"""add learning mode schema support (topic sequencing/status, course mode)

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-09-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('topics', sa.Column('sequence_order', sa.Integer(), nullable=True))
    op.add_column(
        'topics',
        sa.Column('status', sa.String(), nullable=False, server_default='not_started'),
    )
    op.add_column('topics', sa.Column('expected_taught_by', sa.Date(), nullable=True))
    op.add_column(
        'courses',
        sa.Column('mode', sa.String(), nullable=False, server_default='revision'),
    )


def downgrade() -> None:
    op.drop_column('courses', 'mode')
    op.drop_column('topics', 'expected_taught_by')
    op.drop_column('topics', 'status')
    op.drop_column('topics', 'sequence_order')
