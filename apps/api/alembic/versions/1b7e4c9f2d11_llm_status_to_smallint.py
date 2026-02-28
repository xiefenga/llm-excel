"""llm status to smallint

Revision ID: 1b7e4c9f2d11
Revises: 9c3a6b2f4a1d
Create Date: 2026-02-12 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1b7e4c9f2d11"
down_revision: Union[str, None] = "9c3a6b2f4a1d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _migrate_status(table_name: str) -> None:
    op.add_column(table_name, sa.Column("status_int", sa.SmallInteger(), nullable=True))

    op.execute(
        f"""
        UPDATE {table_name}
        SET status_int = CASE
            WHEN status::text = 'enabled' THEN 1
            WHEN status::text = 'disabled' THEN 0
            WHEN status::text = 'deprecated' THEN 2
            WHEN status::text IN ('0','1','2') THEN status::int
            ELSE 0
        END
        """
    )

    op.execute(f"DROP INDEX IF EXISTS ix_{table_name}_status")
    op.drop_column(table_name, "status")
    op.alter_column(
        table_name,
        "status_int",
        new_column_name="status",
        existing_type=sa.SmallInteger(),
        nullable=False,
        server_default=sa.text("1"),
    )
    op.create_index(f"ix_{table_name}_status", table_name, ["status"], unique=False)


def upgrade() -> None:
    _migrate_status("llm_providers")
    _migrate_status("llm_models")
    _migrate_status("llm_credentials")


def downgrade() -> None:
    for table_name in ("llm_credentials", "llm_models", "llm_providers"):
        op.execute(f"DROP INDEX IF EXISTS ix_{table_name}_status")
        op.add_column(table_name, sa.Column("status_text", sa.String(length=20), nullable=True))
        op.execute(
            f"""
            UPDATE {table_name}
            SET status_text = CASE
                WHEN status = 1 THEN 'enabled'
                WHEN status = 0 THEN 'disabled'
                WHEN status = 2 THEN 'deprecated'
                ELSE 'disabled'
            END
            """
        )
        op.drop_column(table_name, "status")
        op.alter_column(
            table_name,
            "status_text",
            new_column_name="status",
            existing_type=sa.String(length=20),
            nullable=False,
            server_default="enabled",
        )
        op.create_index(f"ix_{table_name}_status", table_name, ["status"], unique=False)
