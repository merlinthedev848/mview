from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import psutil
import shutil
import os
import yaml
from pathlib import Path
from api.config import settings

router = APIRouter(prefix="/system", tags=["system"])

CONFIG_PATH = Path(os.environ.get("SENTINEL_CONFIG_FILE", "sentinel.yml"))


class SystemConfigUpdate(BaseModel):
    retention_days: int


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
    retention_days = settings.retention_days
    if CONFIG_PATH.is_file():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh) or {}
                retention_days = data.get("recordings", {}).get("retention_days", settings.retention_days)
        except Exception:
            pass
    return {"retention_days": retention_days}


@router.post("/config")
async def update_system_config(config: SystemConfigUpdate):
    """Update system configuration settings."""
    data = {}
    if CONFIG_PATH.is_file():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh) or {}
        except Exception:
            pass
            
    if "recordings" not in data:
        data["recordings"] = {}
        
    data["recordings"]["retention_days"] = config.retention_days
    
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as fh:
            yaml.safe_dump(data, fh, default_flow_style=False)
    except Exception as e:
        raise HTTPException(500, f"Failed to write configuration: {e}")
        
    # Also update in-memory settings
    settings.retention_days = config.retention_days
    
    return {"status": "success", "retention_days": config.retention_days}
