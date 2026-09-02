"""add plan_block_id to revision_sessions

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-09-02 00:00:00.000000

Links a revision session to the plan block it fulfils, when known. Nullable
with no server_default: existing sessions genuinely have no known plan
block, and NULL is the correct value for those, not a placeholder to be
backfilled.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('revision_sessions') as batch_op:
        batch_op.add_column(sa.Column('plan_block_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_revision_sessions_plan_block_id_plan_blocks',
            'plan_blocks',
            ['plan_block_id'],
            ['id'],
        )


def downgrade() -> None:
    with op.batch_alter_table('revision_sessions') as batch_op:
        batch_op.drop_constraint(
            'fk_revision_sessions_plan_block_id_plan_blocks', type_='foreignkey'
        )
        batch_op.drop_column('plan_block_id')
