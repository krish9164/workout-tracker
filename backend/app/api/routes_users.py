from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.schemas.user import UserOut, UserUpdate
from app.models.user import User

router = APIRouter()

@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user

@router.patch("/me", response_model=UserOut)
def update_me(data: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.name is not None:
        user.name = data.name
    if data.height_cm is not None:
        user.height_cm = data.height_cm
    if data.weight_kg is not None:
        user.weight_kg = data.weight_kg
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
