#!/usr/bin/env python3
"""
Database-dependent tests for session upload functions.
"""

import unittest
from webapp import app, db
from webapp.models import Session, User, Role
from webapp.routes import (
    check_session_exists,
    validate_enumerator_exists,
    save_session_data
)

class TestSessionUploadDatabase(unittest.TestCase):
    """Test database-dependent functions."""

    @classmethod
    def setUpClass(cls):
        """Set up test database."""
        cls.app = app
        cls.app_context = cls.app.app_context()
        cls.app_context.push()

    @classmethod
    def tearDownClass(cls):
        """Clean up test database."""
        cls.app_context.pop()

    def test_check_session_exists_not_found(self):
        """Test checking for non-existent session."""
        exists, error = check_session_exists('nonexistent_session_id')

        self.assertFalse(exists)
        self.assertIsNone(error)

    def test_validate_enumerator_exists_found(self):
        """Test validating existing enumerator."""
        # Get any existing user (should have some from app initialization)
        user = User.query.first()
        if user:
            is_valid, found_user, error = validate_enumerator_exists(user.id)

            self.assertTrue(is_valid)
            self.assertIsNotNone(found_user)
            self.assertIsNone(error)
            self.assertEqual(found_user.id, user.id)

    def test_validate_enumerator_exists_not_found(self):
        """Test validating non-existent enumerator."""
        is_valid, found_user, error = validate_enumerator_exists(99999)  # Unlikely to exist

        self.assertFalse(is_valid)
        self.assertIsNone(found_user)
        self.assertIsNotNone(error)
        self.assertEqual(error['error'], 'invalid_enumerator')

    def test_database_connectivity(self):
        """Test that we can connect to the database."""
        user_count = User.query.count()
        self.assertGreaterEqual(user_count, 0)  # Should have at least 0 users

    def test_session_model_creation(self):
        """Test that we can create Session model instances."""
        from webapp.routes import create_session_object

        session_metadata = {
            'sessionId': 'test_db_123',
            'participantId': 'p456',
            'enumeratorId': 1,
            'sessionType': 'treatment',
            'createdAt': '2025-01-01T10:00:00Z',
            'children': {
                'child1': {'name': 'Alice', 'ability': 80, 'school': 'Test School'},
                'child2': {'name': 'Bob', 'ability': 70, 'school': 'Test School'}
            }
        }

        completion_timestamps = {}

        session_obj = create_session_object(session_metadata, completion_timestamps)

        # Verify the object was created with correct attributes
        self.assertEqual(session_obj.id, 'test_db_123')
        self.assertEqual(session_obj.participant_id, 'p456')
        self.assertEqual(session_obj.child1_name, 'Alice')
        self.assertEqual(session_obj.child2_name, 'Bob')
        self.assertEqual(session_obj.session_type, 'treatment')


if __name__ == '__main__':
    print("Running database-dependent session upload tests...")
    unittest.main()