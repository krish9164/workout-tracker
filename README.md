# Workout Tracker — Starter Repo

End-to-end starter for a portfolio-ready Workout Tracker:
- **Backend:** FastAPI, SQLAlchemy, Alembic, JWT auth
- **DB:** PostgreSQL
- **Frontend:** React + Vite + TypeScript + Tailwind
- **Dev:** Docker Compose for local dev

## Quickstart (Docker)

```bash
# 1) copy env files
cp backend/.env.example backend/.env

# 2) start stack
docker compose up --build

# 3) Open:
#    Frontend: http://localhost:5173
#    API Docs: http://localhost:8000/docs
```

### Demo user
After the API is up: create a demo user via the docs or curl.
```
POST http://localhost:8000/auth/register
{ "email": "demo@fit.dev", "password": "demo1234", "name": "Demo" }
```
Then login to get a token:
```
POST http://localhost:8000/auth/login
{ "email": "demo@fit.dev", "password": "demo1234" }
```

Set `VITE_API_URL` in `frontend/.env` if your API runs elsewhere (default is http://localhost:8000).

> Note: This is a minimal scaffold aimed to run out-of-the-box. You can expand routes, add tests, and wire CI/CD.
