from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from api.database import get_db
from api.models.camera import Camera
from api.schemas.camera import CameraResponse, CameraCreate, CameraUpdate, ONVIFDiscoveryResult
from api.services.onvif_service import onvif_service

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get("/", response_model=List[CameraResponse])
async def get_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera))
    return result.scalars().all()

@router.post("/", response_model=CameraResponse)
async def create_camera(camera: CameraCreate, db: AsyncSession = Depends(get_db)):
    new_camera = Camera(**camera.model_dump())
    db.add(new_camera)
    await db.commit()
    await db.refresh(new_camera)
    return new_camera

@router.post("/discover", response_model=List[ONVIFDiscoveryResult])
async def discover_cameras():
    """
    Scans the local network for ONVIF devices using WS-Discovery.
    """
    try:
        results = await onvif_service.discover_cameras(timeout=3)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")

@router.post("/adopt", response_model=CameraResponse)
async def adopt_camera(discovery_data: ONVIFDiscoveryResult, username: str = "admin", password: str = "admin", db: AsyncSession = Depends(get_db)):
    """
    Probes an auto-discovered camera to extract RTSP URIs and capabilities,
    then saves it to the database.
    """
    # 1. Probe the camera via ONVIF to get its streaming profiles
    # Using default port 80 for the mock
    import asyncio
    streams = await asyncio.to_thread(
        onvif_service.get_camera_streams, discovery_data.ip, 80, username, password
    )
    
    if not streams:
        raise HTTPException(status_code=400, detail="Failed to retrieve camera streams.")
    
    main_stream = streams[0]
    sub_stream = streams[1] if len(streams) > 1 else streams[0]
    
    # 2. Create the Camera database record
    new_camera = Camera(
        name=f"{discovery_data.manufacturer} {discovery_data.model}",
        rtsp_url_main=main_stream.get("rtsp_url"),
        rtsp_url_sub=sub_stream.get("rtsp_url"),
        onvif_endpoint=discovery_data.onvif_endpoint,
        onvif_username=username,
        onvif_password=password,
        manufacturer=discovery_data.manufacturer,
        model=discovery_data.model,
        resolution=main_stream.get("resolution"),
        status="online",
        auto_adopted=True
    )
    
    db.add(new_camera)
    await db.commit()
    await db.refresh(new_camera)
    
    # 3. (Future) Push go2rtc configuration update here
    
    return new_camera

@router.delete("/{camera_id}")
async def delete_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    await db.delete(camera)
    await db.commit()
    return {"status": "deleted"}
