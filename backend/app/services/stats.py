from __future__ import annotations
from datetime import date, timedelta
from collections import defaultdict
from typing import Any
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func

from app.models.workout import Workout, SetEntry
from app.models.exercise import Exercise

CANON_GROUPS = {"chest","back","legs","shoulders","arms","core"}

def _canon_group(m: str) -> str | None:
    if not m: return None
    k = m.strip().lower()
    # quick normalization
    if k in {"quad","quads","hamstring","hamstrings","glute","glutes","leg","legs","lowerbody"}: return "legs"
    if k in {"ab","abs","abdominals","core"}: return "core"
    if k in {"shoulder","delts","deltoids"}: return "shoulders"
    if k in {"biceps","triceps","arms"}: return "arms"
    if k in CANON_GROUPS: return k
    return None

def week_bounds(d: date) -> tuple[date,date]:
    # ISO week: Monday start
    monday = d - timedelta(days=d.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday

def _load_sets_between(db: Session, user_id: int, start: date, end: date):
    q = (
        select(Workout)
        .where(Workout.user_id == user_id, Workout.date >= start, Workout.date <= end)
        .options(selectinload(Workout.sets).selectinload(SetEntry.exercise))
        .order_by(Workout.date.asc())
    )
    return db.execute(q).scalars().all()

def compute_weekly_stats(db: Session, user_id: int, week_start: date, lookback_weeks: int = 4) -> dict[str, Any]:
    week_end = week_start + timedelta(days=6)
    workouts = _load_sets_between(db, user_id, week_start, week_end)

    # Basic counters
    days_trained = len({w.date for w in workouts})
    total_sets = sum(len(w.sets) for w in workouts)

    total_volume = 0.0
    per_group = {g: {"volume": 0.0, "sets": 0} for g in CANON_GROUPS}
    heaviest: list[dict[str, Any]] = []

    for w in workouts:
        for s in w.sets:
            reps = s.reps or 0
            weight = s.weight_kg or 0.0
            total_volume += reps * weight
            ex: Exercise | None = getattr(s, "exercise", None)
            muscles = (ex.muscles or []) if ex else []
            tagged = False
            for m in muscles:
                g = _canon_group(m)
                if g:
                    per_group[g]["volume"] += reps * weight
                    per_group[g]["sets"] += 1
                    tagged = True
            if not tagged and ex:
                # heuristic by name fallback
                name = (ex.name or "").lower()
                if any(k in name for k in ["bench","chest"]): per_group["chest"]["volume"] += reps*weight; per_group["chest"]["sets"] += 1
                elif any(k in name for k in ["row","lat","pull","back"]): per_group["back"]["volume"] += reps*weight; per_group["back"]["sets"] += 1
                elif any(k in name for k in ["squat","leg","press","deadlift","lunge"]): per_group["legs"]["volume"] += reps*weight; per_group["legs"]["sets"] += 1
                elif any(k in name for k in ["shoulder","overhead","ohp","military"]): per_group["shoulders"]["volume"] += reps*weight; per_group["shoulders"]["sets"] += 1
                elif any(k in name for k in ["curl","extension","arm","tricep","bicep"]): per_group["arms"]["volume"] += reps*weight; per_group["arms"]["sets"] += 1
                elif any(k in name for k in ["ab","core","situp","plank"]): per_group["core"]["volume"] += reps*weight; per_group["core"]["sets"] += 1

            if s.weight_kg and s.weight_kg > 0:
                heaviest.append({
                    "exercise_name": ex.name if ex else str(s.exercise_id),
                    "weight_kg": float(s.weight_kg),
                    "reps": s.reps,
                    "date": w.date.isoformat(),
                })

    heaviest.sort(key=lambda x: (x["weight_kg"], x["reps"]), reverse=True)
    heaviest = heaviest[:3]

    # Trend vs last week
    prev_start = week_start - timedelta(days=7)
    prev_end = prev_start + timedelta(days=6)
    prev_workouts = _load_sets_between(db, user_id, prev_start, prev_end)
    prev_vol = 0.0
    for w in prev_workouts:
        for s in w.sets:
            prev_vol += (s.reps or 0) * (s.weight_kg or 0.0)
    volume_change = total_volume - prev_vol

    # Streak: how many consecutive weeks (ending this week) have ≥1 workout
    streak = 0
    check_start = week_start
    for _ in range(52):
        ws, we = check_start, check_start + timedelta(days=6)
        ws_count = db.scalar(
            select(func.count(Workout.id)).where(Workout.user_id == user_id, Workout.date >= ws, Workout.date <= we)
        ) or 0
        if ws_count > 0:
            streak += 1
            check_start = ws - timedelta(days=7)
        else:
            break

    # Hit vs usual groups
    hit_groups = [g for g, v in per_group.items() if v["sets"] > 0]
    lb_start = week_start - timedelta(days=7 * lookback_weeks)
    lb_end = week_start - timedelta(days=1)
    hist_workouts = _load_sets_between(db, user_id, lb_start, lb_end)
    hist_groups = defaultdict(int)
    for w in hist_workouts:
        for s in w.sets:
            ex = getattr(s, "exercise", None)
            muscles = (ex.muscles or []) if ex else []
            tagged = False
            for m in muscles:
                g = _canon_group(m)
                if g: hist_groups[g] += 1; tagged = True
            if not tagged and ex:
                name = (ex.name or "").lower()
                if any(k in name for k in ["bench","chest"]): hist_groups["chest"] += 1
                elif any(k in name for k in ["row","lat","pull","back"]): hist_groups["back"] += 1
                elif any(k in name for k in ["squat","leg","press","deadlift","lunge"]): hist_groups["legs"] += 1
                elif any(k in name for k in ["shoulder","overhead","ohp","military"]): hist_groups["shoulders"] += 1
                elif any(k in name for k in ["curl","extension","arm","tricep","bicep"]): hist_groups["arms"] += 1
                elif any(k in name for k in ["ab","core","situp","plank"]): hist_groups["core"] += 1

    usual_groups = [g for g,cnt in hist_groups.items() if cnt > 0]
    missed_groups = [g for g in usual_groups if g not in hit_groups]
    extra_groups = [g for g in hit_groups if g not in usual_groups]

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "workouts": len(workouts),
        "days_trained": days_trained,
        "total_sets": total_sets,
        "total_volume": round(total_volume, 2),
        "volume_change_vs_last_week": round(volume_change, 2),
        "heaviest_sets": heaviest,
        "per_group": per_group,
        "hit_groups": hit_groups,
        "missed_groups": missed_groups,
        "usual_groups": usual_groups,
        "extra_groups": extra_groups,
        "streak_weeks": streak,
    }
