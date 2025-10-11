from datetime import datetime
import json
import io
import zipfile
from flask import render_template, request, jsonify, current_app, send_file
from flask_security import login_required, roles_required, current_user, hash_password
from babel.dates import format_datetime
import pandas as pd
from sqlalchemy.exc import IntegrityError
# render_table is available in Jinja2 templates via flask_bootstrap
from webapp.models import db, Session, ChildSession, ParentSession, SurveyResponse, SliderResponse, User, Role

from webapp import app, db, mail
# from webapp import limiter

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
            if 'sliderStarted' in completion_timestamps:
                new_session.slider_started_at = datetime.fromisoformat(
                    completion_timestamps['sliderStarted'].replace('Z', '+00:00')
                )
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
        # Include scenarios_id in the ID to prevent duplicates between practice and real sliders
        scenarios_id = response['scenariosId']
        new_slider_response = SliderResponse(
            id=f"{session_id}_{scenarios_id}_slider_{response['displayOrder']}",
            parent_session_id=session_id,  # Now links to parent_session
            scenarios_id=scenarios_id,  # Include scenarios_id
            scenario_number=response['scenarioNumber'],
            display_order=response['displayOrder'],
            child1_investment=response['child1investment'],  # Frontend uses lowercase 'investment'
            completed_at=datetime.fromisoformat(response['completedAt'].replace('Z', '+00:00')),
            # Economic parameters
            scenario_gamma=response['scenarioGamma'],
            scenario_sigma=response['scenarioSigma'],
            scenario_theta=response['scenarioTheta'],
            pre_earnings1=response['preEarnings1'],
            pre_earnings2=response['preEarnings2'],
            scenario_alpha=response['scenarioAlpha'],
            child1_final_earnings=response['child1FinalEarnings'],
            child2_final_earnings=response['child2FinalEarnings'],
            aggregate_final_earnings=response['aggregateFinalEarnings']
        )
        slider_objects.append(new_slider_response)

    return slider_objects

def save_session_data(session_obj, survey_objects, slider_objects):
    """Save all session data in a single database transaction.

    Attempts to INSERT new records. If session already exists (IntegrityError),
    updates the existing session instead. This allows re-uploading sessions.
    """
    session_id = session_obj.id
    session_type = session_obj.session_type

    current_app.logger.info(f"Attempting to save {session_type} session {session_id} with {len(survey_objects)} survey responses and {len(slider_objects)} slider responses")

    try:
        # Try to add new session
        db.session.add(session_obj)

        # Add survey responses
        for survey_obj in survey_objects:
            db.session.add(survey_obj)

        # Add slider responses
        for slider_obj in slider_objects:
            db.session.add(slider_obj)

        # Commit the transaction
        db.session.commit()
        current_app.logger.info(f"Successfully inserted new {session_type} session {session_id}")
        return True, None

    except IntegrityError as e:
        # Session already exists - rollback and update instead
        db.session.rollback()
        current_app.logger.warning(f"Session {session_id} already exists (IntegrityError), attempting to update instead. Error: {str(e)}")

        try:
            # Query existing session
            existing_session = db.session.get(type(session_obj), session_id)

            if existing_session:
                current_app.logger.info(f"Found existing session {session_id}, updating attributes")

                # Update existing session attributes
                updated_fields = []
                for key, value in session_obj.__dict__.items():
                    if not key.startswith('_'):  # Skip SQLAlchemy internal attributes
                        old_value = getattr(existing_session, key, None)
                        if old_value != value:
                            updated_fields.append(key)
                        setattr(existing_session, key, value)

                if updated_fields:
                    current_app.logger.info(f"Updated fields for session {session_id}: {', '.join(updated_fields)}")

                # Update or add survey responses
                surveys_updated = 0
                surveys_added = 0
                for survey_obj in survey_objects:
                    existing_survey = db.session.get(SurveyResponse, survey_obj.id)
                    if existing_survey:
                        # Update existing
                        for key, value in survey_obj.__dict__.items():
                            if not key.startswith('_'):
                                setattr(existing_survey, key, value)
                        surveys_updated += 1
                    else:
                        # Add new
                        db.session.add(survey_obj)
                        surveys_added += 1

                current_app.logger.info(f"Survey responses for session {session_id}: {surveys_updated} updated, {surveys_added} added")

                # Update or add slider responses
                sliders_updated = 0
                sliders_added = 0
                for slider_obj in slider_objects:
                    existing_slider = db.session.get(SliderResponse, slider_obj.id)
                    if existing_slider:
                        # Update existing
                        for key, value in slider_obj.__dict__.items():
                            if not key.startswith('_'):
                                setattr(existing_slider, key, value)
                        sliders_updated += 1
                    else:
                        # Add new
                        db.session.add(slider_obj)
                        sliders_added += 1

                if slider_objects:
                    current_app.logger.info(f"Slider responses for session {session_id}: {sliders_updated} updated, {sliders_added} added")

                db.session.commit()
                current_app.logger.info(f"Successfully updated existing {session_type} session {session_id}")
                return True, None
            else:
                # This shouldn't happen, but handle it
                error_msg = f"Session {session_id} reported as existing but not found in database"
                current_app.logger.error(error_msg)
                raise Exception(error_msg)

        except Exception as update_error:
            db.session.rollback()
            current_app.logger.error(f"Failed to update existing session {session_id}: {str(update_error)}")
            return False, {
                "error": "update_failed",
                "message": "Failed to update existing session data",
                "details": {"error": str(update_error)}
            }

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Database transaction failed for session {session_id}: {str(e)}")
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


@app.route("/enumerators/new", methods=['GET', 'POST'])
@roles_required("administrator")
def create_enumerator():
    """Create a new enumerator user."""
    from webapp import user_datastore

    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '').strip()

        # Validate inputs
        if not email or not password:
            return render_template('create_enumerator.html',
                                 error='Email and password are required')

        # Check if user already exists
        existing_user = user_datastore.find_user(email=email)
        if existing_user:
            return render_template('create_enumerator.html',
                                 error=f'User with email {email} already exists')

        try:
            # Get enumerator role
            enumerator_role = Role.query.filter_by(name='enumerator').first()
            if not enumerator_role:
                enumerator_role = Role(name='enumerator', description='Enumerator role')
                db.session.add(enumerator_role)
                db.session.commit()

            # Create user
            new_user = user_datastore.create_user(
                email=email,
                password=hash_password(password),
                active=True
            )
            user_datastore.add_role_to_user(new_user, enumerator_role)
            db.session.commit()

            current_app.logger.info(f'New enumerator created: {email}')

            return render_template('create_enumerator.html',
                                 success=True,
                                 email=email)

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f'Error creating enumerator: {str(e)}')
            return render_template('create_enumerator.html',
                                 error=f'Failed to create enumerator: {str(e)}')

    # GET request - show form
    return render_template('create_enumerator.html')


@app.route("/enumerators/<int:user_id>/toggle-active", methods=['POST'])
@roles_required("administrator")
def toggle_enumerator_active(user_id):
    """Activate or deactivate an enumerator user."""
    try:
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check if user has enumerator role
        if not user.has_role('enumerator'):
            return jsonify({'error': 'User is not an enumerator'}), 400

        # Toggle active status
        user.active = not user.active
        db.session.commit()

        status = 'activated' if user.active else 'deactivated'
        current_app.logger.info(f'Enumerator {status}: {user.email}')

        return jsonify({
            'success': True,
            'active': user.active,
            'message': f'Enumerator {user.email} has been {status}'
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error toggling enumerator status: {str(e)}')
        return jsonify({'error': f'Failed to update enumerator status: {str(e)}'}), 500

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
            session.group_display = '-'
        else:
            session.session_type_badge = '<span class="badge bg-primary" style="vertical-align: middle;">Parent</span>'
            # Get group_type for parent sessions
            parent_session = db.session.get(ParentSession, session.id)
            if parent_session and parent_session.group_type:
                session.group_display = parent_session.group_type.capitalize()
            else:
                session.group_display = '-'

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


# === Data Export Helper Functions ===

def generate_child_sessions_df():
    """Generate DataFrame containing child session metadata only."""
    child_sessions = ChildSession.query.all()

    rows = []
    for session in child_sessions:
        rows.append({
            'session_id': session.id,
            'enumerator_id': session.enumerator_id,
            'family_id': session.family_id,
            'child_id': session.child_id,
            'child_name': session.name,
            'school': session.school,
            'survey_status': session.survey_status,
            'survey_completed_at': session.survey_completed_at.isoformat() if session.survey_completed_at else None,
            'created_at': session.created_at.isoformat() if session.created_at else None,
            'uploaded_at': session.uploaded_at.isoformat() if session.uploaded_at else None,
            'upload_status': session.upload_status,
        })

    return pd.DataFrame(rows)


def generate_parent_sessions_df():
    """Generate DataFrame containing parent session metadata only."""
    parent_sessions = ParentSession.query.all()

    rows = []
    for session in parent_sessions:
        rows.append({
            'session_id': session.id,
            'enumerator_id': session.enumerator_id,
            'family_id': session.family_id,
            'child1_name': session.child1_name,
            'child2_name': session.child2_name,
            'school': session.school,
            'group_type': session.group_type,
            'preEarnings1': session.preEarnings1,
            'preEarnings2': session.preEarnings2,
            'survey_status': session.survey_status,
            'survey_completed_at': session.survey_completed_at.isoformat() if session.survey_completed_at else None,
            'exit_survey_status': session.exit_survey_status,
            'exit_survey_completed_at': session.exit_survey_completed_at.isoformat() if session.exit_survey_completed_at else None,
            'slider_status': session.slider_status,
            'slider_started_at': session.slider_started_at.isoformat() if session.slider_started_at else None,
            'slider_completed_at': session.slider_completed_at.isoformat() if session.slider_completed_at else None,
            'created_at': session.created_at.isoformat() if session.created_at else None,
            'uploaded_at': session.uploaded_at.isoformat() if session.uploaded_at else None,
            'upload_status': session.upload_status,
        })

    return pd.DataFrame(rows)


def generate_survey_responses_df():
    """Generate DataFrame containing all survey responses in long format."""
    survey_responses = SurveyResponse.query.all()

    rows = []
    for response in survey_responses:
        # Get the session to access family_id and child_id
        session = response.session

        # Get child_id if this is a child session, otherwise None
        child_id = None
        if session and session.session_type == 'child':
            # Import here to avoid circular imports
            from webapp.models import ChildSession
            child_session = ChildSession.query.get(session.id)
            if child_session:
                child_id = child_session.child_id

        # Try to parse JSON answers, fall back to string
        try:
            answer = json.loads(response.answer) if isinstance(response.answer, str) else response.answer
            # Convert lists/dicts to string representation
            if isinstance(answer, (list, dict)):
                answer = json.dumps(answer)
        except (json.JSONDecodeError, TypeError):
            answer = response.answer

        rows.append({
            'response_id': response.id,
            'session_id': response.session_id,
            'family_id': session.family_id if session else None,
            'child_id': child_id,
            'survey_id': response.survey_id,
            'question_id': response.question_id,
            'answer': answer,
            'completed_at': response.completed_at.isoformat() if response.completed_at else None
        })

    return pd.DataFrame(rows)


def generate_slider_responses_df():
    """Generate DataFrame containing all slider responses in long format."""
    slider_responses = SliderResponse.query.all()

    rows = []
    for response in slider_responses:
        # Get the parent session to access family_id
        parent_session = response.parent_session

        rows.append({
            'response_id': response.id,
            'parent_session_id': response.parent_session_id,
            'family_id': parent_session.family_id if parent_session else None,
            'scenarios_id': response.scenarios_id,
            'scenario_number': response.scenario_number,
            'display_order': response.display_order,
            'child1_investment': response.child1_investment,
            'child2_investment': response.child2_investment,
            'completed_at': response.completed_at.isoformat() if response.completed_at else None,
            # Economic parameters
            'scenario_gamma': response.scenario_gamma,
            'scenario_sigma': response.scenario_sigma,
            'scenario_theta': response.scenario_theta,
            'pre_earnings1': response.pre_earnings1,
            'pre_earnings2': response.pre_earnings2,
            'scenario_alpha': response.scenario_alpha,
            'child1_final_earnings': response.child1_final_earnings,
            'child2_final_earnings': response.child2_final_earnings,
            'aggregate_final_earnings': response.aggregate_final_earnings
        })

    return pd.DataFrame(rows)


def generate_enumerators_df():
    """Generate DataFrame containing all enumerator information."""
    enumerators = User.query.all()

    rows = []
    for user in enumerators:
        rows.append({
            'enumerator_id': user.id,
            'email': user.email,
            'active': user.active,
            'roles': ', '.join([role.name for role in user.roles]) if user.roles else '',
            # Login tracking fields (SECURITY_TRACKABLE is enabled)
            'last_login_at': user.last_login_at.isoformat() if hasattr(user, 'last_login_at') and user.last_login_at else None,
            'current_login_at': user.current_login_at.isoformat() if hasattr(user, 'current_login_at') and user.current_login_at else None,
            'last_login_ip': user.last_login_ip if hasattr(user, 'last_login_ip') else None,
            'current_login_ip': user.current_login_ip if hasattr(user, 'current_login_ip') else None,
            'login_count': user.login_count if hasattr(user, 'login_count') else None,
        })

    return pd.DataFrame(rows)


# === Data Export Routes ===

@app.route('/data')
@roles_required('administrator')
def data_export_page():
    """Render the data export page with summary statistics."""
    # Get counts
    total_sessions = Session.query.count()
    child_sessions = ChildSession.query.count()
    parent_sessions = ParentSession.query.count()
    total_survey_responses = SurveyResponse.query.count()
    total_slider_responses = SliderResponse.query.count()
    total_enumerators = User.query.count()

    return render_template('data.html',
                          total_sessions=total_sessions,
                          child_sessions=child_sessions,
                          parent_sessions=parent_sessions,
                          total_survey_responses=total_survey_responses,
                          total_slider_responses=total_slider_responses,
                          total_enumerators=total_enumerators)


@app.route('/data/child_sessions')
@roles_required('administrator')
def download_child_sessions_csv():
    """Download child_sessions.csv file."""
    try:
        df = generate_child_sessions_df()

        # Convert to CSV
        csv_buffer = io.BytesIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)

        return send_file(
            csv_buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name='child_sessions.csv'
        )
    except Exception as e:
        current_app.logger.error(f'Error generating child sessions CSV: {str(e)}')
        return jsonify({'error': 'Failed to generate child sessions CSV'}), 500


@app.route('/data/parent_sessions')
@roles_required('administrator')
def download_parent_sessions_csv():
    """Download parent_sessions.csv file."""
    try:
        df = generate_parent_sessions_df()

        # Convert to CSV
        csv_buffer = io.BytesIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)

        return send_file(
            csv_buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name='parent_sessions.csv'
        )
    except Exception as e:
        current_app.logger.error(f'Error generating parent sessions CSV: {str(e)}')
        return jsonify({'error': 'Failed to generate parent sessions CSV'}), 500


@app.route('/data/survey_responses')
@roles_required('administrator')
def download_survey_responses_csv():
    """Download survey_responses.csv file."""
    try:
        df = generate_survey_responses_df()

        # Convert to CSV
        csv_buffer = io.BytesIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)

        return send_file(
            csv_buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name='survey_responses.csv'
        )
    except Exception as e:
        current_app.logger.error(f'Error generating survey responses CSV: {str(e)}')
        return jsonify({'error': 'Failed to generate survey responses CSV'}), 500


@app.route('/data/slider_responses')
@roles_required('administrator')
def download_slider_responses_csv():
    """Download slider_responses.csv file."""
    try:
        df = generate_slider_responses_df()

        # Convert to CSV
        csv_buffer = io.BytesIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)

        return send_file(
            csv_buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name='slider_responses.csv'
        )
    except Exception as e:
        current_app.logger.error(f'Error generating slider responses CSV: {str(e)}')
        return jsonify({'error': 'Failed to generate slider responses CSV'}), 500


@app.route('/data/enumerators')
@roles_required('administrator')
def download_enumerators_csv():
    """Download enumerators.csv file."""
    try:
        df = generate_enumerators_df()

        # Convert to CSV
        csv_buffer = io.BytesIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)

        return send_file(
            csv_buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name='enumerators.csv'
        )
    except Exception as e:
        current_app.logger.error(f'Error generating enumerators CSV: {str(e)}')
        return jsonify({'error': 'Failed to generate enumerators CSV'}), 500


@app.route('/data/download_all')
@roles_required('administrator')
def download_all_data():
    """Download all data as a ZIP file containing all CSV files."""
    try:
        # Generate all DataFrames
        child_sessions_df = generate_child_sessions_df()
        parent_sessions_df = generate_parent_sessions_df()
        survey_responses_df = generate_survey_responses_df()
        slider_responses_df = generate_slider_responses_df()
        enumerators_df = generate_enumerators_df()

        # Create ZIP file in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add child_sessions.csv
            csv_str = io.StringIO()
            child_sessions_df.to_csv(csv_str, index=False)
            zip_file.writestr('child_sessions.csv', csv_str.getvalue())

            # Add parent_sessions.csv
            csv_str = io.StringIO()
            parent_sessions_df.to_csv(csv_str, index=False)
            zip_file.writestr('parent_sessions.csv', csv_str.getvalue())

            # Add survey_responses.csv
            csv_str = io.StringIO()
            survey_responses_df.to_csv(csv_str, index=False)
            zip_file.writestr('survey_responses.csv', csv_str.getvalue())

            # Add slider_responses.csv
            csv_str = io.StringIO()
            slider_responses_df.to_csv(csv_str, index=False)
            zip_file.writestr('slider_responses.csv', csv_str.getvalue())

            # Add enumerators.csv
            csv_str = io.StringIO()
            enumerators_df.to_csv(csv_str, index=False)
            zip_file.writestr('enumerators.csv', csv_str.getvalue())

        zip_buffer.seek(0)

        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name='data_export.zip'
        )
    except Exception as e:
        current_app.logger.error(f'Error generating data export ZIP: {str(e)}')
        return jsonify({'error': 'Failed to generate data export ZIP'}), 500


@app.route('/reset_data', methods=['GET', 'POST'])
@roles_required('administrator')
def reset_data():
    """Display reset data page and handle data deletion."""
    if request.method == 'GET':
        # Get counts for display
        total_sessions = Session.query.count()
        total_survey_responses = SurveyResponse.query.count()
        total_slider_responses = SliderResponse.query.count()

        return render_template('reset_data.html',
                             total_sessions=total_sessions,
                             total_survey_responses=total_survey_responses,
                             total_slider_responses=total_slider_responses)

    # POST request - handle deletion
    try:
        # Check confirmation text
        confirmation = request.form.get('confirmation', '').strip()
        if confirmation != 'I am sure':
            return render_template('reset_data.html',
                                 error='Confirmation text does not match. Please type "I am sure" exactly.',
                                 total_sessions=Session.query.count(),
                                 total_survey_responses=SurveyResponse.query.count(),
                                 total_slider_responses=SliderResponse.query.count())

        # Delete all slider responses
        SliderResponse.query.delete()

        # Delete all survey responses
        SurveyResponse.query.delete()

        # Delete all child sessions
        ChildSession.query.delete()

        # Delete all parent sessions
        ParentSession.query.delete()

        # Delete all base sessions (in case any orphaned ones exist)
        Session.query.delete()

        # Commit the changes
        db.session.commit()

        current_app.logger.info('Database reset successful - all data except users and roles deleted')

        return render_template('reset_data.html',
                             success=True,
                             total_sessions=0,
                             total_survey_responses=0,
                             total_slider_responses=0)

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error resetting database: {str(e)}')
        return render_template('reset_data.html',
                             error=f'Failed to reset database: {str(e)}',
                             total_sessions=Session.query.count(),
                             total_survey_responses=SurveyResponse.query.count(),
                             total_slider_responses=SliderResponse.query.count())