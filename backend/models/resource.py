from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)

    course = relationship("Course", back_populates="resources")
    topic_resources = relationship("TopicResource", back_populates="resource")
    plan_blocks = relationship("PlanBlock", back_populates="resource")
