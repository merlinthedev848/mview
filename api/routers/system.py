from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import psutil
import shutil
import os
import yaml
from pathlib import Path
from api.config import settings

router = APIRouter(prefix="/system", tags=["system"])

CONFIG_PATH = Path(os.environ.get("SENTINEL_CONFIG_FILE", "sentinel.yml"))


class AIConfig(BaseModel):
    accelerator: str = "auto"
    object_model: str = "yolov8n"
    min_confidence: float = Field(default=0.65, ge=0, le=1)
    enable_alpr: bool = False
    enable_face_recognition: bool = False


class NetworkConfig(BaseModel):
    api_port: int = 8000
    rtsp_port: int = 8554
    webrtc_api_port: int = 1984
    webrtc_port: int = 8555
    ice_servers: list[str] = Field(default_factory=list)
    enable_ssl: bool = False


class SystemConfigUpdate(BaseModel):
    retention_days: int = Field(default=30, ge=0, le=3650)
    ai: AIConfig = Field(default_factory=AIConfig)
    network: NetworkConfig = Field(default_factory=NetworkConfig)


def _read_config_file() -> dict:
    if CONFIG_PATH.is_file():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
                return yaml.safe_load(fh) or {}
        except Exception:
            return {}
    return {}


def _compose_config(data: dict) -> SystemConfigUpdate:
    recordings = data.get("recordings", {}) if isinstance(data.get("recordings"), dict) else {}
    ai = data.get("ai", {}) if isinstance(data.get("ai"), dict) else {}
    network = data.get("network", {}) if isinstance(data.get("network"), dict) else {}
    go2rtc = data.get("go2rtc", {}) if isinstance(data.get("go2rtc"), dict) else {}

    ice_servers = network.get("ice_servers")
    if ice_servers is None:
        ice_servers = go2rtc.get("ice_servers", ["stun:stun.l.google.com:19302"])

    return SystemConfigUpdate(
        retention_days=recordings.get("retention_days", settings.retention_days),
        ai=AIConfig(
            accelerator=ai.get("accelerator", "auto"),
            object_model=ai.get("object_model", "yolov8n"),
            min_confidence=ai.get("min_confidence", 0.65),
            enable_alpr=ai.get("enable_alpr", False),
            enable_face_recognition=ai.get("enable_face_recognition", False),
        ),
        network=NetworkConfig(
            api_port=network.get("api_port", 8000),
            rtsp_port=network.get("rtsp_port", 8554),
            webrtc_api_port=network.get("webrtc_api_port", 1984),
            webrtc_port=network.get("webrtc_port", 8555),
            ice_servers=ice_servers or [],
            enable_ssl=network.get("enable_ssl", False),
        ),
    )


@router.get("/health")
async def get_system_health():
    """Retrieve CPU, RAM, and Disk health statistics."""
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    storage_path = os.getenv("STORAGE_PATH", "/mnt/storage/mview")
    try:
        total, used, free = shutil.disk_usage(storage_path)
    except FileNotFoundError:
        total, used, free = (0, 0, 0)

    return {
        "status": "online",
        "cpu_usage_percent": cpu_percent,
        "memory_usage_percent": memory.percent,
        "memory_total_gb": round(memory.total / (1024**3), 2),
        "storage": {
            "path": storage_path,
            "total_gb": round(total / (1024**3), 2),
            "used_gb": round(used / (1024**3), 2),
            "free_gb": round(free / (1024**3), 2),
            "usage_percent": round((used / total) * 100, 2) if total > 0 else 0
        }
    }


@router.get("/config")
async def get_system_config():
    """Retrieve system configuration settings."""
    return _compose_config(_read_config_file()).model_dump()


@router.post("/config")
async def update_system_config(config: SystemConfigUpdate):
    """Update system configuration settings."""
    data = _read_config_file()

    if "recordings" not in data:
        data["recordings"] = {}

    data["recordings"]["retention_days"] = config.retention_days
    data["ai"] = config.ai.model_dump()
    data["network"] = config.network.model_dump()

    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as fh:
            yaml.safe_dump(data, fh, default_flow_style=False)
    except Exception as e:
        raise HTTPException(500, f"Failed to write configuration: {e}")
        
    settings.retention_days = config.retention_days
    for key, value in config.ai.model_dump().items():
        setting_name = f"ai_{key}"
        if hasattr(settings, setting_name):
            setattr(settings, setting_name, value)
    for key, value in config.network.model_dump().items():
        setting_name = f"network_{key}"
        if hasattr(settings, setting_name):
            setattr(settings, setting_name, value)

    return {"status": "success", **config.model_dump()}
