from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session
from app import audit
from app.database import get_db
from app.middleware.auth import require_role
from app.models.checkin import LocationCheckin
from app.models.user import User
from app.schemas.checkin import CheckinCreateRequest

router = APIRouter(prefix="/api/checkins", tags=["checkins"])


@router.get("")
def get_checkins(
    current_user: User = Depends(require_role("user")),
    db: Session = Depends(get_db),
):
    checkins = (
        db.query(LocationCheckin)
        .filter(LocationCheckin.user_id == current_user.id)
        .order_by(LocationCheckin.checked_in_at.desc())
        .all()
    )
    return [
        {
            "id": str(c.id),
            "user_id": str(c.user_id),
            "place_name": c.place_name,
            "city": c.city,
            "country": c.country,
            "checked_in_at": c.checked_in_at,
        }
        for c in checkins
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_checkin(
    body: CheckinCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role("user")),
    db: Session = Depends(get_db),
):
    checkin = LocationCheckin(
        user_id=current_user.id,
        place_name=body.place_name,
        city=body.city,
        country=body.country,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)

    # Fire audit event — check-in data shared with location partner
    background_tasks.add_task(audit.send, audit.checkin_share(str(current_user.id)))

    return {
        "id": str(checkin.id),
        "user_id": str(checkin.user_id),
        "place_name": checkin.place_name,
        "city": checkin.city,
        "country": checkin.country,
        "checked_in_at": checkin.checked_in_at,
    }
