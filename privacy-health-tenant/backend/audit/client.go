package audit

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
)

type ActionField struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}

type ReasonField struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}

type ActorField struct {
	Type       string `json:"type"`
	Label      string `json:"label"`
	Identifier string `json:"identifier"`
}

type SensitivityField struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}

type Event struct {
	TenantUserID       string                 `json:"tenantUserId"`
	EventID            string                 `json:"eventId"`
	OccurredAt         string                 `json:"occurredAt"`
	Action             ActionField            `json:"action"`
	DataFields         []string               `json:"dataFields"`
	Reason             ReasonField            `json:"reason"`
	Actor              ActorField             `json:"actor"`
	Sensitivity        SensitivityField       `json:"sensitivity"`
	ThirdPartyInvolved bool                   `json:"thirdPartyInvolved"`
	ThirdPartyName     string                 `json:"thirdPartyName"`
	RetentionDays      int                    `json:"retentionDays"`
	Region             string                 `json:"region"`
	ConsentObtained    bool                   `json:"consentObtained"`
	UserOptedOut       bool                   `json:"userOptedOut"`
	Meta               map[string]interface{} `json:"meta"`
}

// Send fires an audit event to the Privacy Audit Service.
// It is safe to call in a goroutine. Errors are logged but never returned.
func Send(e Event) {
	serviceURL := os.Getenv("AUDIT_SERVICE_URL")
	apiKey := os.Getenv("AUDIT_API_KEY")
	if serviceURL == "" {
		return
	}

	e.EventID = uuid.New().String()
	e.OccurredAt = time.Now().UTC().Format(time.RFC3339)
	e.RetentionDays = 90
	e.Region = "IE"
	e.ConsentObtained = true
	e.UserOptedOut = false

	body, err := json.Marshal(e)
	if err != nil {
		log.Printf("[audit] marshal error: %v", err)
		return
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/events", serviceURL), bytes.NewBuffer(body))
	if err != nil {
		log.Printf("[audit] request error: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", apiKey)

	c := &http.Client{Timeout: 5 * time.Second}
	resp, err := c.Do(req)
	if err != nil {
		log.Printf("[audit] send failed: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("[audit] event sent status=%d action=%s user=%s", resp.StatusCode, e.Action.Code, e.TenantUserID)
}
