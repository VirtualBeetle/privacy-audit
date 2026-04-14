from datetime import datetime
from pydantic import BaseModel


class CheckinCreateRequest(BaseModel):
    place_name: str
    city: str
    country: str


class CheckinResponse(BaseModel):
    id: str
    user_id: str
    place_name: str
    city: str
    country: str
    checked_in_at: datetime

    model_config = {"from_attributes": True}
