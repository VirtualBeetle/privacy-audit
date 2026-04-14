from fastapi import APIRouter, BackgroundTasks, Depends, status
from app import audit, config
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/privacy", tags=["privacy"])


@router.get("/dashboard-link")
def dashboard_link(current_user: User = Depends(get_current_user)):
    url = f"{config.AUDIT_SERVICE_URL}/dashboard?tenant_id={config.AUDIT_TENANT_ID}&user_id={current_user.id}"
    return {"url": url}


@router.post("/export", status_code=status.HTTP_202_ACCEPTED)
def request_export(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    background_tasks.add_task(audit.send, audit.gdpr_export(str(current_user.id)))
    return {"message": "export request received — you will be notified when your data is ready"}


@router.delete("/delete", status_code=status.HTTP_202_ACCEPTED)
def request_deletion(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    background_tasks.add_task(audit.send, audit.gdpr_delete(str(current_user.id)))
    return {"message": "deletion request received — your account will be erased within 30 days"}
