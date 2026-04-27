# Business Analytics Dashboard

A full-stack business analytics visualization app for a mock business — inventory, finance, and sales tracking with charts and a summary dashboard.

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Frontend   | React + Vite, Tailwind CSS v4, Shadcn/ui, TanStack Query v5, React Router v6, Recharts |
| Backend    | Go, Chi router, database/sql (no ORM)                  |
| Database   | MySQL (AWS Lightsail in prod, local in dev)             |
| Auth       | JWT in sessionStorage, bcrypt password hashing         |
| Deploy     | AWS Lightsail, GitHub Actions CI/CD                    |

## Project Structure

```
business-analytics/
├── frontend/           # React app (Vite)
│   └── src/
│       ├── api/        # TanStack Query hooks + axios calls per domain
│       ├── components/ # Shared UI components (NavBar, skeletons, etc.)
│       ├── context/    # AuthContext
│       ├── lib/        # axios client with JWT interceptor
│       └── pages/      # One file per route
└── backend/            # Go API server
    ├── main.go         # Entry point: DB connect, migrations, server start
    ├── routes/         # Chi router setup + CORS middleware
    ├── handlers/       # HTTP handlers grouped by domain
    └── middleware/     # JWT auth middleware
```

## Running Locally

### Backend
```bash
cd backend
DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD=yourpassword DB_NAME=business_analytics go run main.go
```
Server runs on `:8080` by default. Migrations run automatically on startup.

### Frontend
```bash
cd frontend
npm run dev
```
Runs on `http://localhost:5173`. API requests proxy to `:8080`.

## Environment Variables (backend)

| Variable      | Default                            | Description           |
|---------------|------------------------------------|-----------------------|
| `DB_HOST`     | `localhost`                        | MySQL host            |
| `DB_PORT`     | `3306`                             | MySQL port            |
| `DB_USER`     | `root`                             | MySQL user            |
| `DB_PASSWORD` | *(empty)*                          | MySQL password        |
| `DB_NAME`     | `business_analytics`               | Database name         |
| `JWT_SECRET`  | `dev-secret-change-in-production`  | JWT signing secret    |
| `PORT`        | `8080`                             | HTTP server port      |

## API Overview

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Path                      | Auth | Description                    |
|--------|---------------------------|------|--------------------------------|
| POST   | /api/auth/register        | No   | Register new user              |
| POST   | /api/auth/login           | No   | Login, returns JWT             |
| GET    | /api/dashboard            | Yes  | Aggregate stats                |
| GET    | /api/profile              | Yes  | Current user info              |
| GET    | /api/inventory            | Yes  | List products                  |
| POST   | /api/inventory            | Yes  | Create product                 |
| GET    | /api/inventory/{id}       | Yes  | Get product                    |
| PUT    | /api/inventory/{id}       | Yes  | Update product                 |
| DELETE | /api/inventory/{id}       | Yes  | Delete product                 |
| GET    | /api/transactions         | Yes  | List transactions (?from=&to=) |
| POST   | /api/transactions         | Yes  | Create transaction             |
| GET    | /api/transactions/{id}    | Yes  | Get transaction                |
| PUT    | /api/transactions/{id}    | Yes  | Update transaction             |
| DELETE | /api/transactions/{id}    | Yes  | Delete transaction             |
| GET    | /api/sales                | Yes  | List sales (?from=&to=)        |
| POST   | /api/sales                | Yes  | Create sale                    |
| GET    | /api/sales/{id}           | Yes  | Get sale                       |
| PUT    | /api/sales/{id}           | Yes  | Update sale                    |
| DELETE | /api/sales/{id}           | Yes  | Delete sale                    |

## Database Schema

```sql
users         -- id, name, email, password_hash, created_at
products      -- id, user_id, name, category, quantity, unit_price, reorder_level, created_at, updated_at
transactions  -- id, user_id, type (income|expense), amount, category, description, date, created_at
sales         -- id, user_id, product_id (FK → products), quantity_sold, unit_price, total_amount, sale_date, created_at
```

## Frontend Patterns

- **All server state** via TanStack Query — no manual fetch in components
- **axios client** at `src/lib/axios.js` — auto-attaches JWT from sessionStorage, redirects to `/login` on 401
- **AuthContext** at `src/context/AuthContext.jsx` — login/logout/user state
- **Every data view** has a loading skeleton and an error state
- **Forms** use `<label htmlFor>` paired with matching `id` on every input
- **Dark theme**: `gray-950` background, `gray-900` cards, purple accents

## Key Decisions

- JWT in sessionStorage (intentional — course context, not production advice)
- Raw SQL with `database/sql` — no ORM, no SQLC
- Migrations run on startup via `tryMigrate` (ignores duplicate column errors for idempotency)
- CORS allows `*` in dev — tighten to your domain in prod
