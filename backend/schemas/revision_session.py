from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class RevisionSessionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class RevisionSessionStart(BaseModel):
    topic_id: int
    method: Optional[str] = None


class RevisionSessionStop(BaseModel):
    duration_minutes: int
    confidence: Optional[int] = None
    notes: Optional[str] = None
    method: Optional[str] = None


class RevisionSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    topic_id: int
    method: Optional[str] = None
    duration_minutes: Optional[int] = None
    confidence: Optional[int] = None
    created_at: datetime

    status: str
    started_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    paused_duration_seconds: int
    notes: Optional[str] = None

    @field_validator("started_at", "paused_at")
    @classmethod
    def _ensure_timezone_aware(cls, value: Optional[datetime]) -> Optional[datetime]:
        # SQLite doesn't persist tzinfo on DateTime(timezone=True) columns,
        # so values can round-trip naive even though they were stored UTC.
        # Postgres round-trips tz-aware values correctly, so this is a no-op there.
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
