from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
        
    # Start the ONVIF auto-discovery background listener
    await onvif_service.start()
    
    yield
    
    # Shutdown logic
    print("Shutting down mView Sentinel API...")
    await onvif_service.stop()
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
