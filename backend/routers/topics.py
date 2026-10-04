from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.course import Course
from models.plan import PlanBlock
from models.topic import Topic
from models.user import User
from schemas.topic import TopicCreate, TopicResponse, TopicUpdate

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("/", response_model=List[TopicResponse])
def list_topics(
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Topic)
        .join(Course, Topic.course_id == Course.id)
        .filter(Course.user_id == current_user.id)
    )
    if course_id is not None:
        q = q.filter(Topic.course_id == course_id)
    return q.all()


@router.get("/{topic_id}", response_model=TopicResponse)
def get_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic = (
        db.query(Topic)
        .join(Course, Topic.course_id == Course.id)
        .filter(Topic.id == topic_id, Course.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.post("/", response_model=TopicResponse, status_code=201)
def create_topic(
    payload: TopicCreate,
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
    data = payload.model_dump()
    # No explicit sequence_order (or an explicit null): append to the end of
    # the course's sequence. func.max ignores NULLs, so unsequenced topics
    # don't skew the result; an empty or fully-unsequenced course starts at 1.
    if data["sequence_order"] is None:
        highest = (
            db.query(func.max(Topic.sequence_order))
            .filter(Topic.course_id == payload.course_id)
            .scalar()
        )
        data["sequence_order"] = 1 if highest is None else highest + 1
    topic = Topic(**data)
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.put("/{topic_id}", response_model=TopicResponse)
def update_topic(
    topic_id: int,
    payload: TopicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic = (
        db.query(Topic)
        .join(Course, Topic.course_id == Course.id)
        .filter(Topic.id == topic_id, Course.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)
    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/{topic_id}", status_code=204)
def delete_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic = (
        db.query(Topic)
        .join(Course, Topic.course_id == Course.id)
        .filter(Topic.id == topic_id, Course.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    db.query(PlanBlock).filter(PlanBlock.topic_id == topic_id).delete(synchronize_session=False)
    db.delete(topic)
    db.commit()
