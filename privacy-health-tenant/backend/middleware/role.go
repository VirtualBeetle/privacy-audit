package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequireRole returns a middleware that allows only the given roles.
func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}

	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || !allowed[role.(string)] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
		c.Next()
	}
}
