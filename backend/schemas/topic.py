from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class TopicBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    course_id: int
    name: str
    description: Optional[str] = None


class TopicCreate(TopicBase):
    pass


class TopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sequence_order: Optional[int] = None
    status: Literal["not_started", "pre_learned", "taught"] = "not_started"
    expected_taught_by: Optional[date] = None


class TopicResponse(TopicBase):
    id: int
    sequence_order: Optional[int] = None
    status: Literal["not_started", "pre_learned", "taught"] = "not_started"
    expected_taught_by: Optional[date] = None
