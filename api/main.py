from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.exceptions import RequestValidationError
from fastapi import Request
from contextlib import asynccontextmanager
import os
from pathlib import Path

from api.database import engine, Base
from api.routers import cameras, recordings, events, system
from api.services.recorder import recorder_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start recording for all existing cameras
    from api.database import AsyncSessionLocal
    from api.models.camera import Camera
    from sqlalchemy.future import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Camera))
        cams = result.scalars().all()
    await recorder_manager.sync_cameras(cams)
    print(f"[Sentinel] Recorder started for {len(cams)} camera(s).")

    yield

    recorder_manager.stop_all()
    await engine.dispose()


app = FastAPI(
    title="mView Sentinel",
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

# ── API routers ────────────────────────────────────────────────────
app.include_router(cameras.router)
app.include_router(recordings.router)
app.include_router(events.router)
app.include_router(system.router)


@app.get("/system/health")
async def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "recording": recorder_manager.status(),
    }


# ── Serve recorded video files ─────────────────────────────────────
RECORDINGS_DIR = Path(os.environ.get("RECORDINGS_DIR", "/mnt/storage/mview/recordings"))


@app.get("/recordings/{camera_id}/{filename}")
async def serve_recording(camera_id: str, filename: str):
    from fastapi import HTTPException
    file_path = RECORDINGS_DIR / camera_id / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(404, "Recording not found")
    return FileResponse(str(file_path), media_type="video/mp4",
                        headers={"Accept-Ranges": "bytes"})


# ── Serve React SPA — must be last ────────────────────────────────
frontend_path = Path(__file__).parent.parent / "web" / "dist"

if frontend_path.exists():
    # Serve /assets statically
    assets = frontend_path / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=str(assets)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Catch-all: serve index.html so React Router handles the path."""
        candidate = frontend_path / full_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(frontend_path / "index.html"))
else:
    @app.get("/")
    async def no_frontend():
        return {"message": "mView Sentinel API is running. Frontend not built yet."}
