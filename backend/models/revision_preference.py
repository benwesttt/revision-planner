from sqlalchemy import Column, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from database import Base


class RevisionPreference(Base):
    __tablename__ = "revision_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    preferred_methods = Column(JSON, nullable=True)
    min_session_minutes = Column(Integer, nullable=True)
    max_session_minutes = Column(Integer, nullable=True)
    current_week = Column(String, default='A', nullable=False)

    user = relationship("User", back_populates="revision_preference")
