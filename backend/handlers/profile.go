package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

type ProfileHandler struct {
	DB *sql.DB
}

type UserProfile struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

func (h *ProfileHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromCtx(r.Context())

	var profile UserProfile
	err := h.DB.QueryRow(
		"SELECT id, name, email, created_at FROM users WHERE id=?",
		userID,
	).Scan(&profile.ID, &profile.Name, &profile.Email, &profile.CreatedAt)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch profile")
		return
	}
	writeJSON(w, http.StatusOK, profile)
}
