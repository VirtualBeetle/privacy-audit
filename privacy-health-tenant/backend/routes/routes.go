package routes

import (
	"github.com/VirtualBeetle/privacy-health-tenant/handlers"
	"github.com/VirtualBeetle/privacy-health-tenant/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(r *gin.Engine, db *gorm.DB) {
	// CORS — allow all origins in dev
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
	}))

	authH := &handlers.AuthHandler{DB: db}
	patientH := &handlers.PatientHandler{DB: db}
	doctorH := &handlers.DoctorHandler{DB: db}
	privacyH := &handlers.PrivacyHandler{DB: db}

	// Health check for Render
	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	// Catch-all OPTIONS handler so CORS middleware fires on every preflight
	r.OPTIONS("/*path", func(c *gin.Context) { c.Status(204) })

	api := r.Group("/api")

	// Public
	api.POST("/auth/register", authH.Register)
	api.POST("/auth/login", authH.Login)

	// Patient routes
	patient := api.Group("/patient", middleware.AuthRequired(), middleware.RequireRole("patient"))
	{
		patient.GET("/me", patientH.GetMe)
		patient.PUT("/me", patientH.UpdateMe)
		patient.GET("/records", patientH.GetRecords)
		patient.GET("/appointments", patientH.GetAppointments)
		patient.GET("/emergency-contacts", patientH.GetEmergencyContacts)
		patient.GET("/insurance", patientH.GetInsurance)
	}

	// Doctor routes
	doctor := api.Group("/doctor", middleware.AuthRequired(), middleware.RequireRole("doctor"))
	{
		doctor.GET("/patients", doctorH.ListPatients)
		doctor.GET("/patients/:id", doctorH.GetPatient)
		doctor.GET("/patients/:id/records", doctorH.GetPatientRecords)
		doctor.GET("/patients/:id/appointments", doctorH.GetPatientAppointments)
	}

	// Privacy routes (any authenticated user)
	privacy := api.Group("/privacy", middleware.AuthRequired())
	{
		privacy.GET("/dashboard-link", privacyH.DashboardLink)
		privacy.GET("/dashboard-token", privacyH.DashboardToken)
		privacy.POST("/export", privacyH.Export)
		privacy.DELETE("/delete", privacyH.Delete)
	}
}
