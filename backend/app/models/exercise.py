from sqlalchemy import Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import ARRAY
from app.models import Base

class Exercise(Base):
    __tablename__ = "exercises"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # null => global
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    muscles: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True, default=[])
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
