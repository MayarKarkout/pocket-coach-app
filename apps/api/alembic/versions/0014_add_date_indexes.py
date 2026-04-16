"""add date indexes

Revision ID: 0014
Revises: 0013
Create Date: 2026-04-16 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_workouts_date", "workouts", ["date"])
    op.create_index("ix_meal_logs_date", "meal_logs", ["date"])
    op.create_index("ix_football_sessions_date", "football_sessions", ["date"])
    op.create_index("ix_activity_sessions_date", "activity_sessions", ["date"])
    op.create_index("ix_wellbeing_logs_date", "wellbeing_logs", ["date"])
    op.create_index("ix_watch_workouts_date", "watch_workouts", ["date"])


def downgrade() -> None:
    op.drop_index("ix_workouts_date", "workouts")
    op.drop_index("ix_meal_logs_date", "meal_logs")
    op.drop_index("ix_football_sessions_date", "football_sessions")
    op.drop_index("ix_activity_sessions_date", "activity_sessions")
    op.drop_index("ix_wellbeing_logs_date", "wellbeing_logs")
    op.drop_index("ix_watch_workouts_date", "watch_workouts")
