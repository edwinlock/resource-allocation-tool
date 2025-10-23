#!/usr/bin/env python3
"""
Backfill group_type for existing child sessions based on their school.

This script:
1. Shows you what would be changed
2. Asks for confirmation before making changes
3. Creates a backup automatically
4. Updates child sessions with group_type based on school
"""

import os
import sys
import shutil
from datetime import datetime

# Add the webapp directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from webapp import app, db
from webapp.models import Session, ChildSession


def backup_database():
    """Create a backup of the database."""
    db_path = os.path.join(app.instance_path, 'app.db')
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return False

    backup_name = f"app.db.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup_path = os.path.join(app.instance_path, backup_name)

    try:
        shutil.copy2(db_path, backup_path)
        print(f"✅ Database backed up to: {backup_path}")
        return True
    except Exception as e:
        print(f"❌ Failed to backup database: {e}")
        return False


def get_group_type_from_school(school_name):
    """Determine group_type based on school name."""
    school_name = school_name.lower()

    # Customize this logic based on your school names
    if 't' in school_name or 'treatment' in school_name:
        return 'treatment'
    elif 'c' in school_name or 'control' in school_name:
        return 'control'
    else:
        return None


def preview_changes():
    """Show what would be changed without making changes."""
    print("\n" + "="*80)
    print("PREVIEW: Child Sessions That Would Be Updated")
    print("="*80)

    child_sessions = db.session.query(Session, ChildSession)\
        .join(ChildSession, Session.id == ChildSession.id)\
        .filter(Session.session_type == 'child')\
        .all()

    if not child_sessions:
        print("No child sessions found.")
        return []

    changes = []
    print(f"\n{'Session ID':<40} {'School':<30} {'Current':<12} {'Would Set':<12}")
    print("-" * 80)

    for session, child_details in child_sessions:
        proposed_group = get_group_type_from_school(child_details.school)
        current_group = session.group_type or 'NULL'

        # Only show if it would change
        if session.group_type != proposed_group:
            changes.append({
                'session': session,
                'child_details': child_details,
                'proposed_group': proposed_group
            })
            print(f"{session.id[:38]:<40} {child_details.school[:28]:<30} {current_group:<12} {proposed_group or 'NULL':<12}")

    print("\n" + "="*80)
    print(f"Total sessions that would be updated: {len(changes)}")
    print("="*80 + "\n")

    return changes


def apply_changes(changes):
    """Apply the changes to the database."""
    print("\n🔄 Applying changes...")

    success_count = 0
    error_count = 0

    for change in changes:
        session = change['session']
        proposed_group = change['proposed_group']

        try:
            session.group_type = proposed_group
            success_count += 1
        except Exception as e:
            print(f"❌ Error updating session {session.id[:8]}: {e}")
            error_count += 1

    # Commit all changes
    try:
        db.session.commit()
        print(f"\n✅ Successfully updated {success_count} sessions")
        if error_count > 0:
            print(f"❌ Failed to update {error_count} sessions")
        return True
    except Exception as e:
        print(f"\n❌ Failed to commit changes: {e}")
        db.session.rollback()
        return False


def verify_changes():
    """Show the final state after changes."""
    print("\n" + "="*80)
    print("VERIFICATION: Final State of Child Sessions")
    print("="*80)

    child_sessions = db.session.query(Session, ChildSession)\
        .join(ChildSession, Session.id == ChildSession.id)\
        .filter(Session.session_type == 'child')\
        .all()

    print(f"\n{'Session ID':<40} {'School':<30} {'Group Type':<12}")
    print("-" * 80)

    treatment_count = 0
    control_count = 0
    null_count = 0

    for session, child_details in child_sessions:
        group = session.group_type or 'NULL'
        print(f"{session.id[:38]:<40} {child_details.school[:28]:<30} {group:<12}")

        if session.group_type == 'treatment':
            treatment_count += 1
        elif session.group_type == 'control':
            control_count += 1
        else:
            null_count += 1

    print("\n" + "="*80)
    print(f"Summary:")
    print(f"  Treatment: {treatment_count}")
    print(f"  Control:   {control_count}")
    print(f"  NULL:      {null_count}")
    print("="*80 + "\n")


def main():
    """Main function to run the backfill process."""
    print("\n" + "="*80)
    print("Child Sessions Group Type Backfill Script")
    print("="*80 + "\n")

    with app.app_context():
        # Step 1: Preview changes
        changes = preview_changes()

        if not changes:
            print("✅ No changes needed. All child sessions already have group_type set.")
            return

        # Step 2: Ask for confirmation
        print("\n⚠️  IMPORTANT: Review the preview above carefully!")
        print("This will update the database based on school names.")
        print("\nSchool name matching logic:")
        print("  - Schools with 'T' or 'treatment' → treatment")
        print("  - Schools with 'C' or 'control' → control")
        print("\nYou can edit the get_group_type_from_school() function if this logic is wrong.")

        response = input("\n❓ Do you want to proceed? (yes/no): ").strip().lower()

        if response != 'yes':
            print("\n❌ Aborted. No changes made.")
            return

        # Step 3: Create backup
        print("\n📦 Creating backup...")
        if not backup_database():
            print("\n❌ Backup failed. Aborting for safety.")
            return

        # Step 4: Apply changes
        if apply_changes(changes):
            # Step 5: Verify
            verify_changes()
            print("✅ Backfill completed successfully!")
        else:
            print("❌ Backfill failed. Check errors above.")


if __name__ == '__main__':
    main()
