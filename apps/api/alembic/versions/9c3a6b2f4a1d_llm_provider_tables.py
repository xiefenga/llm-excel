"""llm provider tables

Revision ID: 9c3a6b2f4a1d
Revises: 648d4ca39b77
Create Date: 2026-02-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "9c3a6b2f4a1d"
down_revision: Union[str, None] = "648d4ca39b77"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "llm_providers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("base_url", sa.String(length=512), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("capabilities", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_llm_providers_id"), "llm_providers", ["id"], unique=False)
    op.create_index(op.f("ix_llm_providers_status"), "llm_providers", ["status"], unique=False)
    op.create_index(op.f("ix_llm_providers_type"), "llm_providers", ["type"], unique=False)

    op.create_table(
        "llm_models",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("provider_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("model_id", sa.String(length=255), nullable=False),
        sa.Column("limits", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("defaults", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["provider_id"], ["llm_providers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_id", "model_id", name="uq_llm_provider_model_id"),
    )
    op.create_index(op.f("ix_llm_models_id"), "llm_models", ["id"], unique=False)
    op.create_index(op.f("ix_llm_models_provider_id"), "llm_models", ["provider_id"], unique=False)
    op.create_index(op.f("ix_llm_models_status"), "llm_models", ["status"], unique=False)

    op.create_table(
        "llm_credentials",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("provider_id", sa.UUID(), nullable=False),
        sa.Column("secret_type", sa.String(length=32), nullable=False),
        sa.Column("secret_value", sa.String(length=2048), nullable=False),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["provider_id"], ["llm_providers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_llm_credentials_id"), "llm_credentials", ["id"], unique=False)
    op.create_index(op.f("ix_llm_credentials_provider_id"), "llm_credentials", ["provider_id"], unique=False)
    op.create_index(op.f("ix_llm_credentials_status"), "llm_credentials", ["status"], unique=False)

    op.create_table(
        "llm_stage_routes",
        sa.Column("stage", sa.String(length=32), nullable=False),
        sa.Column("provider_id", sa.UUID(), nullable=False),
        sa.Column("model_id", sa.UUID(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["model_id"], ["llm_models.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["provider_id"], ["llm_providers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("stage"),
    )
    op.create_index(op.f("ix_llm_stage_routes_is_active"), "llm_stage_routes", ["is_active"], unique=False)
    op.create_index(op.f("ix_llm_stage_routes_model_id"), "llm_stage_routes", ["model_id"], unique=False)
    op.create_index(op.f("ix_llm_stage_routes_provider_id"), "llm_stage_routes", ["provider_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_llm_stage_routes_provider_id"), table_name="llm_stage_routes")
    op.drop_index(op.f("ix_llm_stage_routes_model_id"), table_name="llm_stage_routes")
    op.drop_index(op.f("ix_llm_stage_routes_is_active"), table_name="llm_stage_routes")
    op.drop_table("llm_stage_routes")

    op.drop_index(op.f("ix_llm_credentials_status"), table_name="llm_credentials")
    op.drop_index(op.f("ix_llm_credentials_provider_id"), table_name="llm_credentials")
    op.drop_index(op.f("ix_llm_credentials_id"), table_name="llm_credentials")
    op.drop_table("llm_credentials")

    op.drop_index(op.f("ix_llm_models_status"), table_name="llm_models")
    op.drop_index(op.f("ix_llm_models_provider_id"), table_name="llm_models")
    op.drop_index(op.f("ix_llm_models_id"), table_name="llm_models")
    op.drop_table("llm_models")

    op.drop_index(op.f("ix_llm_providers_type"), table_name="llm_providers")
    op.drop_index(op.f("ix_llm_providers_status"), table_name="llm_providers")
    op.drop_index(op.f("ix_llm_providers_id"), table_name="llm_providers")
    op.drop_table("llm_providers")
