import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    bio = Column(String(500))
    profile_picture_url = Column(String(500))
    location = Column(String(255))
    role = Column(String(50), default="user", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
