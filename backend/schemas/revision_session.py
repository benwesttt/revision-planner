from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RevisionSessionBase(BaseModel):
    user_id: int
    topic_id: int
    method: str
    duration_minutes: int
    confidence: Optional[int] = None


class RevisionSessionCreate(RevisionSessionBase):
    pass


class RevisionSessionUpdate(BaseModel):
    method: Optional[str] = None
    duration_minutes: Optional[int] = None
    confidence: Optional[int] = None


class RevisionSessionResponse(RevisionSessionBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
