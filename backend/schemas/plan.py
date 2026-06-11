from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class PlanBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    start_date: date
    end_date: date


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PlanResponse(PlanBase):
    id: int
    generated_at: datetime


class PlanBlockBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan_id: int
    topic_id: int
    start_time: datetime
    end_time: datetime
    method: str
    resource_id: Optional[int] = None
    reason: Optional[str] = None


class PlanBlockCreate(PlanBlockBase):
    pass


class PlanBlockUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    method: Optional[str] = None
    resource_id: Optional[int] = None
    reason: Optional[str] = None


class PlanBlockResponse(PlanBlockBase):
    id: int


class GeneratePlanRequest(BaseModel):
    user_id: int
    start_date: date


class PlanWithBlocksResponse(PlanResponse):
    plan_blocks: List[PlanBlockResponse] = []
