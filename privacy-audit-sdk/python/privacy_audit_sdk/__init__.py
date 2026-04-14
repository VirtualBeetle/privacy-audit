"""
Privacy Audit SDK — Python client for the Privacy Audit Service.

Usage
-----
    from privacy_audit_sdk import AuditClient, Event, Action, Reason, Actor, Sensitivity

    client = AuditClient(
        base_url="https://audit.example.com",
        api_key="your-api-key",
    )

    # Synchronous send
    client.send(Event(
        event_id="evt-001",
        tenant_user_id="user-123",
        action=Action(code="READ", label="Patient profile read"),
        reason=Reason(code="TREATMENT", label="Clinical care"),
        actor=Actor(type="EMPLOYEE", label="Dr. Mitchell"),
        data_fields=["full_name", "dob", "blood_type"],
        sensitivity=Sensitivity(code="HIGH"),
    ))

    # Fire-and-forget (use with FastAPI BackgroundTasks)
    background_tasks.add_task(client.send, event)
"""

from .client import AuditClient, Event, Action, Reason, Actor, Sensitivity

__all__ = [
    "AuditClient",
    "Event",
    "Action",
    "Reason",
    "Actor",
    "Sensitivity",
]
