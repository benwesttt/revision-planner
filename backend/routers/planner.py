from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from schemas.plan import GeneratePlanRequest, PlanWithBlocksResponse

router = APIRouter(prefix="/planner", tags=["planner"])


@router.post("/generate", response_model=PlanWithBlocksResponse, status_code=201)
def generate_plan(payload: GeneratePlanRequest, db: Session = Depends(get_db)):
    from services.planner import generate_plan as _generate_plan

    try:
        plan = _generate_plan(payload.user_id, payload.start_date, db)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return plan
