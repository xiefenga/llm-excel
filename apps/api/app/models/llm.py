"""LLM 相关模型"""

from datetime import datetime, timezone
from enum import IntEnum
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, SmallInteger, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class LLMStatus(IntEnum):
    DISABLED = 0
    ENABLED = 1
    DEPRECATED = 2


class LLMProvider(Base):
    __tablename__ = "llm_providers"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    base_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=int(LLMStatus.ENABLED), index=True
    )
    capabilities: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

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

    models: Mapped[List["LLMModel"]] = relationship(
        "LLMModel",
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    credentials: Mapped[List["LLMCredential"]] = relationship(
        "LLMCredential",
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    stage_routes: Mapped[List["LLMStageRoute"]] = relationship(
        "LLMStageRoute",
        back_populates="provider",
        cascade="all, delete-orphan",
    )


class LLMModel(Base):
    __tablename__ = "llm_models"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        index=True,
    )
    provider_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("llm_providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    model_id: Mapped[str] = mapped_column(String(255), nullable=False)
    limits: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    defaults: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=int(LLMStatus.ENABLED), index=True
    )

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

    provider: Mapped["LLMProvider"] = relationship("LLMProvider", back_populates="models")
    stage_routes: Mapped[List["LLMStageRoute"]] = relationship(
        "LLMStageRoute",
        back_populates="model",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("provider_id", "model_id", name="uq_llm_provider_model_id"),
    )


class LLMCredential(Base):
    __tablename__ = "llm_credentials"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        index=True,
    )
    provider_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("llm_providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    secret_type: Mapped[str] = mapped_column(String(32), nullable=False)
    secret_value: Mapped[str] = mapped_column(String(2048), nullable=False)
    meta: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=int(LLMStatus.ENABLED), index=True
    )

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

    provider: Mapped["LLMProvider"] = relationship("LLMProvider", back_populates="credentials")


class LLMStageRoute(Base):
    __tablename__ = "llm_stage_routes"

    stage: Mapped[str] = mapped_column(String(32), primary_key=True)
    provider_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("llm_providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("llm_models.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

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

    provider: Mapped["LLMProvider"] = relationship("LLMProvider", back_populates="stage_routes")
    model: Mapped["LLMModel"] = relationship("LLMModel", back_populates="stage_routes")
