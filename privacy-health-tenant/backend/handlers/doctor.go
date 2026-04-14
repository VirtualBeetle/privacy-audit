package handlers

import (
	"net/http"
	"time"

	"github.com/VirtualBeetle/privacy-health-tenant/audit"
	"github.com/VirtualBeetle/privacy-health-tenant/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DoctorHandler struct {
	DB *gorm.DB
}

func (h *DoctorHandler) ListPatients(c *gin.Context) {
	var profiles []models.PatientProfile
	h.DB.Preload("User").Find(&profiles)

	result := make([]gin.H, 0, len(profiles))
	for _, p := range profiles {
		var dob *string
		if p.DateOfBirth != nil {
			s := p.DateOfBirth.Format("2006-01-02")
			dob = &s
		}
		result = append(result, gin.H{
			"patient_id":    p.ID,
			"user_id":       p.UserID,
			"full_name":     p.FullName,
			"date_of_birth": dob,
			"blood_type":    p.BloodType,
			"email":         p.User.Email,
		})
	}
	c.JSON(http.StatusOK, result)
}

func (h *DoctorHandler) GetPatient(c *gin.Context) {
	patientID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
		return
	}

	var profile models.PatientProfile
	if err := h.DB.Preload("User").First(&profile, "id = ?", patientID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}

	doctorID := c.GetString("userID")
	var doctor models.User
	h.DB.First(&doctor, "id = ?", doctorID)

	// Fire audit event — doctor views patient profile
	go audit.Send(audit.Event{
		TenantUserID: profile.UserID.String(),
		Action:       audit.ActionField{Code: "READ", Label: "Read"},
		DataFields:   []string{"full_name", "date_of_birth", "blood_type", "phone", "address"},
		Reason:       audit.ReasonField{Code: "TREATMENT", Label: "Used for medical treatment"},
		Actor:        audit.ActorField{Type: "EMPLOYEE", Label: "Doctor", Identifier: doctor.Email},
		Sensitivity:  audit.SensitivityField{Code: "HIGH", Label: "High sensitivity"},
		Meta:         map[string]interface{}{"feature": "doctor_patient_view"},
	})

	var dob *string
	if profile.DateOfBirth != nil {
		s := profile.DateOfBirth.Format("2006-01-02")
		dob = &s
	}

	c.JSON(http.StatusOK, gin.H{
		"patient_id":    profile.ID,
		"user_id":       profile.UserID,
		"email":         profile.User.Email,
		"full_name":     profile.FullName,
		"date_of_birth": dob,
		"gender":        profile.Gender,
		"blood_type":    profile.BloodType,
		"phone":         profile.Phone,
		"address":       profile.Address,
	})
}

func (h *DoctorHandler) GetPatientRecords(c *gin.Context) {
	patientID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
		return
	}

	var profile models.PatientProfile
	if err := h.DB.First(&profile, "id = ?", patientID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}

	var records []models.MedicalRecord
	h.DB.Preload("Doctor").Where("patient_id = ?", patientID).Find(&records)

	doctorID := c.GetString("userID")
	var doctor models.User
	h.DB.First(&doctor, "id = ?", doctorID)

	// Fire audit event — doctor views medical records
	go audit.Send(audit.Event{
		TenantUserID: profile.UserID.String(),
		Action:       audit.ActionField{Code: "READ", Label: "Read"},
		DataFields:   []string{"diagnosis", "prescriptions", "test_results"},
		Reason:       audit.ReasonField{Code: "TREATMENT", Label: "Used for medical treatment"},
		Actor:        audit.ActorField{Type: "EMPLOYEE", Label: "Doctor", Identifier: doctor.Email},
		Sensitivity:  audit.SensitivityField{Code: "CRITICAL", Label: "Critical sensitivity"},
		Meta:         map[string]interface{}{"feature": "medical_records_view"},
	})

	result := make([]gin.H, 0, len(records))
	for _, r := range records {
		var rd *string
		if r.RecordDate != nil {
			s := r.RecordDate.Format("2006-01-02")
			rd = &s
		}
		result = append(result, gin.H{
			"id":            r.ID,
			"diagnosis":     r.Diagnosis,
			"prescriptions": r.Prescriptions,
			"test_results":  r.TestResults,
			"record_date":   rd,
			"doctor_name":   r.Doctor.Email,
		})
	}
	c.JSON(http.StatusOK, result)
}

func (h *DoctorHandler) GetPatientAppointments(c *gin.Context) {
	patientID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
		return
	}

	var appointments []models.Appointment
	h.DB.Preload("Doctor").Where("patient_id = ?", patientID).Order("scheduled_at desc").Find(&appointments)

	result := make([]gin.H, 0, len(appointments))
	for _, a := range appointments {
		var sat *string
		if a.ScheduledAt != nil {
			s := a.ScheduledAt.Format(time.RFC3339)
			sat = &s
		}
		result = append(result, gin.H{
			"id":           a.ID,
			"scheduled_at": sat,
			"status":       a.Status,
			"notes":        a.Notes,
			"doctor_name":  a.Doctor.Email,
		})
	}
	c.JSON(http.StatusOK, result)
}
