from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.user import User
from schemas.plan import GeneratePlanRequest, PlanWithBlocksResponse

router = APIRouter(prefix="/planner", tags=["planner"])


@router.post("/generate", response_model=PlanWithBlocksResponse, status_code=201)
def generate_plan(
    payload: GeneratePlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from services.planner import generate_plan as _generate_plan

    try:
        plan, warnings = _generate_plan(current_user.id, payload.start_date, db)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    response = PlanWithBlocksResponse.model_validate(plan)
    response.warnings = warnings
    return response
