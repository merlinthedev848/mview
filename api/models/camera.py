import uuid
from sqlalchemy import Column, String, Boolean, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from api.database import Base

class Camera(Base):
    __tablename__ = "cameras"

    # We use string UUIDs if running SQLite for dev, but natively postgres UUIDs in production
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    
    # Streaming URLs
    rtsp_url_main = Column(String, nullable=True)
    rtsp_url_sub = Column(String, nullable=True)
    
    # ONVIF details for Auto-Adopt
    onvif_endpoint = Column(String, nullable=True)
    onvif_username = Column(String, nullable=True)
    onvif_password = Column(String, nullable=True)
    
    # Camera Metadata
    manufacturer = Column(String, nullable=True)
    model = Column(String, nullable=True)
    resolution = Column(String, nullable=True)
    
    # Status & Configuration
    status = Column(String, default="offline") # online, offline, recording, adopting
    enabled = Column(Boolean, default=True)
    auto_adopted = Column(Boolean, default=False)
    config = Column(JSON, nullable=True) # Custom JSON config for overriding global defaults
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
