import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class LocationCheckin(Base):
    __tablename__ = "location_checkins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    place_name = Column(String(255))
    city = Column(String(100))
    country = Column(String(100))
    checked_in_at = Column(DateTime, default=datetime.utcnow)
