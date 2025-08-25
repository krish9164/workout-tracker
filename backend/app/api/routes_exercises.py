from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseIn, ExerciseOut, ExerciseUpdate
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[ExerciseOut])
def list_exercises(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = select(Exercise).where((Exercise.user_id == None) | (Exercise.user_id == user.id)).order_by(Exercise.name)  # noqa: E711
    return db.execute(q).scalars().all()

@router.post("", response_model=ExerciseOut, status_code=201)
def create_exercise(data: ExerciseIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exists = db.execute(
        select(Exercise).where(and_(Exercise.name == data.name, Exercise.user_id == user.id))
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Exercise with this name exists")
    ex = Exercise(name=data.name, muscles=data.muscles or [], is_custom=True, user_id=user.id)
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex

@router.patch("/{exercise_id}", response_model=ExerciseOut)
def update_exercise(exercise_id: int, data: ExerciseUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ex = db.get(Exercise, exercise_id)
    if not ex or (ex.user_id is not None and ex.user_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    if data.name is not None:
        ex.name = data.name
    if data.muscles is not None:
        ex.muscles = data.muscles
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex

@router.delete("/{exercise_id}", status_code=204)
def delete_exercise(exercise_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ex = db.get(Exercise, exercise_id)
    if not ex or (ex.user_id is not None and ex.user_id != user.id):
        return
    db.delete(ex)
    db.commit()
    return
