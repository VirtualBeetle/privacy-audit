"""
Dev router — background simulation + manual trigger for demo purposes.
Fires realistic audit events automatically: ad targeting, analytics, location sharing.
"""
import asyncio
import logging
import random

from fastapi import APIRouter, BackgroundTasks

from app import audit
from app.database import SessionLocal
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dev", tags=["dev"])


# ── Simulation event factories ────────────────────────────────────────────────

def _fire_ad_targeting(user_id: str) -> None:
    audit.send(audit.AuditEvent(
        tenant_user_id=user_id,
        action_code="READ", action_label="Read",
        data_fields=["location", "email", "browsing_history"],
        reason_code="AD_TARGETING", reason_label="Real-time ad targeting engine",
        actor_type="THIRD_PARTY", actor_label="AdNetwork Partner",
        actor_identifier="PrecisionAds Ltd.",
        sensitivity_code="HIGH", sensitivity_label="High sensitivity",
        third_party_involved=True, third_party_name="PrecisionAds Ltd.",
        meta={"feature": "ad_targeting", "automated": True},
    ))


def _fire_analytics(user_id: str) -> None:
    audit.send(audit.AuditEvent(
        tenant_user_id=user_id,
        action_code="READ", action_label="Read",
        data_fields=["posts", "username", "profile_picture"],
        reason_code="ANALYTICS", reason_label="Third-party engagement analytics",
        actor_type="THIRD_PARTY", actor_label="SocialAnalytics Inc.",
        actor_identifier="SocialAnalytics Inc.",
        sensitivity_code="MEDIUM", sensitivity_label="Medium sensitivity",
        third_party_involved=True, third_party_name="SocialAnalytics Inc.",
        meta={"feature": "post_analytics", "automated": True},
    ))


def _fire_location_broker(user_id: str) -> None:
    audit.send(audit.AuditEvent(
        tenant_user_id=user_id,
        action_code="SHARE", action_label="Share",
        data_fields=["location", "check_in"],
        reason_code="LOCATION_PARTNERSHIP", reason_label="Location data shared with partner",
        actor_type="DATA_BROKER", actor_label="GeoPartner Ltd.",
        actor_identifier="GeoPartner Ltd.",
        sensitivity_code="HIGH", sensitivity_label="High sensitivity",
        third_party_involved=True, third_party_name="GeoPartner Ltd.",
        meta={"feature": "location_broker", "automated": True},
    ))


# ── One-shot simulation round ─────────────────────────────────────────────────

def _run_simulation_round() -> dict:
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.role == "user").all()
        if not users:
            return {"users": 0, "message": "no users in DB"}
        selected = random.sample(users, min(3, len(users)))
        for user in selected:
            uid = str(user.id)
            _fire_ad_targeting(uid)
            _fire_analytics(uid)
            _fire_location_broker(uid)
        return {
            "users": len(selected),
            "events_per_user": 3,
            "total_events": len(selected) * 3,
        }
    finally:
        db.close()


# ── Background scheduler ──────────────────────────────────────────────────────

async def _scheduler_loop() -> None:
    """Runs indefinitely, firing audit events on a schedule."""
    await asyncio.sleep(30)  # initial delay on boot
    _run_simulation_round()  # fire once on startup

    ad_interval = 3 * 60       # 3 min
    analytics_interval = 5 * 60  # 5 min
    location_interval = 7 * 60   # 7 min

    ad_elapsed = 0
    analytics_elapsed = 0
    location_elapsed = 0
    tick = 30  # check every 30s

    while True:
        await asyncio.sleep(tick)
        ad_elapsed += tick
        analytics_elapsed += tick
        location_elapsed += tick

        db = SessionLocal()
        try:
            users = db.query(User).filter(User.role == "user").all()
            if not users:
                continue
            pick = lambda n: random.sample(users, min(n, len(users)))  # noqa: E731

            if ad_elapsed >= ad_interval:
                for u in pick(2):
                    _fire_ad_targeting(str(u.id))
                ad_elapsed = 0

            if analytics_elapsed >= analytics_interval:
                for u in pick(2):
                    _fire_analytics(str(u.id))
                analytics_elapsed = 0

            if location_elapsed >= location_interval:
                for u in pick(1):
                    _fire_location_broker(str(u.id))
                location_elapsed = 0
        except Exception as exc:
            logger.warning("[scheduler] tick error: %s", exc)
        finally:
            db.close()


def start_scheduler() -> None:
    """Call from FastAPI startup to launch the background scheduler."""
    loop = asyncio.get_event_loop()
    loop.create_task(_scheduler_loop())
    logger.info("[scheduler] Social background simulation started")


# ── Dev endpoint ──────────────────────────────────────────────────────────────

@router.post("/simulate")
def trigger_simulation(background_tasks: BackgroundTasks):
    """Manually trigger one round of simulation events (ad, analytics, location)."""
    background_tasks.add_task(_run_simulation_round)
    return {
        "message": "Simulation triggered — firing ad targeting, analytics, and location events for random users",
    }
