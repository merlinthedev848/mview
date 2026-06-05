import asyncio
import cv2
import json
import logging
from ultralytics import YOLO
import supervision as sv
from aiomqtt import Client as MQTTClient
import os

from accelerator import HardwareAccelerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mView-Detector")

class ObjectDetector:
    def __init__(self):
        self.backend = HardwareAccelerator.detect_best_backend()
        logger.info(f"Initializing YOLO with backend: {self.backend}")
        
        # Load the appropriate model based on hardware
        # In a full deployment, this downloads the right model weights
        self.model = YOLO("yolov8n.pt") 
        
        # We use Supervision for ByteTrack object tracking
        self.tracker = sv.ByteTrack()
        
        # MQTT for publishing events to the backend API and Home Assistant
        self.mqtt_broker = os.getenv("MQTT_BROKER", "localhost")
        
        # We only care about people, bicycles, cars, motorcycles, etc (COCO classes 0-7, 15-23)
        self.target_classes = [0, 1, 2, 3, 5, 7, 15, 16] 

    async def process_stream(self, camera_id: str, stream_url: str):
        """Connects to a go2rtc sub-stream, extracts frames, and runs AI detection."""
        logger.info(f"Starting detection pipeline for camera: {camera_id} at {stream_url}")
        
        # In production this would be a robust connection handler,
        # skipping frames to match the desired FPS (e.g. 5fps)
        cap = cv2.VideoCapture(stream_url)
        
        async with MQTTClient(self.mqtt_broker) as mqtt:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    await asyncio.sleep(1) # Wait and try to reconnect
                    continue

                # 1. Inference
                results = self.model(frame, classes=self.target_classes, verbose=False)[0]
                detections = sv.Detections.from_ultralytics(results)
                
                # 2. Tracking (Maintains object IDs across frames)
                detections = self.tracker.update_with_detections(detections)
                
                # 3. Publish Events if we detect targets
                if len(detections) > 0:
                    event_payload = {
                        "camera_id": camera_id,
                        "objects": [
                            {"class": self.model.names[class_id], "confidence": float(conf), "track_id": int(track_id) if track_id is not None else None}
                            for class_id, conf, track_id in zip(detections.class_id, detections.confidence, detections.tracker_id)
                        ]
                    }
                    
                    # Publish to MQTT topic that the FastAPI event_processor listens to
                    await mqtt.publish(f"sentinel/events/{camera_id}", payload=json.dumps(event_payload))
                    logger.debug(f"Published event: {event_payload}")

                # Sleep to limit FPS
                await asyncio.sleep(0.2) # ~5 FPS

async def main():
    detector = ObjectDetector()
    
    # Example: In production, the detector queries the API for the list of cameras to monitor
    # await detector.process_stream("front_door", "rtsp://localhost:8554/front_door_sub")
    
    logger.info("AI Detection Service is ready and waiting for stream allocations.")
    while True:
        await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
