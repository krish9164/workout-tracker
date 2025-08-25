from pydantic import BaseModel, Field

class ExerciseIn(BaseModel):
    name: str = Field(min_length=1)
    muscles: list[str] | None = []

class ExerciseUpdate(BaseModel):
    name: str | None = None
    muscles: list[str] | None = None

class ExerciseOut(BaseModel):
    id: int
    user_id: int | None = None
    name: str
    muscles: list[str] | None = None
    is_custom: bool

    class Config:
        from_attributes = True
