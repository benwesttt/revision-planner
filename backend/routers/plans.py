from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.plan import Plan
from schemas.plan import PlanCreate, PlanResponse, PlanUpdate

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("/", response_model=List[PlanResponse])
def list_plans(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Plan)
    if user_id is not None:
        q = q.filter(Plan.user_id == user_id)
    return q.all()


@router.get("/{plan_id}", response_model=PlanResponse)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.post("/", response_model=PlanResponse, status_code=201)
def create_plan(payload: PlanCreate, db: Session = Depends(get_db)):
    plan = Plan(**payload.dict())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/{plan_id}", response_model=PlanResponse)
def update_plan(plan_id: int, payload: PlanUpdate, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=204)
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
