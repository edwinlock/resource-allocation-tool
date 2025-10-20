"""add_group_type_to_base_session

Revision ID: 53ba0081f4cf
Revises: 2778fd77b13f
Create Date: 2025-10-20 23:01:54.209853

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '53ba0081f4cf'
down_revision = '2778fd77b13f'
branch_labels = None
depends_on = None


def upgrade():
    # Add group_type column to base session table (nullable for backwards compatibility)
    op.add_column('session', sa.Column('group_type', sa.String(length=50), nullable=True))

    # Copy group_type values from parent_session to session for existing parent sessions
    op.execute("""
        UPDATE session
        SET group_type = parent_session.group_type
        FROM parent_session
        WHERE session.id = parent_session.id
    """)

    # Drop the old constraint from parent_session table
    op.drop_constraint('check_group_type', 'parent_session', type_='check')

    # Remove group_type column from parent_session (it's now in base session)
    op.drop_column('parent_session', 'group_type')

    # Add new check constraint to session table
    op.create_check_constraint(
        'check_group_type',
        'session',
        "group_type IN ('treatment', 'control') OR group_type IS NULL"
    )


def downgrade():
    # Re-add group_type column to parent_session
    op.add_column('parent_session', sa.Column('group_type', sa.String(length=50), nullable=False, server_default='control'))

    # Copy group_type values back from session to parent_session
    op.execute("""
        UPDATE parent_session
        SET group_type = session.group_type
        FROM session
        WHERE parent_session.id = session.id
        AND session.session_type = 'parent'
    """)

    # Remove server_default after data is migrated
    op.alter_column('parent_session', 'group_type', server_default=None)

    # Drop constraint from session table
    op.drop_constraint('check_group_type', 'session', type_='check')

    # Remove group_type from base session table
    op.drop_column('session', 'group_type')

    # Re-add check constraint to parent_session
    op.create_check_constraint(
        'check_group_type',
        'parent_session',
        "group_type IN ('treatment', 'control')"
    )
