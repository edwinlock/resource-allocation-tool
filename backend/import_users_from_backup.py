#!/usr/bin/env python3
"""
Import users from a backup learn.db database.

This script imports all users from a backup database except the three admin users
(Edwin, Michelle, Esther), and assigns them the 'enumerator' role.

Usage:
    python import_users_from_backup.py path/to/backup/learn.db
"""

import sys
import sqlite3
from datetime import datetime
from webapp import app, db, user_datastore
from webapp.models import User, Role

# Admin emails to exclude from import
EXCLUDED_EMAILS = {
    'edwinlock@gmail.com',
    'michelle.gonzalez.am@gmail.com',
    'esther.gehrke@wur.nl'
}

def import_users_from_backup(backup_db_path):
    """Import users from backup database."""

    print(f"\n=== Importing users from {backup_db_path} ===\n")

    # Connect to backup database
    backup_conn = sqlite3.connect(backup_db_path)
    backup_conn.row_factory = sqlite3.Row
    backup_cursor = backup_conn.cursor()

    # Get all users from backup
    try:
        backup_users = backup_cursor.execute('SELECT * FROM user').fetchall()
    except sqlite3.OperationalError as e:
        print(f"Error reading from backup database: {e}")
        print("Make sure the backup database path is correct and contains a 'user' table.")
        backup_conn.close()
        return

    print(f"Found {len(backup_users)} users in backup database")

    # Get column names from backup
    user_columns = [description[0] for description in backup_cursor.description]
    print(f"User table columns: {', '.join(user_columns)}\n")

    backup_conn.close()

    # Use Flask app context for database operations
    with app.app_context():
        # Get or create enumerator role
        enumerator_role = user_datastore.find_role('enumerator')
        if not enumerator_role:
            print("Creating 'enumerator' role...")
            enumerator_role = user_datastore.create_role(
                name='enumerator',
                description='Enumerator role'
            )
            db.session.commit()

        imported_count = 0
        skipped_count = 0
        exists_count = 0

        for backup_user in backup_users:
            # Convert sqlite3.Row to dict
            user_dict = dict(backup_user)
            email = user_dict.get('email', '')

            # Skip admin users
            if email.lower() in {e.lower() for e in EXCLUDED_EMAILS}:
                print(f"⊘ Skipping admin user: {email}")
                skipped_count += 1
                continue

            # Check if user already exists in current database
            existing_user = user_datastore.find_user(email=email)
            if existing_user:
                print(f"⊘ User already exists: {email}")
                exists_count += 1
                continue

            # Create new user with all fields from backup
            try:
                # Create user without roles (we'll add them separately)
                new_user = User()

                # Datetime columns that need conversion
                datetime_columns = {
                    'confirmed_at', 'last_login_at', 'current_login_at',
                    'create_datetime', 'update_datetime'
                }

                # Copy all fields from backup user
                for column in user_columns:
                    if column != 'id' and hasattr(new_user, column):
                        value = user_dict[column]

                        # Convert string datetime values to datetime objects
                        if column in datetime_columns and value is not None:
                            if isinstance(value, str):
                                try:
                                    # Parse ISO format datetime strings
                                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                                except ValueError:
                                    # If parsing fails, set to None
                                    value = None

                        setattr(new_user, column, value)

                # Add to session
                db.session.add(new_user)
                db.session.flush()  # Get the new user ID

                # Add enumerator role
                user_datastore.add_role_to_user(new_user, enumerator_role)

                print(f"✓ Imported: {email}")
                imported_count += 1

            except Exception as e:
                print(f"✗ Error importing {email}: {e}")
                db.session.rollback()
                continue

        # Commit all changes
        try:
            db.session.commit()
            print(f"\n=== Import Complete ===")
            print(f"✓ Imported: {imported_count} users")
            print(f"⊘ Skipped (admin): {skipped_count} users")
            print(f"⊘ Already exists: {exists_count} users")
            print(f"Total processed: {len(backup_users)} users\n")

            # Verify imported users
            print("=== Verifying Imported Users ===")
            all_enumerators = User.query.join(User.roles).filter(Role.name == 'enumerator').all()
            print(f"Total enumerators in database: {len(all_enumerators)}")
            print("\nImported enumerator emails:")
            for user in all_enumerators:
                if user.email.lower() not in {e.lower() for e in EXCLUDED_EMAILS}:
                    print(f"  - {user.email}")

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Error committing changes: {e}")
            return


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python import_users_from_backup.py path/to/backup/learn.db")
        print("\nExample:")
        print("  python import_users_from_backup.py instance/learn.db.backup")
        sys.exit(1)

    backup_path = sys.argv[1]

    # Check if backup file exists
    import os
    if not os.path.exists(backup_path):
        print(f"Error: Backup database file not found: {backup_path}")
        sys.exit(1)

    import_users_from_backup(backup_path)
