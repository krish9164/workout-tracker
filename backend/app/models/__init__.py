from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

from .user import User  # noqa: E402,F401
from .exercise import Exercise  # noqa: E402,F401
from .workout import Workout, SetEntry  # noqa: E402,F401

Base = Base
