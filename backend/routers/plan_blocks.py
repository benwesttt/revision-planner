from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.course import Course
from models.plan import Plan, PlanBlock
from models.resource import Resource
from models.topic import Topic
from models.user import User
from schemas.plan import PlanBlockCreate, PlanBlockResponse, PlanBlockUpdate

router = APIRouter(prefix="/plan-blocks", tags=["plan-blocks"])


@router.get("/", response_model=List[PlanBlockResponse])
def list_plan_blocks(
    plan_id: Optional[int] = None,
    topic_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(PlanBlock)
        .join(Plan, PlanBlock.plan_id == Plan.id)
        .filter(Plan.user_id == current_user.id)
    )
    if plan_id is not None:
        q = q.filter(PlanBlock.plan_id == plan_id)
    if topic_id is not None:
        q = q.filter(PlanBlock.topic_id == topic_id)
    return q.all()


@router.get("/{block_id}", response_model=PlanBlockResponse)
def get_plan_block(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    block = (
        db.query(PlanBlock)
        .join(Plan, PlanBlock.plan_id == Plan.id)
        .filter(PlanBlock.id == block_id, Plan.user_id == current_user.id)
        .first()
    )
    if not block:
        raise HTTPException(status_code=404, detail="Plan block not found")
    return block


@router.post("/", response_model=PlanBlockResponse, status_code=201)
def create_plan_block(
    payload: PlanBlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = (
        db.query(Plan)
        .filter(Plan.id == payload.plan_id, Plan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    topic = (
        db.query(Topic)
        .join(Course, Topic.course_id == Course.id)
        .filter(Topic.id == payload.topic_id, Course.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    if payload.resource_id is not None:
        resource = (
            db.query(Resource)
            .join(Course, Resource.course_id == Course.id)
            .filter(Resource.id == payload.resource_id, Course.user_id == current_user.id)
            .first()
        )
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

    block = PlanBlock(**payload.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.put("/{block_id}", response_model=PlanBlockResponse)
def update_plan_block(
    block_id: int,
    payload: PlanBlockUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    block = (
        db.query(PlanBlock)
        .join(Plan, PlanBlock.plan_id == Plan.id)
        .filter(PlanBlock.id == block_id, Plan.user_id == current_user.id)
        .first()
    )
    if not block:
        raise HTTPException(status_code=404, detail="Plan block not found")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("resource_id") is not None:
        resource = (
            db.query(Resource)
            .join(Course, Resource.course_id == Course.id)
            .filter(Resource.id == update_data["resource_id"], Course.user_id == current_user.id)
            .first()
        )
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")

    for field, value in update_data.items():
        setattr(block, field, value)
    db.commit()
    db.refresh(block)
    return block


@router.delete("/{block_id}", status_code=204)
def delete_plan_block(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    block = (
        db.query(PlanBlock)
        .join(Plan, PlanBlock.plan_id == Plan.id)
        .filter(PlanBlock.id == block_id, Plan.user_id == current_user.id)
        .first()
    )
    if not block:
        raise HTTPException(status_code=404, detail="Plan block not found")
    db.delete(block)
    db.commit()
