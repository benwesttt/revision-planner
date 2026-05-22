from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    due_date = Column(DateTime, nullable=True)

    course = relationship("Course", back_populates="assessments")
