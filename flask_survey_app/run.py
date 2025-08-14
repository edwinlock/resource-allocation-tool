#!/usr/bin/env python3
import os
import uuid
from datetime import datetime, UTC
from app import create_app, db
from app.models import User, Role
from flask_security import SQLAlchemyUserDatastore
from flask_security.utils import hash_password

app = create_app(os.getenv('FLASK_CONFIG') or 'default')

def create_roles_and_users():
    """Create initial roles and admin user"""
    
    # Create all database tables
    db.create_all()
    
    # Get the user datastore from the Flask-Security extension
    from flask_security import SQLAlchemyUserDatastore
    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    
    if not user_datastore.find_role('admin'):
        user_datastore.create_role(name='admin', description='Administrator')
    if not user_datastore.find_role('enumerator'):
        user_datastore.create_role(name='enumerator', description='Survey Enumerator')
    if not user_datastore.find_role('participant'):
        user_datastore.create_role(name='participant', description='Survey Participant')
    
    # Create admin user if it doesn't exist
    if not user_datastore.find_user(email='admin@example.com'):
        user_datastore.create_user(
            email='admin@example.com',
            username='admin',
            password=hash_password('admin123'),
            first_name='Admin',
            last_name='User',
            active=True,
            confirmed_at=datetime.now(UTC),
            fs_uniquifier=str(uuid.uuid4())
        )
        
    # Create enumerator user if it doesn't exist
    if not user_datastore.find_user(email='enumerator@example.com'):
        user_datastore.create_user(
            email='enumerator@example.com',
            username='enumerator',
            password=hash_password('enum123'),
            first_name='Enumerator',
            last_name='User',
            active=True,
            confirmed_at=datetime.now(UTC),
            fs_uniquifier=str(uuid.uuid4())
        )
    
    # Create participant user if it doesn't exist
    if not user_datastore.find_user(email='participant@example.com'):
        user_datastore.create_user(
            email='participant@example.com',
            username='participant',
            password=hash_password('participant123'),
            first_name='Participant',
            last_name='User',
            active=True,
            confirmed_at=datetime.now(UTC),
            fs_uniquifier=str(uuid.uuid4())
        )
    
    db.session.commit()
    
    # Assign roles to users
    admin_user = user_datastore.find_user(email='admin@example.com')
    enumerator_user = user_datastore.find_user(email='enumerator@example.com')
    participant_user = user_datastore.find_user(email='participant@example.com')
    
    admin_role = user_datastore.find_role('admin')
    enumerator_role = user_datastore.find_role('enumerator')
    participant_role = user_datastore.find_role('participant')
    
    if not admin_user.has_role('admin'):
        user_datastore.add_role_to_user(admin_user, admin_role)
    if not enumerator_user.has_role('enumerator'):
        user_datastore.add_role_to_user(enumerator_user, enumerator_role)
    if not participant_user.has_role('participant'):
        user_datastore.add_role_to_user(participant_user, participant_role)
    
    db.session.commit()

@app.shell_context_processor
def make_shell_context():
    """Make database models available in flask shell"""
    return {
        'db': db,
        'User': User,
        'Role': Role
    }

@app.cli.command()
def init_db():
    """Initialize the database"""
    db.create_all()
    print('Database tables created.')

@app.cli.command()
def create_admin():
    """Create admin user"""
    from flask_security import SQLAlchemyUserDatastore
    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    
    # Create roles
    admin_role = user_datastore.create_role(name='admin', description='Administrator')
    enumerator_role = user_datastore.create_role(name='enumerator', description='Survey Enumerator')
    participant_role = user_datastore.create_role(name='participant', description='Survey Participant')
    
    # Create admin user
    admin_user = user_datastore.create_user(
        email='admin@example.com',
        username='admin',
        password=hash_password('admin123'),
        first_name='Admin',
        last_name='User',
        active=True,
        confirmed_at=datetime.now(UTC),
        fs_uniquifier=str(uuid.uuid4())
    )
    
    user_datastore.add_role_to_user(admin_user, admin_role)
    db.session.commit()
    print('Admin user created: admin@example.com / admin123')

if __name__ == '__main__':
    with app.app_context():
        create_roles_and_users()
    
    app.run(debug=True, host='0.0.0.0', port=5004)