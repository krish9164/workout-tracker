from pydantic import BaseModel, EmailStr

class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    height_cm: float | None = None
    weight_kg: float | None = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
