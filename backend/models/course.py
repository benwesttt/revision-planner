from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, nullable=False)

    user = relationship("User", back_populates="courses")
    topics = relationship("Topic", back_populates="course")
    assessments = relationship("Assessment", back_populates="course")
    resources = relationship("Resource", back_populates="course")
