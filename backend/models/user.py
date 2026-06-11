from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    courses = relationship("Course", back_populates="user")
    calendar_events = relationship("CalendarEvent", back_populates="user")
    revision_sessions = relationship("RevisionSession", back_populates="user")
    revision_preference = relationship(
        "RevisionPreference", back_populates="user", uselist=False
    )
    plans = relationship("Plan", back_populates="user")
