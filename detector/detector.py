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
MODEL_NAME = os.getenv("DETECTOR_MODEL", "yolov8n.pt")
ACCELERATOR = os.getenv("ACCELERATOR", "cpu").lower()
FRAME_STRIDE = max(1, int(os.getenv("FRAME_STRIDE", "6")))
IMAGE_SIZE = int(os.getenv("IMAGE_SIZE", "640"))
MIN_CONFIDENCE = float(os.getenv("MIN_CONFIDENCE", "0.5"))
EVENT_COOLDOWN_SECONDS = float(os.getenv("EVENT_COOLDOWN_SECONDS", "5"))
DETECT_CLASSES = [
    int(value)
    for value in os.getenv("DETECT_CLASSES", "0,2,3,5,7").split(",")
    if value.strip().isdigit()
]

# For demonstration, we'll monitor a single camera stream.
# In a full multi-processing architecture, this would be spawned per camera.
CAMERA_ID = os.getenv("CAMERA_ID", "default_cam")
# Fallback to a public RTSP stream or local video file if go2rtc isn't running
STREAM_URL = os.getenv("STREAM_URL", "rtsp://localhost:8554/camera1") 

class DetectorNode:
    def __init__(self):
        logger.info("Initializing YOLO model %s on %s...", MODEL_NAME, ACCELERATOR)
        self.model = YOLO(MODEL_NAME)
        if ACCELERATOR != "cpu":
            try:
                self.model.to(ACCELERATOR)
            except Exception as e:
                logger.warning("Could not move YOLO model to %s: %s. Falling back to default device.", ACCELERATOR, e)
        
        logger.info(f"Connecting to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}...")
        self.mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        try:
            self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.mqtt_client.loop_start()
        except Exception as e:
            logger.error(f"Failed to connect to MQTT: {e}")
            self.mqtt_client = None

        self.last_event_by_class: dict[str, float] = {}
        self.cooldown = EVENT_COOLDOWN_SECONDS

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
            if frame_count % FRAME_STRIDE != 0:
                continue

            frame_h, frame_w = frame.shape[:2]

            # Run YOLO inference
            results = self.model(
                frame,
                verbose=False,
                classes=DETECT_CLASSES,
                conf=MIN_CONFIDENCE,
                imgsz=IMAGE_SIZE,
            )

            detections = []
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    conf = float(box.conf[0])
                    if conf < MIN_CONFIDENCE:
                        continue
                    
                    cls_id = int(box.cls[0])
                    class_name = self.model.names[cls_id]
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(frame_w, x2), min(frame_h, y2)
                    if x2 <= x1 or y2 <= y1:
                        continue
                    
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
                        "bbox_norm": [
                            max(0, min(1, x1 / frame_w)),
                            max(0, min(1, y1 / frame_h)),
                            max(0, min(1, x2 / frame_w)),
                            max(0, min(1, y2 / frame_h)),
                        ],
                        "embedding": embedding_list
                    })

            if detections:
                self.publish_event(detections, frame_w, frame_h)

        cap.release()

    def publish_event(self, detections, frame_w, frame_h):
        now = time.time()
        publishable = []
        for detection in detections:
            object_class = detection.get("class", "object")
            last_seen = self.last_event_by_class.get(object_class, 0)
            if now - last_seen >= self.cooldown:
                publishable.append(detection)
                self.last_event_by_class[object_class] = now

        if not publishable:
            return

        payload = {
            "camera_id": CAMERA_ID,
            "timestamp": now,
            "frame": {"width": frame_w, "height": frame_h},
            "objects": publishable
        }
        topic = f"sentinel/events/{CAMERA_ID}"
        if self.mqtt_client:
            self.mqtt_client.publish(topic, json.dumps(payload, separators=(",", ":")), qos=0)
            logger.info(f"Published event with {len(publishable)} objects to {topic}")

if __name__ == "__main__":
    node = DetectorNode()
    # Simple loop to restart if stream dies
    while True:
        try:
            node.run()
        except Exception as e:
            logger.error(f"Detector crashed: {e}")
            time.sleep(5)
