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

type TransactionHandler struct {
	DB *sql.DB
}

type Transaction struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	Type          string    `json:"type"`
	Amount        float64   `json:"amount"`
	Category      string    `json:"category"`
	Description   string    `json:"description"`
	Date          string    `json:"date"`
	IsRecurring   bool      `json:"is_recurring"`
	RecurInterval string    `json:"recur_interval"`
	CreatedAt     time.Time `json:"created_at"`
}

func (h *TransactionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())

	q := r.URL.Query()
	from := q.Get("from")
	to := q.Get("to")

	query := `SELECT id, user_id, type, amount, category, description,
		DATE_FORMAT(date, '%Y-%m-%d'),
		COALESCE(is_recurring, 0), COALESCE(recur_interval, ''),
		created_at
		FROM transactions WHERE user_id = ?`
	args := []any{userID}

	if from != "" {
		query += " AND date >= ?"
		args = append(args, from)
	}
	if to != "" {
		query += " AND date <= ?"
		args = append(args, to)
	}
	query += " ORDER BY date DESC, created_at DESC"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch transactions")
		return
	}
	defer rows.Close()

	txns := []Transaction{}
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(&t.ID, &t.UserID, &t.Type, &t.Amount, &t.Category, &t.Description,
			&t.Date, &t.IsRecurring, &t.RecurInterval, &t.CreatedAt); err != nil {
			continue
		}
		txns = append(txns, t)
	}
	writeJSON(w, http.StatusOK, txns)
}

func (h *TransactionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	var t Transaction
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if t.Type != "income" && t.Type != "expense" {
		writeError(w, http.StatusBadRequest, "type must be income or expense")
		return
	}
	if t.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "amount must be positive")
		return
	}
	if t.Date == "" {
		t.Date = time.Now().Format("2006-01-02")
	}

	result, err := h.DB.Exec(
		"INSERT INTO transactions (user_id, type, amount, category, description, date, is_recurring, recur_interval) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		userID, t.Type, t.Amount, t.Category, t.Description, t.Date, t.IsRecurring, t.RecurInterval,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create transaction")
		return
	}
	id, _ := result.LastInsertId()
	t.ID = int(id)
	t.UserID = userID
	desc := fmt.Sprintf("Added %s of $%.2f", t.Type, t.Amount)
	if t.Category != "" {
		desc += " (" + t.Category + ")"
	}
	if t.IsRecurring {
		desc += " [recurring]"
	}
	logAudit(h.DB, userID, "created", "transaction", desc)
	writeJSON(w, http.StatusCreated, t)
}

func (h *TransactionHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var t Transaction
	err = h.DB.QueryRow(
		`SELECT id, user_id, type, amount, category, description,
		DATE_FORMAT(date, '%Y-%m-%d'),
		COALESCE(is_recurring, 0), COALESCE(recur_interval, ''),
		created_at
		FROM transactions WHERE id=? AND user_id=?`,
		id, userID,
	).Scan(&t.ID, &t.UserID, &t.Type, &t.Amount, &t.Category, &t.Description,
		&t.Date, &t.IsRecurring, &t.RecurInterval, &t.CreatedAt)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch transaction")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (h *TransactionHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var t Transaction
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.DB.Exec(
		"UPDATE transactions SET type=?, amount=?, category=?, description=?, date=?, is_recurring=?, recur_interval=? WHERE id=? AND user_id=?",
		t.Type, t.Amount, t.Category, t.Description, t.Date, t.IsRecurring, t.RecurInterval, id, userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update transaction")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}
	t.ID = id
	t.UserID = userID
	logAudit(h.DB, userID, "updated", "transaction", fmt.Sprintf("Updated %s of $%.2f", t.Type, t.Amount))
	writeJSON(w, http.StatusOK, t)
}

func (h *TransactionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	result, err := h.DB.Exec("DELETE FROM transactions WHERE id=? AND user_id=?", id, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete transaction")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "transaction not found")
		return
	}
	logAudit(h.DB, userID, "deleted", "transaction", fmt.Sprintf("Deleted transaction #%d", id))
	writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}
