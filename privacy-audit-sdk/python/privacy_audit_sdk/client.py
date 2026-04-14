"""
Privacy Audit SDK — Python client.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx


# ─── Data models ──────────────────────────────────────────────────────────────

@dataclass
class Action:
    code: str
    label: str = ""


@dataclass
class Reason:
    code: str
    label: str = ""


@dataclass
class Actor:
    type: str
    label: str = ""
    identifier: Optional[str] = None


@dataclass
class Sensitivity:
    code: str


@dataclass
class Event:
    tenant_user_id: str
    action: Action
    reason: Reason
    actor: Actor
    data_fields: List[str]
    sensitivity: Sensitivity

    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    third_party_involved: bool = False
    third_party_name: Optional[str] = None
    retention_days: int = 90
    region: str = "IE"
    consent_obtained: bool = False
    user_opted_out: bool = False
    meta: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "eventId": self.event_id,
            "tenantUserId": self.tenant_user_id,
            "occurredAt": self.occurred_at.isoformat(),
            "action": {"code": self.action.code, "label": self.action.label},
            "reason": {"code": self.reason.code, "label": self.reason.label},
            "actor": {
                "type": self.actor.type,
                "label": self.actor.label,
                "identifier": self.actor.identifier,
            },
            "dataFields": self.data_fields,
            "sensitivity": {"code": self.sensitivity.code},
            "thirdPartyInvolved": self.third_party_involved,
            "retentionDays": self.retention_days,
            "region": self.region,
            "consentObtained": self.consent_obtained,
            "userOptedOut": self.user_opted_out,
        }

        if self.third_party_name:
            payload["thirdPartyName"] = self.third_party_name
        if self.meta:
            payload["meta"] = self.meta

        return payload


# ─── Client ───────────────────────────────────────────────────────────────────

class AuditClient:
    """
    Thread-safe client for the Privacy Audit Service.

    Parameters
    ----------
    base_url : str
        Root URL of the audit service, e.g. ``"https://audit.example.com"``.
    api_key : str
        Tenant API key (sent in the ``x-api-key`` header).
    timeout : float
        Request timeout in seconds (default 10).
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: float = 10.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
        }
        self._timeout = timeout

    # ── Audit events ──────────────────────────────────────────────────────────

    def send(self, event: Event) -> None:
        """
        Send a single audit event synchronously.

        Raises ``httpx.HTTPStatusError`` on non-2xx responses, except 409
        (duplicate eventId), which is silently ignored.
        """
        with httpx.Client(timeout=self._timeout) as http:
            resp = http.post(
                f"{self._base_url}/api/events",
                json=event.to_dict(),
                headers=self._headers,
            )

        if resp.status_code == 409:
            # Duplicate — idempotent, safe to ignore.
            return

        resp.raise_for_status()

    # ── Dashboard token ───────────────────────────────────────────────────────

    def issue_user_token(self, tenant_user_id: str) -> Dict[str, str]:
        """
        Request a short-lived handshake token for a specific user.

        Returns a dict with ``token``, ``expiresIn``, and ``redirectUrl``.
        The ``redirectUrl`` should be embedded in the "View my privacy" link
        shown to the user in the tenant application.
        """
        with httpx.Client(timeout=self._timeout) as http:
            resp = http.post(
                f"{self._base_url}/api/dashboard/token",
                json={"tenantUserId": tenant_user_id},
                headers=self._headers,
            )
        resp.raise_for_status()
        return resp.json()
