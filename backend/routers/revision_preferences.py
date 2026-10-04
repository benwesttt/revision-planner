from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from auth import get_current_user
from database import get_db
from models.revision_preference import RevisionPreference
from models.user import User
from services.week import apply_current_week, effective_current_week
from schemas.revision_preference import (
    RevisionPreferenceCreate,
    RevisionPreferenceResponse,
    RevisionPreferenceUpdate,
)

router = APIRouter(prefix="/revision-preferences", tags=["revision-preferences"])


def _to_response(pref: RevisionPreference) -> RevisionPreferenceResponse:
    # Report the calendar-derived week without writing it back to the row.
    response = RevisionPreferenceResponse.model_validate(pref)
    return response.model_copy(
        update={'current_week': effective_current_week(pref, date.today())}
    )


@router.get("/", response_model=List[RevisionPreferenceResponse])
def list_revision_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefs = (
        db.query(RevisionPreference)
        .filter(RevisionPreference.user_id == current_user.id)
        .all()
    )
    return [_to_response(pref) for pref in prefs]


@router.get("/{preference_id}", response_model=RevisionPreferenceResponse)
def get_revision_preference(
    preference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = (
        db.query(RevisionPreference)
        .filter(
            RevisionPreference.id == preference_id,
            RevisionPreference.user_id == current_user.id,
        )
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Revision preference not found")
    return _to_response(pref)


@router.post("/", response_model=RevisionPreferenceResponse, status_code=201)
def create_revision_preference(
    payload: RevisionPreferenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={'current_week'})
    data['user_id'] = current_user.id
    pref = RevisionPreference(**data)
    # New rows always get an anchor (default 'A' this week), so they advance on their own.
    apply_current_week(pref, payload.current_week, date.today())
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
    return _to_response(pref)


@router.put("/{preference_id}", response_model=RevisionPreferenceResponse)
def update_revision_preference(
    preference_id: int,
    payload: RevisionPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = (
        db.query(RevisionPreference)
        .filter(
            RevisionPreference.id == preference_id,
            RevisionPreference.user_id == current_user.id,
        )
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Revision preference not found")
    changes = payload.model_dump(exclude_unset=True)
    week = changes.pop('current_week', None)
    for field, value in changes.items():
        setattr(pref, field, value)
    if week is not None:
        apply_current_week(pref, week, date.today())
    flag_modified(pref, 'preferred_methods')
    db.commit()
    db.refresh(pref)
    return _to_response(pref)


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
    if not pref:
        pref = RevisionPreference(user_id=current_user.id)
        db.add(pref)
    apply_current_week(pref, current_week, date.today())
    db.commit()
    db.refresh(pref)
    return _to_response(pref)


@router.delete("/{preference_id}", status_code=204)
def delete_revision_preference(
    preference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = (
        db.query(RevisionPreference)
        .filter(
            RevisionPreference.id == preference_id,
            RevisionPreference.user_id == current_user.id,
        )
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Revision preference not found")
    db.delete(pref)
    db.commit()
