"""add occurred_at to events

Revision ID: 0008
Revises: 0007
Create Date: 2026-03-27 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("football_sessions", sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("activity_sessions", sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("wellbeing_logs", sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("wellbeing_logs", "occurred_at")
    op.drop_column("activity_sessions", "occurred_at")
    op.drop_column("football_sessions", "occurred_at")
