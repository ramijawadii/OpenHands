"""Add llm_profiles column to org table.

LLM profiles are stored at the organization level to support both personal
workspaces (where the owner manages their own profiles) and team organizations
(where admins manage profiles that members can activate).

The column uses EncryptedJSON (stored as String) because profiles can contain
per-profile API keys that must be encrypted at rest.

Revision ID: 113
Revises: 112
Create Date: 2025-05-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '113'
down_revision: Union[str, None] = '112'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('org', sa.Column('llm_profiles', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('org', 'llm_profiles')
