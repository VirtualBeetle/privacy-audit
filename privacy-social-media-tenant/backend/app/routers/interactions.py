from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth import require_role
from app.models.comment import Comment
from app.models.like import Like
from app.models.post import Post
from app.models.user import User
from app.schemas.comment import CommentCreateRequest

router = APIRouter(prefix="/api/posts", tags=["interactions"])


@router.post("/{post_id}/like", status_code=status.HTTP_200_OK)
def toggle_like(
    post_id: str,
    current_user: User = Depends(require_role("user")),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False}
    like = Like(user_id=current_user.id, post_id=post_id)
    db.add(like)
    db.commit()
    return {"liked": True}


@router.post("/{post_id}/comments", status_code=status.HTTP_201_CREATED)
def add_comment(
    post_id: str,
    body: CommentCreateRequest,
    current_user: User = Depends(require_role("user")),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = Comment(user_id=current_user.id, post_id=post_id, content=body.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": str(comment.id),
        "post_id": str(comment.post_id),
        "user_id": str(comment.user_id),
        "username": current_user.username,
        "full_name": current_user.full_name,
        "profile_picture_url": current_user.profile_picture_url,
        "content": comment.content,
        "created_at": comment.created_at,
    }


@router.get("/{post_id}/comments")
def get_comments(
    post_id: str,
    current_user: User = Depends(require_role("user")),
    db: Session = Depends(get_db),
):
    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    result = []
    for c in comments:
        author = db.query(User).filter(User.id == c.user_id).first()
        result.append({
            "id": str(c.id),
            "post_id": str(c.post_id),
            "user_id": str(c.user_id),
            "username": author.username if author else "unknown",
            "full_name": author.full_name if author else None,
            "profile_picture_url": author.profile_picture_url if author else None,
            "content": c.content,
            "created_at": c.created_at,
        })
    return result
