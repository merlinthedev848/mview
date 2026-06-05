from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from api.database import get_db
import os
import glob

router = APIRouter(prefix="/recordings", tags=["recordings"])

STORAGE_PATH = os.getenv("STORAGE_PATH", "/mnt/storage/mview")

@router.get("/")
async def list_recordings(
    camera_id: str = None, 
    date: str = None, # format: YYYY-MM-DD
    db: AsyncSession = Depends(get_db)
):
    """Retrieve a list of available recording segments for playback."""
    # Stub: Normally we query the `Recording` model.
    # For now, we search the filesystem based on camera_id
    if not camera_id:
        return {"error": "camera_id is required"}
        
    path = os.path.join(STORAGE_PATH, "recordings", camera_id)
    if date:
        path = os.path.join(path, date)
        
    if not os.path.exists(path):
        return []
        
    # Find all .mp4 segments
    segments = []
    for filepath in glob.glob(os.path.join(path, "**/*.mp4"), recursive=True):
        stat = os.stat(filepath)
        filename = os.path.basename(filepath)
        segments.append({
            "filename": filename,
            "path": filepath.replace(STORAGE_PATH, "/static"),
            "size_bytes": stat.st_size,
            "created_at": stat.st_ctime
        })
        
    return sorted(segments, key=lambda x: x["created_at"], reverse=True)

@router.get("/{camera_id}/{date}/{filename}")
async def get_recording_segment(camera_id: str, date: str, filename: str):
    """Serve a specific MP4 segment."""
    filepath = os.path.join(STORAGE_PATH, "recordings", camera_id, date, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Recording segment not found")
        
    return FileResponse(filepath, media_type="video/mp4")
