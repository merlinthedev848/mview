from fastapi import APIRouter
from api.services.recorder import list_recordings

router = APIRouter(prefix="/recordings-list", tags=["Recordings"])


@router.get("")
async def get_recordings(camera_id: str | None = None):
    """List all recorded MP4 files, optionally filtered by camera_id."""
    return list_recordings(camera_id)
