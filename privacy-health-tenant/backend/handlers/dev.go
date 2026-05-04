package handlers

import (
	"net/http"

	"github.com/VirtualBeetle/privacy-health-tenant/simulation"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DevHandler struct {
	DB *gorm.DB
}

// POST /api/dev/simulate
// Manually trigger one round of background event simulation for demo purposes.
func (h *DevHandler) Simulate(c *gin.Context) {
	result := simulation.TriggerOnce(h.DB)
	c.JSON(http.StatusOK, gin.H{
		"message": "Simulation triggered — firing insurance, reminder, and analytics events",
		"result":  result,
	})
}
