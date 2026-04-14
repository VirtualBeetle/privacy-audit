from datetime import datetime
from pydantic import BaseModel


class UserPublic(BaseModel):
    id: str
    email: str
    username: str
    full_name: str | None
    bio: str | None
    profile_picture_url: str | None
    location: str | None
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    bio: str | None = None
    profile_picture_url: str | None = None
    location: str | None = None
