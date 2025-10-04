from datetime import datetime
import json
from flask import render_template, request, jsonify, current_app
from flask_security import login_required, roles_required, current_user
from babel.dates import format_datetime
# render_table is available in Jinja2 templates via flask_bootstrap
from webapp.models import db, Session, ChildSession, ParentSession, SurveyResponse, SliderResponse, User, Role

from webapp import app, db, mail, limiter

# === Session Upload Helper Functions ===

def parse_session_upload_data(request_data):
    """Parse and extract the main data components from request."""
    try:
        # Validate required top-level keys
        required_keys = ['sessionMetadata', 'surveyResponses', 'completionTimestamps']
        missing_keys = [key for key in required_keys if key not in request_data]
        if missing_keys:
            return None, {
                "error": "missing_required_fields",
                "message": f"Missing required fields: {', '.join(missing_keys)}",
                "details": {"missing_fields": missing_keys}
            }

        # sliderResponses is optional (only for parent treatment sessions)
        slider_responses = request_data.get('sliderResponses', [])

        return (
            request_data['sessionMetadata'],
            request_data['surveyResponses'],
            slider_responses,
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
    # Common required fields
    required_common_fields = ['sessionId', 'sessionType', 'enumeratorId', 'createdAt', 'familyId', 'school']
    missing_common_fields = [field for field in required_common_fields if field not in session_metadata]
    if missing_common_fields:
        return False, {
            "error": "missing_session_fields",
            "message": f"Missing required session fields: {', '.join(missing_common_fields)}",
            "details": {"missing_fields": missing_common_fields}
        }

    # Validate session-type specific fields
    session_type = session_metadata['sessionType']
    if session_type == 'child':
        required_child_fields = ['childId', 'childName']
        missing_child_fields = [field for field in required_child_fields if field not in session_metadata]
        if missing_child_fields:
            return False, {
                "error": "missing_child_session_fields",
                "message": f"Missing required child session fields: {', '.join(missing_child_fields)}",
                "details": {"missing_fields": missing_child_fields}
            }
    elif session_type == 'parent':
        required_parent_fields = ['child1Name', 'child2Name', 'groupType', 'preEarnings1', 'preEarnings2']
        missing_parent_fields = [field for field in required_parent_fields if field not in session_metadata]
        if missing_parent_fields:
            return False, {
                "error": "missing_parent_session_fields",
                "message": f"Missing required parent session fields: {', '.join(missing_parent_fields)}",
                "details": {"missing_fields": missing_parent_fields}
            }
    else:
        return False, {
            "error": "invalid_session_type",
            "message": f"Invalid session type: {session_type}. Must be 'child' or 'parent'."
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
    """Create ChildSession or ParentSession model instance from metadata."""
    session_id = session_metadata['sessionId']
    session_type = session_metadata['sessionType']

    created_at = datetime.fromisoformat(session_metadata['createdAt'].replace('Z', '+00:00'))

    if session_type == 'child':
        new_session = ChildSession(
            id=session_id,
            enumerator_id=session_metadata['enumeratorId'],
            created_at=created_at,
            family_id=session_metadata['familyId'],
            child_id=session_metadata['childId'],
            name=session_metadata['childName'],
            school=session_metadata['school'],
            upload_status='uploaded',
            uploaded_at=datetime.utcnow()
        )

        # Set completion timestamps
        if 'surveyCompleted' in completion_timestamps:
            new_session.survey_status = 'completed'
            new_session.survey_completed_at = datetime.fromisoformat(
                completion_timestamps['surveyCompleted'].replace('Z', '+00:00')
            )

    elif session_type == 'parent':
        new_session = ParentSession(
            id=session_id,
            enumerator_id=session_metadata['enumeratorId'],
            created_at=created_at,
            family_id=session_metadata['familyId'],
            child1_name=session_metadata['child1Name'],
            child2_name=session_metadata['child2Name'],
            school=session_metadata['school'],
            group_type=session_metadata['groupType'],
            preEarnings1=session_metadata['preEarnings1'],
            preEarnings2=session_metadata['preEarnings2'],
            upload_status='uploaded',
            uploaded_at=datetime.utcnow()
        )

        # Set completion timestamps
        if 'surveyCompleted' in completion_timestamps:
            new_session.survey_status = 'completed'
            new_session.survey_completed_at = datetime.fromisoformat(
                completion_timestamps['surveyCompleted'].replace('Z', '+00:00')
            )

        if session_metadata['groupType'] == 'treatment':
            if 'sliderCompleted' in completion_timestamps:
                new_session.slider_status = 'completed'
                new_session.slider_completed_at = datetime.fromisoformat(
                    completion_timestamps['sliderCompleted'].replace('Z', '+00:00')
                )
            if 'exitSurveyCompleted' in completion_timestamps:
                new_session.exit_survey_status = 'completed'
                new_session.exit_survey_completed_at = datetime.fromisoformat(
                    completion_timestamps['exitSurveyCompleted'].replace('Z', '+00:00')
                )

    return new_session

def create_survey_response_objects(session_id, survey_responses, session_metadata):
    """Create list of SurveyResponse objects."""
    survey_objects = []

    # survey_responses is now a flat list of response objects with surveyId field
    for response in survey_responses:
        new_survey_response = SurveyResponse(
            id=response['id'],
            session_id=session_id,
            survey_id=response['surveyId'],
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
            parent_session_id=session_id,  # Now links to parent_session
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

        session_id = session_metadata['sessionId']

        # 4. Check business rules
        session_exists, error_response = check_session_exists(session_id)
        if session_exists:
            return jsonify(error_response), 409

        enumerator_valid, enumerator, error_response = validate_enumerator_exists(session_metadata['enumeratorId'])
        if not enumerator_valid:
            return jsonify(error_response), 422

        # 5. Create model objects
        session_obj = create_session_object(session_metadata, completion_timestamps)
        survey_objects = create_survey_response_objects(session_id, survey_responses, session_metadata)
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

    # Add formatted datetime and session type badge for each session
    for session in sessions:
        session.id_short = f"{session.id[:8]}..."
        session.created_at_formatted = format_datetime(session.created_at, 'short', locale='en_GB') if session.created_at else 'N/A'
        if session.session_type == 'child':
            session.session_type_badge = '<span class="badge bg-info" style="vertical-align: middle;">Child</span>'
        else:
            session.session_type_badge = '<span class="badge bg-primary" style="vertical-align: middle;">Parent</span>'

    return render_template('sessions.html', sessions=sessions)

@app.route("/session/<id>")
@login_required
def session_details_page(id):
    """Display comprehensive session data using Bootstrap cards and tables."""
    session = db.session.get(Session, id)
    if not session:
        return render_template('404.html'), 404

    # Add formatted datetime to session
    session.created_at_formatted = format_datetime(session.created_at, 'short', locale='en_GB') if session.created_at else 'N/A'
    session.uploaded_at_formatted = format_datetime(session.uploaded_at, 'short', locale='en_GB') if session.uploaded_at else None

    # Add formatted datetimes for parent session component completion times
    if session.session_type == 'parent':
        parent_session = db.session.get(ParentSession, id)
        if parent_session:
            parent_session.survey_completed_at_formatted = format_datetime(parent_session.survey_completed_at, 'short', locale='en_GB') if parent_session.survey_completed_at else None
            parent_session.slider_completed_at_formatted = format_datetime(parent_session.slider_completed_at, 'short', locale='en_GB') if parent_session.slider_completed_at else None
            parent_session.exit_survey_completed_at_formatted = format_datetime(parent_session.exit_survey_completed_at, 'short', locale='en_GB') if parent_session.exit_survey_completed_at else None

    # Get all survey responses for this session
    survey_responses = SurveyResponse.query.filter_by(session_id=id).order_by(SurveyResponse.completed_at).all()

    # Add formatted datetime to each survey response
    for response in survey_responses:
        response.completed_at_formatted = format_datetime(response.completed_at, 'short', locale='en_GB') if response.completed_at else 'N/A'

    # Get slider responses (only for parent treatment sessions)
    slider_responses = []
    if session.session_type == 'parent':
        parent_session = db.session.get(ParentSession, id)
        if parent_session and parent_session.group_type == 'treatment':
            slider_responses = SliderResponse.query.filter_by(parent_session_id=id).order_by(SliderResponse.display_order).all()

            # Add formatted datetime to each slider response
            for response in slider_responses:
                response.completed_at_formatted = format_datetime(response.completed_at, 'short', locale='en_GB') if response.completed_at else 'N/A'

    return render_template('session_details.html',
                          session=session,
                          survey_responses=survey_responses,
                          slider_responses=slider_responses)