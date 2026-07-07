from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.assessment import Assessment
from models.course import Course
from models.user import User
from schemas.assessment import AssessmentCreate, AssessmentResponse, AssessmentUpdate

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("/", response_model=List[AssessmentResponse])
def list_assessments(
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Assessment)
        .join(Course, Assessment.course_id == Course.id)
        .filter(Course.user_id == current_user.id)
    )
    if course_id is not None:
        q = q.filter(Assessment.course_id == course_id)
    return q.all()


@router.get("/{assessment_id}", response_model=AssessmentResponse)
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = (
        db.query(Assessment)
        .join(Course, Assessment.course_id == Course.id)
        .filter(Assessment.id == assessment_id, Course.user_id == current_user.id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.post("/", response_model=AssessmentResponse, status_code=201)
def create_assessment(
    payload: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = (
        db.query(Course)
        .filter(Course.id == payload.course_id, Course.user_id == current_user.id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    assessment = Assessment(**payload.model_dump())
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.put("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: int,
    payload: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = (
        db.query(Assessment)
        .join(Course, Assessment.course_id == Course.id)
        .filter(Assessment.id == assessment_id, Course.user_id == current_user.id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "course_id" in update_data:
        new_course = (
            db.query(Course)
            .filter(Course.id == update_data["course_id"], Course.user_id == current_user.id)
            .first()
        )
        if not new_course:
            raise HTTPException(status_code=404, detail="Course not found")

    for field, value in update_data.items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.delete("/{assessment_id}", status_code=204)
def delete_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = (
        db.query(Assessment)
        .join(Course, Assessment.course_id == Course.id)
        .filter(Assessment.id == assessment_id, Course.user_id == current_user.id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    db.delete(assessment)
    db.commit()
