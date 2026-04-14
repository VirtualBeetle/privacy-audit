# Privacy Audit Integration — Health Tenant App

## Overview

The Health App integrates with the Privacy Audit Service by sending HTTP POST requests to `AUDIT_SERVICE_URL/api/events` with an `X-API-Key: <AUDIT_API_KEY>` header whenever internal data access occurs.

**This integration is fire-and-forget.** If the audit service is unreachable, log the error and continue — never fail the primary request.

---

## Audit Event Payload Shape

```json
{
  "tenant_id": "<from AUDIT_TENANT_ID env or hardcoded UUID>",
  "tenant_user_id": "<user.ID as string>",
  "event_id": "<new UUID generated per event>",
  "timestamp": "<ISO 8601 UTC>",

  "action": {
    "code": "READ",
    "label": "Read"
  },

  "data_fields": ["full_name", "dob", "blood_type"],

  "reason": {
    "code": "TREATMENT",
    "label": "Used for medical treatment"
  },

  "actor": {
    "type": "EMPLOYEE",
    "label": "Doctor",
    "identifier": "Dr. Sarah Mitchell"
  },

  "sensitivity": {
    "code": "HIGH",
    "label": "High sensitivity"
  },

  "third_party_involved": false,
  "third_party_name": "",
  "retention_days": 90,
  "region": "IE",
  "consent_obtained": true,
  "user_opted_out": false,

  "meta": {
    "feature": "doctor_patient_view",
    "app": "health-tenant"
  }
}
```

---

## Integration Points

### 1. Doctor views patient profile
**Trigger:** `GET /api/doctor/patients/:id`

```json
{
  "tenant_user_id": "<patient's user_id>",
  "action": { "code": "READ", "label": "Read" },
  "data_fields": ["full_name", "date_of_birth", "blood_type", "phone", "address"],
  "reason": { "code": "TREATMENT", "label": "Used for medical treatment" },
  "actor": { "type": "EMPLOYEE", "label": "Doctor", "identifier": "<doctor full name>" },
  "sensitivity": { "code": "HIGH", "label": "High sensitivity" },
  "third_party_involved": false,
  "meta": { "feature": "doctor_patient_view" }
}
```

---

### 2. Doctor views patient medical records
**Trigger:** `GET /api/doctor/patients/:id/records`

```json
{
  "tenant_user_id": "<patient's user_id>",
  "action": { "code": "READ", "label": "Read" },
  "data_fields": ["diagnosis", "prescriptions", "test_results"],
  "reason": { "code": "TREATMENT", "label": "Used for medical treatment" },
  "actor": { "type": "EMPLOYEE", "label": "Doctor", "identifier": "<doctor full name>" },
  "sensitivity": { "code": "CRITICAL", "label": "Critical sensitivity" },
  "third_party_involved": false,
  "meta": { "feature": "medical_records_view" }
}
```

---

### 3. Insurance details accessed
**Trigger:** `GET /api/patient/insurance` OR `GET /api/doctor/patients/:id/insurance`

```json
{
  "tenant_user_id": "<patient's user_id>",
  "action": { "code": "READ", "label": "Read" },
  "data_fields": ["policy_number", "coverage_type", "provider_name"],
  "reason": { "code": "BILLING", "label": "Used for billing and insurance processing" },
  "actor": { "type": "SYSTEM", "label": "Billing System", "identifier": "health-billing-service" },
  "sensitivity": { "code": "MEDIUM", "label": "Medium sensitivity" },
  "third_party_involved": false,
  "meta": { "feature": "insurance_lookup" }
}
```

---

### 4. Patient requests data export
**Trigger:** `POST /api/privacy/export`

```json
{
  "tenant_user_id": "<patient's user_id>",
  "action": { "code": "EXPORT", "label": "Export" },
  "data_fields": ["all_fields"],
  "reason": { "code": "GDPR_REQUEST", "label": "GDPR Article 20 data portability request" },
  "actor": { "type": "SYSTEM", "label": "System", "identifier": "health-export-service" },
  "sensitivity": { "code": "HIGH", "label": "High sensitivity" },
  "third_party_involved": false,
  "meta": { "feature": "gdpr_export", "legal_basis": "GDPR Article 20" }
}
```

---

### 5. Patient requests account deletion
**Trigger:** `DELETE /api/privacy/delete`

```json
{
  "tenant_user_id": "<patient's user_id>",
  "action": { "code": "DELETE", "label": "Delete" },
  "data_fields": ["all_fields"],
  "reason": { "code": "GDPR_REQUEST", "label": "GDPR Article 17 right to erasure request" },
  "actor": { "type": "SYSTEM", "label": "System", "identifier": "health-deletion-service" },
  "sensitivity": { "code": "HIGH", "label": "High sensitivity" },
  "third_party_involved": false,
  "meta": { "feature": "gdpr_deletion", "legal_basis": "GDPR Article 17" }
}
```

---

## Go Implementation Pattern

```go
// In a separate file: audit/client.go

package audit

import (
    "bytes"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "time"

    "github.com/google/uuid"
)

type AuditEvent struct {
    TenantID          string                 `json:"tenant_id"`
    TenantUserID      string                 `json:"tenant_user_id"`
    EventID           string                 `json:"event_id"`
    Timestamp         string                 `json:"timestamp"`
    Action            map[string]string      `json:"action"`
    DataFields        []string               `json:"data_fields"`
    Reason            map[string]string      `json:"reason"`
    Actor             map[string]string      `json:"actor"`
    Sensitivity       map[string]string      `json:"sensitivity"`
    ThirdPartyInvolved bool                  `json:"third_party_involved"`
    ThirdPartyName    string                 `json:"third_party_name"`
    RetentionDays     int                    `json:"retention_days"`
    Region            string                 `json:"region"`
    ConsentObtained   bool                   `json:"consent_obtained"`
    UserOptedOut      bool                   `json:"user_opted_out"`
    Meta              map[string]interface{} `json:"meta"`
}

func SendEvent(event AuditEvent) {
    serviceURL := os.Getenv("AUDIT_SERVICE_URL")
    apiKey := os.Getenv("AUDIT_API_KEY")
    if serviceURL == "" {
        return // audit service not configured, skip silently
    }

    event.EventID = uuid.New().String()
    event.Timestamp = time.Now().UTC().Format(time.RFC3339)
    event.RetentionDays = 90
    event.Region = "IE"
    event.ConsentObtained = true
    event.UserOptedOut = false

    body, err := json.Marshal(event)
    if err != nil {
        log.Printf("[audit] marshal error: %v", err)
        return
    }

    req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/events", serviceURL), bytes.NewBuffer(body))
    if err != nil {
        log.Printf("[audit] request build error: %v", err)
        return
    }
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-API-Key", apiKey)

    client := &http.Client{Timeout: 5 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        log.Printf("[audit] send error: %v", err)
        return
    }
    defer resp.Body.Close()
    log.Printf("[audit] event sent, status: %d", resp.StatusCode)
}
```

**Usage in handlers:**
```go
// Fire-and-forget (non-blocking)
go audit.SendEvent(audit.AuditEvent{
    TenantUserID: patient.UserID.String(),
    Action:       map[string]string{"code": "READ", "label": "Read"},
    DataFields:   []string{"full_name", "date_of_birth", "blood_type"},
    Reason:       map[string]string{"code": "TREATMENT", "label": "Used for medical treatment"},
    Actor:        map[string]string{"type": "EMPLOYEE", "label": "Doctor", "identifier": doctorName},
    Sensitivity:  map[string]string{"code": "HIGH", "label": "High sensitivity"},
    Meta:         map[string]interface{}{"feature": "doctor_patient_view"},
})
```
