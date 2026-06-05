from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path

from api.database import engine, Base
from api.routers import cameras, recordings, events, system
from api.services.recorder import recorder_manager

log = logging.getLogger("sentinel")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────
    log.info("=== mView Sentinel starting up ===")

    # DB tables
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)

    # Check frontend
    dist = Path(__file__).parent.parent / "web" / "dist"
    if dist.exists():
        idx = dist / "index.html"
        log.info(f"Frontend dist: FOUND at {dist}  (index.html={'yes' if idx.exists() else 'MISSING'})")
    else:
        log.warning(f"Frontend dist: NOT FOUND at {dist} — API-only mode")

    # Start recorders for all cameras
    from api.database import async_session_maker as AsyncSessionLocal
    from api.models.camera import Camera
    from sqlalchemy.future import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Camera))
        cams = result.scalars().all()
    await recorder_manager.sync_cameras(cams)
    log.info(f"Recorder started for {len(cams)} camera(s).")

    yield

    # ── Shutdown ─────────────────────────────────────────────────────
    recorder_manager.stop_all()
    await engine.dispose()
    log.info("Sentinel shutdown complete.")


app = FastAPI(title="mView Sentinel", version="1.0.0", lifespan=lifespan)

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
    dist = Path(__file__).parent.parent / "web" / "dist"
    return {
        "status": "healthy",
        "version": "1.0.0",
        "frontend_built": dist.exists() and (dist / "index.html").exists(),
        "recording": recorder_manager.status(),
    }


# ── Serve recorded video files ─────────────────────────────────────
RECORDINGS_DIR = Path(os.environ.get("RECORDINGS_DIR", "/mnt/storage/mview/recordings"))


@app.get("/recordings/{camera_id}/{filename}")
async def serve_recording(camera_id: str, filename: str):
    fp = RECORDINGS_DIR / camera_id / filename
    if not fp.exists() or not fp.is_file():
        raise HTTPException(404, "Recording not found")
    return FileResponse(str(fp), media_type="video/mp4",
                        headers={"Accept-Ranges": "bytes"})


# ── Frontend SPA — ALWAYS registered, handles missing build gracefully ──
DIST = Path(__file__).parent.parent / "web" / "dist"
INDEX = DIST / "index.html"

# Mount /assets only if the built assets folder exists
_assets = DIST / "assets"
if _assets.exists():
    app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

FALLBACK_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>mView Sentinel — Building…</title>
<style>
  body { background: #0d1520; color: #00f0d4; font-family: monospace;
         display:flex; align-items:center; justify-content:center; height:100vh; margin:0; flex-direction:column; gap:16px; }
  h1   { font-size:1.4rem; letter-spacing:2px; }
  p    { color:#7e90a8; font-size:0.9rem; max-width:480px; text-align:center; line-height:1.6; }
  code { background:rgba(0,240,212,.1); border:1px solid rgba(0,240,212,.25);
         padding:8px 16px; border-radius:8px; display:block; margin-top:8px; }
</style>
</head>
<body>
  <h1>⬡ mView Sentinel</h1>
  <p>The API is running but the frontend was not compiled into this image.<br>
     Check your Docker build logs, then redeploy:</p>
  <code>cd /opt/mview-sentinel && docker compose up -d --build</code>
  <p style="margin-top:24px">API health: <a style="color:#00f0d4" href="/system/health">/system/health</a></p>
</body>
</html>"""


@app.get("/{full_path:path}")
async def serve_spa(request: Request, full_path: str):
    """Catch-all: serve the React SPA, or a useful fallback if not built yet."""
    # Try to serve a real file from dist first
    if DIST.exists() and full_path:
        candidate = DIST / full_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(str(candidate))

    # Serve index.html for all SPA routes
    if INDEX.exists():
        return FileResponse(str(INDEX))

    # Graceful fallback if the frontend was never built
    return HTMLResponse(FALLBACK_HTML, status_code=200)
