import asyncio
import json
import logging
from aiomqtt import Client as MQTTClient
from sqlalchemy.ext.asyncio import AsyncSession
from api.database import async_session_maker
from api.models.event import Event
from api.models.ai import SemanticEvent
import os
from datetime import datetime

logger = logging.getLogger("mView-EventProcessor")

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")

async def process_mqtt_events():
    """
    Background task that listens to MQTT events from the AI Detector
    and persists them into the PostgreSQL database.
    """
    logger.info(f"Connecting to MQTT Broker at {MQTT_BROKER} to subscribe to events...")
    
    while True:
        try:
            async with MQTTClient(MQTT_BROKER) as client:
                await client.subscribe("sentinel/events/#")
                logger.info("Subscribed to sentinel/events/#")
                
                async for message in client.messages:
                    topic = message.topic.value
                    payload = message.payload.decode()
                    
                    try:
                        data = json.loads(payload)
                        camera_id = data.get("camera_id")
                        objects = data.get("objects", [])
                        timestamp = datetime.fromtimestamp(data.get("timestamp"))
                        
                        if not objects:
                            continue
                            
                        logger.info(f"Received event from {camera_id} with {len(objects)} objects")
                        
                        async with async_session_maker() as session:
                            for obj in objects:
                                # Save the core event
                                new_event = Event(
                                    camera_id=camera_id,
                                    event_type=obj.get("class"),
                                    object_class=obj.get("class"),
                                    confidence=obj.get("confidence"),
                                    bounding_box=obj.get("bbox"),
                                    timestamp=timestamp
                                )
                                session.add(new_event)
                                
                                # If we have a semantic embedding, save it to the vector table
                                embedding = obj.get("embedding")
                                if embedding and len(embedding) == 512:
                                    # Create the pgvector record
                                    semantic_event = SemanticEvent(
                                        id=new_event.id, # Link them
                                        camera_id=camera_id,
                                        embedding=embedding,
                                        object_class=obj.get("class"),
                                        confidence=obj.get("confidence"),
                                        timestamp=timestamp
                                    )
                                    session.add(semantic_event)
                                    
                            await session.commit()
                            logger.info(f"Saved {len(objects)} events to Postgres with embeddings.")
                            
                    except json.JSONDecodeError:
                        logger.error("Failed to decode MQTT payload")
                    except Exception as db_err:
                        logger.error(f"Database error while saving event: {db_err}")
                        
        except Exception as e:
            logger.error(f"MQTT connection lost: {e}. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)

# Entry point for the background task
if __name__ == "__main__":
    asyncio.run(process_mqtt_events())
