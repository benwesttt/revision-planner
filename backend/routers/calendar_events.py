from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.calendar_event import CalendarEvent
from models.user import User
from schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
)

router = APIRouter(prefix="/calendar-events", tags=["calendar-events"])


@router.get("/", response_model=List[CalendarEventResponse])
def list_calendar_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id).all()


@router.get("/{event_id}", response_model=CalendarEventResponse)
def get_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    return event


@router.post("/", response_model=CalendarEventResponse, status_code=201)
def create_calendar_event(
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump()
    data['user_id'] = current_user.id
    event = CalendarEvent(**data)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(
    event_id: int,
    payload: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    db.delete(event)
    db.commit()
