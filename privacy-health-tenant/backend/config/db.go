package config

import (
	"fmt"
	"log"
	"os"

	"github.com/VirtualBeetle/privacy-health-tenant/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() *gorm.DB {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("[db] failed to connect: %v", err)
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.PatientProfile{},
		&models.MedicalRecord{},
		&models.Appointment{},
		&models.EmergencyContact{},
		&models.InsuranceDetail{},
	); err != nil {
		log.Fatalf("[db] automigrate failed: %v", err)
	}

	log.Println("[db] connected and migrated")
	DB = db
	return db
}
