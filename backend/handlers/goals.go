package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type GoalsHandler struct {
	DB *sql.DB
}

type Goal struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	Name          string    `json:"name"`
	Metric        string    `json:"metric"`
	TargetAmount  float64   `json:"target_amount"`
	Period        string    `json:"period"`
	CurrentAmount float64   `json:"current_amount"`
	Progress      float64   `json:"progress"`
	CreatedAt     time.Time `json:"created_at"`
}

func (h *GoalsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	rows, err := h.DB.Query(
		"SELECT id, user_id, name, metric, target_amount, period, created_at FROM goals WHERE user_id=? ORDER BY created_at DESC",
		userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch goals")
		return
	}
	defer rows.Close()

	goals := []Goal{}
	for rows.Next() {
		var g Goal
		if err := rows.Scan(&g.ID, &g.UserID, &g.Name, &g.Metric, &g.TargetAmount, &g.Period, &g.CreatedAt); err != nil {
			continue
		}
		g.CurrentAmount = h.currentAmount(userID, g.Metric, g.Period)
		if g.TargetAmount > 0 {
			g.Progress = (g.CurrentAmount / g.TargetAmount) * 100
		}
		goals = append(goals, g)
	}
	writeJSON(w, http.StatusOK, goals)
}

func (h *GoalsHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	var g Goal
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if g.Name == "" || g.Metric == "" || g.TargetAmount <= 0 {
		writeError(w, http.StatusBadRequest, "name, metric, and target_amount are required")
		return
	}
	if g.Period == "" {
		g.Period = "monthly"
	}

	result, err := h.DB.Exec(
		"INSERT INTO goals (user_id, name, metric, target_amount, period) VALUES (?,?,?,?,?)",
		userID, g.Name, g.Metric, g.TargetAmount, g.Period,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create goal")
		return
	}
	id, _ := result.LastInsertId()
	g.ID = int(id)
	g.UserID = userID
	g.CurrentAmount = h.currentAmount(userID, g.Metric, g.Period)
	if g.TargetAmount > 0 {
		g.Progress = (g.CurrentAmount / g.TargetAmount) * 100
	}
	logAudit(h.DB, userID, "created", "goal", "Added goal: "+g.Name)
	writeJSON(w, http.StatusCreated, g)
}

func (h *GoalsHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var g Goal
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.DB.Exec(
		"UPDATE goals SET name=?, metric=?, target_amount=?, period=? WHERE id=? AND user_id=?",
		g.Name, g.Metric, g.TargetAmount, g.Period, id, userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update goal")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "goal not found")
		return
	}
	g.ID = id
	g.UserID = userID
	g.CurrentAmount = h.currentAmount(userID, g.Metric, g.Period)
	if g.TargetAmount > 0 {
		g.Progress = (g.CurrentAmount / g.TargetAmount) * 100
	}
	logAudit(h.DB, userID, "updated", "goal", "Updated goal: "+g.Name)
	writeJSON(w, http.StatusOK, g)
}

func (h *GoalsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	result, err := h.DB.Exec("DELETE FROM goals WHERE id=? AND user_id=?", id, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete goal")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "goal not found")
		return
	}
	logAudit(h.DB, userID, "deleted", "goal", "Deleted goal #"+strconv.Itoa(id))
	writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}

func (h *GoalsHandler) currentAmount(userID int, metric, period string) float64 {
	var txnFilter, salesFilter string
	if period == "monthly" {
		txnFilter = "AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())"
		salesFilter = "AND MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())"
	} else {
		txnFilter = "AND YEAR(date) = YEAR(CURDATE())"
		salesFilter = "AND YEAR(sale_date) = YEAR(CURDATE())"
	}

	var amount float64
	switch metric {
	case "revenue":
		h.DB.QueryRow(
			"SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id=? AND type='income' "+txnFilter,
			userID,
		).Scan(&amount)
	case "expenses":
		h.DB.QueryRow(
			"SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id=? AND type='expense' "+txnFilter,
			userID,
		).Scan(&amount)
	case "profit":
		var inc, exp float64
		h.DB.QueryRow("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id=? AND type='income' "+txnFilter, userID).Scan(&inc)
		h.DB.QueryRow("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id=? AND type='expense' "+txnFilter, userID).Scan(&exp)
		amount = inc - exp
	case "sales":
		h.DB.QueryRow(
			"SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE user_id=? "+salesFilter,
			userID,
		).Scan(&amount)
	}
	return amount
}
