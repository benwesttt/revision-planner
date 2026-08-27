"""enable row level security on all tables

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-08-27 00:00:00.000000

Supabase exposes every table in the public schema through its
auto-generated PostgREST API. This app authenticates via Clerk and the
backend talks to Postgres directly over DATABASE_URL (SQLAlchemy/psycopg2),
which bypasses PostgREST entirely and is unaffected by RLS. Enabling RLS
with no policies defined makes the PostgREST path default-deny for every
table, while the backend's direct connection keeps working unchanged.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = [
    'alembic_version',
    'assessments',
    'calendar_events',
    'courses',
    'plan_blocks',
    'plans',
    'resources',
    'revision_preferences',
    'revision_sessions',
    'topic_resources',
    'topics',
    'users',
]


def upgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;')


def downgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY;')
