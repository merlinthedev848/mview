import uuid
from sqlalchemy import Column, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from datetime import datetime
from api.database import Base

class Face(Base):
    """
    Stores known faces for Facial Recognition.
    """
    __tablename__ = "faces"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    
    # 512-Dimensional vector from InsightFace
    embedding = Column(Vector(512), nullable=False)
    
    thumbnail_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SemanticEvent(Base):
    """
    Stores video events with their CLIP semantic embeddings for Natural Language Search.
    """
    __tablename__ = "semantic_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    camera_id = Column(String, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    camera = relationship("Camera")
    
    # 512-Dimensional vector from CLIP
    embedding = Column(Vector(512), nullable=False)
    
    object_class = Column(String, nullable=True) # e.g., "person", "car"
    confidence = Column(Float, nullable=True)
    
    thumbnail_path = Column(String, nullable=True)
    clip_path = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
