from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import routes_auth, routes_users, routes_exercises, routes_workouts
from app.api import routes_analytics

# ✅ add these two lines
from app.api.v1.routes import router as v1_router

app = FastAPI(title="Workout Tracker API", version="0.1.0")

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers (existing)
app.include_router(routes_auth.router, prefix="/auth", tags=["auth"])
app.include_router(routes_users.router, tags=["users"])
app.include_router(routes_exercises.router, prefix="/exercises", tags=["exercises"])
app.include_router(routes_workouts.router, prefix="/workouts", tags=["workouts"])
app.include_router(routes_analytics.router, prefix="/analytics", tags=["analytics"])

# ✅ include v1 routes at /api/v1
app.include_router(v1_router, prefix="/api/v1", tags=["v1"])

@app.get("/healthz")
def health():
    return {"status": "ok"}
