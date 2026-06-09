import asyncio
import json
import logging
from aiomqtt import Client as MQTTClient
from api.database import async_session_maker
from api.models.ai import SemanticEvent
from api.models.camera import Camera
from api.config import settings
from api.services.local_core import local_core
from datetime import datetime

logger = logging.getLogger("mView-EventProcessor")

MQTT_BROKER = settings.mqtt_broker
MQTT_PORT = settings.mqtt_port
_LAST_ZONE_EVENTS: dict[tuple[str, str, str], float] = {}


def _point_in_polygon(x: float, y: float, points: list[dict]) -> bool:
    inside = False
    j = len(points) - 1
    for i, point in enumerate(points):
        xi, yi = float(point.get("x", 0)), float(point.get("y", 0))
        xj, yj = float(points[j].get("x", 0)), float(points[j].get("y", 0))
        intersects = ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / ((yj - yi) or 0.000001) + xi
        )
        if intersects:
            inside = not inside
        j = i
    return inside


def _normalized_bbox(obj: dict, frame: dict | None) -> list[float] | None:
    bbox_norm = obj.get("bbox_norm")
    if isinstance(bbox_norm, list) and len(bbox_norm) == 4:
        return [float(v) for v in bbox_norm]

    bbox = obj.get("bbox")
    if not isinstance(bbox, list) or len(bbox) != 4 or not frame:
        return None

    width = float(frame.get("width") or 0)
    height = float(frame.get("height") or 0)
    if width <= 0 or height <= 0:
        return None

    x1, y1, x2, y2 = [float(v) for v in bbox]
    return [
        max(0, min(1, x1 / width)),
        max(0, min(1, y1 / height)),
        max(0, min(1, x2 / width)),
        max(0, min(1, y2 / height)),
    ]


def _matching_zone(obj: dict, zones: list[dict], frame: dict | None) -> dict | None:
    if not zones:
        return {}

    class_name = str(obj.get("class") or "").lower()
    confidence = float(obj.get("confidence") or 0)
    bbox = _normalized_bbox(obj, frame)
    center = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2) if bbox else None

    for zone in zones:
        if zone.get("enabled") is False:
            continue
        objects = [str(v).lower() for v in zone.get("objects", [])]
        if objects and class_name not in objects:
            continue
        if confidence < float(zone.get("min_confidence") or 0):
            continue

        points = zone.get("points") or []
        if len(points) >= 3:
            if not center or not _point_in_polygon(center[0], center[1], points):
                continue

        return zone

    return None

async def process_mqtt_events():
    """
    Background task that listens to MQTT events from the AI Detector
    and persists them into the PostgreSQL database.
    """
    logger.info(f"Connecting to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT} to subscribe to events...")
    
    while True:
        try:
            async with MQTTClient(MQTT_BROKER, port=MQTT_PORT) as client:
                await client.subscribe("sentinel/events/#")
                logger.info("Subscribed to sentinel/events/#")
                
                async for message in client.messages:
                    topic = message.topic.value
                    payload = message.payload.decode()
                    
                    try:
                        data = json.loads(payload)
                        camera_id = data.get("camera_id")
                        objects = data.get("objects", [])
                        frame = data.get("frame") or {}
                        timestamp = datetime.fromtimestamp(data.get("timestamp") or datetime.utcnow().timestamp())

                        if not objects:
                            continue

                        if not camera_id:
                            logger.warning("Skipping MQTT event without camera_id")
                            continue

                        async with async_session_maker() as session:
                            zones = []
                            camera = await session.get(Camera, camera_id)
                            if not camera:
                                logger.warning(f"Skipping event for unknown camera {camera_id}")
                                continue
                            if camera and isinstance(camera.config, dict):
                                zones = camera.config.get("zones") or []

                            saved_count = 0
                            for obj in objects:
                                zone = _matching_zone(obj, zones, frame)
                                if zone is None:
                                    continue

                                embedding = obj.get("embedding")
                                if not embedding or len(embedding) != 512:
                                    continue

                                object_class = obj.get("class")
                                if zone.get("name"):
                                    object_class = f"{object_class} @ {zone.get('name')}"
                                if zone.get("id"):
                                    cooldown = float(zone.get("cooldown_seconds") or 0)
                                    cooldown_key = (str(camera_id), str(zone.get("id")), str(obj.get("class") or "object"))
                                    last_seen = _LAST_ZONE_EVENTS.get(cooldown_key, 0)
                                    event_time = timestamp.timestamp()
                                    if cooldown > 0 and event_time - last_seen < cooldown:
                                        continue
                                    _LAST_ZONE_EVENTS[cooldown_key] = event_time

                                session.add(SemanticEvent(
                                    camera_id=camera_id,
                                    embedding=embedding,
                                    object_class=object_class,
                                    confidence=obj.get("confidence"),
                                    timestamp=timestamp,
                                ))
                                saved_count += 1
                                    
                            await session.commit()
                            if saved_count:
                                await local_core.publish("ai_event", {
                                    "camera_id": camera_id,
                                    "count": saved_count,
                                    "timestamp": timestamp.isoformat(),
                                })
                                logger.info(f"Saved {saved_count} events to Postgres with embeddings.")
                            
                    except json.JSONDecodeError:
                        logger.error("Failed to decode MQTT payload")
                    except Exception as db_err:
                        logger.error(f"Database error while saving event: {db_err}")
                        
        except asyncio.CancelledError:
            logger.info("MQTT event processor cancelled.")
            raise
        except Exception as e:
            logger.error(f"MQTT connection lost: {e}. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)

# Entry point for the background task
if __name__ == "__main__":
    asyncio.run(process_mqtt_events())
