from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AssessmentBase(BaseModel):
    course_id: int
    name: str
    type: str
    due_date: Optional[datetime] = None


class AssessmentCreate(AssessmentBase):
    pass


class AssessmentUpdate(BaseModel):
    course_id: Optional[int] = None
    name: Optional[str] = None
    type: Optional[str] = None
    due_date: Optional[datetime] = None


class AssessmentResponse(AssessmentBase):
    id: int

    class Config:
        orm_mode = True
