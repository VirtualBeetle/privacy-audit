package main

import (
	"flag"
	"log"
	"os"

	"github.com/VirtualBeetle/privacy-health-tenant/config"
	"github.com/VirtualBeetle/privacy-health-tenant/routes"
	"github.com/VirtualBeetle/privacy-health-tenant/seed"
	"github.com/gin-gonic/gin"
)

func main() {
	runSeed := flag.Bool("seed", false, "run database seeder on startup")
	flag.Parse()

	config.LoadEnv()
	db := config.InitDB()

	if *runSeed {
		seed.Run(db)
	}

	r := gin.Default()
	routes.Setup(r, db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("[server] starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("[server] failed to start: %v", err)
	}
}
