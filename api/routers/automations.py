from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import uuid

router = APIRouter(prefix="/automations", tags=["automations"])

class AutomationRule(BaseModel):
    id: Optional[str] = None
    name: str
    trigger_event: str # "person_detected", "motion", "camera_tampered", "signal_loss"
    camera_id: Optional[str] = None
    webhook_url: Optional[str] = None
    mqtt_topic: Optional[str] = None
    enabled: bool = True

_automations_store: dict[str, dict] = {
    "rule_1": {
        "id": "rule_1",
        "name": "Night Security Floodlight Webhook",
        "trigger_event": "person_detected",
        "camera_id": None,
        "webhook_url": "https://homeassistant.local/api/webhook/driveway_light",
        "mqtt_topic": "sentinel/triggers/floodlight",
        "enabled": True,
    }
}

@router.get("", response_model=List[AutomationRule])
async def list_automations():
    """List all registered webhook & automation rules."""
    return list(_automations_store.values())

@router.post("", response_model=AutomationRule)
async def create_automation(rule: AutomationRule):
    """Create or update an automation rule."""
    rule_id = rule.id or f"rule_{str(uuid.uuid4())[:8]}"
    rule_dict = rule.model_dump()
    rule_dict["id"] = rule_id
    _automations_store[rule_id] = rule_dict
    return rule_dict

@router.delete("/{rule_id}")
async def delete_automation(rule_id: str):
    """Delete an automation rule."""
    if rule_id in _automations_store:
        del _automations_store[rule_id]
        return {"status": "deleted"}
    raise HTTPException(404, "Rule not found")
