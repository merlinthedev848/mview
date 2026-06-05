from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from contextlib import asynccontextmanager
import os
import aiofiles
from pathlib import Path

from api.database import engine, Base
from api.routers import cameras, recordings
from api.services.recorder import recorder_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting mView Sentinel API…")

    # Create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start recording for all cameras
    from api.database import AsyncSessionLocal
    from api.models.camera import Camera
    from sqlalchemy.future import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Camera))
        cams = result.scalars().all()
    await recorder_manager.sync_cameras(cams)

    yield

    print("Shutting down mView Sentinel API…")
    recorder_manager.stop_all()
    await engine.dispose()


app = FastAPI(
    title="mView Sentinel API",
    description="Core backend for mView Sentinel NVR",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(cameras.router)
app.include_router(recordings.router)


@app.get("/system/health")
async def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "recording": recorder_manager.status(),
    }


# ── Serve recorded video files with range request support ───────────────────
RECORDINGS_DIR = Path(os.environ.get("RECORDINGS_DIR", "/mnt/storage/mview/recordings"))


@app.get("/recordings/{camera_id}/{filename}")
async def serve_recording(camera_id: str, filename: str, request_range: str = None):
    """Serve an MP4 recording with HTTP range support for smooth browser playback."""
    file_path = RECORDINGS_DIR / camera_id / filename
    if not file_path.exists() or not file_path.is_file():
        from fastapi import HTTPException
        raise HTTPException(404, "Recording not found")
    return FileResponse(
        str(file_path),
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"},
    )


# ── Serve React frontend ────────────────────────────────────────────────────
frontend_path = Path(os.path.dirname(__file__)).parent / "web" / "dist"

if frontend_path.exists():
    assets_path = frontend_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file = frontend_path / full_path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(frontend_path / "index.html"))
