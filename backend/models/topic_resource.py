from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from database import Base


class TopicResource(Base):
    __tablename__ = "topic_resources"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)

    topic = relationship("Topic", back_populates="topic_resources")
    resource = relationship("Resource", back_populates="topic_resources")
