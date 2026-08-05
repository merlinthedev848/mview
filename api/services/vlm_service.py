import base64
import json
import logging
import httpx
from api.config import settings

logger = logging.getLogger("mView-VLM")

class VLMService:
    """
    Multimodal Vision-Language Model analyzer.
    Supports local fallback, Google Gemini API, and OpenAI GPT API.
    """

    async def analyze_frame(self, image_bytes: bytes, detected_classes: list[str]) -> dict:
        """
        Takes raw image bytes, runs VLM analysis, and returns structured summary & threat rating.
        """
        provider = settings.ai_provider
        classes_str = ", ".join(detected_classes) or "unidentified motion"

        if provider == "gemini" and settings.gemini_api_key:
            return await self._analyze_gemini(image_bytes, classes_str)
        elif provider == "openai" and settings.openai_api_key:
            return await self._analyze_openai(image_bytes, classes_str)
        
        # Local / fallback mock behavior
        return self._local_fallback(detected_classes)

    async def _analyze_gemini(self, image_bytes: bytes, classes_str: str) -> dict:
        b64_data = base64.b64encode(image_bytes).decode("utf-8")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
        
        prompt = (
            f"Analyze this security camera frame. YOLO detected: {classes_str}. "
            "Describe the scene and any activity in a single short sentence (max 15 words). "
            "Assess the threat level as LOW, MEDIUM, or HIGH based on safety/security risk. "
            "You MUST return JSON matching this exact structure: "
            '{"description": "...", "threat_level": "LOW|MEDIUM|HIGH"}'
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inlineData": {
                                "mimeType": "image/jpeg",
                                "data": b64_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(text)
                else:
                    logger.error(f"Gemini API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Failed to analyze frame with Gemini: {e}")

        return self._local_fallback(classes_str.split(", "))

    async def _analyze_openai(self, image_bytes: bytes, classes_str: str) -> dict:
        b64_data = base64.b64encode(image_bytes).decode("utf-8")
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json"
        }

        prompt = (
            f"Analyze this security camera frame. YOLO detected: {classes_str}. "
            "Describe the scene and any activity in a single short sentence (max 15 words). "
            "Assess the threat level as LOW, MEDIUM, or HIGH based on safety/security risk. "
            "You MUST return JSON matching this exact structure: "
            '{"description": "...", "threat_level": "LOW|MEDIUM|HIGH"}'
        )

        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_data}"
                            }
                        }
                    ]
                }
            ],
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["choices"][0]["message"]["content"]
                    return json.loads(text)
                else:
                    logger.error(f"OpenAI API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Failed to analyze frame with OpenAI: {e}")

        return self._local_fallback(classes_str.split(", "))

    def _local_fallback(self, classes: list[str]) -> dict:
        """Lightweight rules-based security context analyzer."""
        if not classes or classes == [""]:
            return {
                "description": "Motion detected, no recognized objects in view.",
                "threat_level": "LOW"
            }
        
        objects_desc = ", ".join(classes)
        threat = "LOW"
        
        # Simple security rules
        suspicious_classes = {"person", "backpack", "suitcase", "knife", "scissors"}
        if any(c in suspicious_classes for c in classes):
            threat = "MEDIUM"
        
        return {
            "description": f"Visual alert: {objects_desc} identified in frame.",
            "threat_level": threat
        }

vlm_service = VLMService()
