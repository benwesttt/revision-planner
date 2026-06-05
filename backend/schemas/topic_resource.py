from pydantic import BaseModel, ConfigDict


class TopicResourceBase(BaseModel):
    topic_id: int
    resource_id: int


class TopicResourceCreate(TopicResourceBase):
    pass


class TopicResourceResponse(TopicResourceBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
