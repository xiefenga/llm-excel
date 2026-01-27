"""线程相关模型"""

from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.file import File


class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship("User", back_populates="threads")
    turns: Mapped[List["ThreadTurn"]] = relationship(
        "ThreadTurn",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="ThreadTurn.turn_number",
    )


class ThreadTurn(Base):
    __tablename__ = "thread_turns"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        index=True,
    )
    thread_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)
    user_query: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    analysis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    operations_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("thread_id", "turn_number", name="uq_thread_turn"),
    )

    thread: Mapped["Thread"] = relationship("Thread", back_populates="turns")
    files: Mapped[List["File"]] = relationship(
        "File",
        secondary="turn_files",
        back_populates="turns",
    )
    result: Mapped[Optional["TurnResult"]] = relationship(
        "TurnResult",
        back_populates="turn",
        uselist=False,
        cascade="all, delete-orphan",
    )


class TurnResult(Base):
    __tablename__ = "turn_results"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    turn_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("thread_turns.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    variables: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    new_columns: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    formulas: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    output_file: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    output_file_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    errors: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    turn: Mapped["ThreadTurn"] = relationship("ThreadTurn", back_populates="result")


class TurnFile(Base):
    __tablename__ = "turn_files"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    turn_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("thread_turns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (UniqueConstraint("turn_id", "file_id", name="uq_turn_file"),)
