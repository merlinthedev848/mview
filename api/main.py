from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from contextlib import asynccontextmanager
import os
import logging
import asyncio
from pathlib import Path

from api.database import engine, Base
from api.models.user import User
from api.routers import cameras, recordings, events, system, auth, users, maps
from api.services.recorder import recorder_manager
from api.services.local_core import local_snapshot_worker
from api.config import settings
from jose import jwt, JWTError

log = logging.getLogger("sentinel")

# Fetch JWT config directly for the middleware
SECRET_KEY = settings.jwt_secret
ALGORITHM = settings.jwt_algorithm


async def retention_worker():
    """Background task to delete recordings older than settings.retention_days."""
    log.info("Starting retention worker background loop...")
    while True:
        try:
            retention_days = settings.retention_days
            if retention_days and retention_days > 0:
                from api.services.recorder import purge_old_recordings
                purge_old_recordings(retention_days)
        except Exception as e:
            log.error(f"Error in retention worker: {e}")
        
        # Run every 12 hours (43200 seconds)
        await asyncio.sleep(12 * 3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────
    log.info("=== mView Sentinel starting up ===")

    # DB tables
    from sqlalchemy import text, select
    async with engine.begin() as conn:
        if engine.url.get_backend_name().startswith("postgresql"):
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)

    # Seed a default admin user the first time the database starts.
    from api.database import async_session_maker as AsyncSessionLocal
    from api.routers.auth import get_password_hash
    async with AsyncSessionLocal() as db:
        existing_users = await db.execute(select(User.id).limit(1))
        if existing_users.scalar_one_or_none() is None:
            admin_password = os.getenv("ADMIN_PASSWORD", settings.default_admin_password)
            db.add(User(
                username=settings.default_admin_username,
                hashed_password=get_password_hash(admin_password),
                role="admin",
                permissions=["live", "playback", "events", "settings"],
            ))
            await db.commit()
            log.info("Seeded default admin user.")

    # Check frontend
    dist = Path(__file__).parent.parent / "web" / "dist"
    if dist.exists():
        idx = dist / "index.html"
        log.info(f"Frontend dist: FOUND at {dist}  (index.html={'yes' if idx.exists() else 'MISSING'})")
    else:
        log.warning(f"Frontend dist: NOT FOUND at {dist} — API-only mode")

    # Start recorders for all cameras
    from api.models.camera import Camera
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Camera))
        cams = result.scalars().all()
    await recorder_manager.sync_cameras(cams)
    log.info(f"Recorder started for {len(cams)} camera(s).")

    # Start retention worker
    background_tasks = [
        asyncio.create_task(local_snapshot_worker(), name="local-core-snapshot"),
        asyncio.create_task(retention_worker(), name="retention-worker"),
    ]
    from api.services.event_processor import process_mqtt_events
    background_tasks.append(asyncio.create_task(process_mqtt_events(), name="mqtt-event-processor"))

    try:
        yield
    finally:
        for task in background_tasks:
            task.cancel()
        await asyncio.gather(*background_tasks, return_exceptions=True)

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

from fastapi.responses import JSONResponse

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path

    if request.method == "OPTIONS":
        return await call_next(request)

    path_permissions = [
        ("/cameras", {"live", "settings"}),
        ("/recordings-list", {"playback"}),
        ("/recordings", {"playback"}),
        ("/events", {"events"}),
        ("/system", {"settings"}),
        ("/users", {"settings"}),
    ]

    required = None
    for prefix, permissions in path_permissions:
        if path.startswith(prefix):
            required = permissions
            break

    if required and not path.startswith("/system/health"):
        auth_header = request.headers.get("Authorization")
        token = None
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        elif path.startswith("/recordings/") or path == "/system/live":
            token = request.query_params.get("token")

        if not token:
            return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if not payload.get("sub"):
                return JSONResponse(status_code=401, content={"detail": "Invalid token payload"})
            if payload.get("role") != "admin":
                user_permissions = set(payload.get("permissions") or [])
                if not user_permissions.intersection(required):
                    return JSONResponse(status_code=403, content={"detail": "Permission denied"})
        except JWTError:
            return JSONResponse(status_code=401, content={"detail": "Invalid token"})
            
    return await call_next(request)

# ── API routers ────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(cameras.router)
app.include_router(recordings.router)
app.include_router(events.router)
app.include_router(system.router)
app.include_router(users.router)
app.include_router(maps.router)


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
RECORDINGS_DIR = Path(settings.recordings_dir).resolve()


@app.get("/recordings/{camera_id}/{filename}")
async def serve_recording(camera_id: str, filename: str, request: Request):
    fp = (RECORDINGS_DIR / camera_id / filename).resolve()
    if RECORDINGS_DIR not in fp.parents:
        raise HTTPException(400, "Invalid recording path")
    if not fp.exists() or not fp.is_file():
        raise HTTPException(404, "Recording not found")
    file_size = fp.stat().st_size
    range_header = request.headers.get("range")
    if range_header:
        start = 0
        end = file_size - 1
        try:
            requested = range_header.replace("bytes=", "", 1)
            start_text, end_text = requested.split("-", 1)
            if start_text:
                start = int(start_text)
            if end_text:
                end = min(int(end_text), file_size - 1)
        except ValueError:
            raise HTTPException(416, "Invalid range")
        if start > end or start >= file_size:
            raise HTTPException(416, "Requested range not satisfiable")

        def iter_file():
            with open(fp, "rb") as fh:
                fh.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk = fh.read(min(1024 * 1024, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Content-Length": str(end - start + 1),
            },
        )
    return FileResponse(str(fp), media_type="video/mp4",
                        headers={"Accept-Ranges": "bytes"})


# ── Frontend SPA — ALWAYS registered, handles missing build gracefully ──
DIST = Path(__file__).parent.parent / "web" / "dist"
INDEX = DIST / "index.html"

# Mount /assets only if the built assets folder exists
_assets = DIST / "assets"
if _assets.exists():
    app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

app.mount("/static/maps", StaticFiles(directory=maps.UPLOAD_DIR), name="maps")

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
