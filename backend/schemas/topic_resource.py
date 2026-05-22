from pydantic import BaseModel


class TopicResourceBase(BaseModel):
    topic_id: int
    resource_id: int


class TopicResourceCreate(TopicResourceBase):
    pass


class TopicResourceResponse(TopicResourceBase):
    id: int

    class Config:
        orm_mode = True
