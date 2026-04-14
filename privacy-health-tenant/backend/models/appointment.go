package models

import (
	"time"

	"github.com/google/uuid"
)

type Appointment struct {
	ID          uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	PatientID   uuid.UUID  `gorm:"type:uuid;not null;index"`
	DoctorID    uuid.UUID  `gorm:"type:uuid;not null"`
	ScheduledAt *time.Time
	Status      string // "scheduled" | "completed" | "cancelled"
	Notes       string
	CreatedAt   time.Time
	Patient     PatientProfile `gorm:"foreignKey:PatientID"`
	Doctor      User           `gorm:"foreignKey:DoctorID"`
}
