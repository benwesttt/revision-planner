"""change courses.mode default to learning

Revision ID: 7e26f8041f43
Revises: 1a355b7abea7
Create Date: 2026-10-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '7e26f8041f43'
down_revision: Union[str, Sequence[str], None] = '1a355b7abea7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Default-only change: new rows get 'learning'. Existing rows keep
    # whatever mode they already have — no backfill.
    op.alter_column('courses', 'mode', server_default='learning')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('courses', 'mode', server_default='revision')
