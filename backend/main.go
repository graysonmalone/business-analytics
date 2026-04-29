package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/graysonmalone/business-analytics/routes"
)

func main() {
	db := connectDB()
	runMigrations(db)

	r := routes.Setup(db)

	port := getEnv("PORT", "8080")
	log.Printf("Server listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func connectDB() *sql.DB {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=Local",
		getEnv("DB_USER", "root"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "3306"),
		getEnv("DB_NAME", "business_analytics"),
	)

	var db *sql.DB
	var err error
	for i := 0; i < 10; i++ {
		db, err = sql.Open("mysql", dsn)
		if err == nil {
			if pingErr := db.Ping(); pingErr == nil {
				break
			} else {
				err = pingErr
			}
		}
		log.Printf("DB not ready (attempt %d): %v", i+1, err)
		time.Sleep(3 * time.Second)
	}
	if err != nil {
		log.Fatalf("could not connect to DB: %v", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	log.Println("Database connected")
	return db
}

func runMigrations(db *sql.DB) {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255) NOT NULL UNIQUE,
			password_hash VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS products (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			name VARCHAR(255) NOT NULL,
			category VARCHAR(255) DEFAULT '',
			quantity INT NOT NULL DEFAULT 0,
			unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
			reorder_level INT NOT NULL DEFAULT 10,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS transactions (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			type ENUM('income','expense') NOT NULL,
			amount DECIMAL(10,2) NOT NULL,
			category VARCHAR(255) DEFAULT '',
			description TEXT,
			date DATE NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS sales (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			product_id INT,
			quantity_sold INT NOT NULL,
			unit_price DECIMAL(10,2) NOT NULL,
			total_amount DECIMAL(10,2) NOT NULL,
			sale_date DATE NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
		)`,
		`ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER unit_price`,
		`ALTER TABLE sales ADD COLUMN customer_name VARCHAR(255) NOT NULL DEFAULT ''`,
		`ALTER TABLE transactions ADD COLUMN is_recurring TINYINT(1) NOT NULL DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN recur_interval VARCHAR(20) NOT NULL DEFAULT ''`,
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			action VARCHAR(50) NOT NULL,
			entity VARCHAR(50) NOT NULL,
			description VARCHAR(500) NOT NULL DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS goals (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			name VARCHAR(255) NOT NULL,
			metric ENUM('revenue','expenses','profit','sales') NOT NULL,
			target_amount DECIMAL(10,2) NOT NULL,
			period ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
	}

	for _, stmt := range stmts {
		if err := tryMigrate(db, stmt); err != nil {
			log.Fatalf("migration failed: %v", err)
		}
	}
	log.Println("Migrations complete")
}

func tryMigrate(db *sql.DB, stmt string) error {
	_, err := db.Exec(stmt)
	if err != nil && strings.Contains(err.Error(), "Duplicate column name") {
		return nil
	}
	return err
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
