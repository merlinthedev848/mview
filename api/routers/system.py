from fastapi import APIRouter, Depends, HTTPException
import psutil
import shutil
import os

router = APIRouter(prefix="/system", tags=["system"])

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
