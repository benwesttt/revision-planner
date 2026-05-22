from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.topic import Topic
from schemas.topic import TopicCreate, TopicResponse, TopicUpdate

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("/", response_model=List[TopicResponse])
def list_topics(course_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Topic)
    if course_id is not None:
        q = q.filter(Topic.course_id == course_id)
    return q.all()


@router.get("/{topic_id}", response_model=TopicResponse)
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.post("/", response_model=TopicResponse, status_code=201)
def create_topic(payload: TopicCreate, db: Session = Depends(get_db)):
    topic = Topic(**payload.dict())
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.put("/{topic_id}", response_model=TopicResponse)
def update_topic(topic_id: int, payload: TopicUpdate, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(topic, field, value)
    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/{topic_id}", status_code=204)
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    db.delete(topic)
    db.commit()
