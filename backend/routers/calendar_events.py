from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.calendar_event import CalendarEvent
from schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
)

router = APIRouter(prefix="/calendar-events", tags=["calendar-events"])


@router.get("/", response_model=List[CalendarEventResponse])
def list_calendar_events(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(CalendarEvent)
    if user_id is not None:
        q = q.filter(CalendarEvent.user_id == user_id)
    return q.all()


@router.get("/{event_id}", response_model=CalendarEventResponse)
def get_calendar_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    return event


@router.post("/", response_model=CalendarEventResponse, status_code=201)
def create_calendar_event(payload: CalendarEventCreate, db: Session = Depends(get_db)):
    event = CalendarEvent(**payload.dict())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(
    event_id: int, payload: CalendarEventUpdate, db: Session = Depends(get_db)
):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_calendar_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    db.delete(event)
    db.commit()
