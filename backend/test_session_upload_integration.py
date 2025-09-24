#!/usr/bin/env python3
"""
Integration test for complete session upload functionality.
"""

import json
from webapp import app, db
from webapp.models import Session, SurveyResponse, SliderResponse, User

def test_complete_upload_flow():
    """Test the complete session upload flow."""

    # Sample complete session data (similar to what would come from the PWA)
    test_session_data = {
        "sessionMetadata": {
            "sessionId": "test-integration-123",
            "participantId": "participant-456",
            "enumeratorId": 1,  # Assuming user with ID 1 exists
            "sessionType": "treatment",
            "createdAt": "2025-01-01T10:00:00Z",
            "children": {
                "child1": {
                    "name": "Alice",
                    "ability": 85,
                    "school": "Primary School A"
                },
                "child2": {
                    "name": "Bob",
                    "ability": 75,
                    "school": "Primary School A"
                }
            }
        },
        "surveyResponses": {
            "child1Survey": [
                {
                    "questionId": "child1_q1",
                    "answer": "yes",
                    "completedAt": "2025-01-01T10:15:00Z"
                },
                {
                    "questionId": "child1_q2",
                    "answer": ["option1", "option2"],
                    "completedAt": "2025-01-01T10:16:00Z"
                }
            ],
            "child2Survey": [
                {
                    "questionId": "child2_q1",
                    "answer": "no",
                    "completedAt": "2025-01-01T10:20:00Z"
                }
            ],
            "parentSurvey": [
                {
                    "questionId": "parent_q1",
                    "answer": {"rating": 5, "comment": "Good school"},
                    "completedAt": "2025-01-01T10:25:00Z"
                }
            ]
        },
        "sliderResponses": [
            {
                "scenarioNumber": 1,
                "displayOrder": 1,
                "child1Investment": 6,
                "completedAt": "2025-01-01T10:30:00Z"
            },
            {
                "scenarioNumber": 2,
                "displayOrder": 2,
                "child1Investment": 4,
                "completedAt": "2025-01-01T10:31:00Z"
            }
        ],
        "completionTimestamps": {
            "child1SurveyCompleted": "2025-01-01T10:16:00Z",
            "child2SurveyCompleted": "2025-01-01T10:20:00Z",
            "parentSurveyCompleted": "2025-01-01T10:25:00Z",
            "sliderCompleted": "2025-01-01T10:31:00Z"
        }
    }

    with app.app_context():
        # Check if we have users in the database
        user_count = User.query.count()
        print(f"Users in database: {user_count}")

        if user_count == 0:
            print("⚠️  No users found in database. Skipping integration test.")
            return

        # Import our parsing functions
        from webapp.routes import (
            parse_session_upload_data,
            validate_session_metadata,
            validate_children_data,
            check_session_exists,
            validate_enumerator_exists,
            create_session_object,
            create_survey_response_objects,
            create_slider_response_objects,
            save_session_data
        )

        print("🧪 Testing complete session upload flow...")

        # 1. Parse data
        parsed_data, parse_error = parse_session_upload_data(test_session_data)
        assert parse_error is None, f"Parse error: {parse_error}"
        print("✅ Data parsing successful")

        session_metadata, survey_responses, slider_responses, completion_timestamps = parsed_data

        # 2. Validate session metadata
        is_valid, error = validate_session_metadata(session_metadata)
        assert is_valid, f"Session metadata validation failed: {error}"
        print("✅ Session metadata validation successful")

        # 3. Validate children data
        is_valid, error = validate_children_data(session_metadata['children'])
        assert is_valid, f"Children data validation failed: {error}"
        print("✅ Children data validation successful")

        # 4. Check session doesn't exist
        session_id = session_metadata['sessionId']
        exists, error = check_session_exists(session_id)
        assert not exists, f"Session should not exist yet: {error}"
        print("✅ Session existence check successful")

        # 5. Validate enumerator exists
        enumerator_valid, enumerator, error = validate_enumerator_exists(session_metadata['enumeratorId'])
        assert enumerator_valid, f"Enumerator validation failed: {error}"
        print(f"✅ Enumerator validation successful (found user: {enumerator.email})")

        # 6. Create objects
        session_obj = create_session_object(session_metadata, completion_timestamps)
        survey_objects = create_survey_response_objects(session_id, survey_responses, session_metadata['sessionType'])
        slider_objects = create_slider_response_objects(session_id, slider_responses)

        print(f"✅ Objects created: 1 session, {len(survey_objects)} survey responses, {len(slider_objects)} slider responses")

        # 7. Save to database
        success, error = save_session_data(session_obj, survey_objects, slider_objects)
        assert success, f"Database save failed: {error}"
        print("✅ Database save successful")

        # 8. Verify data was saved correctly
        saved_session = Session.query.get(session_id)
        assert saved_session is not None, "Session not found in database"
        assert saved_session.child1_name == "Alice"
        assert saved_session.child2_name == "Bob"
        assert saved_session.session_type == "treatment"
        print("✅ Session data verification successful")

        saved_surveys = SurveyResponse.query.filter_by(session_id=session_id).count()
        saved_sliders = SliderResponse.query.filter_by(session_id=session_id).count()
        print(f"✅ Database verification: {saved_surveys} survey responses, {saved_sliders} slider responses saved")

        print(f"🎉 Integration test completed successfully!")
        print(f"   Session ID: {session_id}")
        print(f"   Enumerator: {enumerator.email}")
        print(f"   Children: Alice (ability: 85), Bob (ability: 75)")
        print(f"   Survey responses: {saved_surveys}")
        print(f"   Slider responses: {saved_sliders}")


if __name__ == '__main__':
    test_complete_upload_flow()