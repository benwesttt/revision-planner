from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    user = relationship("User", back_populates="plans")
    plan_blocks = relationship("PlanBlock", back_populates="plan")


class PlanBlock(Base):
    __tablename__ = "plan_blocks"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    method = Column(String, nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=True)
    reason = Column(String, nullable=True)

    plan = relationship("Plan", back_populates="plan_blocks")
    topic = relationship("Topic", back_populates="plan_blocks")
    resource = relationship("Resource", back_populates="plan_blocks")
