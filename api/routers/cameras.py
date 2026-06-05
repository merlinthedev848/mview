from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from api.database import get_db
from api.models.camera import Camera
from api.schemas.camera import CameraResponse, CameraCreate, CameraUpdate, ONVIFDiscoveryResult
from api.services.onvif_service import onvif_service
from api.services.recorder import recorder_manager

router = APIRouter(prefix="/cameras", tags=["Cameras"])


async def _refresh_recorder(db: AsyncSession):
    result = await db.execute(select(Camera))
    await recorder_manager.sync_cameras(result.scalars().all())


@router.get("", response_model=List[CameraResponse])
async def get_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera))
    return result.scalars().all()


@router.post("", response_model=CameraResponse, status_code=201)
async def create_camera(camera: CameraCreate, db: AsyncSession = Depends(get_db)):
    data = camera.model_dump()
    new_cam = Camera(**data)
    db.add(new_cam)
    await db.commit()
    await db.refresh(new_cam)
    await _refresh_recorder(db)
    return new_cam


@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: str, update: CameraUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(404, "Camera not found")
    for k, v in update.model_dump(exclude_unset=True).items():
        setattr(cam, k, v)
    await db.commit()
    await db.refresh(cam)
    await _refresh_recorder(db)
    return cam


@router.delete("/{camera_id}")
async def delete_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(404, "Camera not found")
    await db.delete(cam)
    await db.commit()
    await _refresh_recorder(db)
    return {"status": "deleted"}


@router.post("/discover", response_model=List[ONVIFDiscoveryResult])
async def discover_cameras():
    """Scan network for ONVIF cameras (WS-Discovery + IP range scan fallback)."""
    try:
        return await onvif_service.discover_cameras(timeout=4)
    except Exception as e:
        raise HTTPException(500, f"Discovery failed: {e}")


@router.post("/adopt", response_model=CameraResponse, status_code=201)
async def adopt_camera(
    data: ONVIFDiscoveryResult,
    username: str = "admin",
    password: str = "admin",
    db: AsyncSession = Depends(get_db),
):
    """Probe a discovered device for RTSP streams, then save it."""
    import asyncio
    streams = await asyncio.to_thread(
        onvif_service.get_camera_streams,
        data.ip, 80, username, password
    )

    if streams:
        rtsp_main = streams[0].get("rtsp_url")
        rtsp_sub  = streams[1].get("rtsp_url") if len(streams) > 1 else None
        resolution = streams[0].get("resolution")
    else:
        # Standard fallback — works on the vast majority of cameras
        rtsp_main = f"rtsp://{username}:{password}@{data.ip}:554/stream1"
        rtsp_sub  = f"rtsp://{username}:{password}@{data.ip}:554/stream2"
        resolution = None

    cam = Camera(
        name=f"{data.manufacturer} {data.model} ({data.ip})",
        rtsp_url_main=rtsp_main,
        rtsp_url_sub=rtsp_sub,
        onvif_endpoint=data.onvif_endpoint,
        onvif_username=username,
        onvif_password=password,
        manufacturer=data.manufacturer,
        model=data.model,
        resolution=resolution,
        status="online",
        auto_adopted=True,
    )
    db.add(cam)
    await db.commit()
    await db.refresh(cam)
    await _refresh_recorder(db)
    return cam
