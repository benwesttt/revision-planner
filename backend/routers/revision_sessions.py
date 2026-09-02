from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.course import Course
from models.plan import Plan, PlanBlock
from models.revision_session import RevisionSession
from models.topic import Topic
from models.user import User
from schemas.revision_session import (
    RevisionSessionCreate,
    RevisionSessionResponse,
    RevisionSessionStart,
    RevisionSessionStop,
    RevisionSessionUpdate,
)

router = APIRouter(prefix="/revision-sessions", tags=["revision-sessions"])


def _as_aware_utc(value: datetime) -> datetime:
    """Treat a naive datetime as UTC.

    SQLite doesn't persist tzinfo on DateTime(timezone=True) columns, so a
    value that was stored tz-aware can come back naive on read. Postgres
    round-trips tz-aware values correctly, so this is a no-op there.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _owned_topic_or_404(db: Session, topic_id: int, current_user: User) -> Topic:
    topic = (
        db.query(Topic)
        .join(Course, Topic.course_id == Course.id)
        .filter(Topic.id == topic_id, Course.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


def _owned_session_or_404(db: Session, session_id: int, current_user: User) -> RevisionSession:
    session = (
        db.query(RevisionSession)
        .filter(RevisionSession.id == session_id, RevisionSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Revision session not found")
    return session


def _validated_plan_block(
    db: Session, plan_block_id: int, topic_id: int, current_user: User
) -> PlanBlock:
    plan_block = (
        db.query(PlanBlock)
        .join(Plan, PlanBlock.plan_id == Plan.id)
        .filter(PlanBlock.id == plan_block_id, Plan.user_id == current_user.id)
        .first()
    )
    if not plan_block:
        raise HTTPException(status_code=404, detail="Plan block not found")
    if plan_block.topic_id != topic_id:
        raise HTTPException(
            status_code=422, detail="Plan block does not belong to this session's topic"
        )
    return plan_block


def _to_response(session: RevisionSession) -> RevisionSessionResponse:
    response = RevisionSessionResponse.model_validate(session)
    if session.plan_block is not None:
        block = session.plan_block
        response.planned_duration_minutes = round(
            (block.end_time - block.start_time).total_seconds() / 60
        )
    return response


@router.get("/", response_model=List[RevisionSessionResponse])
def list_revision_sessions(
    topic_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(RevisionSession).filter(RevisionSession.user_id == current_user.id)
    if topic_id is not None:
        q = q.filter(RevisionSession.topic_id == topic_id)
    return [_to_response(s) for s in q.all()]


@router.get("/current", response_model=Optional[RevisionSessionResponse])
def get_current_revision_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(RevisionSession)
        .filter(
            RevisionSession.user_id == current_user.id,
            RevisionSession.status == "in_progress",
        )
        .order_by(RevisionSession.started_at.desc())
        .first()
    )
    return _to_response(session) if session else None


@router.post("/start", response_model=RevisionSessionResponse, status_code=201)
def start_revision_session(
    payload: RevisionSessionStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _owned_topic_or_404(db, payload.topic_id, current_user)
    if payload.plan_block_id is not None:
        _validated_plan_block(db, payload.plan_block_id, payload.topic_id, current_user)

    existing = (
        db.query(RevisionSession)
        .filter(
            RevisionSession.user_id == current_user.id,
            RevisionSession.status == "in_progress",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A revision session is already in progress",
        )

    session = RevisionSession(
        user_id=current_user.id,
        topic_id=payload.topic_id,
        plan_block_id=payload.plan_block_id,
        method=payload.method,
        status="in_progress",
        started_at=datetime.now(timezone.utc),
        paused_duration_seconds=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _to_response(session)


@router.patch("/{session_id}/pause", response_model=RevisionSessionResponse)
def pause_revision_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session_or_404(db, session_id, current_user)
    if session.status != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")
    if session.paused_at is not None:
        raise HTTPException(status_code=400, detail="Session is already paused")

    session.paused_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return _to_response(session)


@router.patch("/{session_id}/resume", response_model=RevisionSessionResponse)
def resume_revision_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session_or_404(db, session_id, current_user)
    if session.status != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")
    if session.paused_at is None:
        raise HTTPException(status_code=400, detail="Session is not paused")

    pause_elapsed = datetime.now(timezone.utc) - _as_aware_utc(session.paused_at)
    session.paused_duration_seconds += max(int(pause_elapsed.total_seconds()), 0)
    session.paused_at = None
    db.commit()
    db.refresh(session)
    return _to_response(session)


@router.patch("/{session_id}/stop", response_model=RevisionSessionResponse)
def stop_revision_session(
    session_id: int,
    payload: RevisionSessionStop,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session_or_404(db, session_id, current_user)
    if session.status != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")

    if session.paused_at is not None:
        pause_elapsed = datetime.now(timezone.utc) - _as_aware_utc(session.paused_at)
        session.paused_duration_seconds += max(int(pause_elapsed.total_seconds()), 0)
        session.paused_at = None

    session.status = "completed"
    session.duration_minutes = payload.duration_minutes
    session.confidence = payload.confidence
    session.notes = payload.notes
    if payload.method is not None:
        session.method = payload.method

    db.commit()
    db.refresh(session)
    return _to_response(session)


@router.get("/{session_id}", response_model=RevisionSessionResponse)
def get_revision_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(RevisionSession)
        .filter(RevisionSession.id == session_id, RevisionSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Revision session not found")
    return _to_response(session)


@router.post("/", response_model=RevisionSessionResponse, status_code=201)
def create_revision_session(
    payload: RevisionSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic = (
        db.query(Topic)
        .join(Course, Topic.course_id == Course.id)
        .filter(Topic.id == payload.topic_id, Course.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if payload.plan_block_id is not None:
        _validated_plan_block(db, payload.plan_block_id, payload.topic_id, current_user)

    data = payload.model_dump()
    data['user_id'] = current_user.id
    session = RevisionSession(**data)
    db.add(session)
    db.commit()
    db.refresh(session)
    return _to_response(session)


@router.put("/{session_id}", response_model=RevisionSessionResponse)
def update_revision_session(
    session_id: int,
    payload: RevisionSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(RevisionSession)
        .filter(RevisionSession.id == session_id, RevisionSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Revision session not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    db.commit()
    db.refresh(session)
    return _to_response(session)


@router.delete("/{session_id}", status_code=204)
def delete_revision_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(RevisionSession)
        .filter(RevisionSession.id == session_id, RevisionSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Revision session not found")
    db.delete(session)
    db.commit()
