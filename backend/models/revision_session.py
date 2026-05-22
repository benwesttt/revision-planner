from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class RevisionSession(Base):
    __tablename__ = "revision_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    method = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    confidence = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="revision_sessions")
    topic = relationship("Topic", back_populates="revision_sessions")
