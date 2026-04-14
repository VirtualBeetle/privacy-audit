# Backend Spec — Health Tenant App

## Language: Go 1.21+
## Framework: Gin
## ORM: GORM with postgres driver
## Module: `github.com/VirtualBeetle/privacy-health-tenant`

---

## Dependencies (go.mod)

```
github.com/gin-gonic/gin
gorm.io/gorm
gorm.io/driver/postgres
github.com/golang-jwt/jwt/v5
github.com/joho/godotenv
github.com/google/uuid
golang.org/x/crypto
```

---

## File-by-File Spec

### `config/env.go`
- Load `.env` file using `godotenv.Load()`
- Export typed accessor functions or just load into `os.Getenv` — either is fine
- Call this before anything else in `main.go`

---

### `config/db.go`
- Build DSN from env vars: `host=... user=... password=... dbname=... port=... sslmode=disable`
- Open connection with `gorm.Open(postgres.Open(dsn), &gorm.Config{})`
- AutoMigrate all models in this order:
  1. `models.User`
  2. `models.PatientProfile`
  3. `models.MedicalRecord`
  4. `models.Appointment`
  5. `models.EmergencyContact`
  6. `models.InsuranceDetail`
- Return `*gorm.DB` — stored in a package-level variable accessed by handlers

---

### `models/user.go`
```go
type User struct {
    ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    Email        string    `gorm:"uniqueIndex;not null"`
    PasswordHash string    `gorm:"not null"`
    Role         string    `gorm:"not null"` // "patient" | "doctor"
    CreatedAt    time.Time
}
```

---

### `models/patient.go`
```go
type PatientProfile struct {
    ID          uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    UserID      uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex"`
    FullName    string
    DateOfBirth *time.Time
    Gender      string
    BloodType   string
    Phone       string
    Address     string
    CreatedAt   time.Time
    User        User `gorm:"foreignKey:UserID"`
}
```

---

### `models/medical_record.go`
```go
type MedicalRecord struct {
    ID            uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    PatientID     uuid.UUID  `gorm:"type:uuid;not null;index"`
    DoctorID      uuid.UUID  `gorm:"type:uuid;not null"`
    Diagnosis     string
    Prescriptions string
    TestResults   string
    RecordDate    *time.Time
    CreatedAt     time.Time
    Patient       PatientProfile `gorm:"foreignKey:PatientID"`
    Doctor        User           `gorm:"foreignKey:DoctorID"`
}
```

---

### `models/appointment.go`
```go
type Appointment struct {
    ID          uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    PatientID   uuid.UUID  `gorm:"type:uuid;not null;index"`
    DoctorID    uuid.UUID  `gorm:"type:uuid;not null"`
    ScheduledAt *time.Time
    Status      string     // "scheduled" | "completed" | "cancelled"
    Notes       string
    CreatedAt   time.Time
    Patient     PatientProfile `gorm:"foreignKey:PatientID"`
    Doctor      User           `gorm:"foreignKey:DoctorID"`
}
```

---

### `models/emergency_contact.go`
```go
type EmergencyContact struct {
    ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    PatientID    uuid.UUID `gorm:"type:uuid;not null;index"`
    Name         string
    Relationship string
    Phone        string
    Patient      PatientProfile `gorm:"foreignKey:PatientID"`
}
```

---

### `models/insurance.go`
```go
type InsuranceDetail struct {
    ID           uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    PatientID    uuid.UUID  `gorm:"type:uuid;not null;index"`
    ProviderName string
    PolicyNumber string
    CoverageType string
    ExpiryDate   *time.Time
    Patient      PatientProfile `gorm:"foreignKey:PatientID"`
}
```

---

### `middleware/auth.go`
JWT middleware for Gin:
- Read `Authorization: Bearer <token>` header
- Parse with `golang-jwt/jwt/v5` using `JWT_SECRET`
- On valid token: set `userID` and `role` into Gin context (`c.Set(...)`)
- On invalid/missing: return `401` and abort

JWT claims structure:
```go
type Claims struct {
    UserID string `json:"user_id"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}
```

Token expiry: 24 hours from issue.

---

### `middleware/role.go`
Role guard middleware factory:
```go
func RequireRole(roles ...string) gin.HandlerFunc
```
- Read `role` from Gin context (set by auth middleware)
- If role not in allowed list: return `403` and abort
- Otherwise: call `c.Next()`

---

### `handlers/auth.go`

**Register (`POST /api/auth/register`):**
1. Bind JSON to struct: `email`, `password`, `full_name`, `date_of_birth`, `gender`, `blood_type`, `phone`, `address`
2. Check email not already taken
3. Bcrypt hash password
4. Create `User` record (role = "patient")
5. Create `PatientProfile` record linked to user
6. Return 201

**Login (`POST /api/auth/login`):**
1. Bind JSON: `email`, `password`
2. Look up user by email
3. Compare bcrypt hash
4. Generate JWT with `user_id`, `role`, `exp` (+24h)
5. Return token + role + user_id

---

### `handlers/patient.go`

**GET /api/patient/me:**
- Get `userID` from context
- Load `User` + `PatientProfile` by userID
- Return combined response

**PUT /api/patient/me:**
- Bind JSON with optional fields
- Update `PatientProfile` fields (only non-zero values)
- Return 200

**GET /api/patient/records:**
- Get patient profile by userID
- Load `MedicalRecord` where `patient_id = profile.ID`
- Preload Doctor name
- Return array

**GET /api/patient/appointments:**
- Load `Appointment` where `patient_id = profile.ID`
- Preload Doctor name
- Return array

**GET /api/patient/emergency-contacts:**
- Load `EmergencyContact` where `patient_id = profile.ID`
- Return array

**GET /api/patient/insurance:**
- Load `InsuranceDetail` where `patient_id = profile.ID`
- Fire audit event (BILLING, SYSTEM, READ) in goroutine
- Return array

---

### `handlers/doctor.go`

**GET /api/doctor/patients:**
- Load all `PatientProfile` records with preloaded `User`
- Return array with basic info
- **Do NOT fire individual audit events here** (list is informational)

**GET /api/doctor/patients/:id:**
- Load `PatientProfile` by ID (UUID param)
- Preload `User`
- Fire audit event (READ, EMPLOYEE, TREATMENT) in goroutine
- Return profile

**GET /api/doctor/patients/:id/records:**
- Load `MedicalRecord` where `patient_id = :id`
- Preload `Doctor`
- Fire audit event (READ, EMPLOYEE, TREATMENT, CRITICAL) in goroutine
- Return array

**GET /api/doctor/patients/:id/appointments:**
- Load `Appointment` where `patient_id = :id`
- Preload `Doctor`
- Return array

---

### `handlers/privacy.go`

**GET /api/privacy/dashboard-link:**
- Get `userID` from context
- Build URL: `AUDIT_SERVICE_URL/dashboard?tenant_id=<AUDIT_TENANT_ID>&user_id=<userID>`
- Return JSON with `url` field

**POST /api/privacy/export:**
- Get `userID` from context
- Fire audit event (EXPORT, SYSTEM, GDPR_REQUEST) in goroutine
- Return 202

**DELETE /api/privacy/delete:**
- Get `userID` from context
- Fire audit event (DELETE, SYSTEM, GDPR_REQUEST) in goroutine
- Return 202

---

### `routes/routes.go`
Wire all routes with Gin:
```
POST   /api/auth/register       → auth.Register
POST   /api/auth/login          → auth.Login

// Patient group (AuthMiddleware + RequireRole("patient"))
GET    /api/patient/me                    → patient.GetMe
PUT    /api/patient/me                    → patient.UpdateMe
GET    /api/patient/records               → patient.GetRecords
GET    /api/patient/appointments          → patient.GetAppointments
GET    /api/patient/emergency-contacts    → patient.GetEmergencyContacts
GET    /api/patient/insurance             → patient.GetInsurance

// Doctor group (AuthMiddleware + RequireRole("doctor"))
GET    /api/doctor/patients               → doctor.ListPatients
GET    /api/doctor/patients/:id           → doctor.GetPatient
GET    /api/doctor/patients/:id/records   → doctor.GetPatientRecords
GET    /api/doctor/patients/:id/appointments → doctor.GetPatientAppointments

// Privacy group (AuthMiddleware, any role)
GET    /api/privacy/dashboard-link   → privacy.DashboardLink
POST   /api/privacy/export           → privacy.Export
DELETE /api/privacy/delete           → privacy.Delete
```

CORS: Allow all origins in dev (`gin-contrib/cors` or manual header setting).

---

### `seed/seed.go`
Idempotent seeder. Before inserting, check by email — if record exists, skip.

Seed data:
- **Doctor:** sarah.mitchell@healthdemo.com / doctor123 / role: doctor
- **Patient 1:** james.obrien@demo.com / patient123 / DOB: 1985-03-14 / Blood: A+ / Diagnosis: Type 2 Diabetes
- **Patient 2:** aoife.byrne@demo.com / patient123 / DOB: 1992-07-22 / Blood: O- / Diagnosis: Hypertension
- **Patient 3:** conor.walsh@demo.com / patient123 / DOB: 1978-11-05 / Blood: B+ / Diagnosis: Asthma

Each patient also gets:
- 1 medical record (with the diagnosis above, prescriptions, test results)
- 2 appointments (one completed, one scheduled)
- 1 emergency contact
- 1 insurance detail

Full seed data in `seed/seed.go`.

---

### `main.go`
1. Load env (`config.LoadEnv()`)
2. Init DB (`config.InitDB()`)
3. If `--seed` flag: run `seed.Run(db)`
4. Set up Gin router
5. Mount routes
6. Listen on `PORT` env var (default 8081)

---

### `audit/client.go`
See `docs/privacy_integration.md` for full implementation.
Package: `audit`
Single exported function: `func SendEvent(event AuditEvent)`
