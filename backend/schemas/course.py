from typing import Optional

from pydantic import BaseModel, ConfigDict


class CourseBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    name: str
    color: str
    is_active: bool = True


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class CourseResponse(CourseBase):
    id: int
