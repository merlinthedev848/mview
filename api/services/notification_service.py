import logging
import json
import httpx
import os
from aiomqtt import Client as MQTTClient

logger = logging.getLogger("mView-Notifications")

class NotificationService:
    """
    Handles dispatching alerts to external services based on user-defined rules.
    Supports Webhooks, Discord, Telegram, and MQTT.
    """
    def __init__(self):
        self.mqtt_broker = os.getenv("MQTT_BROKER", "localhost")
        logger.info("Notification Service Initialized.")

    async def dispatch(self, rule: dict, event_data: dict):
        """Evaluate a rule and dispatch to the requested channels."""
        channels = rule.get("channels", [])
        
        for channel in channels:
            if channel == "discord":
                await self.send_discord(rule.get("webhook_url"), event_data)
            elif channel == "telegram":
                await self.send_telegram(rule.get("bot_token"), rule.get("chat_id"), event_data)
            elif channel == "mqtt":
                await self.send_mqtt(rule.get("mqtt_topic"), event_data)
            else:
                logger.warning(f"Unsupported notification channel: {channel}")

    async def send_discord(self, webhook_url: str, event_data: dict):
        if not webhook_url:
            return
            
        payload = {
            "content": f"🚨 **mView Alert**: {event_data.get('object_class')} detected on {event_data.get('camera_id')} at {event_data.get('timestamp')}",
            "embeds": [{
                "title": "Confidence Score",
                "description": f"{round(event_data.get('confidence', 0) * 100, 1)}%",
                "color": 16711680 # Red
            }]
        }
        
        async with httpx.AsyncClient() as client:
            try:
                await client.post(webhook_url, json=payload)
                logger.info("Discord webhook sent.")
            except Exception as e:
                logger.error(f"Failed to send Discord webhook: {e}")

    async def send_telegram(self, bot_token: str, chat_id: str, event_data: dict):
        if not bot_token or not chat_id:
            return
            
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": f"🚨 mView Alert: {event_data.get('object_class')} on {event_data.get('camera_id')}"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                await client.post(url, json=payload)
                logger.info("Telegram message sent.")
            except Exception as e:
                logger.error(f"Failed to send Telegram message: {e}")

    async def send_mqtt(self, topic: str, event_data: dict):
        if not topic:
            return
            
        try:
            async with MQTTClient(self.mqtt_broker) as client:
                await client.publish(topic, payload=json.dumps(event_data))
                logger.info(f"MQTT notification published to {topic}")
        except Exception as e:
            logger.error(f"Failed to publish MQTT notification: {e}")

notification_service = NotificationService()
