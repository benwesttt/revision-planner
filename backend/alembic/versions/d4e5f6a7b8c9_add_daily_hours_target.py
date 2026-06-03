"""add daily_hours_target to revision_preferences

Revision ID: d4e5f6a7b8c9
Revises: b2c3d4e5f6a7
Create Date: 2026-06-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'revision_preferences',
        sa.Column('daily_hours_target', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('revision_preferences', 'daily_hours_target')
