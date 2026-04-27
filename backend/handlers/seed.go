package handlers

import (
	"database/sql"
	"math/rand"
	"net/http"
	"time"
)

type SeedHandler struct {
	DB *sql.DB
}

func (h *SeedHandler) Seed(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())

	var count int
	h.DB.QueryRow("SELECT COUNT(*) FROM products WHERE user_id=?", userID).Scan(&count)
	if count > 0 {
		writeError(w, http.StatusConflict, "demo data already exists — clear your data first")
		return
	}

	products := []struct {
		name     string
		category string
		qty      int
		price    float64
		reorder  int
	}{
		{"Wireless Headphones", "Electronics", 45, 89.99, 10},
		{"Mechanical Keyboard", "Electronics", 8, 129.99, 10},
		{"Desk Lamp", "Office", 62, 34.99, 15},
		{"Notebook (Pack of 3)", "Stationery", 120, 12.99, 25},
		{"Ergonomic Mouse", "Electronics", 33, 59.99, 10},
		{"USB-C Hub", "Electronics", 5, 49.99, 8},
		{"Standing Desk Mat", "Office", 28, 44.99, 10},
		{"Blue Light Glasses", "Accessories", 19, 24.99, 10},
	}

	productIDs := []int{}
	for _, p := range products {
		res, err := h.DB.Exec(
			"INSERT INTO products (user_id, name, category, quantity, unit_price, reorder_level) VALUES (?,?,?,?,?,?)",
			userID, p.name, p.category, p.qty, p.price, p.reorder,
		)
		if err == nil {
			id, _ := res.LastInsertId()
			productIDs = append(productIDs, int(id))
		}
	}

	txns := []struct {
		typ      string
		amount   float64
		category string
		desc     string
		daysAgo  int
	}{
		{"income", 4250.00, "Product Sales", "Online store revenue - Week 1", 175},
		{"expense", 1200.00, "Inventory", "Restocked headphones and keyboards", 170},
		{"income", 3890.00, "Product Sales", "Online store revenue - Week 2", 168},
		{"expense", 450.00, "Marketing", "Social media ad campaign", 165},
		{"income", 5100.00, "Product Sales", "Bulk order - corporate client", 160},
		{"expense", 800.00, "Shipping", "Courier fees Q1", 155},
		{"income", 2750.00, "Product Sales", "Online store revenue - Week 3", 148},
		{"expense", 350.00, "Software", "Inventory management tools", 140},
		{"income", 6200.00, "Product Sales", "Holiday promotion revenue", 130},
		{"expense", 1500.00, "Inventory", "New product line stock", 125},
		{"income", 3100.00, "Product Sales", "Online store revenue", 115},
		{"expense", 220.00, "Utilities", "Office electricity bill", 110},
		{"income", 4800.00, "Product Sales", "Flash sale revenue", 100},
		{"expense", 600.00, "Marketing", "Influencer partnership", 95},
		{"income", 2900.00, "Product Sales", "Regular weekly revenue", 88},
		{"expense", 180.00, "Utilities", "Internet and phone", 80},
		{"income", 5500.00, "Product Sales", "B2B client order", 70},
		{"expense", 900.00, "Inventory", "Restock best sellers", 65},
		{"income", 3300.00, "Product Sales", "Online store revenue", 55},
		{"expense", 400.00, "Marketing", "Email campaign tools", 50},
		{"income", 4100.00, "Product Sales", "Weekend sale revenue", 42},
		{"expense", 250.00, "Shipping", "Express delivery fees", 35},
		{"income", 3700.00, "Product Sales", "Online store revenue", 28},
		{"expense", 700.00, "Inventory", "Restocked accessories", 22},
		{"income", 4900.00, "Product Sales", "Monthly subscription orders", 15},
		{"expense", 320.00, "Utilities", "Monthly bills", 8},
		{"income", 2200.00, "Product Sales", "Online store revenue", 3},
	}

	now := time.Now()
	for _, t := range txns {
		date := now.AddDate(0, 0, -t.daysAgo).Format("2006-01-02")
		h.DB.Exec(
			"INSERT INTO transactions (user_id, type, amount, category, description, date) VALUES (?,?,?,?,?,?)",
			userID, t.typ, t.amount, t.category, t.desc, date,
		)
	}

	if len(productIDs) > 0 {
		r := rand.New(rand.NewSource(42))
		for i := 0; i < 40; i++ {
			pid := productIDs[r.Intn(len(productIDs))]
			qty := r.Intn(8) + 1
			price := products[r.Intn(len(products))].price
			daysAgo := r.Intn(150)
			date := now.AddDate(0, 0, -daysAgo).Format("2006-01-02")
			total := float64(qty) * price
			h.DB.Exec(
				"INSERT INTO sales (user_id, product_id, quantity_sold, unit_price, total_amount, sale_date) VALUES (?,?,?,?,?,?)",
				userID, pid, qty, price, total, date,
			)
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "demo data loaded"})
}
