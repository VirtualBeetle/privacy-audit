from datetime import datetime
from pydantic import BaseModel


class CommentCreateRequest(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    username: str
    full_name: str | None
    profile_picture_url: str | None
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
