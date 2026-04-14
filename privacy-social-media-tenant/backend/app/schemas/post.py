from datetime import datetime
from pydantic import BaseModel


class PostCreateRequest(BaseModel):
    content: str
    image_url: str | None = None
    visibility: str = "public"  # public | friends | private


class PostResponse(BaseModel):
    id: str
    user_id: str
    username: str
    full_name: str | None
    profile_picture_url: str | None
    content: str
    image_url: str | None
    visibility: str
    like_count: int
    comment_count: int
    liked_by_me: bool
    created_at: datetime

    model_config = {"from_attributes": True}
