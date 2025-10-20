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
        SET group_type = (
            SELECT parent_session.group_type
            FROM parent_session
            WHERE parent_session.id = session.id
        )
        WHERE session.session_type = 'parent'
    """)

    # Use batch mode to modify parent_session table (SQLite compatible)
    with op.batch_alter_table('parent_session', schema=None) as batch_op:
        # Drop the old constraint from parent_session table
        batch_op.drop_constraint('check_group_type', type_='check')
        # Remove group_type column from parent_session (it's now in base session)
        batch_op.drop_column('group_type')

    # Use batch mode to add constraint to session table (SQLite compatible)
    with op.batch_alter_table('session', schema=None) as batch_op:
        # Add new check constraint to session table
        batch_op.create_check_constraint(
            'check_group_type',
            "group_type IN ('treatment', 'control') OR group_type IS NULL"
        )


def downgrade():
    # Use batch mode to remove constraint from session table
    with op.batch_alter_table('session', schema=None) as batch_op:
        # Drop constraint from session table
        batch_op.drop_constraint('check_group_type', type_='check')
        # Remove group_type from base session table
        batch_op.drop_column('group_type')

    # Use batch mode to restore parent_session table
    with op.batch_alter_table('parent_session', schema=None) as batch_op:
        # Re-add group_type column to parent_session
        batch_op.add_column(sa.Column('group_type', sa.String(length=50), nullable=False, server_default='control'))

    # Copy group_type values back from session to parent_session
    # Note: This assumes session.group_type still exists during downgrade
    op.execute("""
        UPDATE parent_session
        SET group_type = (
            SELECT session.group_type
            FROM session
            WHERE parent_session.id = session.id
        )
        WHERE EXISTS (
            SELECT 1 FROM session
            WHERE session.id = parent_session.id
            AND session.session_type = 'parent'
        )
    """)

    # Use batch mode to finalize parent_session
    with op.batch_alter_table('parent_session', schema=None) as batch_op:
        # Remove server_default after data is migrated
        batch_op.alter_column('group_type', server_default=None)
        # Re-add check constraint to parent_session
        batch_op.create_check_constraint(
            'check_group_type',
            "group_type IN ('treatment', 'control')"
        )
