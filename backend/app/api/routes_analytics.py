from collections import defaultdict
from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.workout import Workout, SetEntry

from datetime import date, timedelta
from zoneinfo import ZoneInfo
from app.services.stats import compute_weekly_stats, week_bounds
from app.services.summarize import summarize_week
from app.services.mailer import send_email
from app.core.config import settings

router = APIRouter()

@router.get("/max-weight")
def max_weight_per_exercise(
    top_n: int = Query(8, ge=1, le=20),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    For each exercise, find the single heaviest set (max weight_kg).
    Returns: [{ exercise_id, exercise_name, max_weight }]
    """
    q = (
        select(Workout)
        .where(Workout.user_id == user.id)
        .options(selectinload(Workout.sets).selectinload(SetEntry.exercise))
    )
    workouts = db.execute(q).scalars().all()

    best: dict[int, dict] = {}  # exercise_id -> { name, max_weight }
    for w in workouts:
        for s in w.sets:
            if not s.weight_kg or s.weight_kg <= 0:
                continue
            ex_id = s.exercise_id
            ex_name = getattr(getattr(s, "exercise", None), "name", str(ex_id))
            prev = best.get(ex_id)
            if not prev or s.weight_kg > prev["max_weight"]:
                best[ex_id] = {
                    "exercise_id": ex_id,
                    "exercise_name": ex_name,
                    "max_weight": float(round(s.weight_kg, 2)),
                }

    # sort heavy to light, take top_n
    out = sorted(best.values(), key=lambda x: x["max_weight"], reverse=True)[:top_n]
    return out


@router.get("/weekly-volume")
def weekly_volume(
    weeks: int = Query(10, ge=1, le=52),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return [{ week_start: 'YYYY-MM-DD', volume: number }] for the last N weeks.
    week_start is Monday of that ISO week.
    """
    # work with weeks ending this week (today's Monday as week start)
    today = date.today()
    this_monday = today - timedelta(days=today.weekday())  # Monday = 0
    start = this_monday - timedelta(weeks=weeks - 1)

    q = (
        select(Workout)
        .where(
            Workout.user_id == user.id,
            Workout.date >= start,
            Workout.date <= this_monday + timedelta(days=6),
        )
        .options(selectinload(Workout.sets))
        .order_by(Workout.date.asc())
    )
    workouts = db.execute(q).scalars().all()

    week_map: dict[date, float] = defaultdict(float)
    # initialize to 0 for all weeks in the range
    for i in range(weeks):
        wk = start + timedelta(weeks=i)
        week_map[wk] = 0.0

    for w in workouts:
        # compute this workout's Monday (week start)
        wk_start = w.date - timedelta(days=w.date.weekday())
        total = 0.0
        for s in w.sets:
            total += (s.reps or 0) * (s.weight_kg or 0.0)
        week_map[wk_start] += total

    return [
        {"week_start": k.isoformat(), "volume": week_map[k]}
        for k in sorted(week_map.keys())
    ]


@router.get("/prs")
def personal_records(
    top_n: int = Query(8, ge=1, le=20),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return best (estimated) 1RM per exercise:
    [{ exercise_id, exercise_name, best_1rm }]
    Uses Epley: 1RM ~= weight * (1 + reps/30)
    """
    q = (
        select(Workout)
        .where(Workout.user_id == user.id)
        .options(selectinload(Workout.sets).selectinload(SetEntry.exercise))
    )
    workouts = db.execute(q).scalars().all()

    best: dict[int, dict] = {}  # exercise_id -> { name, best_1rm }
    for w in workouts:
        for s in w.sets:
            weight = s.weight_kg or 0.0
            reps = s.reps or 0
            if weight <= 0 or reps <= 0:
                continue
            est_1rm = weight * (1 + reps / 30.0)
            ex_id = s.exercise_id
            ex_name = getattr(getattr(s, "exercise", None), "name", str(ex_id))
            prev = best.get(ex_id)
            if not prev or est_1rm > prev["best_1rm"]:
                best[ex_id] = {"exercise_id": ex_id, "exercise_name": ex_name, "best_1rm": round(est_1rm, 2)}

    # sort and trim to top_n
    out = sorted(best.values(), key=lambda x: x["best_1rm"], reverse=True)[:top_n]
    return out

@router.get("/daily-volume")
def daily_volume(
    days: int = Query(30, ge=1, le=180),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return [{ date: 'YYYY-MM-DD', volume: number }] for the last N days."""
    end = date.today()
    start = end - timedelta(days=days - 1)

    q = (
        select(Workout)
        .where(
            Workout.user_id == user.id,
            Workout.date >= start,
            Workout.date <= end,
        )
        .options(selectinload(Workout.sets))
        .order_by(Workout.date.asc())
    )
    workouts = db.execute(q).scalars().all()

    # initialize every day with 0 so the chart is continuous
    day_map = {start + timedelta(d): 0.0 for d in range(days)}

    for w in workouts:
        total = 0.0
        for s in w.sets:
            reps = s.reps or 0
            weight = s.weight_kg or 0.0
            total += reps * weight
        day_map[w.date] = day_map.get(w.date, 0.0) + total

    return [
        {"date": d.isoformat(), "volume": day_map[d]}
        for d in sorted(day_map.keys())
    ]

@router.get("/weekly-summary")
def weekly_summary_preview(
    week_start: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # default to current week's Monday
    today = date.today()
    this_mon = today - timedelta(days=today.weekday())
    ws = week_start or this_mon
    stats = compute_weekly_stats(db, user.id, ws)
    summary = summarize_week(stats)
    return {"stats": stats, "summary": summary}

@router.post("/send-weekly-summary")
def send_weekly_summary_now(
    week_start: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    this_mon = today - timedelta(days=today.weekday())
    ws = week_start or this_mon
    stats = compute_weekly_stats(db, user.id, ws)
    summary = summarize_week(stats)
    subject = f"Your Weekly Training Recap • Week of {stats['week_start']}"
    body = f"{summary}\n\n— Workout Tracker"
    if user.email:
        send_email(user.email, subject, body)
    return {"ok": True, "sent_to": user.email, "subject": subject}

@router.get("/stats")
def dashboard_stats(
    threshold: int = Query(3, ge=1, le=14),
    weeks: int = Query(26, ge=4, le=104),   # how far back to look for streaks
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns:
    {
      last_workout_date: "YYYY-MM-DD" | null,
      this_week_start: "YYYY-MM-DD",
      last_completed_week_start: "YYYY-MM-DD",
      current_week_count: int,
      last_week_count: int,
      threshold: int,                        # sessions required per week
      streak_weeks: int                      # consecutive completed weeks ≥ threshold (ending last week)
    }
    Notes:
    - Weeks start on Monday (ISO).
    - Streak counts fully completed weeks only (to avoid inflating mid-week).
    """
    today = date.today()
    this_monday = today - timedelta(days=today.weekday())         # current week start
    last_completed_week = this_monday - timedelta(weeks=1)        # last week's Monday
    start_range = this_monday - timedelta(weeks=weeks - 1)
    end_range = this_monday + timedelta(days=6)                   # include current week through Sunday

    q = (
        select(Workout)
        .where(
            Workout.user_id == user.id,
            Workout.date >= start_range,
            Workout.date <= end_range,
        )
        .order_by(Workout.date.asc())
    )
    workouts = db.execute(q).scalars().all()

    last_workout_date = max((w.date for w in workouts), default=None)

    # Count sessions per ISO week (Mon start)
    per_week = defaultdict(int)
    for w in workouts:
        wk_start = w.date - timedelta(days=w.date.weekday())
        per_week[wk_start] += 1

    # Streak over *completed* weeks (ending last week), walking backwards
    streak = 0
    wk = last_completed_week
    while per_week.get(wk, 0) >= threshold:
        streak += 1
        wk = wk - timedelta(weeks=1)

    out = {
        "last_workout_date": last_workout_date.isoformat() if last_workout_date else None,
        "this_week_start": this_monday.isoformat(),
        "last_completed_week_start": last_completed_week.isoformat(),
        "current_week_count": per_week.get(this_monday, 0),
        "last_week_count": per_week.get(last_completed_week, 0),
        "threshold": threshold,
        "streak_weeks": streak,
    }
    return out