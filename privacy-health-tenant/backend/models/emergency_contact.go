package models

import "github.com/google/uuid"

type EmergencyContact struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	PatientID    uuid.UUID `gorm:"type:uuid;not null;index"`
	Name         string
	Relationship string
	Phone        string
	Patient      PatientProfile `gorm:"foreignKey:PatientID"`
}
