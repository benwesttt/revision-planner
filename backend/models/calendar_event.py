from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    recurring = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="calendar_events")
