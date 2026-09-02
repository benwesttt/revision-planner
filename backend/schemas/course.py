from datetime import date
from typing import List, Literal, Optional

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
    mode: Literal["learning", "revision"] = "revision"


class CourseResponse(CourseBase):
    id: int
    mode: Literal["learning", "revision"] = "revision"


class TopicBehindPace(BaseModel):
    id: int
    name: str
    expected_taught_by: Optional[date] = None


class CourseLearningStatusResponse(BaseModel):
    course_id: int
    taught_count: int
    total_count: int
    behind_pace: List[TopicBehindPace] = []
