"""add week_a_anchor to revision preferences

Revision ID: 3f9a1c7b2d4e
Revises: 7e26f8041f43
Create Date: 2026-10-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '3f9a1c7b2d4e'
down_revision: Union[str, Sequence[str], None] = '7e26f8041f43'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'revision_preferences',
        sa.Column('week_a_anchor', sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('revision_preferences', 'week_a_anchor')
