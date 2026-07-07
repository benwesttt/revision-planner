from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.course import Course
from models.resource import Resource
from models.topic import Topic
from models.topic_resource import TopicResource
from models.user import User
from schemas.topic_resource import TopicResourceCreate, TopicResourceResponse

router = APIRouter(prefix="/topic-resources", tags=["topic-resources"])


@router.get("/", response_model=List[TopicResourceResponse])
def list_topic_resources(
    topic_id: Optional[int] = None,
    resource_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(TopicResource)
        .join(Topic, TopicResource.topic_id == Topic.id)
        .join(Course, Topic.course_id == Course.id)
        .filter(Course.user_id == current_user.id)
    )
    if topic_id is not None:
        q = q.filter(TopicResource.topic_id == topic_id)
    if resource_id is not None:
        q = q.filter(TopicResource.resource_id == resource_id)
    return q.all()


@router.get("/{topic_resource_id}", response_model=TopicResourceResponse)
def get_topic_resource(
    topic_resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tr = (
        db.query(TopicResource)
        .join(Topic, TopicResource.topic_id == Topic.id)
        .join(Course, Topic.course_id == Course.id)
        .filter(TopicResource.id == topic_resource_id, Course.user_id == current_user.id)
        .first()
    )
    if not tr:
        raise HTTPException(status_code=404, detail="TopicResource not found")
    return tr


@router.post("/", response_model=TopicResourceResponse, status_code=201)
def create_topic_resource(
    payload: TopicResourceCreate,
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

    resource = (
        db.query(Resource)
        .join(Course, Resource.course_id == Course.id)
        .filter(Resource.id == payload.resource_id, Course.user_id == current_user.id)
        .first()
    )
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    tr = TopicResource(**payload.model_dump())
    db.add(tr)
    db.commit()
    db.refresh(tr)
    return tr


@router.delete("/{topic_resource_id}", status_code=204)
def delete_topic_resource(
    topic_resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tr = (
        db.query(TopicResource)
        .join(Topic, TopicResource.topic_id == Topic.id)
        .join(Course, Topic.course_id == Course.id)
        .filter(TopicResource.id == topic_resource_id, Course.user_id == current_user.id)
        .first()
    )
    if not tr:
        raise HTTPException(status_code=404, detail="TopicResource not found")
    db.delete(tr)
    db.commit()
