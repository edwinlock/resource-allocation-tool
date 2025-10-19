#!/usr/bin/env python3
"""
Database migration script to recreate slider_response table with new schema
"""
from webapp import create_app, db
from webapp.models import SliderResponse

def migrate_database():
    app = create_app()
    with app.app_context():
        # Drop and recreate slider_response table
        print("Dropping slider_response table if exists...")
        SliderResponse.__table__.drop(db.engine, checkfirst=True)

        print("Creating slider_response table with new schema...")
        SliderResponse.__table__.create(db.engine)

        print("Migration complete!")

        # Verify the new schema
        print("\nNew table schema:")
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        columns = inspector.get_columns('slider_response')
        for col in columns:
            print(f"  {col['name']}: {col['type']}")

if __name__ == '__main__':
    migrate_database()
