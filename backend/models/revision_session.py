from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class RevisionSession(Base):
    __tablename__ = "revision_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    method = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    confidence = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    status = Column(String, nullable=False, default="completed", server_default="completed")
    started_at = Column(DateTime(timezone=True), nullable=True)
    paused_at = Column(DateTime(timezone=True), nullable=True)
    paused_duration_seconds = Column(Integer, nullable=False, default=0, server_default="0")
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="revision_sessions")
    topic = relationship("Topic", back_populates="revision_sessions")
