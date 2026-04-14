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

type PatientHandler struct {
	DB *gorm.DB
}

func (h *PatientHandler) getProfile(userID string) (*models.PatientProfile, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	var profile models.PatientProfile
	if err := h.DB.Preload("User").Where("user_id = ?", uid).First(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (h *PatientHandler) GetMe(c *gin.Context) {
	userID := c.GetString("userID")
	profile, err := h.getProfile(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
		return
	}

	var dob *string
	if profile.DateOfBirth != nil {
		s := profile.DateOfBirth.Format("2006-01-02")
		dob = &s
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id": profile.UserID,
		"email":   profile.User.Email,
		"role":    profile.User.Role,
		"profile": gin.H{
			"full_name":     profile.FullName,
			"date_of_birth": dob,
			"gender":        profile.Gender,
			"blood_type":    profile.BloodType,
			"phone":         profile.Phone,
			"address":       profile.Address,
		},
	})
}

func (h *PatientHandler) UpdateMe(c *gin.Context) {
	userID := c.GetString("userID")
	profile, err := h.getProfile(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
		return
	}

	var input struct {
		FullName string `json:"full_name"`
		Gender   string `json:"gender"`
		Phone    string `json:"phone"`
		Address  string `json:"address"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.FullName != "" {
		updates["full_name"] = input.FullName
	}
	if input.Gender != "" {
		updates["gender"] = input.Gender
	}
	if input.Phone != "" {
		updates["phone"] = input.Phone
	}
	if input.Address != "" {
		updates["address"] = input.Address
	}

	h.DB.Model(profile).Updates(updates)
	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}

func (h *PatientHandler) GetRecords(c *gin.Context) {
	userID := c.GetString("userID")
	profile, err := h.getProfile(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
		return
	}

	var records []models.MedicalRecord
	h.DB.Preload("Doctor").Where("patient_id = ?", profile.ID).Find(&records)

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

func (h *PatientHandler) GetAppointments(c *gin.Context) {
	userID := c.GetString("userID")
	profile, err := h.getProfile(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
		return
	}

	var appointments []models.Appointment
	h.DB.Preload("Doctor").Where("patient_id = ?", profile.ID).Order("scheduled_at desc").Find(&appointments)

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

func (h *PatientHandler) GetEmergencyContacts(c *gin.Context) {
	userID := c.GetString("userID")
	profile, err := h.getProfile(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
		return
	}

	var contacts []models.EmergencyContact
	h.DB.Where("patient_id = ?", profile.ID).Find(&contacts)
	c.JSON(http.StatusOK, contacts)
}

func (h *PatientHandler) GetInsurance(c *gin.Context) {
	userID := c.GetString("userID")
	profile, err := h.getProfile(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
		return
	}

	var insurance []models.InsuranceDetail
	h.DB.Where("patient_id = ?", profile.ID).Find(&insurance)

	// Fire audit event — insurance access triggers BILLING event
	go audit.Send(audit.Event{
		TenantUserID: userID,
		Action:       audit.ActionField{Code: "READ", Label: "Read"},
		DataFields:   []string{"policy_number", "coverage_type", "provider_name"},
		Reason:       audit.ReasonField{Code: "BILLING", Label: "Used for billing and insurance processing"},
		Actor:        audit.ActorField{Type: "SYSTEM", Label: "Billing System", Identifier: "health-billing-service"},
		Sensitivity:  audit.SensitivityField{Code: "MEDIUM", Label: "Medium sensitivity"},
		Meta:         map[string]interface{}{"feature": "insurance_lookup"},
	})

	c.JSON(http.StatusOK, insurance)
}
