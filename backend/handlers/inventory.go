package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type InventoryHandler struct {
	DB *sql.DB
}

type Product struct {
	ID           int       `json:"id"`
	UserID       int       `json:"user_id"`
	Name         string    `json:"name"`
	Category     string    `json:"category"`
	Quantity     int       `json:"quantity"`
	UnitPrice    float64   `json:"unit_price"`
	ReorderLevel int       `json:"reorder_level"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (h *InventoryHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	rows, err := h.DB.Query(
		`SELECT id, user_id, name, category, quantity, unit_price, reorder_level, created_at, updated_at
		 FROM products WHERE user_id = ? ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch products")
		return
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.Category, &p.Quantity, &p.UnitPrice, &p.ReorderLevel, &p.CreatedAt, &p.UpdatedAt); err != nil {
			continue
		}
		products = append(products, p)
	}
	writeJSON(w, http.StatusOK, products)
}

func (h *InventoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if p.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if p.ReorderLevel == 0 {
		p.ReorderLevel = 10
	}

	result, err := h.DB.Exec(
		"INSERT INTO products (user_id, name, category, quantity, unit_price, reorder_level) VALUES (?, ?, ?, ?, ?, ?)",
		userID, p.Name, p.Category, p.Quantity, p.UnitPrice, p.ReorderLevel,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create product")
		return
	}
	id, _ := result.LastInsertId()
	p.ID = int(id)
	p.UserID = userID
	writeJSON(w, http.StatusCreated, p)
}

func (h *InventoryHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var p Product
	err = h.DB.QueryRow(
		`SELECT id, user_id, name, category, quantity, unit_price, reorder_level, created_at, updated_at
		 FROM products WHERE id = ? AND user_id = ?`,
		id, userID,
	).Scan(&p.ID, &p.UserID, &p.Name, &p.Category, &p.Quantity, &p.UnitPrice, &p.ReorderLevel, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch product")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h *InventoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.DB.Exec(
		"UPDATE products SET name=?, category=?, quantity=?, unit_price=?, reorder_level=? WHERE id=? AND user_id=?",
		p.Name, p.Category, p.Quantity, p.UnitPrice, p.ReorderLevel, id, userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update product")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}
	p.ID = id
	p.UserID = userID
	writeJSON(w, http.StatusOK, p)
}

func (h *InventoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	result, err := h.DB.Exec("DELETE FROM products WHERE id=? AND user_id=?", id, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete product")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}
