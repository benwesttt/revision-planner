from typing import Optional

from pydantic import BaseModel


class CourseBase(BaseModel):
    user_id: int
    name: str
    color: str


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class CourseResponse(CourseBase):
    id: int

    class Config:
        orm_mode = True
