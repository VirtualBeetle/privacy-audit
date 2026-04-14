package models

import (
	"time"

	"github.com/google/uuid"
)

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
