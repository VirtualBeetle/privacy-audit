package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/VirtualBeetle/privacy-health-tenant/audit"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PrivacyHandler struct {
	DB *gorm.DB
}

func (h *PrivacyHandler) DashboardLink(c *gin.Context) {
	// Kept for backwards compat — redirects to the token-based flow.
	url, err := buildDashboardURL(c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"url": url})
}

// DashboardToken issues a short-lived SSO token and returns the DataGuard
// login URL with ?token= so the user lands directly on their dashboard.
func (h *PrivacyHandler) DashboardToken(c *gin.Context) {
	url, err := buildDashboardURL(c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"url": url})
}

func buildDashboardURL(userID string) (string, error) {
	auditURL := os.Getenv("AUDIT_SERVICE_URL")
	if auditURL == "" {
		auditURL = "http://localhost:8080"
	}
	apiKey := os.Getenv("AUDIT_API_KEY")
	dashboardURL := os.Getenv("DASHBOARD_BASE_URL")
	if dashboardURL == "" {
		dashboardURL = "http://localhost:3000"
	}

	body := fmt.Sprintf(`{"tenantUserId":"%s"}`, userID)
	req, err := http.NewRequest("POST", auditURL+"/api/dashboard/token", strings.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to build request")
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("audit service unavailable")
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("invalid audit response")
	}

	token, ok := result["handshakeToken"].(string)
	if !ok || token == "" {
		return "", fmt.Errorf("no token returned by audit service")
	}

	return fmt.Sprintf("%s/login?token=%s", dashboardURL, token), nil
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
