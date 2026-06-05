from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from contextlib import asynccontextmanager

from api.database import engine, Base
from api.routers import cameras
from api.services.onvif_service import onvif_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Starting mView Sentinel API...")
    
    # Create database tables (in dev we use sqlite + auto-create, in prod alembic migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    yield
    
    # Shutdown logic
    print("Shutting down mView Sentinel API...")
    await engine.dispose()


app = FastAPI(
    title="mView Sentinel API",
    description="Core backend for the Ultimate Open-Source Linux NVR",
    version="1.0.0",
    lifespan=lifespan
)

# Allow the React frontend to communicate with the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development. Bind to actual UI domains in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(cameras.router)

@app.get("/system/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "components": {
            "database": "connected",
            "redis": "stub",
            "mqtt": "stub"
        }
    }

# Mount the compiled React Frontend (Static Assets)
# We serve it on the root URL path
frontend_path = os.path.join(os.path.dirname(__file__), "..", "web", "dist")

if os.path.exists(frontend_path):
    # Serve static files (assets, js, css)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")
    
    # Catch-all to serve index.html for React Router compatibility
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        path = os.path.join(frontend_path, full_path)
        if os.path.exists(path) and os.path.isfile(path):
            return FileResponse(path)
        return FileResponse(os.path.join(frontend_path, "index.html"))
