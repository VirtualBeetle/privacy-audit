// Package privacyaudit provides a Go client for the Privacy Audit Service.
//
// Usage (Mode 1 — synchronous):
//
//	client := privacyaudit.New("https://api.example.com", "your-api-key")
//	err := client.Send(ctx, privacyaudit.Event{
//	    EventID:     "evt-001",
//	    TenantUserID: "user-123",
//	    OccurredAt:  time.Now(),
//	    Action:      privacyaudit.Action{Code: "READ", Label: "Patient profile read"},
//	    Reason:      privacyaudit.Reason{Code: "TREATMENT", Label: "Clinical care"},
//	    Actor:       privacyaudit.Actor{Type: "EMPLOYEE", Label: "Dr. Mitchell"},
//	    DataFields:  []string{"full_name", "dob", "blood_type"},
//	    Sensitivity: privacyaudit.Sensitivity{Code: "HIGH"},
//	})
package privacyaudit

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// ─── Types ────────────────────────────────────────────────────────────────────

type Action struct {
	Code  string `json:"code"`
	Label string `json:"label,omitempty"`
}

type Reason struct {
	Code  string `json:"code"`
	Label string `json:"label,omitempty"`
}

type Actor struct {
	Type       string  `json:"type"`
	Label      string  `json:"label,omitempty"`
	Identifier *string `json:"identifier,omitempty"`
}

type Sensitivity struct {
	Code string `json:"code"`
}

// Event is the payload sent to POST /api/events.
type Event struct {
	EventID           string            `json:"eventId"`
	TenantUserID      string            `json:"tenantUserId"`
	OccurredAt        time.Time         `json:"occurredAt"`
	Action            Action            `json:"action"`
	Reason            Reason            `json:"reason"`
	Actor             Actor             `json:"actor"`
	DataFields        []string          `json:"dataFields"`
	Sensitivity       Sensitivity       `json:"sensitivity"`
	ThirdPartyInvolved bool             `json:"thirdPartyInvolved,omitempty"`
	ThirdPartyName    *string           `json:"thirdPartyName,omitempty"`
	RetentionDays     int               `json:"retentionDays,omitempty"`
	Region            string            `json:"region,omitempty"`
	ConsentObtained   bool              `json:"consentObtained,omitempty"`
	UserOptedOut      bool              `json:"userOptedOut,omitempty"`
	Meta              map[string]string `json:"meta,omitempty"`
}

// ─── Client ───────────────────────────────────────────────────────────────────

// Client sends audit events to the Privacy Audit Service.
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// New creates a new Client.
//
//	baseURL  – root URL of the audit service, e.g. "https://audit.example.com"
//	apiKey   – tenant API key (sent in the x-api-key header)
func New(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Send posts a single audit event. It returns nil on HTTP 202.
// On a non-2xx response, it returns a descriptive error.
func (c *Client) Send(ctx context.Context, event Event) error {
	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("privacyaudit: marshal event: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/api/events",
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("privacyaudit: create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("privacyaudit: send event: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusConflict {
		// Duplicate eventId — safe to ignore.
		return nil
	}

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("privacyaudit: unexpected status %d", resp.StatusCode)
	}

	return nil
}

// SendAsync sends an audit event in a separate goroutine and discards errors.
// Use this for fire-and-forget reporting where audit failures must not block
// the primary request.
func (c *Client) SendAsync(ctx context.Context, event Event) {
	go func() {
		_ = c.Send(ctx, event)
	}()
}

// IssueUserToken calls POST /api/dashboard/token and returns the handshake
// token and its redirect URL. The tenant app embeds this URL in the
// "View my privacy" link shown to the user.
func (c *Client) IssueUserToken(ctx context.Context, tenantUserID string) (token, redirectURL string, err error) {
	body, _ := json.Marshal(map[string]string{"tenantUserId": tenantUserID})

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/api/dashboard/token",
		bytes.NewReader(body),
	)
	if err != nil {
		return "", "", fmt.Errorf("privacyaudit: create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("privacyaudit: issue token: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Token       string `json:"token"`
		RedirectURL string `json:"redirectUrl"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", fmt.Errorf("privacyaudit: decode response: %w", err)
	}

	return result.Token, result.RedirectURL, nil
}
