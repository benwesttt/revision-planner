from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class RevisionPreferenceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    preferred_methods: Optional[List[str]] = None
    min_session_minutes: Optional[int] = None
    max_session_minutes: Optional[int] = None
    current_week: str = 'A'
    daily_hours_target: Optional[int] = None


class RevisionPreferenceCreate(RevisionPreferenceBase):
    # Create/Update re-anchor the week, so reject anything that isn't A or B.
    current_week: str = Field(default='A', pattern="^[AB]$")


class RevisionPreferenceUpdate(BaseModel):
    preferred_methods: Optional[List[str]] = None
    min_session_minutes: Optional[int] = None
    max_session_minutes: Optional[int] = None
    current_week: Optional[str] = Field(default=None, pattern="^[AB]$")
    daily_hours_target: Optional[int] = None


class RevisionPreferenceResponse(RevisionPreferenceBase):
    id: int
    week_a_anchor: Optional[date] = None
