import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from app import audit, config
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/privacy", tags=["privacy"])


def _get_dashboard_url(user_id: str) -> str:
    """Call audit service to issue a handshake token, return DataGuard login URL."""
    try:
        resp = httpx.post(
            f"{config.AUDIT_SERVICE_URL}/api/dashboard/token",
            json={"tenantUserId": user_id},
            headers={"x-api-key": config.AUDIT_API_KEY},
            timeout=5.0,
        )
        resp.raise_for_status()
        token = resp.json().get("token", "")
        if not token:
            raise ValueError("empty token")
        return f"{config.DASHBOARD_BASE_URL}/login?token={token}"
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Audit service error: {exc}")


@router.get("/dashboard-link")
def dashboard_link(current_user: User = Depends(get_current_user)):
    # Kept for backwards compat — now also uses the token flow.
    return {"url": _get_dashboard_url(str(current_user.id))}


@router.get("/dashboard-token")
def dashboard_token(current_user: User = Depends(get_current_user)):
    return {"url": _get_dashboard_url(str(current_user.id))}


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
