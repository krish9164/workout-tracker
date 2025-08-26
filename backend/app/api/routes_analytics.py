from collections import defaultdict
from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.workout import Workout, SetEntry

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
