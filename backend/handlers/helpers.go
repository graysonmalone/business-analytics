package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"github.com/graysonmalone/business-analytics/middleware"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func userIDFromCtx(ctx context.Context) int {
	id, _ := ctx.Value(middleware.UserIDKey).(int)
	return id
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
