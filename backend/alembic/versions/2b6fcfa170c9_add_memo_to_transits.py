"""Add memo to transits

Revision ID: 2b6fcfa170c9
Revises: 15bb5e96817e
Create Date: 2026-08-22 16:45:01.040273

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b6fcfa170c9'
down_revision: Union[str, Sequence[str], None] = '15bb5e96817e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('transits', sa.Column('memo', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('transits', 'memo')
