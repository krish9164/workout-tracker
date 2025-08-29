# backend/app/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import routes_auth, routes_users, routes_exercises, routes_workouts
from app.api import routes_analytics
from app.api import routes_voice
from app.tasks.scheduler import start_scheduler  # and optionally: stop_scheduler

# ✅ v1 router
from app.api.v1.routes import router as v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    # Prevent duplicate starts under `uvicorn --reload`
    if not getattr(app.state, "scheduler_started", False):
        start_scheduler()
        app.state.scheduler_started = True
    yield
    # ---- Shutdown (optional) ----
    # If you expose a stop() or shutdown() for your scheduler, call it here:
    # try:
    #     stop_scheduler()
    # except Exception:
    #     pass


app = FastAPI(title="Workout Tracker API", version="0.1.0", lifespan=lifespan)

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
app.include_router(routes_voice.router, prefix="/voice", tags=["voice"])

# ✅ include v1 routes at /api/v1
app.include_router(v1_router, prefix="/api/v1", tags=["v1"])

@app.get("/healthz")
def health():
    return {"status": "ok"}
