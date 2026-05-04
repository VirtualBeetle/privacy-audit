package simulation

import (
	"log"
	"math/rand"
	"time"

	"github.com/VirtualBeetle/privacy-health-tenant/audit"
	"github.com/VirtualBeetle/privacy-health-tenant/models"
	"gorm.io/gorm"
)

// RunScheduler starts background audit event simulation goroutines.
// Fires realistic 3rd-party data access events automatically for demo realism.
func RunScheduler(db *gorm.DB) {
	go func() {
		// Stagger start so we fire one event immediately on boot
		time.Sleep(30 * time.Second)
		TriggerOnce(db)

		billingTicker := time.NewTicker(3 * time.Minute)
		reminderTicker := time.NewTicker(5 * time.Minute)
		analyticsTicker := time.NewTicker(7 * time.Minute)

		for {
			select {
			case <-billingTicker.C:
				fireInsuranceBilling(db)
			case <-reminderTicker.C:
				fireAppointmentReminder(db)
			case <-analyticsTicker.C:
				fireMedicalAnalytics(db)
			}
		}
	}()
	log.Println("[scheduler] Background event simulation started (insurance/reminder/analytics)")
}

// TriggerOnce fires one round of all simulation types for a random patient.
// Called by the dev endpoint for on-demand triggering.
func TriggerOnce(db *gorm.DB) map[string]interface{} {
	patients := randomPatients(db, 2)
	if len(patients) == 0 {
		return map[string]interface{}{"patients": 0, "message": "no patients in DB"}
	}
	for _, p := range patients {
		p := p
		go fireInsuranceBillingFor(p)
		go fireReminderFor(p)
		go fireAnalyticsFor(p)
	}
	return map[string]interface{}{
		"patients":           len(patients),
		"events_per_patient": 3,
		"total_events":       len(patients) * 3,
	}
}

func fireInsuranceBilling(db *gorm.DB) {
	for _, p := range randomPatients(db, 1) {
		go fireInsuranceBillingFor(p)
	}
}

func fireInsuranceBillingFor(p models.PatientProfile) {
	audit.Send(audit.Event{
		TenantUserID: p.UserID.String(),
		Action:       audit.ActionField{Code: "READ", Label: "Read"},
		DataFields:   []string{"insurance_details", "diagnosis", "prescription"},
		Reason:       audit.ReasonField{Code: "BILLING", Label: "Insurance claim processing"},
		Actor: audit.ActorField{
			Type:       "THIRD_PARTY",
			Label:      "Insurance Provider",
			Identifier: "HealthShield Insurance Ltd.",
		},
		Sensitivity:        audit.SensitivityField{Code: "HIGH", Label: "High sensitivity"},
		ThirdPartyInvolved: true,
		ThirdPartyName:     "HealthShield Insurance Ltd.",
		Meta:               map[string]interface{}{"feature": "insurance_billing", "automated": true},
	})
}

func fireAppointmentReminder(db *gorm.DB) {
	for _, p := range randomPatients(db, 2) {
		go fireReminderFor(p)
	}
}

func fireReminderFor(p models.PatientProfile) {
	audit.Send(audit.Event{
		TenantUserID: p.UserID.String(),
		Action:       audit.ActionField{Code: "READ", Label: "Read"},
		DataFields:   []string{"email", "phone_number", "appointment_date"},
		Reason:       audit.ReasonField{Code: "APPOINTMENT_REMINDER", Label: "Automated appointment reminder"},
		Actor: audit.ActorField{
			Type:       "SYSTEM",
			Label:      "Reminder Service",
			Identifier: "health-reminder-service",
		},
		Sensitivity: audit.SensitivityField{Code: "MEDIUM", Label: "Medium sensitivity"},
		Meta:        map[string]interface{}{"feature": "appointment_reminder", "automated": true},
	})
}

func fireMedicalAnalytics(db *gorm.DB) {
	for _, p := range randomPatients(db, 1) {
		go fireAnalyticsFor(p)
	}
}

func fireAnalyticsFor(p models.PatientProfile) {
	audit.Send(audit.Event{
		TenantUserID: p.UserID.String(),
		Action:       audit.ActionField{Code: "READ", Label: "Read"},
		DataFields:   []string{"diagnosis", "blood_type", "date_of_birth"},
		Reason:       audit.ReasonField{Code: "ANALYTICS", Label: "Anonymised medical research analytics"},
		Actor: audit.ActorField{
			Type:       "THIRD_PARTY",
			Label:      "MedResearch Analytics",
			Identifier: "MedResearch Analytics Ltd.",
		},
		Sensitivity:        audit.SensitivityField{Code: "HIGH", Label: "High sensitivity"},
		ThirdPartyInvolved: true,
		ThirdPartyName:     "MedResearch Analytics Ltd.",
		Meta:               map[string]interface{}{"feature": "medical_analytics", "automated": true},
	})
}

func randomPatients(db *gorm.DB, n int) []models.PatientProfile {
	var patients []models.PatientProfile
	db.Find(&patients)
	if len(patients) == 0 {
		return nil
	}
	rand.Shuffle(len(patients), func(i, j int) { patients[i], patients[j] = patients[j], patients[i] })
	if n > len(patients) {
		n = len(patients)
	}
	return patients[:n]
}
