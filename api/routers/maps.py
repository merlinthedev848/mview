from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from api.database import get_db
import shutil
import os
import uuid

router = APIRouter(prefix="/maps", tags=["maps"])

UPLOAD_DIR = os.getenv("STORAGE_PATH", "/mnt/storage/mview") + "/maps"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_floorplan(file: UploadFile = File(...)):
    """Upload a floorplan image to the server."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    file_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1]
    filename = f"{file_id}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"status": "success", "map_id": file_id, "url": f"/static/maps/{filename}"}

@router.post("/{map_id}/cameras")
async def save_camera_positions(map_id: str, positions: list, db: AsyncSession = Depends(get_db)):
    """Save camera [x, y, rotation] coordinates for the Map View."""
    # Stub: Iterate over positions and update the camera models in PostgreSQL
    return {"status": "success", "saved": len(positions)}

@router.get("/{map_id}")
async def get_map_config(map_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve map floorplan and all camera markers."""
    # Stub: Query DB for camera positions on this map
    return {
        "map_id": map_id,
        "floorplan_url": f"/static/maps/{map_id}.png",
        "cameras": []
    }
