package handlers

import (
	"database/sql"
	"net/http"
)

type DashboardHandler struct {
	DB *sql.DB
}

type DashboardStats struct {
	TotalRevenue       float64       `json:"total_revenue"`
	TotalExpenses      float64       `json:"total_expenses"`
	NetProfit          float64       `json:"net_profit"`
	InventoryValue     float64       `json:"inventory_value"`
	TotalProducts      int           `json:"total_products"`
	LowStockCount      int           `json:"low_stock_count"`
	TotalSales         float64       `json:"total_sales"`
	RecentTransactions []Transaction `json:"recent_transactions"`
	TopProducts        []TopProduct  `json:"top_products"`
	MonthlyRevenue     []MonthlyData `json:"monthly_revenue"`
}

type TopProduct struct {
	ProductID   *int    `json:"product_id"`
	ProductName string  `json:"product_name"`
	TotalSold   int     `json:"total_sold"`
	TotalAmount float64 `json:"total_amount"`
}

type MonthlyData struct {
	Month    string  `json:"month"`
	Revenue  float64 `json:"revenue"`
	Expenses float64 `json:"expenses"`
}

func (h *DashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	stats := DashboardStats{
		RecentTransactions: []Transaction{},
		TopProducts:        []TopProduct{},
		MonthlyRevenue:     []MonthlyData{},
	}

	h.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id=? AND type='income'", userID).Scan(&stats.TotalRevenue)
	h.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id=? AND type='expense'", userID).Scan(&stats.TotalExpenses)
	stats.NetProfit = stats.TotalRevenue - stats.TotalExpenses

	h.DB.QueryRow("SELECT COALESCE(SUM(CAST(quantity AS DECIMAL(10,2)) * unit_price), 0) FROM products WHERE user_id=?", userID).Scan(&stats.InventoryValue)
	h.DB.QueryRow("SELECT COUNT(*) FROM products WHERE user_id=?", userID).Scan(&stats.TotalProducts)
	h.DB.QueryRow("SELECT COUNT(*) FROM products WHERE user_id=? AND quantity <= reorder_level", userID).Scan(&stats.LowStockCount)
	h.DB.QueryRow("SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE user_id=?", userID).Scan(&stats.TotalSales)

	// Recent transactions
	rows, err := h.DB.Query(
		`SELECT id, user_id, type, amount, category, description,
		DATE_FORMAT(date, '%Y-%m-%d'), created_at
		FROM transactions WHERE user_id=? ORDER BY date DESC, created_at DESC LIMIT 5`,
		userID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var t Transaction
			if err := rows.Scan(&t.ID, &t.UserID, &t.Type, &t.Amount, &t.Category, &t.Description, &t.Date, &t.CreatedAt); err == nil {
				stats.RecentTransactions = append(stats.RecentTransactions, t)
			}
		}
	}

	// Top products by revenue
	rows2, err := h.DB.Query(`
		SELECT s.product_id, COALESCE(p.name, 'Unknown'),
		SUM(s.quantity_sold), SUM(s.total_amount)
		FROM sales s LEFT JOIN products p ON s.product_id = p.id
		WHERE s.user_id=?
		GROUP BY s.product_id, p.name
		ORDER BY SUM(s.total_amount) DESC
		LIMIT 5`, userID,
	)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var tp TopProduct
			var productID sql.NullInt64
			if err := rows2.Scan(&productID, &tp.ProductName, &tp.TotalSold, &tp.TotalAmount); err == nil {
				if productID.Valid {
					id := int(productID.Int64)
					tp.ProductID = &id
				}
				stats.TopProducts = append(stats.TopProducts, tp)
			}
		}
	}

	// Monthly revenue vs expenses (last 6 months)
	rows3, err := h.DB.Query(`
		SELECT DATE_FORMAT(date, '%Y-%m') as month,
		SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as revenue,
		SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses
		FROM transactions
		WHERE user_id=? AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
		GROUP BY month ORDER BY month ASC`, userID,
	)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var m MonthlyData
			if err := rows3.Scan(&m.Month, &m.Revenue, &m.Expenses); err == nil {
				stats.MonthlyRevenue = append(stats.MonthlyRevenue, m)
			}
		}
	}

	writeJSON(w, http.StatusOK, stats)
}
