from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth import require_role
from app.models.post import Post
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def list_users(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role,
            "location": u.location,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.get("/posts")
def list_posts(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    posts = db.query(Post).order_by(Post.created_at.desc()).all()
    author_ids = {str(p.user_id) for p in posts}
    authors = {str(u.id): u for u in db.query(User).filter(User.id.in_(author_ids)).all()}
    return [
        {
            "id": str(p.id),
            "user_id": str(p.user_id),
            "username": authors.get(str(p.user_id), type("", (), {"username": "unknown"})()).username,
            "content": p.content[:120],
            "visibility": p.visibility,
            "created_at": p.created_at,
        }
        for p in posts
    ]
