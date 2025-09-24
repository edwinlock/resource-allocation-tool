from datetime import datetime
import json
from flask import render_template, request, jsonify, current_app
from flask_security import login_required, roles_required, current_user
from babel.dates import format_datetime
# render_table is available in Jinja2 templates via flask_bootstrap
from webapp.models import db, Session, SurveyResponse, SliderResponse, User, Role

from webapp import app, db, mail, limiter

@app.route("/")
@app.route("/index")
def index_page():
    """Show a generic index page with a welcome."""
    return render_template('index.html')

@app.route("/profile")
@login_required
def profile_page():
    """Return JSON response with user_id and email only."""
    return jsonify({
        "user_id": current_user.id,
        "email": current_user.email
    })

@app.route("/upload-session", methods=['POST'])
@roles_required("enumerator")
def upload_session_page():
    """Process JSON data from request body containing session metadata, survey responses, and slider responses."""
    try:
        # Parse JSON from request body
        if not request.is_json:
            return jsonify({
                "error": "invalid_content_type",
                "message": "Content-Type must be application/json"
            }), 400

        data = request.get_json()
        if not data:
            return jsonify({
                "error": "empty_request",
                "message": "Request body cannot be empty"
            }), 400

        # Validate required top-level keys
        required_keys = ['sessionMetadata', 'surveyResponses', 'sliderResponses', 'completionTimestamps']
        missing_keys = [key for key in required_keys if key not in data]
        if missing_keys:
            return jsonify({
                "error": "missing_required_fields",
                "message": f"Missing required fields: {', '.join(missing_keys)}",
                "details": {"missing_fields": missing_keys}
            }), 400

        session_metadata = data['sessionMetadata']
        survey_responses = data['surveyResponses']
        slider_responses = data['sliderResponses']
        completion_timestamps = data['completionTimestamps']

        # Validate session metadata
        required_session_fields = ['sessionId', 'participantId', 'enumeratorId', 'sessionType', 'createdAt', 'children']
        missing_session_fields = [field for field in required_session_fields if field not in session_metadata]
        if missing_session_fields:
            return jsonify({
                "error": "missing_session_fields",
                "message": f"Missing required session fields: {', '.join(missing_session_fields)}",
                "details": {"missing_fields": missing_session_fields}
            }), 400

        session_id = session_metadata['sessionId']

        # Check if session already exists
        existing_session = db.session.get(Session, session_id)
        if existing_session:
            return jsonify({
                "error": "session_exists",
                "message": f"Session with ID {session_id} already exists",
                "details": {"session_id": session_id}
            }), 409

        # Validate enumerator exists
        enumerator = db.session.get(User, session_metadata['enumeratorId'])
        if not enumerator:
            return jsonify({
                "error": "invalid_enumerator",
                "message": "Enumerator not found",
                "details": {"enumerator_id": session_metadata['enumeratorId']}
            }), 422

        # Validate children data
        children = session_metadata['children']
        if 'child1' not in children or 'child2' not in children:
            return jsonify({
                "error": "missing_children_data",
                "message": "Both child1 and child2 data are required"
            }), 400

        # Start database transaction
        try:
            with db.session.begin():
                # Create Session record
                new_session = Session(
                    id=session_id,
                    participant_id=session_metadata['participantId'],
                    enumerator_id=session_metadata['enumeratorId'],
                    created_at=datetime.fromisoformat(session_metadata['createdAt'].replace('Z', '+00:00')),
                    child1_name=children['child1']['name'],
                    child1_ability=children['child1']['ability'],
                    child2_name=children['child2']['name'],
                    child2_ability=children['child2']['ability'],
                    school=children['child1']['school'],  # Assuming same school for both children
                    session_type=session_metadata['sessionType'],
                    upload_status='uploaded',
                    uploaded_at=datetime.utcnow()
                )

                # Set completion timestamps based on completion data
                if 'child1SurveyCompleted' in completion_timestamps:
                    new_session.child1_survey_status = 'completed'
                    new_session.child1_survey_completed_at = datetime.fromisoformat(
                        completion_timestamps['child1SurveyCompleted'].replace('Z', '+00:00')
                    )

                if 'child2SurveyCompleted' in completion_timestamps:
                    new_session.child2_survey_status = 'completed'
                    new_session.child2_survey_completed_at = datetime.fromisoformat(
                        completion_timestamps['child2SurveyCompleted'].replace('Z', '+00:00')
                    )

                if 'parentSurveyCompleted' in completion_timestamps:
                    if session_metadata['sessionType'] == 'treatment':
                        new_session.treatment_survey_status = 'completed'
                        new_session.treatment_survey_completed_at = datetime.fromisoformat(
                            completion_timestamps['parentSurveyCompleted'].replace('Z', '+00:00')
                        )
                    else:  # control
                        new_session.control_survey_status = 'completed'
                        new_session.control_survey_completed_at = datetime.fromisoformat(
                            completion_timestamps['parentSurveyCompleted'].replace('Z', '+00:00')
                        )

                if 'sliderCompleted' in completion_timestamps:
                    new_session.slider_status = 'completed'
                    new_session.slider_completed_at = datetime.fromisoformat(
                        completion_timestamps['sliderCompleted'].replace('Z', '+00:00')
                    )

                db.session.add(new_session)

                # Create SurveyResponse records
                survey_mapping = {
                    'child1Survey': 'Child1',
                    'child2Survey': 'Child2',
                    'parentSurvey': 'Treatment' if session_metadata['sessionType'] == 'treatment' else 'Control'
                }

                for survey_key, survey_id in survey_mapping.items():
                    if survey_key in survey_responses:
                        for response in survey_responses[survey_key]:
                            new_survey_response = SurveyResponse(
                                id=f"{session_id}_{survey_id}_{response['questionId']}",
                                session_id=session_id,
                                survey_id=survey_id,
                                question_id=response['questionId'],
                                answer=json.dumps(response['answer']) if isinstance(response['answer'], (list, dict)) else str(response['answer']),
                                completed_at=datetime.fromisoformat(response['completedAt'].replace('Z', '+00:00'))
                            )
                            db.session.add(new_survey_response)

                # Create SliderResponse records
                for response in slider_responses:
                    new_slider_response = SliderResponse(
                        id=f"{session_id}_slider_{response['displayOrder']}",
                        session_id=session_id,
                        scenario_number=response['scenarioNumber'],
                        display_order=response['displayOrder'],
                        child1_investment=response['child1Investment'],
                        completed_at=datetime.fromisoformat(response['completedAt'].replace('Z', '+00:00'))
                    )
                    db.session.add(new_slider_response)

            return jsonify({
                "success": True,
                "session_id": session_id,
                "message": "Session uploaded successfully"
            }), 201

        except Exception as e:
            current_app.logger.error(f"Database transaction failed: {str(e)}")
            return jsonify({
                "error": "transaction_failed",
                "message": "Failed to save session data",
                "details": {"error": str(e)}
            }), 500

    except json.JSONDecodeError:
        return jsonify({
            "error": "invalid_json",
            "message": "Request body contains invalid JSON"
        }), 400

    except Exception as e:
        current_app.logger.error(f"Unexpected error in upload_session: {str(e)}")
        return jsonify({
            "error": "internal_error",
            "message": "An unexpected error occurred",
            "details": {"error": str(e)}
        }), 500

@app.route("/enumerators")
@roles_required("administrator")
def enumerators_page():
    """Show a list of enumerator users using bootstrap-flask render_table() function."""
    # Get all users with enumerator role
    enumerator_role = Role.query.filter_by(name='enumerator').first()
    if not enumerator_role:
        enumerators = []
    else:
        enumerators = enumerator_role.users.all()

        # Add formatted date attributes for display using Babel
        for user in enumerators:
            user.last_login_formatted = format_datetime(user.last_login_at, 'short', locale='en_GB') if user.last_login_at else 'Never'
            user.current_login_formatted = format_datetime(user.current_login_at, 'short', locale='en_GB') if user.current_login_at else 'Never'

    return render_template('enumerators.html', enumerators=enumerators)

@app.route("/sessions")
@login_required
def session_page():
    """Show table of sessions using bootstrap-flask render_table() function."""
    # Get sessions, optionally filtered by enumerator
    enumerator_id = request.args.get('enumerator_id')

    if enumerator_id:
        sessions = Session.query.filter_by(enumerator_id=enumerator_id).order_by(Session.created_at.desc()).all()
    else:
        sessions = Session.query.order_by(Session.created_at.desc()).all()

    return render_template('sessions.html', sessions=sessions)

@app.route("/session/<id>")
@login_required
def session_details_page(id):
    """Display comprehensive session data using Bootstrap cards and tables."""
    session = db.session.get(Session, id)
    if not session:
        return render_template('404.html'), 404

    # Get survey responses organized by survey type
    survey_responses = {}
    for response in session.survey_responses:
        if response.survey_id not in survey_responses:
            survey_responses[response.survey_id] = []
        survey_responses[response.survey_id].append(response)

    # Get slider responses in display order
    slider_responses = session.slider_responses.order_by(SliderResponse.display_order).all()

    # Prepare survey response data for template
    survey_data = {}
    for survey_id, responses in survey_responses.items():
        survey_data[survey_id] = [
            {
                'question_id': response.question_id,
                'answer': str(response.to_dict()['answer']),
                'completed_at': response.completed_at
            }
            for response in responses
        ]

    # Prepare slider response data for template
    slider_data = [
        {
            'display_order': response.display_order,
            'scenario_number': response.scenario_number,
            'child1_investment': response.child1_investment,
            'child2_investment': response.child2_investment,
            'completed_at': response.completed_at
        }
        for response in slider_responses
    ]

    return render_template('session_details.html',
                            session=session,
                            survey_data=survey_data,
                            slider_data=slider_data)