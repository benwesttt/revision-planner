from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.revision_preference import RevisionPreference
from schemas.revision_preference import (
    RevisionPreferenceCreate,
    RevisionPreferenceResponse,
    RevisionPreferenceUpdate,
)

router = APIRouter(prefix="/revision-preferences", tags=["revision-preferences"])


@router.get("/", response_model=List[RevisionPreferenceResponse])
def list_revision_preferences(
    user_id: Optional[int] = None, db: Session = Depends(get_db)
):
    q = db.query(RevisionPreference)
    if user_id is not None:
        q = q.filter(RevisionPreference.user_id == user_id)
    return q.all()


@router.get("/{preference_id}", response_model=RevisionPreferenceResponse)
def get_revision_preference(preference_id: int, db: Session = Depends(get_db)):
    pref = (
        db.query(RevisionPreference)
        .filter(RevisionPreference.id == preference_id)
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Revision preference not found")
    return pref


@router.post("/", response_model=RevisionPreferenceResponse, status_code=201)
def create_revision_preference(
    payload: RevisionPreferenceCreate, db: Session = Depends(get_db)
):
    pref = RevisionPreference(**payload.dict())
    db.add(pref)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Revision preference already exists for this user",
        )
    db.refresh(pref)
    return pref


@router.put("/{preference_id}", response_model=RevisionPreferenceResponse)
def update_revision_preference(
    preference_id: int,
    payload: RevisionPreferenceUpdate,
    db: Session = Depends(get_db),
):
    pref = (
        db.query(RevisionPreference)
        .filter(RevisionPreference.id == preference_id)
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Revision preference not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(pref, field, value)
    db.commit()
    db.refresh(pref)
    return pref


@router.patch("/current-week", response_model=RevisionPreferenceResponse)
def set_current_week(
    user_id: int = Query(...),
    current_week: str = Query(..., regex="^[AB]$"),
    db: Session = Depends(get_db),
):
    pref = (
        db.query(RevisionPreference)
        .filter(RevisionPreference.user_id == user_id)
        .first()
    )
    if pref:
        pref.current_week = current_week
    else:
        pref = RevisionPreference(user_id=user_id, current_week=current_week)
        db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


@router.delete("/{preference_id}", status_code=204)
def delete_revision_preference(preference_id: int, db: Session = Depends(get_db)):
    pref = (
        db.query(RevisionPreference)
        .filter(RevisionPreference.id == preference_id)
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Revision preference not found")
    db.delete(pref)
    db.commit()
