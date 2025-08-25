from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, and_
from datetime import date

from app.api.deps import get_current_user, get_db
from app.schemas.workout import WorkoutIn, WorkoutOut, WorkoutUpdate, SetIn, SetUpdate
from app.models.user import User
from app.models.workout import Workout, SetEntry

router = APIRouter()

def _load_workout(db: Session, workout_id: int, user_id: int) -> Workout | None:
    return db.execute(
        select(Workout)
        .where(Workout.id == workout_id, Workout.user_id == user_id)
        .options(selectinload(Workout.sets).selectinload(SetEntry.exercise))
    ).scalar_one_or_none()

@router.post("/{workout_id}/sets", response_model=WorkoutOut, status_code=201)
def add_set(
    workout_id: int,
    data: SetIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    w = _load_workout(db, workout_id, user.id)
    if not w:
        raise HTTPException(status_code=404, detail="Workout not found")

    idx = data.set_index if data.set_index is not None else (len(w.sets) + 1)
    s = SetEntry(
        workout_id=w.id,
        exercise_id=data.exercise_id,
        set_index=idx,
        reps=data.reps,
        weight_kg=data.weight_kg,
        rpe=data.rpe,
        duration_s=data.duration_s,
        distance_m=data.distance_m,
        notes=data.notes,
    )
    db.add(s)
    db.commit()
    return _load_workout(db, workout_id, user.id)

@router.patch("/{workout_id}/sets/{set_id}", response_model=WorkoutOut)
def update_set(
    workout_id: int,
    set_id: int,
    data: SetUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.get(SetEntry, set_id)
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")
    w = db.get(Workout, s.workout_id)
    if not w or w.id != workout_id or w.user_id != user.id:
        raise HTTPException(status_code=404, detail="Set not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(s, field, value)

    db.add(s)
    db.commit()
    return _load_workout(db, workout_id, user.id)

@router.delete("/{workout_id}/sets/{set_id}", status_code=204)
def delete_set(
    workout_id: int,
    set_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.get(SetEntry, set_id)
    if not s:
        return
    w = db.get(Workout, s.workout_id)
    if not w or w.id != workout_id or w.user_id != user.id:
        return
    db.delete(s)
    db.commit()
    return

@router.get("", response_model=List[WorkoutOut])
def list_workouts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
):
    q = (
    select(Workout)
    .where(Workout.user_id == user.id)
    .options(selectinload(Workout.sets).selectinload(SetEntry.exercise))
    .order_by(Workout.date.desc(), Workout.id.desc())
)
    if from_date:
        q = q.where(Workout.date >= from_date)
    if to_date:
        q = q.where(Workout.date <= to_date)
    return db.execute(q).scalars().all()

@router.post("", response_model=WorkoutOut, status_code=201)
def create_workout(data: WorkoutIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = Workout(user_id=user.id, date=data.date, title=data.title, notes=data.notes)
    db.add(w); db.flush()  # get w.id
    for i, s in enumerate(data.sets):
        db.add(SetEntry(
            workout_id=w.id,
            exercise_id=s.exercise_id,
            set_index=s.set_index or (i+1),
            reps=s.reps,
            weight_kg=s.weight_kg,
            rpe=s.rpe,
            duration_s=s.duration_s,
            distance_m=s.distance_m,
            notes=s.notes,
        ))
    db.commit()
    db.refresh(w)
    _ = w.sets  # trigger load
    return w

@router.get("/{workout_id}", response_model=WorkoutOut)
def get_workout(workout_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = db.execute(
        select(Workout)
            .where(Workout.id == workout_id, Workout.user_id == user.id)
            .options(selectinload(Workout.sets).selectinload(SetEntry.exercise))
    ).scalar_one_or_none()
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    return w

@router.patch("/{workout_id}", response_model=WorkoutOut)
def update_workout(workout_id: int, data: WorkoutUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = db.get(Workout, workout_id)
    if not w or w.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    if data.title is not None:
        w.title = data.title
    if data.notes is not None:
        w.notes = data.notes
    if data.date is not None:
        w.date = data.date
    db.add(w); db.commit(); db.refresh(w)
    _ = w.sets
    return w

@router.delete("/{workout_id}", status_code=204)
def delete_workout(workout_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = db.get(Workout, workout_id)
    if not w or w.user_id != user.id:
        return
    db.delete(w); db.commit()
    return

def _load_workout(db: Session, workout_id: int, user_id: int) -> Workout | None:
    return db.execute(
        select(Workout)
        .where(Workout.id == workout_id, Workout.user_id == user_id)
        .options(selectinload(Workout.sets).selectinload(SetEntry.exercise))
    ).scalar_one_or_none()

@router.post("/{workout_id}/sets", response_model=WorkoutOut, status_code=201)
def add_set(
    workout_id: int,
    data: SetIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    w = _load_workout(db, workout_id, user.id)
    if not w:
        raise HTTPException(status_code=404, detail="Workout not found")

    idx = data.set_index if data.set_index is not None else (len(w.sets) + 1)
    s = SetEntry(
        workout_id=w.id,
        exercise_id=data.exercise_id,
        set_index=idx,
        reps=data.reps,
        weight_kg=data.weight_kg,
        rpe=data.rpe,
        duration_s=data.duration_s,
        distance_m=data.distance_m,
        notes=data.notes,
    )
    db.add(s)
    db.commit()
    return _load_workout(db, workout_id, user.id)

@router.patch("/{workout_id}/sets/{set_id}", response_model=WorkoutOut)
def update_set(
    workout_id: int,
    set_id: int,
    data: SetUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ensure ownership
    s = db.get(SetEntry, set_id)
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")
    w = db.get(Workout, s.workout_id)
    if not w or w.id != workout_id or w.user_id != user.id:
        raise HTTPException(status_code=404, detail="Set not found")

    # patch fields if provided
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(s, field, value)

    db.add(s)
    db.commit()
    return _load_workout(db, workout_id, user.id)

@router.delete("/{workout_id}/sets/{set_id}", status_code=204)
def delete_set(
    workout_id: int,
    set_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.get(SetEntry, set_id)
    if not s:
        return
    w = db.get(Workout, s.workout_id)
    if not w or w.id != workout_id or w.user_id != user.id:
        return
    db.delete(s)
    db.commit()
    return
