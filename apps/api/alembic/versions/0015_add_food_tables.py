"""add food tables

Revision ID: 0015
Revises: 0014
Create Date: 2026-04-23 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "food_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("kcal_per_100g", sa.Numeric(6, 2), nullable=False),
        sa.Column("protein_per_100g", sa.Numeric(6, 2), nullable=True),
        sa.Column("carbs_per_100g", sa.Numeric(6, 2), nullable=True),
        sa.Column("fat_per_100g", sa.Numeric(6, 2), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("off_id", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_food_items_name", "food_items", ["name"])
    op.create_index("uq_food_items_off_id", "food_items", ["off_id"], unique=True)

    op.create_table(
        "meal_definitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_meal_definitions_name", "meal_definitions", ["name"])

    op.create_table(
        "meal_ingredients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "meal_definition_id",
            sa.Integer(),
            sa.ForeignKey("meal_definitions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "food_item_id",
            sa.Integer(),
            sa.ForeignKey("food_items.id"),
            nullable=False,
        ),
        sa.Column("quantity_grams", sa.Numeric(8, 2), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_meal_ingredients_def_id", "meal_ingredients", ["meal_definition_id"]
    )

    op.add_column(
        "meal_logs",
        sa.Column(
            "meal_definition_id",
            sa.Integer(),
            sa.ForeignKey("meal_definitions.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "meal_logs",
        sa.Column("portion_multiplier", sa.Numeric(6, 3), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("meal_logs", "portion_multiplier")
    op.drop_column("meal_logs", "meal_definition_id")
    op.drop_index("ix_meal_ingredients_def_id", "meal_ingredients")
    op.drop_table("meal_ingredients")
    op.drop_index("ix_meal_definitions_name", "meal_definitions")
    op.drop_table("meal_definitions")
    op.drop_index("uq_food_items_off_id", "food_items")
    op.drop_index("ix_food_items_name", "food_items")
    op.drop_table("food_items")
