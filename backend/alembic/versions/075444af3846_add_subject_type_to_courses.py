"""add subject_type to courses

Revision ID: 075444af3846
Revises: d5e6f7a8b9c0
Create Date: 2026-09-11 15:04:01.304139

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '075444af3846'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'courses',
        sa.Column('subject_type', sa.String(), nullable=False, server_default='discrete'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('courses', 'subject_type')
