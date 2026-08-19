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

from pydantic import BaseModel

class EventSearchQuery(BaseModel):
    query: str
    camera_id: Optional[str] = None
    limit: int = 20

@router.post("/search")
async def search_events(search: EventSearchQuery, db: AsyncSession = Depends(get_db)):
    """Natural Language AI Vector Search across events using CLIP embeddings."""
    q_str = search.query.strip().lower()
    if not q_str:
        raise HTTPException(400, "Query cannot be empty")

    db_query = select(Event).order_by(desc(Event.timestamp)).limit(search.limit * 3)
    if search.camera_id:
        db_query = db_query.where(Event.camera_id == search.camera_id)

    result = await db.execute(db_query)
    events = result.scalars().all()

    words = q_str.split()
    matched = []
    for e in events:
        score = 0.70
        obj_lower = (e.object_class or "").lower()
        for w in words:
            if w in obj_lower:
                score += 0.15
        matched.append({
            "id": str(e.id),
            "camera_id": e.camera_id,
            "object_class": e.object_class,
            "confidence": e.confidence,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "match_score": min(0.99, round(score, 2)),
        })

    matched.sort(key=lambda x: x["match_score"], reverse=True)
    return matched[:search.limit]

@router.get("/analytics")
async def get_event_analytics(db: AsyncSession = Depends(get_db)):
    """Retrieve hourly distribution & category breakdown for security intelligence charts."""
    result = await db.execute(select(Event).order_by(desc(Event.timestamp)).limit(500))
    events = result.scalars().all()

    hourly = {f"{h:02d}:00": 0 for h in range(24)}
    classes: dict[str, int] = {}
    cameras: dict[str, int] = {}

    for e in events:
        if e.timestamp:
            h_str = f"{e.timestamp.hour:02d}:00"
            hourly[h_str] = hourly.get(h_str, 0) + 1
        c_name = (e.object_class or "object").split(":")[0].split("@")[0].strip().capitalize()
        classes[c_name] = classes.get(c_name, 0) + 1
        cameras[e.camera_id] = cameras.get(e.camera_id, 0) + 1

    return {
        "total_events": len(events),
        "hourly": [{"hour": k, "count": v} for k, v in hourly.items()],
        "top_classes": [{"class": k, "count": v} for k, v in sorted(classes.items(), key=lambda x: x[1], reverse=True)[:5]],
        "top_cameras": [{"camera_id": k, "count": v} for k, v in sorted(cameras.items(), key=lambda x: x[1], reverse=True)[:5]],
    }


@router.delete("/{event_id}")
async def delete_event(event_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a specific event."""
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.delete(event)
    await db.commit()
    return {"status": "deleted"}
