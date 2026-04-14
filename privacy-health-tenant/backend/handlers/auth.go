package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/VirtualBeetle/privacy-health-tenant/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB *gorm.DB
}

type RegisterInput struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	FullName    string `json:"full_name"`
	DateOfBirth string `json:"date_of_birth"` // "YYYY-MM-DD"
	Gender      string `json:"gender"`
	BloodType   string `json:"blood_type"`
	Phone       string `json:"phone"`
	Address     string `json:"address"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.User
	if err := h.DB.Where("email = ?", input.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email already registered"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	user := models.User{
		ID:           uuid.New(),
		Email:        input.Email,
		PasswordHash: string(hash),
		Role:         "patient",
	}
	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	profile := models.PatientProfile{
		ID:        uuid.New(),
		UserID:    user.ID,
		FullName:  input.FullName,
		Gender:    input.Gender,
		BloodType: input.BloodType,
		Phone:     input.Phone,
		Address:   input.Address,
	}

	if input.DateOfBirth != "" {
		dob, err := time.Parse("2006-01-02", input.DateOfBirth)
		if err == nil {
			profile.DateOfBirth = &dob
		}
	}

	if err := h.DB.Create(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create profile"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "registered successfully",
		"user_id": user.ID,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    user.Role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})

	signed, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to sign token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":   signed,
		"role":    user.Role,
		"user_id": user.ID,
	})
}
