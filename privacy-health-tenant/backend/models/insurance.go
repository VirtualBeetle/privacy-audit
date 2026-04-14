package models

import (
	"time"

	"github.com/google/uuid"
)

type InsuranceDetail struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	PatientID    uuid.UUID  `gorm:"type:uuid;not null;index"`
	ProviderName string
	PolicyNumber string
	CoverageType string
	ExpiryDate   *time.Time
	Patient      PatientProfile `gorm:"foreignKey:PatientID"`
}
