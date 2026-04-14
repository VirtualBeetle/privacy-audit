# API Contract — Health Tenant App

Base URL: `http://localhost:8081`
All responses are JSON. All authenticated routes require `Authorization: Bearer <token>`.

---

## Auth

### POST /api/auth/register
Register a new patient account.

**Request body:**
```json
{
  "email": "james.obrien@demo.com",
  "password": "patient123",
  "full_name": "James O'Brien",
  "date_of_birth": "1985-03-14",
  "gender": "male",
  "blood_type": "A+",
  "phone": "+353 87 123 4567",
  "address": "12 Grafton Street, Dublin 2"
}
```

**Response 201:**
```json
{
  "message": "registered successfully",
  "user_id": "uuid"
}
```

**Response 400:** email already exists or validation error.

---

### POST /api/auth/login
Login for both patients and doctors.

**Request body:**
```json
{
  "email": "sarah.mitchell@healthdemo.com",
  "password": "doctor123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "role": "doctor",
  "user_id": "uuid"
}
```

**Response 401:** invalid credentials.

---

## Patient Routes (role: patient)

### GET /api/patient/me
Returns own user + patient profile.

**Response 200:**
```json
{
  "user_id": "uuid",
  "email": "james.obrien@demo.com",
  "role": "patient",
  "profile": {
    "full_name": "James O'Brien",
    "date_of_birth": "1985-03-14",
    "gender": "male",
    "blood_type": "A+",
    "phone": "+353 87 123 4567",
    "address": "12 Grafton Street, Dublin 2"
  }
}
```

---

### PUT /api/patient/me
Update own profile fields.

**Request body** (all fields optional):
```json
{
  "full_name": "James O'Brien",
  "phone": "+353 87 999 9999",
  "address": "New address"
}
```

**Response 200:**
```json
{ "message": "profile updated" }
```

---

### GET /api/patient/records
Returns own medical records.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "diagnosis": "Type 2 Diabetes",
    "prescriptions": "Metformin 500mg twice daily",
    "test_results": "HbA1c 7.2%",
    "record_date": "2024-01-15",
    "doctor_name": "Dr. Sarah Mitchell"
  }
]
```

---

### GET /api/patient/appointments
Returns own appointments.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "scheduled_at": "2024-02-10T10:00:00Z",
    "status": "completed",
    "notes": "Follow-up for diabetes management",
    "doctor_name": "Dr. Sarah Mitchell"
  }
]
```

---

### GET /api/patient/emergency-contacts
Returns emergency contacts for logged-in patient.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Mary O'Brien",
    "relationship": "Spouse",
    "phone": "+353 86 555 1234"
  }
]
```

---

### GET /api/patient/insurance
Returns insurance details for logged-in patient.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "provider_name": "VHI Healthcare",
    "policy_number": "VHI-1234567",
    "coverage_type": "Comprehensive",
    "expiry_date": "2025-12-31"
  }
]
```

---

## Doctor Routes (role: doctor)

### GET /api/doctor/patients
Returns list of all patients with basic info.

**Response 200:**
```json
[
  {
    "patient_id": "uuid (patient_profiles.id)",
    "user_id": "uuid",
    "full_name": "James O'Brien",
    "date_of_birth": "1985-03-14",
    "blood_type": "A+",
    "email": "james.obrien@demo.com"
  }
]
```

**Side effect:** Fires privacy audit event (READ, EMPLOYEE, TREATMENT) for each patient in the list.

---

### GET /api/doctor/patients/:id
Returns full profile of one patient.

`:id` is the `patient_profiles.id` (UUID).

**Response 200:** same shape as `GET /api/patient/me` profile block.

**Side effect:** Fires privacy audit event (READ, EMPLOYEE, TREATMENT) for this patient.

---

### GET /api/doctor/patients/:id/records
Returns medical records for one patient.

**Response 200:** same shape as `GET /api/patient/records`.

**Side effect:** Fires privacy audit event (READ, EMPLOYEE, TREATMENT) for medical records.

---

### GET /api/doctor/patients/:id/appointments
Returns appointments for one patient.

**Response 200:** same shape as `GET /api/patient/appointments`.

---

## Privacy Routes (any authenticated role)

### GET /api/privacy/dashboard-link
Returns the URL to the Privacy Audit Dashboard for the current user.

**Response 200:**
```json
{
  "url": "http://localhost:3000/dashboard?tenant_id=health-tenant-uuid&user_id=james-uuid"
}
```

---

### POST /api/privacy/export
Request a GDPR Article 20 data export.

**Response 202:**
```json
{
  "message": "export request received",
  "request_id": "uuid"
}
```

**Side effect:** Fires privacy audit event (EXPORT, SYSTEM, GDPR_REQUEST).

---

### DELETE /api/privacy/delete
Request GDPR Article 17 account deletion.

**Response 202:**
```json
{
  "message": "deletion request received",
  "request_id": "uuid"
}
```

**Side effect:** Fires privacy audit event (DELETE, SYSTEM, GDPR_REQUEST).

---

## Error Response Shape

All errors follow:
```json
{
  "error": "human readable message"
}
```

HTTP status codes used: 200, 201, 202, 400, 401, 403, 404, 500.
