"""add llm interaction logs table

Revision ID: f984dc0862b0
Revises: 20260310_051530
Create Date: 2026-03-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f984dc0862b0'
down_revision: Union[str, None] = '20260310_051530'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This migration file was lost but its changes may already be applied.
    # Empty upgrade to maintain version chain.
    pass


def downgrade() -> None:
    # Empty downgrade.
    pass