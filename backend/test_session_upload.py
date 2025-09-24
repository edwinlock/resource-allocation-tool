#!/usr/bin/env python3
"""
Tests for session upload parsing and validation functions.
"""

import unittest
from datetime import datetime

# Import the functions we want to test
from webapp.routes import (
    parse_session_upload_data,
    validate_session_metadata,
    validate_children_data,
    check_session_exists,
    validate_enumerator_exists,
    create_session_object,
    create_survey_response_objects,
    create_slider_response_objects
)

class TestSessionUploadParsing(unittest.TestCase):
    """Test data parsing functions."""

    def test_parse_session_upload_data_valid(self):
        """Test parsing valid request data."""
        valid_data = {
            'sessionMetadata': {'sessionId': 'test123'},
            'surveyResponses': [{'questionId': 'q1', 'answer': 'yes'}],
            'sliderResponses': [{'displayOrder': 1, 'child1Investment': 5}],
            'completionTimestamps': {'child1SurveyCompleted': '2025-01-01T10:00:00Z'}
        }

        result, error = parse_session_upload_data(valid_data)

        self.assertIsNotNone(result)
        self.assertIsNone(error)
        self.assertEqual(len(result), 4)  # Should return 4 components
        self.assertEqual(result[0]['sessionId'], 'test123')

    def test_parse_session_upload_data_missing_keys(self):
        """Test parsing with missing required keys."""
        invalid_data = {
            'sessionMetadata': {'sessionId': 'test123'},
            # Missing surveyResponses, sliderResponses, completionTimestamps
        }

        result, error = parse_session_upload_data(invalid_data)

        self.assertIsNone(result)
        self.assertIsNotNone(error)
        self.assertEqual(error['error'], 'missing_required_fields')
        self.assertIn('surveyResponses', error['details']['missing_fields'])

    def test_validate_session_metadata_valid(self):
        """Test validating valid session metadata."""
        valid_metadata = {
            'sessionId': 'test123',
            'participantId': 'p456',
            'enumeratorId': 1,
            'sessionType': 'treatment',
            'createdAt': '2025-01-01T10:00:00Z',
            'children': {'child1': {}, 'child2': {}}
        }

        is_valid, error = validate_session_metadata(valid_metadata)

        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_session_metadata_missing_fields(self):
        """Test validating session metadata with missing fields."""
        invalid_metadata = {
            'sessionId': 'test123',
            # Missing required fields
        }

        is_valid, error = validate_session_metadata(invalid_metadata)

        self.assertFalse(is_valid)
        self.assertIsNotNone(error)
        self.assertEqual(error['error'], 'missing_session_fields')

    def test_validate_children_data_valid(self):
        """Test validating valid children data."""
        valid_children = {
            'child1': {'name': 'Alice', 'ability': 80},
            'child2': {'name': 'Bob', 'ability': 70}
        }

        is_valid, error = validate_children_data(valid_children)

        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_children_data_missing_child(self):
        """Test validating children data with missing child."""
        invalid_children = {
            'child1': {'name': 'Alice', 'ability': 80}
            # Missing child2
        }

        is_valid, error = validate_children_data(invalid_children)

        self.assertFalse(is_valid)
        self.assertIsNotNone(error)
        self.assertEqual(error['error'], 'missing_children_data')


class TestSessionObjectCreation(unittest.TestCase):
    """Test object creation functions."""

    def test_create_session_object(self):
        """Test creating a Session object from metadata."""
        session_metadata = {
            'sessionId': 'test123',
            'participantId': 'p456',
            'enumeratorId': 1,
            'sessionType': 'treatment',
            'createdAt': '2025-01-01T10:00:00Z',
            'children': {
                'child1': {'name': 'Alice', 'ability': 80, 'school': 'Primary School'},
                'child2': {'name': 'Bob', 'ability': 70, 'school': 'Primary School'}
            }
        }

        completion_timestamps = {
            'child1SurveyCompleted': '2025-01-01T11:00:00Z'
        }

        session_obj = create_session_object(session_metadata, completion_timestamps)

        self.assertEqual(session_obj.id, 'test123')
        self.assertEqual(session_obj.participant_id, 'p456')
        self.assertEqual(session_obj.enumerator_id, 1)
        self.assertEqual(session_obj.session_type, 'treatment')
        self.assertEqual(session_obj.child1_name, 'Alice')
        self.assertEqual(session_obj.child2_name, 'Bob')
        self.assertEqual(session_obj.child1_ability, 80)
        self.assertEqual(session_obj.child2_ability, 70)
        self.assertEqual(session_obj.school, 'Primary School')
        self.assertEqual(session_obj.child1_survey_status, 'completed')
        self.assertIsNotNone(session_obj.child1_survey_completed_at)

    def test_create_survey_response_objects(self):
        """Test creating SurveyResponse objects."""
        session_id = 'test123'
        survey_responses = {
            'child1Survey': [
                {
                    'questionId': 'q1',
                    'answer': 'yes',
                    'completedAt': '2025-01-01T10:00:00Z'
                },
                {
                    'questionId': 'q2',
                    'answer': ['option1', 'option2'],
                    'completedAt': '2025-01-01T10:05:00Z'
                }
            ]
        }
        session_type = 'treatment'

        survey_objects = create_survey_response_objects(session_id, survey_responses, session_type)

        self.assertEqual(len(survey_objects), 2)
        self.assertEqual(survey_objects[0].session_id, 'test123')
        self.assertEqual(survey_objects[0].survey_id, 'Child1')
        self.assertEqual(survey_objects[0].question_id, 'q1')
        self.assertEqual(survey_objects[0].answer, 'yes')
        # Second response should have JSON-encoded answer
        self.assertIn('option1', survey_objects[1].answer)

    def test_create_slider_response_objects(self):
        """Test creating SliderResponse objects."""
        session_id = 'test123'
        slider_responses = [
            {
                'scenarioNumber': 1,
                'displayOrder': 1,
                'child1Investment': 5,
                'completedAt': '2025-01-01T10:00:00Z'
            },
            {
                'scenarioNumber': 2,
                'displayOrder': 2,
                'child1Investment': 7,
                'completedAt': '2025-01-01T10:01:00Z'
            }
        ]

        slider_objects = create_slider_response_objects(session_id, slider_responses)

        self.assertEqual(len(slider_objects), 2)
        self.assertEqual(slider_objects[0].session_id, 'test123')
        self.assertEqual(slider_objects[0].scenario_number, 1)
        self.assertEqual(slider_objects[0].display_order, 1)
        self.assertEqual(slider_objects[0].child1_investment, 5)
        self.assertEqual(slider_objects[1].child1_investment, 7)


if __name__ == '__main__':
    print("Running session upload tests...")
    unittest.main()