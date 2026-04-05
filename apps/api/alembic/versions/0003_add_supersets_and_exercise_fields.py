"""add supersets and exercise fields

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-26 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "supersets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("day_id", sa.Integer(), nullable=False),
        sa.Column("group_label", sa.String(), nullable=False),
        sa.Column("rest_seconds", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["day_id"], ["plan_days.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Make day_id nullable (superset exercises won't have it)
    op.alter_column("plan_exercises", "day_id", nullable=True)

    # Replace planned_reps with new fields
    op.drop_column("plan_exercises", "planned_reps")
    op.add_column("plan_exercises", sa.Column("reps_min", sa.Integer(), nullable=True))
    op.add_column("plan_exercises", sa.Column("reps_max", sa.Integer(), nullable=True))
    op.add_column("plan_exercises", sa.Column("duration_seconds", sa.Integer(), nullable=True))
    op.add_column(
        "plan_exercises",
        sa.Column("per_side", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "plan_exercises",
        sa.Column("intensity_pct", sa.Integer(), nullable=False, server_default="70"),
    )
    op.add_column(
        "plan_exercises",
        sa.Column("rest_seconds", sa.Integer(), nullable=False, server_default="90"),
    )
    op.add_column(
        "plan_exercises",
        sa.Column("superset_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_plan_exercises_superset_id",
        "plan_exercises",
        "supersets",
        ["superset_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_plan_exercises_superset_id", "plan_exercises", type_="foreignkey")
    op.drop_column("plan_exercises", "superset_id")
    op.drop_column("plan_exercises", "rest_seconds")
    op.drop_column("plan_exercises", "intensity_pct")
    op.drop_column("plan_exercises", "per_side")
    op.drop_column("plan_exercises", "duration_seconds")
    op.drop_column("plan_exercises", "reps_max")
    op.drop_column("plan_exercises", "reps_min")
    op.add_column(
        "plan_exercises",
        sa.Column("planned_reps", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("plan_exercises", "day_id", nullable=False)
    op.drop_table("supersets")
