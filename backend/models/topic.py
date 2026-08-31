from sqlalchemy import Column, Date, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    sequence_order = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default='not_started', server_default='not_started')
    expected_taught_by = Column(Date, nullable=True)

    course = relationship("Course", back_populates="topics")
    revision_sessions = relationship("RevisionSession", back_populates="topic")
    topic_resources = relationship("TopicResource", back_populates="topic")
    plan_blocks = relationship("PlanBlock", back_populates="topic")
