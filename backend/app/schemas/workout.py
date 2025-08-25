from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class SetIn(BaseModel):
    exercise_id: int
    set_index: int | None = Field(default=None, ge=1)
    reps: int
    weight_kg: float | None = None
    rpe: float | None = None
    duration_s: float | None = None
    distance_m: float | None = None
    notes: str | None = None

class SetUpdate(BaseModel):
    exercise_id: Optional[int] = None
    set_index: Optional[int] = None
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    rpe: Optional[float] = None
    duration_s: Optional[float] = None
    distance_m: Optional[float] = None
    notes: Optional[str] = None

class SetOut(BaseModel):
    id: int
    exercise_id: int
    set_index: int
    reps: int
    weight_kg: float | None = None
    rpe: float | None = None
    duration_s: float | None = None
    distance_m: float | None = None
    notes: str | None = None

    class Config:
        from_attributes = True

class WorkoutIn(BaseModel):
    date: date
    title: str | None = None
    notes: str | None = None
    sets: list[SetIn]

class WorkoutUpdate(BaseModel):
    date: Optional[date] = None
    title: Optional[str] = None
    notes: Optional[str] = None


class WorkoutOut(BaseModel):
    id: int
    date: date
    title: str | None = None
    notes: str | None = None
    sets: list[SetOut]

    class Config:
        from_attributes = True
