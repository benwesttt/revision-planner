from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from auth import get_current_user
from database import get_db
from models.revision_preference import RevisionPreference
from models.user import User
from schemas.revision_preference import (
    RevisionPreferenceCreate,
    RevisionPreferenceResponse,
    RevisionPreferenceUpdate,
)

router = APIRouter(prefix="/revision-preferences", tags=["revision-preferences"])


@router.get("/", response_model=List[RevisionPreferenceResponse])
def list_revision_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(RevisionPreference)
        .filter(RevisionPreference.user_id == current_user.id)
        .all()
    )


@router.get("/{preference_id}", response_model=RevisionPreferenceResponse)
def get_revision_preference(
    preference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    payload: RevisionPreferenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump()
    data['user_id'] = current_user.id
    pref = RevisionPreference(**data)
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
    current_user: User = Depends(get_current_user),
):
    pref = (
        db.query(RevisionPreference)
        .filter(RevisionPreference.id == preference_id)
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Revision preference not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pref, field, value)
    flag_modified(pref, 'preferred_methods')
    db.commit()
    db.refresh(pref)
    return pref


@router.patch("/current-week", response_model=RevisionPreferenceResponse)
def set_current_week(
    current_week: str = Query(..., pattern="^[AB]$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = (
        db.query(RevisionPreference)
        .filter(RevisionPreference.user_id == current_user.id)
        .first()
    )
    if pref:
        pref.current_week = current_week
    else:
        pref = RevisionPreference(user_id=current_user.id, current_week=current_week)
        db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


@router.delete("/{preference_id}", status_code=204)
def delete_revision_preference(
    preference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = (
        db.query(RevisionPreference)
        .filter(RevisionPreference.id == preference_id)
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Revision preference not found")
    db.delete(pref)
    db.commit()
