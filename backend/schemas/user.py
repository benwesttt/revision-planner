from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserBase(BaseModel):
    email: str
    name: str


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
