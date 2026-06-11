from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CalendarEventBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    title: str
    start_time: datetime
    end_time: datetime
    recurring: bool = False
    week: str = 'both'


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    recurring: Optional[bool] = None
    week: Optional[str] = None


class CalendarEventResponse(CalendarEventBase):
    id: int
