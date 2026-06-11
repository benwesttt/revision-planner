from typing import Optional

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


class TopicResponse(TopicBase):
    id: int
