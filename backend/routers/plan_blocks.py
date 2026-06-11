from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.plan import PlanBlock
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
    q = db.query(PlanBlock)
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
    block = db.query(PlanBlock).filter(PlanBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Plan block not found")
    return block


@router.post("/", response_model=PlanBlockResponse, status_code=201)
def create_plan_block(
    payload: PlanBlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    block = PlanBlock(**payload.dict())
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
    block = db.query(PlanBlock).filter(PlanBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Plan block not found")
    for field, value in payload.dict(exclude_unset=True).items():
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
    block = db.query(PlanBlock).filter(PlanBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Plan block not found")
    db.delete(block)
    db.commit()
