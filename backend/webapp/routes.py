from datetime import datetime
import json
from flask import render_template, request, jsonify, current_app
from flask_security import login_required, roles_required, current_user
from babel.dates import format_datetime
# render_table is available in Jinja2 templates via flask_bootstrap
from webapp.models import db, Session, SurveyResponse, SliderResponse, User, Role

from webapp import app, db, mail, limiter

# === Session Upload Helper Functions ===

def parse_session_upload_data(request_data):
    """Parse and extract the four main data components from request."""
    try:
        # Validate required top-level keys
        required_keys = ['sessionMetadata', 'surveyResponses', 'sliderResponses', 'completionTimestamps']
        missing_keys = [key for key in required_keys if key not in request_data]
        if missing_keys:
            return None, {
                "error": "missing_required_fields",
                "message": f"Missing required fields: {', '.join(missing_keys)}",
                "details": {"missing_fields": missing_keys}
            }

        return (
            request_data['sessionMetadata'],
            request_data['surveyResponses'],
            request_data['sliderResponses'],
            request_data['completionTimestamps']
        ), None

    except Exception as e:
        return None, {
            "error": "parsing_error",
            "message": "Failed to parse request data",
            "details": {"error": str(e)}
        }

def validate_session_metadata(session_metadata):
    """Validate session metadata structure and required fields."""
    required_session_fields = ['sessionId', 'participantId', 'enumeratorId', 'sessionType', 'createdAt', 'children']
    missing_session_fields = [field for field in required_session_fields if field not in session_metadata]
    if missing_session_fields:
        return False, {
            "error": "missing_session_fields",
            "message": f"Missing required session fields: {', '.join(missing_session_fields)}",
            "details": {"missing_fields": missing_session_fields}
        }
    return True, None

def validate_children_data(children):
    """Validate children data structure."""
    if 'child1' not in children or 'child2' not in children:
        return False, {
            "error": "missing_children_data",
            "message": "Both child1 and child2 data are required"
        }
    return True, None

def check_session_exists(session_id):
    """Check if session already exists in database."""
    existing_session = db.session.get(Session, session_id)
    if existing_session:
        return True, {
            "error": "session_exists",
            "message": f"Session with ID {session_id} already exists",
            "details": {"session_id": session_id}
        }
    return False, None

def validate_enumerator_exists(enumerator_id):
    """Validate that enumerator user exists."""
    enumerator = db.session.get(User, enumerator_id)
    if not enumerator:
        return False, None, {
            "error": "invalid_enumerator",
            "message": "Enumerator not found",
            "details": {"enumerator_id": enumerator_id}
        }
    return True, enumerator, None

def create_session_object(session_metadata, completion_timestamps):
    """Create Session model instance from metadata."""
    session_id = session_metadata['sessionId']
    children = session_metadata['children']

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

    return new_session

def create_survey_response_objects(session_id, survey_responses, session_type):
    """Create list of SurveyResponse objects."""
    survey_objects = []
    survey_mapping = {
        'child1Survey': 'Child1',
        'child2Survey': 'Child2',
        'parentSurvey': 'Treatment' if session_type == 'treatment' else 'Control'
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
                survey_objects.append(new_survey_response)

    return survey_objects

def create_slider_response_objects(session_id, slider_responses):
    """Create list of SliderResponse objects."""
    slider_objects = []
    for response in slider_responses:
        new_slider_response = SliderResponse(
            id=f"{session_id}_slider_{response['displayOrder']}",
            session_id=session_id,
            scenario_number=response['scenarioNumber'],
            display_order=response['displayOrder'],
            child1_investment=response['child1Investment'],
            completed_at=datetime.fromisoformat(response['completedAt'].replace('Z', '+00:00'))
        )
        slider_objects.append(new_slider_response)

    return slider_objects

def save_session_data(session_obj, survey_objects, slider_objects):
    """Save all session data in a single database transaction."""
    try:
        # Add all objects to the session
        db.session.add(session_obj)
        for survey_obj in survey_objects:
            db.session.add(survey_obj)
        for slider_obj in slider_objects:
            db.session.add(slider_obj)

        # Commit the transaction
        db.session.commit()
        return True, None

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Database transaction failed: {str(e)}")
        return False, {
            "error": "transaction_failed",
            "message": "Failed to save session data",
            "details": {"error": str(e)}
        }

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
        # 1. Validate request format
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

        # 2. Parse and validate data structure
        parsed_data, parse_error = parse_session_upload_data(data)
        if parse_error:
            return jsonify(parse_error), 400

        session_metadata, survey_responses, slider_responses, completion_timestamps = parsed_data

        # 3. Validate session metadata
        is_valid, validation_error = validate_session_metadata(session_metadata)
        if not is_valid:
            return jsonify(validation_error), 400

        # 4. Validate children data
        children = session_metadata['children']
        is_valid, validation_error = validate_children_data(children)
        if not is_valid:
            return jsonify(validation_error), 400

        session_id = session_metadata['sessionId']

        # 5. Check business rules
        session_exists, error_response = check_session_exists(session_id)
        if session_exists:
            return jsonify(error_response), 409

        enumerator_valid, enumerator, error_response = validate_enumerator_exists(session_metadata['enumeratorId'])
        if not enumerator_valid:
            return jsonify(error_response), 422

        # 6. Create model objects
        session_obj = create_session_object(session_metadata, completion_timestamps)
        survey_objects = create_survey_response_objects(session_id, survey_responses, session_metadata['sessionType'])
        slider_objects = create_slider_response_objects(session_id, slider_responses)

        # 7. Save to database
        success, error_response = save_session_data(session_obj, survey_objects, slider_objects)
        if not success:
            return jsonify(error_response), 500

        # 8. Return success response
        return jsonify({
            "success": True,
            "session_id": session_id,
            "message": "Session uploaded successfully"
        }), 201

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

    # Create 4 separate queries for the 4 tables
    child1_responses = SurveyResponse.query.filter_by(session_id=id, survey_id='Child1').order_by(SurveyResponse.completed_at)
    child2_responses = SurveyResponse.query.filter_by(session_id=id, survey_id='Child2').order_by(SurveyResponse.completed_at)

    # Parent survey depends on session type (Treatment or Control)
    parent_survey_id = 'Treatment' if session.session_type == 'treatment' else 'Control'
    parent_responses = SurveyResponse.query.filter_by(session_id=id, survey_id=parent_survey_id).order_by(SurveyResponse.completed_at)

    slider_responses = SliderResponse.query.filter_by(session_id=id).order_by(SliderResponse.display_order)

    return render_template('session_details.html',
                          session=session,
                          child1_responses=child1_responses,
                          child2_responses=child2_responses,
                          parent_responses=parent_responses,
                          slider_responses=slider_responses)