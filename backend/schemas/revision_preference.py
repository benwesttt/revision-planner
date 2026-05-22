from typing import List, Optional

from pydantic import BaseModel


class RevisionPreferenceBase(BaseModel):
    user_id: int
    preferred_methods: Optional[List[str]] = None
    min_session_minutes: Optional[int] = None
    max_session_minutes: Optional[int] = None


class RevisionPreferenceCreate(RevisionPreferenceBase):
    pass


class RevisionPreferenceUpdate(BaseModel):
    preferred_methods: Optional[List[str]] = None
    min_session_minutes: Optional[int] = None
    max_session_minutes: Optional[int] = None


class RevisionPreferenceResponse(RevisionPreferenceBase):
    id: int

    class Config:
        orm_mode = True
