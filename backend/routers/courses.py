from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.assessment import Assessment
from models.course import Course
from models.plan import PlanBlock
from models.resource import Resource
from models.revision_session import RevisionSession
from models.topic import Topic
from models.topic_resource import TopicResource
from models.user import User
from schemas.course import (
    CourseCreate,
    CourseLearningStatusResponse,
    CourseResponse,
    CourseUpdate,
)

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=List[CourseResponse])
def list_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Course).filter(Course.user_id == current_user.id).all()


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = (
        db.query(Course)
        .filter(Course.id == course_id, Course.user_id == current_user.id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.get("/{course_id}/learning-status", response_model=CourseLearningStatusResponse)
def get_course_learning_status(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = (
        db.query(Course)
        .filter(Course.id == course_id, Course.user_id == current_user.id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.mode != 'learning':
        raise HTTPException(
            status_code=422, detail="This endpoint only applies to Learning Mode courses"
        )

    topics = db.query(Topic).filter(Topic.course_id == course_id).all()
    today = date.today()
    behind_pace = [
        t for t in topics
        if t.status != 'taught' and t.expected_taught_by is not None and t.expected_taught_by <= today
    ]

    return CourseLearningStatusResponse(
        course_id=course.id,
        taught_count=sum(1 for t in topics if t.status == 'taught'),
        total_count=len(topics),
        behind_pace=[
            {"id": t.id, "name": t.name, "expected_taught_by": t.expected_taught_by}
            for t in behind_pace
        ],
    )


@router.post("/", response_model=CourseResponse, status_code=201)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump()
    data['user_id'] = current_user.id
    course = Course(**data)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = (
        db.query(Course)
        .filter(Course.id == course_id, Course.user_id == current_user.id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = (
        db.query(Course)
        .filter(Course.id == course_id, Course.user_id == current_user.id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    topic_ids = [
        t.id for t in db.query(Topic.id).filter(Topic.course_id == course_id).all()
    ]

    if topic_ids:
        db.query(TopicResource).filter(
            TopicResource.topic_id.in_(topic_ids)
        ).delete(synchronize_session=False)
        db.query(RevisionSession).filter(
            RevisionSession.topic_id.in_(topic_ids)
        ).delete(synchronize_session=False)
        db.query(PlanBlock).filter(
            PlanBlock.topic_id.in_(topic_ids)
        ).delete(synchronize_session=False)
        db.query(Topic).filter(
            Topic.course_id == course_id
        ).delete(synchronize_session=False)

    db.query(Assessment).filter(
        Assessment.course_id == course_id
    ).delete(synchronize_session=False)

    db.query(Resource).filter(
        Resource.course_id == course_id
    ).delete(synchronize_session=False)

    db.delete(course)
    db.commit()
