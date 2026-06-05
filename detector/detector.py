import cv2
import json
import time
import os
import logging
from ultralytics import YOLO
import paho.mqtt.client as mqtt
from semantic_search import semantic_engine
from PIL import Image

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("mView-Detector")

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

# For demonstration, we'll monitor a single camera stream.
# In a full multi-processing architecture, this would be spawned per camera.
CAMERA_ID = os.getenv("CAMERA_ID", "default_cam")
# Fallback to a public RTSP stream or local video file if go2rtc isn't running
STREAM_URL = os.getenv("STREAM_URL", "rtsp://localhost:8554/camera1") 

class DetectorNode:
    def __init__(self):
        logger.info("Initializing YOLOv8 Nano model...")
        # Automatically downloads yolov8n.pt if not present
        self.model = YOLO('yolov8n.pt')
        
        logger.info(f"Connecting to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}...")
        self.mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        try:
            self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.mqtt_client.loop_start()
        except Exception as e:
            logger.error(f"Failed to connect to MQTT: {e}")
            self.mqtt_client = None

        self.last_event_time = 0
        self.cooldown = 5 # seconds between sending events for the same object class

    def run(self):
        logger.info(f"Connecting to stream: {STREAM_URL}")
        cap = cv2.VideoCapture(STREAM_URL)
        
        if not cap.isOpened():
            logger.error("Failed to open video stream. Retrying in 10s...")
            time.sleep(10)
            return

        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process every Nth frame to save CPU (e.g., 5 fps)
            frame_count += 1
            if frame_count % 6 != 0:
                continue

            # Run YOLO inference
            results = self.model(frame, verbose=False, classes=[0, 2, 3, 5, 7]) # person, car, motorcycle, bus, truck

            detections = []
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    conf = float(box.conf[0])
                    if conf < 0.5:
                        continue
                    
                    cls_id = int(box.cls[0])
                    class_name = self.model.names[cls_id]
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    
                    # Generate Semantic Embedding for the detected object
                    # We crop the image to the bounding box
                    try:
                        cropped = frame[y1:y2, x1:x2]
                        # Convert BGR to RGB for PIL
                        cropped_rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
                        pil_img = Image.fromarray(cropped_rgb)
                        embedding = semantic_engine.embed_image(pil_img)
                        # Convert to list for JSON serialization
                        embedding_list = embedding.tolist()
                    except Exception as e:
                        logger.error(f"Failed to generate embedding: {e}")
                        embedding_list = []

                    detections.append({
                        "class": class_name,
                        "confidence": conf,
                        "bbox": [x1, y1, x2, y2],
                        "embedding": embedding_list
                    })

            if detections:
                self.publish_event(detections)

        cap.release()

    def publish_event(self, detections):
        now = time.time()
        if now - self.last_event_time < self.cooldown:
            return
        
        self.last_event_time = now
        payload = {
            "camera_id": CAMERA_ID,
            "timestamp": now,
            "objects": detections
        }
        topic = f"sentinel/events/{CAMERA_ID}"
        if self.mqtt_client:
            self.mqtt_client.publish(topic, json.dumps(payload))
            logger.info(f"Published event with {len(detections)} objects to {topic}")

if __name__ == "__main__":
    node = DetectorNode()
    # Simple loop to restart if stream dies
    while True:
        try:
            node.run()
        except Exception as e:
            logger.error(f"Detector crashed: {e}")
            time.sleep(5)
