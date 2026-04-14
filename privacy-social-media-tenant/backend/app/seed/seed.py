"""Idempotent seeder — safe to run multiple times."""
import logging
from datetime import datetime, timedelta

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models.checkin import LocationCheckin
from app.models.comment import Comment
from app.models.like import Like
from app.models.post import Post
from app.models.user import User

logger = logging.getLogger(__name__)
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _upsert_user(db: Session, email: str, username: str, password: str, role: str, **kwargs) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    user = User(
        email=email,
        username=username,
        password_hash=pwd.hash(password),
        role=role,
        **kwargs,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _upsert_post(db: Session, user_id, content: str, visibility: str = "public", days_ago: int = 0) -> Post:
    existing = db.query(Post).filter(Post.user_id == user_id, Post.content == content).first()
    if existing:
        return existing
    post = Post(
        user_id=user_id,
        content=content,
        visibility=visibility,
        created_at=datetime.utcnow() - timedelta(days=days_ago),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def _upsert_checkin(db: Session, user_id, place_name: str, city: str, country: str) -> None:
    if db.query(LocationCheckin).filter(LocationCheckin.user_id == user_id, LocationCheckin.place_name == place_name).first():
        return
    db.add(LocationCheckin(user_id=user_id, place_name=place_name, city=city, country=country))
    db.commit()


def run(db: Session) -> None:
    logger.info("[seed] running...")

    # Admin
    _upsert_user(db, "admin@socialdemo.com", "admin", "admin123", "admin",
                 full_name="Admin", bio="Platform administrator")

    # User 1 — Emma
    emma = _upsert_user(
        db, "emma.thornton@demo.com", "emma_writes", "user123", "user",
        full_name="Emma Thornton",
        bio="Coffee lover. Amateur photographer. Dublin based.",
        location="Dublin, Ireland",
        profile_picture_url="https://i.pravatar.cc/150?u=emma",
    )
    p1 = _upsert_post(db, emma.id, "Golden hour at the Pepper Canister Church 🌅 Dublin never disappoints.", days_ago=5)
    p2 = _upsert_post(db, emma.id, "Third coffee of the day. Strictly for productivity reasons. ☕", days_ago=3)
    p3 = _upsert_post(db, emma.id, "Film photography is making a comeback and I'm here for it 📷", days_ago=1)
    _upsert_checkin(db, emma.id, "The Pepper Canister Church", "Dublin", "Ireland")

    # User 2 — Luca
    luca = _upsert_user(
        db, "luca.marino@demo.com", "luca_dev", "user123", "user",
        full_name="Luca Marino",
        bio="Software engineer. Passionate about open source.",
        location="Milan, Italy",
        profile_picture_url="https://i.pravatar.cc/150?u=luca",
    )
    p4 = _upsert_post(db, luca.id, "Just shipped my first open source CLI tool 🚀 Link in bio.", days_ago=4)
    p5 = _upsert_post(db, luca.id, "Hot take: documentation is more important than the code itself.", days_ago=2)
    _upsert_checkin(db, luca.id, "Piazza del Duomo", "Milan", "Italy")

    # User 3 — Priya
    priya = _upsert_user(
        db, "priya.k@demo.com", "priya_k", "user123", "user",
        full_name="Priya Krishnamurthy",
        bio="UX designer. Loves minimal design and good coffee.",
        location="Bengaluru, India",
        profile_picture_url="https://i.pravatar.cc/150?u=priya",
    )
    p6 = _upsert_post(db, priya.id, "Redesigned our onboarding flow — 40% drop in friction. Small changes, big results ✨", days_ago=6)
    p7 = _upsert_post(db, priya.id, "Visited Lalbagh today. Nature is the best design inspiration 🌿", days_ago=1)
    _upsert_checkin(db, priya.id, "Lalbagh Botanical Garden", "Bengaluru", "India")

    # Cross-user likes
    for (liker_id, post) in [
        (luca.id, p1), (priya.id, p1), (priya.id, p2),
        (emma.id, p4), (priya.id, p4), (emma.id, p5),
        (emma.id, p6), (luca.id, p6), (luca.id, p7),
    ]:
        if not db.query(Like).filter(Like.user_id == liker_id, Like.post_id == post.id).first():
            db.add(Like(user_id=liker_id, post_id=post.id))
    db.commit()

    # Comments
    def _comment(user_id, post: Post, content: str):
        if not db.query(Comment).filter(Comment.user_id == user_id, Comment.post_id == post.id, Comment.content == content).first():
            db.add(Comment(user_id=user_id, post_id=post.id, content=content))

    _comment(luca.id, p1, "Stunning shot Emma! 😍")
    _comment(priya.id, p1, "Dublin looks magical here.")
    _comment(emma.id, p4, "Congrats Luca! Will check it out 🔥")
    _comment(priya.id, p5, "100% agree. Code without docs is a black box.")
    _comment(emma.id, p6, "40% is huge! Would love to see the before/after.")
    _comment(luca.id, p7, "Lalbagh is on my bucket list!")
    db.commit()

    logger.info("[seed] done — admin + 3 users with posts, likes, comments, check-ins")
