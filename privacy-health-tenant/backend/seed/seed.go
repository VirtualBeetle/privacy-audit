package seed

import (
	"log"
	"time"

	"github.com/VirtualBeetle/privacy-health-tenant/models"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func hash(password string) string {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("[seed] bcrypt error: %v", err)
	}
	return string(b)
}

func parseDate(s string) *time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

func parseDateTime(s string) *time.Time {
	t, err := time.Parse("2006-01-02T15:04:05Z", s)
	if err != nil {
		return nil
	}
	return &t
}

func Run(db *gorm.DB) {
	log.Println("[seed] running...")

	// ── Doctor ──────────────────────────────────────────────────────────────
	doctor := upsertUser(db, "sarah.mitchell@healthdemo.com", "doctor123", "doctor")

	// ── Patient 1: James O'Brien ─────────────────────────────────────────
	james := upsertUser(db, "james.obrien@demo.com", "patient123", "patient")
	jamesProfile := upsertPatient(db, james.ID, models.PatientProfile{
		FullName:    "James O'Brien",
		DateOfBirth: parseDate("1985-03-14"),
		Gender:      "male",
		BloodType:   "A+",
		Phone:       "+353 87 123 4567",
		Address:     "12 Grafton Street, Dublin 2, Ireland",
	})
	upsertRecord(db, jamesProfile.ID, doctor.ID, models.MedicalRecord{
		Diagnosis:     "Type 2 Diabetes",
		Prescriptions: "Metformin 500mg twice daily",
		TestResults:   "HbA1c 7.2%",
		RecordDate:    parseDate("2024-01-15"),
	})
	upsertAppointment(db, jamesProfile.ID, doctor.ID, models.Appointment{
		ScheduledAt: parseDateTime("2024-01-15T10:00:00Z"),
		Status:      "completed",
		Notes:       "Initial diabetes assessment. Prescribed Metformin.",
	})
	upsertAppointment(db, jamesProfile.ID, doctor.ID, models.Appointment{
		ScheduledAt: parseDateTime("2024-04-20T10:00:00Z"),
		Status:      "scheduled",
		Notes:       "3-month HbA1c follow-up",
	})
	upsertEmergencyContact(db, jamesProfile.ID, models.EmergencyContact{
		Name:         "Mary O'Brien",
		Relationship: "Spouse",
		Phone:        "+353 86 555 1234",
	})
	upsertInsurance(db, jamesProfile.ID, models.InsuranceDetail{
		ProviderName: "VHI Healthcare",
		PolicyNumber: "VHI-1234567",
		CoverageType: "Comprehensive",
		ExpiryDate:   parseDate("2025-12-31"),
	})

	// ── Patient 2: Aoife Byrne ───────────────────────────────────────────
	aoife := upsertUser(db, "aoife.byrne@demo.com", "patient123", "patient")
	aoifeProfile := upsertPatient(db, aoife.ID, models.PatientProfile{
		FullName:    "Aoife Byrne",
		DateOfBirth: parseDate("1992-07-22"),
		Gender:      "female",
		BloodType:   "O-",
		Phone:       "+353 85 234 5678",
		Address:     "45 O'Connell Street, Dublin 1, Ireland",
	})
	upsertRecord(db, aoifeProfile.ID, doctor.ID, models.MedicalRecord{
		Diagnosis:     "Hypertension",
		Prescriptions: "Lisinopril 10mg once daily",
		TestResults:   "BP 145/90 mmHg",
		RecordDate:    parseDate("2024-02-10"),
	})
	upsertAppointment(db, aoifeProfile.ID, doctor.ID, models.Appointment{
		ScheduledAt: parseDateTime("2024-02-10T14:00:00Z"),
		Status:      "completed",
		Notes:       "Hypertension diagnosed. Lifestyle changes and Lisinopril prescribed.",
	})
	upsertAppointment(db, aoifeProfile.ID, doctor.ID, models.Appointment{
		ScheduledAt: parseDateTime("2024-05-10T14:00:00Z"),
		Status:      "scheduled",
		Notes:       "Blood pressure monitoring follow-up",
	})
	upsertEmergencyContact(db, aoifeProfile.ID, models.EmergencyContact{
		Name:         "Declan Byrne",
		Relationship: "Father",
		Phone:        "+353 87 666 7890",
	})
	upsertInsurance(db, aoifeProfile.ID, models.InsuranceDetail{
		ProviderName: "Laya Healthcare",
		PolicyNumber: "LAYA-7654321",
		CoverageType: "Essential Plus",
		ExpiryDate:   parseDate("2025-09-30"),
	})

	// ── Patient 3: Conor Walsh ───────────────────────────────────────────
	conor := upsertUser(db, "conor.walsh@demo.com", "patient123", "patient")
	conorProfile := upsertPatient(db, conor.ID, models.PatientProfile{
		FullName:    "Conor Walsh",
		DateOfBirth: parseDate("1978-11-05"),
		Gender:      "male",
		BloodType:   "B+",
		Phone:       "+353 86 345 6789",
		Address:     "78 Baggot Street, Dublin 4, Ireland",
	})
	upsertRecord(db, conorProfile.ID, doctor.ID, models.MedicalRecord{
		Diagnosis:     "Asthma",
		Prescriptions: "Salbutamol inhaler as needed, Fluticasone 100mcg twice daily",
		TestResults:   "Peak flow 420 L/min (85% predicted)",
		RecordDate:    parseDate("2024-03-05"),
	})
	upsertAppointment(db, conorProfile.ID, doctor.ID, models.Appointment{
		ScheduledAt: parseDateTime("2024-03-05T09:00:00Z"),
		Status:      "completed",
		Notes:       "Asthma review. Peak flow within acceptable range.",
	})
	upsertAppointment(db, conorProfile.ID, doctor.ID, models.Appointment{
		ScheduledAt: parseDateTime("2024-06-05T09:00:00Z"),
		Status:      "scheduled",
		Notes:       "Annual asthma review",
	})
	upsertEmergencyContact(db, conorProfile.ID, models.EmergencyContact{
		Name:         "Siobhan Walsh",
		Relationship: "Sister",
		Phone:        "+353 85 777 1234",
	})
	upsertInsurance(db, conorProfile.ID, models.InsuranceDetail{
		ProviderName: "Irish Life Health",
		PolicyNumber: "ILH-9876543",
		CoverageType: "Corporate Plan",
		ExpiryDate:   parseDate("2025-06-30"),
	})

	log.Println("[seed] done — doctor + 3 patients seeded")
}

func upsertUser(db *gorm.DB, email, password, role string) models.User {
	var user models.User
	if err := db.Where("email = ?", email).First(&user).Error; err == nil {
		return user
	}
	user = models.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hash(password),
		Role:         role,
	}
	db.Create(&user)
	return user
}

func upsertPatient(db *gorm.DB, userID uuid.UUID, p models.PatientProfile) models.PatientProfile {
	var existing models.PatientProfile
	if err := db.Where("user_id = ?", userID).First(&existing).Error; err == nil {
		return existing
	}
	p.ID = uuid.New()
	p.UserID = userID
	db.Create(&p)
	return p
}

func upsertRecord(db *gorm.DB, patientID, doctorID uuid.UUID, r models.MedicalRecord) {
	var existing models.MedicalRecord
	if err := db.Where("patient_id = ? AND diagnosis = ?", patientID, r.Diagnosis).First(&existing).Error; err == nil {
		return
	}
	r.ID = uuid.New()
	r.PatientID = patientID
	r.DoctorID = doctorID
	db.Create(&r)
}

func upsertAppointment(db *gorm.DB, patientID, doctorID uuid.UUID, a models.Appointment) {
	var existing models.Appointment
	if err := db.Where("patient_id = ? AND notes = ?", patientID, a.Notes).First(&existing).Error; err == nil {
		return
	}
	a.ID = uuid.New()
	a.PatientID = patientID
	a.DoctorID = doctorID
	db.Create(&a)
}

func upsertEmergencyContact(db *gorm.DB, patientID uuid.UUID, ec models.EmergencyContact) {
	var existing models.EmergencyContact
	if err := db.Where("patient_id = ? AND name = ?", patientID, ec.Name).First(&existing).Error; err == nil {
		return
	}
	ec.ID = uuid.New()
	ec.PatientID = patientID
	db.Create(&ec)
}

func upsertInsurance(db *gorm.DB, patientID uuid.UUID, ins models.InsuranceDetail) {
	var existing models.InsuranceDetail
	if err := db.Where("patient_id = ? AND policy_number = ?", patientID, ins.PolicyNumber).First(&existing).Error; err == nil {
		return
	}
	ins.ID = uuid.New()
	ins.PatientID = patientID
	db.Create(&ins)
}
