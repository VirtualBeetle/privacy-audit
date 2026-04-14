package models

import (
	"time"

	"github.com/google/uuid"
)

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
