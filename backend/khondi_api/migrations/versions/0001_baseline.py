"""Baseline: the starting point of Khondi's schema history.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-11-21
"""

from collections.abc import Sequence

revision: str = "0001_baseline"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """No schema objects yet; domain tables arrive as later revisions with feature work (#2)."""


def downgrade() -> None:
    """Nothing to remove; the baseline creates no schema objects."""
