"""add week support

Revision ID: b2c3d4e5f6a7
Revises: 4251f8435141
Create Date: 2026-06-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = '4251f8435141'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'calendar_events',
        sa.Column('week', sa.String(), nullable=False, server_default='both'),
    )
    op.add_column(
        'revision_preferences',
        sa.Column('current_week', sa.String(), nullable=False, server_default='A'),
    )


def downgrade() -> None:
    op.drop_column('revision_preferences', 'current_week')
    op.drop_column('calendar_events', 'week')
