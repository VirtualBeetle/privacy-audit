package handlers

import (
	"fmt"
	"net/http"
	"os"

	"github.com/VirtualBeetle/privacy-health-tenant/audit"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PrivacyHandler struct {
	DB *gorm.DB
}

func (h *PrivacyHandler) DashboardLink(c *gin.Context) {
	userID := c.GetString("userID")
	serviceURL := os.Getenv("AUDIT_SERVICE_URL")
	tenantID := os.Getenv("AUDIT_TENANT_ID")

	url := fmt.Sprintf("%s/dashboard?tenant_id=%s&user_id=%s", serviceURL, tenantID, userID)
	c.JSON(http.StatusOK, gin.H{"url": url})
}

func (h *PrivacyHandler) Export(c *gin.Context) {
	userID := c.GetString("userID")

	go audit.Send(audit.Event{
		TenantUserID: userID,
		Action:       audit.ActionField{Code: "EXPORT", Label: "Export"},
		DataFields:   []string{"all_fields"},
		Reason:       audit.ReasonField{Code: "GDPR_REQUEST", Label: "GDPR Article 20 data portability request"},
		Actor:        audit.ActorField{Type: "SYSTEM", Label: "System", Identifier: "health-export-service"},
		Sensitivity:  audit.SensitivityField{Code: "HIGH", Label: "High sensitivity"},
		Meta: map[string]interface{}{
			"feature":     "gdpr_export",
			"legal_basis": "GDPR Article 20",
		},
	})

	c.JSON(http.StatusAccepted, gin.H{
		"message": "export request received — you will be notified when your data is ready",
	})
}

func (h *PrivacyHandler) Delete(c *gin.Context) {
	userID := c.GetString("userID")

	go audit.Send(audit.Event{
		TenantUserID: userID,
		Action:       audit.ActionField{Code: "DELETE", Label: "Delete"},
		DataFields:   []string{"all_fields"},
		Reason:       audit.ReasonField{Code: "GDPR_REQUEST", Label: "GDPR Article 17 right to erasure request"},
		Actor:        audit.ActorField{Type: "SYSTEM", Label: "System", Identifier: "health-deletion-service"},
		Sensitivity:  audit.SensitivityField{Code: "HIGH", Label: "High sensitivity"},
		Meta: map[string]interface{}{
			"feature":     "gdpr_deletion",
			"legal_basis": "GDPR Article 17",
		},
	})

	c.JSON(http.StatusAccepted, gin.H{
		"message": "deletion request received — your account will be erased within 30 days",
	})
}
