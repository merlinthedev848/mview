import asyncio
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from api.database import get_db
from api.models.camera import Camera
from api.schemas.camera import CameraResponse, CameraCreate, CameraUpdate, ONVIFDiscoveryResult
from api.services.onvif_service import onvif_service
from api.services.recorder import recorder_manager
from api.services.local_core import local_core
from api.routers.auth import get_current_user

router = APIRouter(prefix="/cameras", tags=["Cameras"])


async def _refresh_recorder(db: AsyncSession):
    result = await db.execute(select(Camera))
    await recorder_manager.sync_cameras(result.scalars().all())
    await local_core.refresh_snapshot()


class PTZMove(BaseModel):
    action: str = Field(pattern="^(up|down|left|right|zoom_in|zoom_out)$")
    speed: float = Field(default=0.5, ge=0.0, le=1.0)


def _require_settings(current_user: dict) -> None:
    if current_user.get("role") != "admin" and "settings" not in set(current_user.get("permissions") or []):
        raise HTTPException(status_code=403, detail="Settings permission required")


def _go2rtc_base_url(request: Request) -> str:
    host = request.url.hostname or "localhost"
    scheme = "https" if request.url.scheme == "https" else "http"
    return f"{scheme}://{host}:1984"


def _live_stream_payload(camera_id: str, request: Request) -> dict:
    live_stream_name = camera_id
    encoded = quote(live_stream_name, safe="")
    base_url = _go2rtc_base_url(request).rstrip("/")
    return {
        "live_stream_name": live_stream_name,
        "main_stream_name": f"{camera_id}_main",
        "sub_stream_name": f"{camera_id}_sub",
        "go2rtc_base_url": base_url,
        "go2rtc_webrtc_url": f"{base_url}/webrtc.html?src={encoded}",
        "go2rtc_mse_url": f"{base_url}/stream.html?src={encoded}",
        "go2rtc_hls_url": f"{base_url}/api/stream.m3u8?src={encoded}",
        "snapshot_url": f"/cameras/{quote(camera_id, safe='')}/snapshot",
    }


def _camera_payload(cam: Camera, request: Request, can_view_settings: bool, recording_ids: dict | None = None) -> dict:
    recording_ids = recording_ids or {}
    return {
        "id": cam.id,
        "name": cam.name,
        "rtsp_url_main": cam.rtsp_url_main if can_view_settings else None,
        "rtsp_url_sub": cam.rtsp_url_sub if can_view_settings else None,
        "onvif_endpoint": cam.onvif_endpoint if can_view_settings else None,
        "onvif_username": cam.onvif_username if can_view_settings else None,
        "onvif_password": cam.onvif_password if can_view_settings else None,
        "manufacturer": cam.manufacturer,
        "model": cam.model,
        "resolution": cam.resolution,
        "enabled": cam.enabled,
        "config": cam.config if can_view_settings else None,
        "status": "recording" if cam.id in recording_ids else cam.status,
        "auto_adopted": cam.auto_adopted,
        "created_at": cam.created_at,
        "updated_at": cam.updated_at,
        **_live_stream_payload(cam.id, request),
    }


@router.get("", response_model=List[CameraResponse])
async def get_cameras(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Camera))
    cams = result.scalars().all()
    
    # Inject active recording status dynamically
    recording_ids = recorder_manager.status()
    can_view_settings = current_user.get("role") == "admin" or "settings" in set(current_user.get("permissions") or [])
    return [_camera_payload(cam, request, can_view_settings, recording_ids) for cam in cams]


@router.post("", response_model=CameraResponse, status_code=201)
async def create_camera(
    request: Request,
    camera: CameraCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_settings(current_user)
    data = camera.model_dump()
    new_cam = Camera(**data)
    db.add(new_cam)
    await db.commit()
    await db.refresh(new_cam)
    await _refresh_recorder(db)
    return _camera_payload(new_cam, request, True, recorder_manager.status())


@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    request: Request,
    camera_id: str,
    update: CameraUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_settings(current_user)
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(404, "Camera not found")
    for k, v in update.model_dump(exclude_unset=True).items():
        setattr(cam, k, v)
    await db.commit()
    await db.refresh(cam)
    await _refresh_recorder(db)
    return _camera_payload(cam, request, True, recorder_manager.status())


@router.delete("/{camera_id}")
async def delete_camera(
    camera_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_settings(current_user)
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(404, "Camera not found")
    await db.delete(cam)
    await db.commit()
    await _refresh_recorder(db)
    return {"status": "deleted"}


@router.get("/{camera_id}/snapshot")
async def get_camera_snapshot(camera_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(404, "Camera not found")

    rtsp_url = cam.rtsp_url_sub or cam.rtsp_url_main
    if not rtsp_url:
        raise HTTPException(400, "Camera has no RTSP stream configured")

    cmd = [
        "ffmpeg",
        "-loglevel", "error",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-frames:v", "1",
        "-q:v", "4",
        "-f", "image2pipe",
        "-vcodec", "mjpeg",
        "-",
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=8.0)
    except asyncio.TimeoutError:
        if "proc" in locals():
            proc.kill()
        raise HTTPException(504, "Snapshot timed out")
    except FileNotFoundError:
        raise HTTPException(500, "ffmpeg is not available in the API container")

    if proc.returncode != 0 or not stdout:
        detail = stderr.decode(errors="replace")[-240:] if stderr else "Snapshot capture failed"
        raise HTTPException(502, detail)

    return Response(content=stdout, media_type="image/jpeg")


@router.post("/{camera_id}/ptz/move")
async def move_camera_ptz(camera_id: str, command: PTZMove, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(404, "Camera not found")
    if not cam.onvif_endpoint:
        raise HTTPException(400, "Camera has no ONVIF endpoint configured")

    ok = await asyncio.to_thread(
        onvif_service.move_ptz,
        cam.onvif_endpoint,
        cam.onvif_username or "",
        cam.onvif_password or "",
        command.action,
        command.speed,
    )
    if not ok:
        raise HTTPException(502, "PTZ move command failed")
    return {"status": "moving", "action": command.action}


@router.post("/{camera_id}/ptz/stop")
async def stop_camera_ptz(camera_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(404, "Camera not found")
    if not cam.onvif_endpoint:
        raise HTTPException(400, "Camera has no ONVIF endpoint configured")

    ok = await asyncio.to_thread(
        onvif_service.stop_ptz,
        cam.onvif_endpoint,
        cam.onvif_username or "",
        cam.onvif_password or "",
    )
    if not ok:
        raise HTTPException(502, "PTZ stop command failed")
    return {"status": "stopped"}


@router.post("/discover", response_model=List[ONVIFDiscoveryResult])
async def discover_cameras(current_user: dict = Depends(get_current_user)):
    """Scan network for ONVIF cameras (WS-Discovery + IP range scan fallback)."""
    _require_settings(current_user)
    try:
        return await onvif_service.discover_cameras(timeout=4)
    except Exception as e:
        raise HTTPException(500, f"Discovery failed: {e}")


def get_default_rtsp_paths(manufacturer: str | None, model: str | None, ip: str, username: str, password: str) -> tuple[str, str | None]:
    m = (manufacturer or "").lower()
    import urllib.parse
    encoded_user = urllib.parse.quote(username, safe="")
    encoded_pass = urllib.parse.quote(password, safe="")
    credentials = f"{encoded_user}:{encoded_pass}@" if username else ""
    
    if "hikvision" in m or "hik" in m:
        return (
            f"rtsp://{credentials}{ip}:554/Streaming/Channels/101",
            f"rtsp://{credentials}{ip}:554/Streaming/Channels/102"
        )
    elif "dahua" in m or "amcrest" in m or "lts" in m:
        return (
            f"rtsp://{credentials}{ip}:554/cam/realmonitor?channel=1&subtype=0",
            f"rtsp://{credentials}{ip}:554/cam/realmonitor?channel=1&subtype=1"
        )
    elif "reolink" in m:
        return (
            f"rtsp://{credentials}{ip}:554/h264Preview_01_main",
            f"rtsp://{credentials}{ip}:554/h264Preview_01_sub"
        )
    elif "axis" in m:
        return (
            f"rtsp://{credentials}{ip}:554/axis-media/media.amp",
            None
        )
    elif "foscam" in m:
        return (
            f"rtsp://{credentials}{ip}:554/videoMain",
            f"rtsp://{credentials}{ip}:554/videoSub"
        )
    else:
        # Generic fallback
        return (
            f"rtsp://{credentials}{ip}:554/stream1",
            f"rtsp://{credentials}{ip}:554/stream2"
        )


@router.post("/adopt", response_model=CameraResponse, status_code=201)
async def adopt_camera(
    request: Request,
    data: ONVIFDiscoveryResult,
    username: str = "",
    password: str = "",
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Probe a discovered device for RTSP streams, then save it."""
    _require_settings(current_user)
    import urllib.parse
    port = 80
    if data.onvif_endpoint:
        try:
            parsed = urllib.parse.urlparse(data.onvif_endpoint)
            if parsed.port:
                port = parsed.port
        except Exception:
            pass

    streams = await asyncio.to_thread(
        onvif_service.get_camera_streams,
        data.ip, port, username, password
    )

    def inject_rtsp_credentials(rtsp_url: str | None, user: str, psw: str) -> str | None:
        if not rtsp_url or not user:
            return rtsp_url
        # If credentials already embedded, skip
        if "@" in rtsp_url.split("//")[-1]:
            return rtsp_url
        prefix = "rtsp://"
        if rtsp_url.startswith("rtsps://"):
            prefix = "rtsps://"
        body = rtsp_url[len(prefix):]
        import urllib.parse
        encoded_user = urllib.parse.quote(user, safe="")
        encoded_pass = urllib.parse.quote(psw, safe="")
        return f"{prefix}{encoded_user}:{encoded_pass}@{body}"

    if streams:
        rtsp_main = inject_rtsp_credentials(streams[0].get("rtsp_url"), username, password)
        rtsp_sub  = inject_rtsp_credentials(streams[1].get("rtsp_url"), username, password) if len(streams) > 1 else None
        resolution = streams[0].get("resolution")
    else:
        # Fall back to manufacturer-specific defaults
        rtsp_main, rtsp_sub = get_default_rtsp_paths(
            data.manufacturer, data.model, data.ip, username, password
        )
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
    return _camera_payload(cam, request, True, recorder_manager.status())
