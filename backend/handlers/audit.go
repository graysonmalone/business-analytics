package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

type AuditHandler struct {
	DB *sql.DB
}

type AuditLog struct {
	ID          int       `json:"id"`
	Action      string    `json:"action"`
	Entity      string    `json:"entity"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

func logAudit(db *sql.DB, userID int, action, entity, description string) {
	db.Exec(
		"INSERT INTO audit_logs (user_id, action, entity, description) VALUES (?,?,?,?)",
		userID, action, entity, description,
	)
}

func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())
	rows, err := h.DB.Query(
		"SELECT id, action, entity, description, created_at FROM audit_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
		userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch audit log")
		return
	}
	defer rows.Close()

	logs := []AuditLog{}
	for rows.Next() {
		var l AuditLog
		rows.Scan(&l.ID, &l.Action, &l.Entity, &l.Description, &l.CreatedAt)
		logs = append(logs, l)
	}
	writeJSON(w, http.StatusOK, logs)
}
