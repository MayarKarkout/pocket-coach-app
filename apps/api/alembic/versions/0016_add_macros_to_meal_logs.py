"""add macros to meal_logs

Revision ID: 0016
Revises: 0015
Create Date: 2026-04-28 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("meal_logs", sa.Column("protein_g", sa.Numeric(6, 1), nullable=True))
    op.add_column("meal_logs", sa.Column("carbs_g", sa.Numeric(6, 1), nullable=True))
    op.add_column("meal_logs", sa.Column("fat_g", sa.Numeric(6, 1), nullable=True))


def downgrade() -> None:
    op.drop_column("meal_logs", "fat_g")
    op.drop_column("meal_logs", "carbs_g")
    op.drop_column("meal_logs", "protein_g")
