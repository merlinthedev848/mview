from fastapi import APIRouter
from api.services.recorder import list_recordings
import asyncio

router = APIRouter(prefix="/recordings-list", tags=["Recordings"])


@router.get("")
async def get_recordings(camera_id: str | None = None):
    """List all recorded MP4 files, optionally filtered by camera_id."""
    return await asyncio.to_thread(list_recordings, camera_id)
