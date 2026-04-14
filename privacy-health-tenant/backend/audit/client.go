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
	TenantID           string                 `json:"tenant_id"`
	TenantUserID       string                 `json:"tenant_user_id"`
	EventID            string                 `json:"event_id"`
	Timestamp          string                 `json:"timestamp"`
	Action             ActionField            `json:"action"`
	DataFields         []string               `json:"data_fields"`
	Reason             ReasonField            `json:"reason"`
	Actor              ActorField             `json:"actor"`
	Sensitivity        SensitivityField       `json:"sensitivity"`
	ThirdPartyInvolved bool                   `json:"third_party_involved"`
	ThirdPartyName     string                 `json:"third_party_name"`
	RetentionDays      int                    `json:"retention_days"`
	Region             string                 `json:"region"`
	ConsentObtained    bool                   `json:"consent_obtained"`
	UserOptedOut       bool                   `json:"user_opted_out"`
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
	e.Timestamp = time.Now().UTC().Format(time.RFC3339)
	e.TenantID = os.Getenv("AUDIT_TENANT_ID")
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
