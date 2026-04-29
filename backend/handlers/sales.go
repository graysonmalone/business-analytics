package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type SalesHandler struct {
	DB *sql.DB
}

type Sale struct {
	ID           int     `json:"id"`
	UserID       int     `json:"user_id"`
	ProductID    *int    `json:"product_id"`
	ProductName  string  `json:"product_name,omitempty"`
	CustomerName string  `json:"customer_name"`
	QuantitySold int     `json:"quantity_sold"`
	UnitPrice    float64 `json:"unit_price"`
	TotalAmount  float64 `json:"total_amount"`
	SaleDate     string  `json:"sale_date"`
	CreatedAt    time.Time `json:"created_at"`
}

func (h *SalesHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())

	q := r.URL.Query()
	query := `SELECT s.id, s.user_id, s.product_id, COALESCE(p.name, ''),
		COALESCE(s.customer_name, ''),
		s.quantity_sold, s.unit_price, s.total_amount,
		DATE_FORMAT(s.sale_date, '%Y-%m-%d'), s.created_at
		FROM sales s LEFT JOIN products p ON s.product_id = p.id
		WHERE s.user_id = ?`
	args := []any{userID}

	if from := q.Get("from"); from != "" {
		query += " AND s.sale_date >= ?"
		args = append(args, from)
	}
	if to := q.Get("to"); to != "" {
		query += " AND s.sale_date <= ?"
		args = append(args, to)
	}
	query += " ORDER BY s.sale_date DESC, s.created_at DESC"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch sales")
		return
	}
	defer rows.Close()

	sales := []Sale{}
	for rows.Next() {
		var s Sale
		var productID sql.NullInt64
		if err := rows.Scan(&s.ID, &s.UserID, &productID, &s.ProductName,
			&s.CustomerName, &s.QuantitySold, &s.UnitPrice, &s.TotalAmount,
			&s.SaleDate, &s.CreatedAt); err != nil {
			continue
		}
		if productID.Valid {
			id := int(productID.Int64)
			s.ProductID = &id
		}
		sales = append(sales, s)
	}
	writeJSON(w, http.StatusOK, sales)
}

func (h *SalesHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	var s Sale
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if s.QuantitySold <= 0 {
		writeError(w, http.StatusBadRequest, "quantity_sold must be positive")
		return
	}
	if s.UnitPrice < 0 {
		writeError(w, http.StatusBadRequest, "unit_price must be non-negative")
		return
	}
	if s.SaleDate == "" {
		s.SaleDate = time.Now().Format("2006-01-02")
	}
	s.TotalAmount = float64(s.QuantitySold) * s.UnitPrice

	result, err := h.DB.Exec(
		"INSERT INTO sales (user_id, product_id, customer_name, quantity_sold, unit_price, total_amount, sale_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
		userID, s.ProductID, s.CustomerName, s.QuantitySold, s.UnitPrice, s.TotalAmount, s.SaleDate,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create sale")
		return
	}
	id, _ := result.LastInsertId()
	s.ID = int(id)
	s.UserID = userID
	desc := fmt.Sprintf("Logged sale of %d unit(s) for $%.2f", s.QuantitySold, s.TotalAmount)
	if s.CustomerName != "" {
		desc += " to " + s.CustomerName
	}
	logAudit(h.DB, userID, "created", "sale", desc)
	writeJSON(w, http.StatusCreated, s)
}

func (h *SalesHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var s Sale
	var productID sql.NullInt64
	err = h.DB.QueryRow(`
		SELECT s.id, s.user_id, s.product_id, COALESCE(p.name, ''),
		COALESCE(s.customer_name, ''),
		s.quantity_sold, s.unit_price, s.total_amount,
		DATE_FORMAT(s.sale_date, '%Y-%m-%d'), s.created_at
		FROM sales s LEFT JOIN products p ON s.product_id = p.id
		WHERE s.id=? AND s.user_id=?`, id, userID,
	).Scan(&s.ID, &s.UserID, &productID, &s.ProductName, &s.CustomerName,
		&s.QuantitySold, &s.UnitPrice, &s.TotalAmount, &s.SaleDate, &s.CreatedAt)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "sale not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch sale")
		return
	}
	if productID.Valid {
		pid := int(productID.Int64)
		s.ProductID = &pid
	}
	writeJSON(w, http.StatusOK, s)
}

func (h *SalesHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var s Sale
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	s.TotalAmount = float64(s.QuantitySold) * s.UnitPrice

	result, err := h.DB.Exec(
		"UPDATE sales SET product_id=?, customer_name=?, quantity_sold=?, unit_price=?, total_amount=?, sale_date=? WHERE id=? AND user_id=?",
		s.ProductID, s.CustomerName, s.QuantitySold, s.UnitPrice, s.TotalAmount, s.SaleDate, id, userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update sale")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "sale not found")
		return
	}
	s.ID = id
	s.UserID = userID
	logAudit(h.DB, userID, "updated", "sale", fmt.Sprintf("Updated sale #%d", id))
	writeJSON(w, http.StatusOK, s)
}

func (h *SalesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	result, err := h.DB.Exec("DELETE FROM sales WHERE id=? AND user_id=?", id, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete sale")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "sale not found")
		return
	}
	logAudit(h.DB, userID, "deleted", "sale", fmt.Sprintf("Deleted sale #%d", id))
	writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}
