from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
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
    q = db.query(TopicResource)
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
    tr = db.query(TopicResource).filter(TopicResource.id == topic_resource_id).first()
    if not tr:
        raise HTTPException(status_code=404, detail="TopicResource not found")
    return tr


@router.post("/", response_model=TopicResourceResponse, status_code=201)
def create_topic_resource(
    payload: TopicResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    tr = db.query(TopicResource).filter(TopicResource.id == topic_resource_id).first()
    if not tr:
        raise HTTPException(status_code=404, detail="TopicResource not found")
    db.delete(tr)
    db.commit()
