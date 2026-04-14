from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import audit
from app.database import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.comment import Comment
from app.models.like import Like
from app.models.post import Post
from app.models.user import User

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _enrich_post(post: Post, author: User, db: Session, current_user_id: str) -> dict:
    like_count = db.query(func.count(Like.id)).filter(Like.post_id == post.id).scalar()
    comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id).scalar()
    liked_by_me = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user_id).first() is not None
    return {
        "id": str(post.id),
        "user_id": str(post.user_id),
        "username": author.username,
        "full_name": author.full_name,
        "profile_picture_url": author.profile_picture_url,
        "content": post.content,
        "image_url": post.image_url,
        "visibility": post.visibility,
        "like_count": like_count,
        "comment_count": comment_count,
        "liked_by_me": liked_by_me,
        "created_at": post.created_at,
    }


@router.get("/feed")
def get_feed(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return public + friends posts ordered by created_at DESC."""
    posts = (
        db.query(Post)
        .filter(Post.visibility.in_(["public", "friends"]))
        .order_by(Post.created_at.desc())
        .limit(50)
        .all()
    )

    # Collect unique authors in this feed
    author_ids = {str(p.user_id) for p in posts}
    authors = {str(u.id): u for u in db.query(User).filter(User.id.in_(author_ids)).all()}

    # Fire audit events once per unique author (feed recommendation + ad targeting)
    for uid in author_ids:
        background_tasks.add_task(audit.send, audit.feed_recommendation(uid))
        background_tasks.add_task(audit.send, audit.ad_targeting(uid))

    return [
        _enrich_post(p, authors[str(p.user_id)], db, str(current_user.id))
        for p in posts
        if str(p.user_id) in authors
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_post(
    body: dict,
    current_user: User = Depends(require_role("user")),
    db: Session = Depends(get_db),
):
    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    visibility = body.get("visibility", "public")
    if visibility not in ("public", "friends", "private"):
        raise HTTPException(status_code=400, detail="Invalid visibility value")
    post = Post(
        user_id=current_user.id,
        content=content,
        image_url=body.get("image_url"),
        visibility=visibility,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _enrich_post(post, current_user, db, str(current_user.id))


@router.get("/{post_id}")
def get_post(
    post_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    author = db.query(User).filter(User.id == post.user_id).first()

    # Fire third-party analytics audit event
    background_tasks.add_task(audit.send, audit.post_analytics(str(post.user_id)))

    return _enrich_post(post, author, db, str(current_user.id))


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: str,
    current_user: User = Depends(require_role("user")),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if str(post.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Cannot delete another user's post")
    db.delete(post)
    db.commit()
