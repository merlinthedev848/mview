from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from api.database import get_db
from api.models.ai import SemanticEvent as Event
from typing import List, Optional
import datetime

router = APIRouter(prefix="/events", tags=["events"])

@router.get("")
async def get_events(
    camera_id: Optional[str] = None,
    object_class: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve AI events with optional filtering."""
    query = select(Event).order_by(desc(Event.timestamp)).limit(limit)
    
    if camera_id:
        query = query.where(Event.camera_id == camera_id)
    if object_class:
        query = query.where(Event.object_class == object_class)
        
    result = await db.execute(query)
    events = result.scalars().all()
    
    return [
        {
            "id": str(e.id),
            "camera_id": e.camera_id,
            "object_class": e.object_class,
            "confidence": e.confidence,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None
        }
        for e in events
    ]

@router.delete("/{event_id}")
async def delete_event(event_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a specific event."""
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.delete(event)
    await db.commit()
    return {"status": "deleted"}
