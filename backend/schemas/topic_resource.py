from pydantic import BaseModel, ConfigDict


class TopicResourceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    topic_id: int
    resource_id: int


class TopicResourceCreate(TopicResourceBase):
    pass


class TopicResourceResponse(TopicResourceBase):
    id: int
