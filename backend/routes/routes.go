package routes

import (
	"database/sql"
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/graysonmalone/business-analytics/handlers"
	"github.com/graysonmalone/business-analytics/middleware"
)

func Setup(db *sql.DB) http.Handler {
	r := chi.NewRouter()

	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(corsMiddleware)

	auth := &handlers.AuthHandler{DB: db}
	inv := &handlers.InventoryHandler{DB: db}
	txn := &handlers.TransactionHandler{DB: db}
	sal := &handlers.SalesHandler{DB: db}
	dash := &handlers.DashboardHandler{DB: db}
	prof := &handlers.ProfileHandler{DB: db}

	// Public
	r.Post("/api/auth/register", auth.Register)
	r.Post("/api/auth/login", auth.Login)

	// Protected
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth)

		r.Get("/api/dashboard", dash.Get)
		r.Get("/api/profile", prof.Get)

		r.Get("/api/inventory", inv.List)
		r.Post("/api/inventory", inv.Create)
		r.Get("/api/inventory/{id}", inv.Get)
		r.Put("/api/inventory/{id}", inv.Update)
		r.Delete("/api/inventory/{id}", inv.Delete)

		r.Get("/api/transactions", txn.List)
		r.Post("/api/transactions", txn.Create)
		r.Get("/api/transactions/{id}", txn.Get)
		r.Put("/api/transactions/{id}", txn.Update)
		r.Delete("/api/transactions/{id}", txn.Delete)

		r.Get("/api/sales", sal.List)
		r.Post("/api/sales", sal.Create)
		r.Get("/api/sales/{id}", sal.Get)
		r.Put("/api/sales/{id}", sal.Update)
		r.Delete("/api/sales/{id}", sal.Delete)
	})

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
