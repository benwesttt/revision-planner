from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.assessment import Assessment
from models.course import Course
from models.plan import PlanBlock
from models.resource import Resource
from models.revision_session import RevisionSession
from models.topic import Topic
from models.topic_resource import TopicResource
from schemas.course import CourseCreate, CourseResponse, CourseUpdate

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=List[CourseResponse])
def list_courses(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Course)
    if user_id is not None:
        q = q.filter(Course.user_id == user_id)
    return q.all()


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("/", response_model=CourseResponse, status_code=201)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    course = Course(**payload.dict())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(course_id: int, payload: CourseUpdate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
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
