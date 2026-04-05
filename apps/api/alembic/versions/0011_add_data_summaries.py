"""add data summaries

Revision ID: 0011
Revises: 0010
Create Date: 2026-03-28 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "data_summaries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("period_type", sa.String(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("summary_json", sa.JSON(), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("period_type", "period_start", name="uq_data_summaries_type_start"),
    )


def downgrade() -> None:
    op.drop_table("data_summaries")
