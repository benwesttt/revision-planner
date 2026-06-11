from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class RevisionPreferenceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    preferred_methods: Optional[List[str]] = None
    min_session_minutes: Optional[int] = None
    max_session_minutes: Optional[int] = None
    current_week: str = 'A'
    daily_hours_target: Optional[int] = None


class RevisionPreferenceCreate(RevisionPreferenceBase):
    pass


class RevisionPreferenceUpdate(BaseModel):
    preferred_methods: Optional[List[str]] = None
    min_session_minutes: Optional[int] = None
    max_session_minutes: Optional[int] = None
    current_week: Optional[str] = None
    daily_hours_target: Optional[int] = None


class RevisionPreferenceResponse(RevisionPreferenceBase):
    id: int
