from typing import Optional

from pydantic import BaseModel


class ResourceBase(BaseModel):
    course_id: int
    name: str
    type: str


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    course_id: Optional[int] = None
    name: Optional[str] = None
    type: Optional[str] = None


class ResourceResponse(ResourceBase):
    id: int

    class Config:
        orm_mode = True
