from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app import audit
from app.database import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.user import User
from app.schemas.user import UserPublic, UserUpdateRequest

router = APIRouter(prefix="/api/users", tags=["users"])


def _user_to_public(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "username": u.username,
        "full_name": u.full_name,
        "bio": u.bio,
        "profile_picture_url": u.profile_picture_url,
        "location": u.location,
        "role": u.role,
        "created_at": u.created_at,
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return _user_to_public(current_user)


@router.put("/me")
def update_me(
    body: UserUpdateRequest,
    current_user: User = Depends(require_role("user")),
    db: Session = Depends(get_db),
):
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.bio is not None:
        current_user.bio = body.bio
    if body.profile_picture_url is not None:
        current_user.profile_picture_url = body.profile_picture_url
    if body.location is not None:
        current_user.location = body.location
    db.commit()
    db.refresh(current_user)
    return {"message": "profile updated"}


@router.get("/search")
def search_users(
    q: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search users by username or full name. Fires audit event on each matched user."""
    results = (
        db.query(User)
        .filter(
            (User.username.ilike(f"%{q}%")) | (User.full_name.ilike(f"%{q}%"))
        )
        .limit(20)
        .all()
    )
    # Fire audit event for each user whose profile was surfaced in search
    for u in results:
        if str(u.id) != str(current_user.id):
            background_tasks.add_task(
                audit.send,
                audit.user_search(str(u.id), current_user.username),
            )
    return [
        {
            "id": str(u.id),
            "username": u.username,
            "full_name": u.full_name,
            "profile_picture_url": u.profile_picture_url,
            "location": u.location,
            "bio": u.bio,
        }
        for u in results
    ]
