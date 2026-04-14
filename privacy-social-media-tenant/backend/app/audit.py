"""
Fire-and-forget audit event client.
Use via FastAPI BackgroundTasks: background_tasks.add_task(audit.send, event)
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from app import config

logger = logging.getLogger(__name__)


class AuditEvent:
    def __init__(
        self,
        tenant_user_id: str,
        action_code: str,
        action_label: str,
        data_fields: list[str],
        reason_code: str,
        reason_label: str,
        actor_type: str,
        actor_label: str,
        actor_identifier: str,
        sensitivity_code: str,
        sensitivity_label: str,
        third_party_involved: bool = False,
        third_party_name: str = "",
        meta: dict[str, Any] | None = None,
    ):
        self.tenant_user_id = tenant_user_id
        self.action_code = action_code
        self.action_label = action_label
        self.data_fields = data_fields
        self.reason_code = reason_code
        self.reason_label = reason_label
        self.actor_type = actor_type
        self.actor_label = actor_label
        self.actor_identifier = actor_identifier
        self.sensitivity_code = sensitivity_code
        self.sensitivity_label = sensitivity_label
        self.third_party_involved = third_party_involved
        self.third_party_name = third_party_name
        self.meta = meta or {}

    def to_dict(self) -> dict:
        return {
            "tenant_id": config.AUDIT_TENANT_ID,
            "tenant_user_id": self.tenant_user_id,
            "event_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": {"code": self.action_code, "label": self.action_label},
            "data_fields": self.data_fields,
            "reason": {"code": self.reason_code, "label": self.reason_label},
            "actor": {
                "type": self.actor_type,
                "label": self.actor_label,
                "identifier": self.actor_identifier,
            },
            "sensitivity": {"code": self.sensitivity_code, "label": self.sensitivity_label},
            "third_party_involved": self.third_party_involved,
            "third_party_name": self.third_party_name,
            "retention_days": 90,
            "region": "IE",
            "consent_obtained": True,
            "user_opted_out": False,
            "meta": {**self.meta, "app": "social-tenant"},
        }


def send(event: AuditEvent) -> None:
    """Send an audit event synchronously. Safe to call from BackgroundTasks."""
    if not config.AUDIT_SERVICE_URL:
        return
    try:
        payload = event.to_dict()
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(
                f"{config.AUDIT_SERVICE_URL}/api/events",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": config.AUDIT_API_KEY,
                },
            )
        logger.info("[audit] sent event=%s action=%s status=%d", payload["event_id"], event.action_code, resp.status_code)
    except Exception as exc:
        logger.warning("[audit] failed to send event: %s", exc)


# ── Convenience factories ──────────────────────────────────────────────────────

def feed_recommendation(user_id: str) -> AuditEvent:
    return AuditEvent(
        tenant_user_id=user_id,
        action_code="READ", action_label="Read",
        data_fields=["username", "location", "bio"],
        reason_code="RECOMMENDATION", reason_label="Used by feed recommendation algorithm",
        actor_type="SYSTEM", actor_label="Feed Algorithm", actor_identifier="social-feed-service",
        sensitivity_code="MEDIUM", sensitivity_label="Medium sensitivity",
        meta={"feature": "feed_recommendation"},
    )


def ad_targeting(user_id: str) -> AuditEvent:
    return AuditEvent(
        tenant_user_id=user_id,
        action_code="READ", action_label="Read",
        data_fields=["location", "email"],
        reason_code="AD_TARGETING", reason_label="Used for targeted advertising",
        actor_type="SYSTEM", actor_label="Ad Engine", actor_identifier="social-ad-service",
        sensitivity_code="HIGH", sensitivity_label="High sensitivity",
        third_party_involved=True, third_party_name="AdNetwork Partner",
        meta={"feature": "ad_targeting"},
    )


def user_search(searched_user_id: str, searcher_username: str) -> AuditEvent:
    return AuditEvent(
        tenant_user_id=searched_user_id,
        action_code="READ", action_label="Read",
        data_fields=["username", "full_name", "profile_picture_url"],
        reason_code="SEARCH", reason_label="Profile viewed via search",
        actor_type="OTHER_USER", actor_label="Another User", actor_identifier=searcher_username,
        sensitivity_code="LOW", sensitivity_label="Low sensitivity",
        meta={"feature": "user_search"},
    )


def post_analytics(user_id: str) -> AuditEvent:
    return AuditEvent(
        tenant_user_id=user_id,
        action_code="READ", action_label="Read",
        data_fields=["content", "created_at"],
        reason_code="ANALYTICS", reason_label="Read by third-party analytics service",
        actor_type="THIRD_PARTY", actor_label="Analytics Service", actor_identifier="SocialAnalytics Inc.",
        sensitivity_code="MEDIUM", sensitivity_label="Medium sensitivity",
        third_party_involved=True, third_party_name="SocialAnalytics Inc.",
        meta={"feature": "post_analytics"},
    )


def checkin_share(user_id: str) -> AuditEvent:
    return AuditEvent(
        tenant_user_id=user_id,
        action_code="SHARE", action_label="Share",
        data_fields=["city", "country", "place_name"],
        reason_code="LOCATION_PARTNERSHIP", reason_label="Location data shared with location partner",
        actor_type="DATA_BROKER", actor_label="Location Data Broker", actor_identifier="GeoPartner Ltd.",
        sensitivity_code="HIGH", sensitivity_label="High sensitivity",
        third_party_involved=True, third_party_name="GeoPartner Ltd.",
        meta={"feature": "checkin_location_share"},
    )


def gdpr_export(user_id: str) -> AuditEvent:
    return AuditEvent(
        tenant_user_id=user_id,
        action_code="EXPORT", action_label="Export",
        data_fields=["all_fields"],
        reason_code="GDPR_REQUEST", reason_label="GDPR Article 20 data portability request",
        actor_type="SYSTEM", actor_label="System", actor_identifier="social-export-service",
        sensitivity_code="HIGH", sensitivity_label="High sensitivity",
        meta={"feature": "gdpr_export", "legal_basis": "GDPR Article 20"},
    )


def gdpr_delete(user_id: str) -> AuditEvent:
    return AuditEvent(
        tenant_user_id=user_id,
        action_code="DELETE", action_label="Delete",
        data_fields=["all_fields"],
        reason_code="GDPR_REQUEST", reason_label="GDPR Article 17 right to erasure request",
        actor_type="SYSTEM", actor_label="System", actor_identifier="social-deletion-service",
        sensitivity_code="HIGH", sensitivity_label="High sensitivity",
        meta={"feature": "gdpr_deletion", "legal_basis": "GDPR Article 17"},
    )
