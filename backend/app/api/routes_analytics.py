from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.workout import Workout, SetEntry

router = APIRouter()

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
