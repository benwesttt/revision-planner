from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.revision_session import RevisionSession
from schemas.revision_session import (
    RevisionSessionCreate,
    RevisionSessionResponse,
    RevisionSessionUpdate,
)

router = APIRouter(prefix="/revision-sessions", tags=["revision-sessions"])


@router.get("/", response_model=List[RevisionSessionResponse])
def list_revision_sessions(
    user_id: Optional[int] = None,
    topic_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(RevisionSession)
    if user_id is not None:
        q = q.filter(RevisionSession.user_id == user_id)
    if topic_id is not None:
        q = q.filter(RevisionSession.topic_id == topic_id)
    return q.all()


@router.get("/{session_id}", response_model=RevisionSessionResponse)
def get_revision_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(RevisionSession).filter(RevisionSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Revision session not found")
    return session


@router.post("/", response_model=RevisionSessionResponse, status_code=201)
def create_revision_session(
    payload: RevisionSessionCreate, db: Session = Depends(get_db)
):
    session = RevisionSession(**payload.dict())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.put("/{session_id}", response_model=RevisionSessionResponse)
def update_revision_session(
    session_id: int, payload: RevisionSessionUpdate, db: Session = Depends(get_db)
):
    session = db.query(RevisionSession).filter(RevisionSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Revision session not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(session, field, value)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
def delete_revision_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(RevisionSession).filter(RevisionSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Revision session not found")
    db.delete(session)
    db.commit()
