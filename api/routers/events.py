from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from api.database import get_db
from api.models.ai import SemanticEvent as Event
from api.models.operations import EventReview
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
    review_result = await db.execute(select(EventReview).where(EventReview.event_id.in_([e.id for e in events]))) if events else None
    reviews = {review.event_id: review for review in review_result.scalars().all()} if review_result else {}
    
    return [
        {
            "id": str(e.id),
            "camera_id": e.camera_id,
            "object_class": e.object_class,
            "confidence": e.confidence,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "review": {
                "verdict": reviews[e.id].verdict,
                "note": reviews[e.id].note or "",
                "tags": (reviews[e.id].config or {}).get("tags", []),
            } if e.id in reviews else None,
        }
        for e in events
    ]

_ANALYTICS_CACHE = {"timestamp": 0.0, "data": None}

@router.get("/analytics")
async def get_event_analytics(db: AsyncSession = Depends(get_db)):
    """Retrieve 24h event analytics and category breakdown."""
    import time
    now_ts = time.time()
    if _ANALYTICS_CACHE["data"] is not None and (now_ts - _ANALYTICS_CACHE["timestamp"]) < 15.0:
        return _ANALYTICS_CACHE["data"]

    now = datetime.datetime.now(datetime.timezone.utc)
    since = now - datetime.timedelta(hours=24)
    
    query = select(Event).where(Event.timestamp >= since).order_by(Event.timestamp.asc())
    result = await db.execute(query)
    events = result.scalars().all()
    
    hourly_counts = { (now - datetime.timedelta(hours=i)).strftime("%H:00"): 0 for i in range(23, -1, -1) }
    class_counts = {}
    
    for e in events:
        if e.timestamp:
            h_str = e.timestamp.strftime("%H:00")
            if h_str in hourly_counts:
                hourly_counts[h_str] += 1
            else:
                hourly_counts[h_str] = 1
        cls = e.object_class or "other"
        class_counts[cls] = class_counts.get(cls, 0) + 1
        
    hourly = [{"hour": k, "count": v} for k, v in hourly_counts.items()]
    top_classes = [{"class": k, "count": v} for k, v in sorted(class_counts.items(), key=lambda x: x[1], reverse=True)]
    
    payload = {
        "total_events": len(events),
        "hourly": hourly,
        "top_classes": top_classes
    }
    _ANALYTICS_CACHE["timestamp"] = now_ts
    _ANALYTICS_CACHE["data"] = payload
    return payload

from fastapi.responses import FileResponse

@router.get("/{event_id}/thumbnail")
async def get_event_thumbnail(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await db.get(Event, event_id)
    if not event or not event.thumbnail_path or not __import__('os').path.exists(event.thumbnail_path):
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(event.thumbnail_path, media_type="image/jpeg")

@router.delete("/{event_id}")
async def delete_event(event_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a specific event."""
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.delete(event)
    await db.commit()
    return {"status": "deleted"}
