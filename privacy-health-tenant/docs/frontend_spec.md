# Frontend Spec — Health Tenant App

## Stack: Vite + React + TypeScript
## Port: 3001
## API proxy: all `/api/*` → `http://localhost:8081`

---

## Setup

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install axios react-router-dom
```

---

## File Structure

```
frontend/src/
├── main.tsx                    ← render App inside BrowserRouter + AuthProvider
├── App.tsx                     ← route definitions
├── api/
│   └── client.ts               ← axios instance, auto-attach JWT
├── context/
│   └── AuthContext.tsx         ← user state, login/logout, token storage
├── hooks/
│   ├── useAuth.ts              ← consume AuthContext
│   └── usePatient.ts           ← data fetching hooks for patient data
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── PatientDashboard.tsx    ← overview: profile summary + quick links
│   ├── MedicalRecords.tsx      ← table of medical records
│   ├── Appointments.tsx        ← table of appointments
│   ├── Profile.tsx             ← view/edit own profile
│   ├── DoctorDashboard.tsx     ← doctor: list of patients
│   ├── PatientDetail.tsx       ← doctor: one patient's full info (records + appointments)
│   └── PrivacySettings.tsx     ← privacy dashboard link + export + delete buttons
└── components/
    ├── Navbar.tsx              ← top nav with role-based links + logout
    ├── ProtectedRoute.tsx      ← redirect to /login if not authenticated
    └── RecordCard.tsx          ← renders a single medical record
```

---

## `api/client.ts`

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
```

---

## `context/AuthContext.tsx`

State:
```typescript
interface AuthUser {
  user_id: string;
  role: 'patient' | 'doctor';
  token: string;
}
```

Functions:
- `login(token, role, user_id)` — save to state + localStorage
- `logout()` — clear state + localStorage + redirect to /login
- On mount: read from localStorage to restore session

---

## `App.tsx` — Routes

```
/               → redirect to /login
/login          → <Login />          (public)
/register       → <Register />       (public)

/patient/dashboard  → <PatientDashboard />   (protected, role: patient)
/patient/records    → <MedicalRecords />     (protected, role: patient)
/patient/appointments → <Appointments />     (protected, role: patient)
/patient/profile    → <Profile />           (protected, role: patient)
/patient/privacy    → <PrivacySettings />   (protected, role: patient)

/doctor/dashboard   → <DoctorDashboard />   (protected, role: doctor)
/doctor/patients/:id → <PatientDetail />    (protected, role: doctor)
```

---

## Page Specs

### `Login.tsx`
- Email + password form
- Call `POST /api/auth/login`
- On success: call `auth.login(token, role, user_id)`
- Redirect based on role: patient → `/patient/dashboard`, doctor → `/doctor/dashboard`
- Show error message on failed login

---

### `Register.tsx`
- Fields: email, password, full_name, date_of_birth, gender, blood_type, phone, address
- Call `POST /api/auth/register`
- On success: redirect to `/login`

---

### `PatientDashboard.tsx`
- Show welcome message with patient name
- Cards/sections for: Medical Records (count), Appointments (count), Profile summary
- Quick links to each section
- Link to Privacy Settings

---

### `MedicalRecords.tsx`
- Fetch `GET /api/patient/records`
- Display as list of `<RecordCard />` components
- Each card shows: diagnosis, prescriptions, test results, record date, doctor name

---

### `Appointments.tsx`
- Fetch `GET /api/patient/appointments`
- Display as table with columns: Date/Time, Doctor, Status (badge), Notes
- Status badge colors: scheduled=blue, completed=green, cancelled=red

---

### `Profile.tsx`
- Fetch `GET /api/patient/me`
- Display profile fields
- Inline edit form (toggle edit mode)
- Also display emergency contacts (GET /api/patient/emergency-contacts)
- Also display insurance details (GET /api/patient/insurance)
- Call `PUT /api/patient/me` to save

---

### `DoctorDashboard.tsx`
- Fetch `GET /api/doctor/patients`
- Display as table: full name, DOB, blood type, email
- Each row has a "View" button → navigate to `/doctor/patients/:id`

---

### `PatientDetail.tsx`
- Route param: `:id` (patient_profiles.id)
- Fetch `GET /api/doctor/patients/:id` → profile
- Fetch `GET /api/doctor/patients/:id/records` → records
- Fetch `GET /api/doctor/patients/:id/appointments` → appointments
- Display in tabs or sections: Profile | Records | Appointments
- Note: **These fetches trigger privacy audit events server-side**

---

### `PrivacySettings.tsx`
- Fetch `GET /api/privacy/dashboard-link` → display as clickable link (opens new tab)
- Button: "Request Data Export" → `POST /api/privacy/export` → show success message
- Button: "Request Account Deletion" → confirmation dialog → `DELETE /api/privacy/delete` → show success message
- Explain each action briefly (GDPR Article 17 / 20)

---

## `components/Navbar.tsx`
- Show app name ("HealthDemo")
- If patient: links to Dashboard, Records, Appointments, Profile, Privacy Settings
- If doctor: links to Patient List
- Logout button (calls `auth.logout()`)

---

## `components/ProtectedRoute.tsx`
- Wrap routes that require auth
- If no token: redirect to `/login`
- Optional `requiredRole` prop: if role mismatch, redirect to appropriate dashboard

---

## `components/RecordCard.tsx`
Props:
```typescript
interface RecordCardProps {
  diagnosis: string;
  prescriptions: string;
  test_results: string;
  record_date: string;
  doctor_name: string;
}
```
Renders as a styled card.

---

## `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})
```

---

## Styling

Use plain CSS or inline styles. No UI library required. Keep it clean and functional — this is a demo app. Dark/light theme not required.

Simple consistent color scheme:
- Primary: `#2563eb` (blue)
- Success: `#16a34a` (green)
- Danger: `#dc2626` (red)
- Background: `#f8fafc`
- Card background: `#ffffff`
