from typing import Optional

from pydantic import BaseModel


class TopicBase(BaseModel):
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

    class Config:
        orm_mode = True
