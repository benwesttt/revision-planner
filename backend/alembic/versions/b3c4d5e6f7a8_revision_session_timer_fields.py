"""add live session timer fields to revision_sessions

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-08-27 00:00:00.000000

Adds started_at (timezone-aware), paused_at (timezone-aware, internal
bookkeeping for in-progress pauses), paused_duration_seconds, notes and
status to revision_sessions, and relaxes method/duration_minutes to
nullable since a session created via POST /revision-sessions/start has
neither until it's stopped.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('revision_sessions') as batch_op:
        batch_op.add_column(
            sa.Column('status', sa.String(), nullable=False, server_default='completed')
        )
        batch_op.add_column(sa.Column('started_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('paused_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(
            sa.Column(
                'paused_duration_seconds', sa.Integer(), nullable=False, server_default='0'
            )
        )
        batch_op.add_column(sa.Column('notes', sa.Text(), nullable=True))
        batch_op.alter_column('method', existing_type=sa.String(), nullable=True)
        batch_op.alter_column('duration_minutes', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('revision_sessions') as batch_op:
        batch_op.alter_column('duration_minutes', existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column('method', existing_type=sa.String(), nullable=False)
        batch_op.drop_column('notes')
        batch_op.drop_column('paused_duration_seconds')
        batch_op.drop_column('paused_at')
        batch_op.drop_column('started_at')
        batch_op.drop_column('status')
