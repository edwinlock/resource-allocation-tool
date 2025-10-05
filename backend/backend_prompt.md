# General

At a high level, the web app allows enumerators to submit experiment data from their PWA offline web apps that are running on their tablets with sporadic internet access.

* Build a flask app, following best practices and a modern design. For example, use the app factory approach.
* The name of the app is "LEARN".
* Use the packages installed by pip install bootstrap-flask flask-security-too flask-mail argon2-cffi python-dotenv bcrypt flask-migrate
* Use flask-sqlalchemy for databases and wtforms for forms. It's fine to use sqlite for the database. It's crucial that you follow the Flask-SQLAlchemy documentation and use the latest conventions, no depreciated or legacy commands like db.session.query and so forth.
* Use consistent bootstrap 5 styling throughout. Read the documentation carefully: https://bootstrap-flask.readthedocs.io/en/stable/
* There's no need for separate blueprints because it's a simple app
* All datetimes should be stored in UTC in the database, but shown in the local time zone when the date or time is rendered in a template.
* Create a requirements.txt file for the python venv.
* Add a README.md that tells potential users how to run the app in production and for development.

App file structure: have separate files for routes, models, forms, and configuration:
* routes.py
* models.py
* forms.py - can be empty, no forms needed for this app
* config.py - Flask configuration class with environment variable handling
* __init__.py - Flask factory function and initial user setup
* migrations/ - Flask-Migrate database migration files

## UI Design & Templates
* Create a responsive Bootstrap 5 navbar with role-based navigation:
  - Brand: "LEARN".
  - If not logged in: "Register", "Log in"
  - For administrators: "Sessions", "Enumerators", "Logout"
  - For enumerators: "My Sessions", "Change Password", "Logout"
* Use consistent Bootstrap 5 styling throughout all templates with card-based layouts
* Implement proper flash message handling with Bootstrap alerts (success, error, info)
* All forms should use Bootstrap form classes and proper error handling
* Use `InputRequired()` validator instead of `DataRequired()` for numeric fields where 0 is valid
* Dynamic forms should use FieldList with FormField for proper WTForms integration

## Security
* **Token Authentication**: Enable token authentication in flask-security-too with these specific configuration variables:
  - `SECURITY_TOKEN_AUTHENTICATION_HEADER = 'Authorization'`
  - `SECURITY_TOKEN_AUTHENTICATION_KEY = 'auth_token'`
  - `SECURITY_TOKEN_MAX_AGE = 86400`  # 24 hours
  - `SECURITY_USE_VERIFY_PASSWORD_CACHE = True`
  - `SECURITY_LOGIN_WITHOUT_CONFIRMATION = True`
* **User Roles**: Use flask-security-too roles to create two roles: "administrator" and "enumerator"
* **Initial Users**: Create these dummy users in the `__init__.py` script during app initialization:
  - enumerator@example.com (password: "learn_enumerator", role: enumerator)
  - administrator@example.com (password: "learn_administrator", role: administrator)
  - edwinlock@gmail.com (password: "learn_edwinlock", roles: both enumerator and administrator)
* **User Model**: Use default flask-security-too User model (no additional fields needed). Display enumerator names using email addresses.
* **Default Role**: Configure `SECURITY_DEFAULT_ROLE = 'enumerator'` for new registrations
* Leverage flask-security-too but implement custom and consistent templates for login, reset passwords, register, etc., that use bootstrap styling
* Create custom templates for all Flask-Security-Too endpoints with Bootstrap 5 styling:
  - `templates/security/login_user.html` - Login page with demo account information
  - `templates/security/register_user.html` - Registration page
  - `templates/security/change_password.html` - Change password page with current/new password fields
  - `templates/security/forgot_password.html` - Forgot password page
  - `templates/security/reset_password.html` - Reset password page
  - `templates/security/send_confirmation.html` - Resend confirmation page

## Routes
Create the following routes.

@app.route("/index")
def index_page():
    # Show a generic index page with a welcome.

@login_required
@app.route("/profile")
def profile_page():
    # Return JSON response with user_id and email only
    # Response format:
    # {
    #   "user_id": "string",
    #   "email": "string"
    # }

@roles_required("enumerator")
@app.route("/upload-session", methods = ['POST'])
def upload_session_page():
    # Process JSON data from request body containing session metadata, survey responses, and slider responses
    # Use database transactions to ensure all-or-nothing upload (partial failures treated as total failures)
    #
    # JSON Structure (see session_data.json for example):
    # {
    #   "sessionMetadata": { sessionId, participantId, enumeratorId, sessionType, createdAt, completedAt, children: {child1: {name, ability, school}, child2: {name, ability, school}} },
    #   "surveyResponses": { child1Survey: [...], child2Survey: [...], parentSurvey: [...] },
    #   "sliderResponses": [...],
    #   "completionTimestamps": { child1SurveyCompleted, child2SurveyCompleted, parentSurveyCompleted, sliderCompleted }
    # }
    #
    # Database Transaction Handling:
    # - Use db.session.begin() to start transaction
    # - Create Session record first, then SurveyResponse and SliderResponse records
    # - Validate all data before committing
    # - Use try/except to rollback on any error
    # - Set session upload_status to 'uploaded' and uploaded_at timestamp on success
    #
    # Error Handling with Standard HTTP Status Codes:
    # - 400 Bad Request: Invalid JSON, missing required fields, validation errors
    # - 409 Conflict: Session with same ID already exists
    # - 422 Unprocessable Entity: Valid JSON but business logic validation fails
    # - 500 Internal Server Error: Database transaction failures, unexpected errors
    #
    # JSON Error Response Format:
    # {
    #   "error": "error_code",
    #   "message": "Human readable error message",
    #   "details": {...}  # Optional additional error details
    # }
    #
    # Success Response (201 Created):
    # {
    #   "success": true,
    #   "session_id": "uuid",
    #   "message": "Session uploaded successfully"
    # }

@roles_required("administrator")
@app.route("/enumerators")
def enumerators_page():
    # Show a list of enumerator users using bootstrap-flask render_table() function
    # Example usage:
    # from bootstrap_flask import render_table
    #
    # columns = [
    #     {'name': 'Email', 'field': 'email'},
    #     {'name': 'Sessions Count', 'field': 'session_count'},
    #     {'name': 'Actions', 'field': 'actions'}
    # ]
    #
    # data = [
    #     {
    #         'email': user.email,
    #         'session_count': len(user.sessions),
    #         'actions': f'<a href="/sessions?enumerator_id={user.id}" class="btn btn-sm btn-primary">View Sessions</a>'
    #     }
    #     for user in enumerator_users
    # ]
    #
    # table_html = render_table(data, columns, table_id='enumerators-table', table_classes='table table-striped')

@login_required
@app.route("/sessions")
def session_page():
    # Show table of sessions using bootstrap-flask render_table() function
    # Support filtering by enumerator_id query parameter
    #
    # Example render_table usage:
    # columns = [
    #     {'name': 'Session ID', 'field': 'id'},
    #     {'name': 'Participant ID', 'field': 'participant_id'},
    #     {'name': 'Enumerator', 'field': 'enumerator_email'},
    #     {'name': 'Type', 'field': 'session_type'},
    #     {'name': 'Status', 'field': 'upload_status'},
    #     {'name': 'Created', 'field': 'created_at_local'},
    #     {'name': 'Actions', 'field': 'actions'}
    # ]
    #
    # data = [
    #     {
    #         'id': session.id[:8] + '...',  # Truncated ID for display
    #         'participant_id': session.participant_id,
    #         'enumerator_email': session.enumerator.email,
    #         'session_type': session.session_type.title(),
    #         'upload_status': session.upload_status.replace('_', ' ').title(),
    #         'created_at_local': session.created_at.strftime('%Y-%m-%d %H:%M'),
    #         'actions': f'<a href="/session/{session.id}" class="btn btn-sm btn-outline-primary">Details</a>'
    #     }
    #     for session in sessions
    # ]

@login_required
@app.route("/session/<id>")
def session_details_page(id):
    # Check if session exists - return 404 if not found
    # Display comprehensive session data using Bootstrap cards and tables:
    # - Session metadata (participant, enumerator, timestamps, children info)
    # - Survey responses organized by survey type (Child1, Child2, Treatment/Control)
    # - Slider responses in display order
    # - Session completion status and missing components
    #
    # Use render_table() for survey and slider response tables
    # Handle timezone conversion for all datetime displays using moment.js or server-side conversion


## Models
Implement the following Flask-SQLAlchemy models, in addition to the User and Role models used by flask-security-too. The UUIDs will be generated on the frontend/web app, so not in this flask instance.

-------
Session
-------
id: string (primary key, UUID format)
participant_id: string (not null)
enumerator_id: string (not null, foreign key to User.id)
enumerator: User object (relationship to User model via enumerator_id)
created_at: datetime (UTC, not null, default=datetime.utcnow)
child1_survey_status: string (default='not_started', values: 'not_started', 'in_progress', 'completed')
child1_survey_completed_at: datetime (UTC, nullable)
child2_survey_status: string (default='not_started', values: 'not_started', 'in_progress', 'completed')
child2_survey_completed_at: datetime (UTC, nullable)
treatment_survey_status: string (default='not_started', values: 'not_started', 'in_progress', 'completed')
treatment_survey_completed_at: datetime (UTC, nullable)
control_survey_status: string (default='not_started', values: 'not_started', 'in_progress', 'completed')
control_survey_completed_at: datetime (UTC, nullable)
slider_started_at: datetime (UTC, nullable)
slider_completed_at: datetime (UTC, nullable)
slider_status: string (default='not_started', values: 'not_started', 'in_progress', 'completed')
child1_ability: int (not null, range 0-100)
child2_ability: int (not null, range 0-100)
child1_name: string (not null)
child2_name: string (not null)
school: string (not null)
session_type: string (not null, values: 'treatment', 'control')
uploaded_at: datetime (UTC, nullable)
upload_status: string (default='not_uploaded', values: 'not_uploaded', 'uploading', 'uploaded', 'upload_failed')
survey_responses: SurveyResponse[], backref relationship. Cascade delete.
slider_responses: SliderResponse[], backref relationship. Cascade delete.

### Constraints and Indexes:
- Unique constraint on (participant_id, enumerator_id) - each participant-enumerator combination can only have one session
- Index on enumerator_id for filtering sessions by enumerator
- Index on upload_status for finding uploadable sessions
- Index on created_at for chronological ordering

def is_complete(self):
    """Returns True if all required components of the session are completed."""
    # Check if both child surveys are completed
    child_surveys_done = (self.child1_survey_status == 'completed' and
                         self.child2_survey_status == 'completed')

    # Check if appropriate parent survey is completed based on session type
    parent_survey_done = False
    if self.session_type == 'treatment':
        parent_survey_done = self.treatment_survey_status == 'completed'
    elif self.session_type == 'control':
        parent_survey_done = self.control_survey_status == 'completed'

    # Check if slider is completed
    slider_done = self.slider_status == 'completed'

    return child_surveys_done and parent_survey_done and slider_done

def get_missing_components(self):
    """Returns list of missing components needed to complete the session."""
    missing = []
    if self.child1_survey_status != 'completed':
        missing.append('Child 1 Survey')
    if self.child2_survey_status != 'completed':
        missing.append('Child 2 Survey')
    if self.session_type == 'treatment' and self.treatment_survey_status != 'completed':
        missing.append('Treatment Survey')
    if self.session_type == 'control' and self.control_survey_status != 'completed':
        missing.append('Control Survey')
    if self.slider_status != 'completed':
        missing.append('Slider Exercise')
    return missing

def to_dict(self):
    """Convert session to dictionary for JSON serialization."""
    return {
        'id': self.id,
        'participant_id': self.participant_id,
        'enumerator_id': self.enumerator_id,
        'created_at': self.created_at.isoformat() if self.created_at else None,
        'child1_survey_status': self.child1_survey_status,
        'child1_survey_completed_at': self.child1_survey_completed_at.isoformat() if self.child1_survey_completed_at else None,
        'child2_survey_status': self.child2_survey_status,
        'child2_survey_completed_at': self.child2_survey_completed_at.isoformat() if self.child2_survey_completed_at else None,
        'treatment_survey_status': self.treatment_survey_status,
        'treatment_survey_completed_at': self.treatment_survey_completed_at.isoformat() if self.treatment_survey_completed_at else None,
        'control_survey_status': self.control_survey_status,
        'control_survey_completed_at': self.control_survey_completed_at.isoformat() if self.control_survey_completed_at else None,
        'slider_started_at': self.slider_started_at.isoformat() if self.slider_started_at else None,
        'slider_completed_at': self.slider_completed_at.isoformat() if self.slider_completed_at else None,
        'slider_status': self.slider_status,
        'child1_ability': self.child1_ability,
        'child2_ability': self.child2_ability,
        'child1_name': self.child1_name,
        'child2_name': self.child2_name,
        'school': self.school,
        'session_type': self.session_type,
        'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
        'upload_status': self.upload_status,
        'is_complete': self.is_complete(),
        'missing_components': self.get_missing_components()
    }

--------------
SurveyResponse
--------------
id: string (primary key, UUID format)
session_id: string (not null, foreign key to Session.id)
session: Session object (relationship to Session model)
survey_id: string (not null, values: 'Child1', 'Child2', 'Treatment', 'Control')
question_id: string (not null)
answer: text (not null, can be JSON for complex answers like arrays, or plain text for single values)
completed_at: datetime (UTC, not null, default=datetime.utcnow)

### Constraints and Indexes:
- Foreign key constraint on session_id
- Index on (session_id, survey_id) for filtering responses by session and survey type
- Index on completed_at for chronological ordering
- Unique constraint on (session_id, survey_id, question_id) - one response per question per survey per session

def to_dict(self):
    """Convert survey response to dictionary for JSON serialization."""
    # Try to parse answer as JSON, fall back to string if it fails
    try:
        import json
        parsed_answer = json.loads(self.answer) if isinstance(self.answer, str) else self.answer
    except (json.JSONDecodeError, TypeError):
        parsed_answer = self.answer

    return {
        'id': self.id,
        'session_id': self.session_id,
        'survey_id': self.survey_id,
        'question_id': self.question_id,
        'answer': parsed_answer,
        'completed_at': self.completed_at.isoformat() if self.completed_at else None
    }

--------------
SliderResponse
--------------
id: string (primary key, UUID format)
session_id: string (not null, foreign key to Session.id)
session: Session object (relationship to Session model)
scenario_number: int (not null, the scenario configuration number)
display_order: int (not null, the order in which this scenario was presented to the user)
child1_investment: int (not null, amount allocated to child 1, range 0-9)
child2_investment: int (computed property = 9 - child1_investment, not stored in DB)
completed_at: datetime (UTC, not null, default=datetime.utcnow)

# Constraints and Indexes:
- Foreign key constraint on session_id
- Index on session_id for filtering responses by session
- Index on (session_id, display_order) for ordered retrieval of session responses
- Index on completed_at for chronological ordering
- Check constraint: child1_investment >= 0 AND child1_investment <= 9

@hybrid_property
def child2_investment(self):
    """Calculate child2 investment as remainder of total budget (9)."""
    return 9 - self.child1_investment

def to_dict(self):
    """Convert slider response to dictionary for JSON serialization."""
    return {
        'id': self.id,
        'session_id': self.session_id,
        'scenario_number': self.scenario_number,
        'display_order': self.display_order,
        'child1_investment': self.child1_investment,
        'child2_investment': self.child2_investment,
        'completed_at': self.completed_at.isoformat() if self.completed_at else None
    }




## Configuration

Use a dedicated config.py file to manage all Flask application configuration:

* **Config Class**: Create a Config class that loads environment variables using python-dotenv
* **Environment Variables**: All sensitive configuration (API keys, passwords, secrets) should be stored in .env file
* **Configuration Categories**:
  - Flask core settings (SECRET_KEY, database URI)
  - Flask-Mail SMTP settings (server, port, credentials)
  - Flask-Security-Too settings (password salt, feature flags)
* **App Integration**: Use `app.config.from_object(Config)` in the Flask factory function
* **Security**: Generate secure random keys using Python's secrets module for SECRET_KEY and SECURITY_PASSWORD_SALT

### Sample Configuration Variables:
```python
# Flask Core
SECRET_KEY = os.getenv('SECRET_KEY') or secrets.token_hex(32)
SQLALCHEMY_DATABASE_URI = os.getenv('DATABACKEND_URL') or 'sqlite:///learn.db'
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Flask-Security-Too
SECURITY_PASSWORD_SALT = os.getenv('SECURITY_PASSWORD_SALT') or secrets.token_hex(32)
SECURITY_DEFAULT_ROLE = 'enumerator'
SECURITY_TOKEN_AUTHENTICATION_HEADER = 'Authorization'
SECURITY_TOKEN_AUTHENTICATION_KEY = 'auth_token'
SECURITY_TOKEN_MAX_AGE = 86400  # 24 hours
SECURITY_USE_VERIFY_PASSWORD_CACHE = True
SECURITY_LOGIN_WITHOUT_CONFIRMATION = True

# Flask-Mail (SMTP2GO)
MAIL_SERVER = 'mail.smtp2go.com'
MAIL_PORT = 2525
MAIL_USE_TLS = True
MAIL_USERNAME = os.getenv('SMTP2GO_USERNAME')
MAIL_PASSWORD = os.getenv('SMTP2GO_PASSWORD')
MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')
SECURITY_EMAIL_SENDER = os.getenv('MAIL_DEFAULT_SENDER')
```

## Email Subsystem

The application uses Flask-Mail with SMTP2GO for sending password reset emails and other security-related communications:

* **Configuration**: Set up Flask-Mail with SMTP2GO SMTP using environment variables for secure credential management
* **Environment Setup**: Create `.env` file with:
  - SMTP2GO SMTP server settings (mail.smtp2go.com:2525 with TLS)
  - SMTP2GO username and password from dashboard
  - Verified sender email address for Flask-Security-Too
* **Security**: Generate secure random SECRET_KEY and SECURITY_PASSWORD_SALT using Python's secrets module
* **SMTP2GO Requirements**:
  - Create free SMTP2GO account at https://www.smtp2go.com (1,000 emails/month free)
  - Verify sender email address or domain in SMTP2GO dashboard
  - Get SMTP username and password from Settings > SMTP Users
  - Use verified sender email for both MAIL_DEFAULT_SENDER and SECURITY_EMAIL_SENDER
* **Flask-Security Integration**: Configure `SECURITY_EMAIL_SENDER` to enable password reset functionality
* **Dependencies**: Add Flask-Mail and python-dotenv to requirements.txt

The email system enables Flask-Security-Too features like password reset, account confirmation (if enabled), and security notifications.

## Timezone Handling

Follow Miguel Grinberg's Flask Mega-Tutorial pattern for handling local time in the browser:

* Store all datetimes in UTC in the database
* Send UTC timestamps to templates
* Use JavaScript moment.js or browser Intl.DateTimeFormat to convert to local time
* Example template usage:
```html
<script>
document.addEventListener('DOMContentLoaded', function() {
    const timestamps = document.querySelectorAll('.timestamp');
    timestamps.forEach(function(element) {
        const utcTime = element.getAttribute('data-timestamp');
        const localTime = new Date(utcTime).toLocaleString();
        element.textContent = localTime;
    });
});
</script>

<span class="timestamp" data-timestamp="{{ session.created_at.isoformat() }}Z">
    {{ session.created_at.strftime('%Y-%m-%d %H:%M UTC') }}
</span>
```

## Implementation Notes

1. **User Model**: Use default flask-security-too User model (no additional fields needed). The backend doesn't know an enumerator's name and uses the email address instead.

2. **Token Authentication**: Check the flask-security-too documentation to ensure token auth is properly enabled with the configuration variables listed above.

3. **Initial Users**: Initialize the initial users in the `__init__.py` script. Use flask-migrate for database migrations.

4. **API Error Handling**: For the /upload-session API, return JSON errors with standard HTTP status codes as specified in the route documentation.

5. **Transaction Handling**: Partial failure during upload should be treated as total failure using database transactions (all-or-nothing approach).

6. **Response Formats**: API endpoints should return JSON. The /profile endpoint should only return user_id and email.

7. **Forms**: The forms.py file can be empty since no forms are needed for this API-focused app.

8. **Bootstrap Integration**: Use bootstrap-flask's render_table() function as described in the route documentation for displaying tabular data.

9. **Development vs Production**: For now, use a single Config class. Separate dev/production configurations can be added later if needed.

10. **Survey Response Processing**: The upload endpoint must handle the complex JSON structure from session_data.json, mapping:
    - sessionMetadata to Session model fields
    - surveyResponses arrays to individual SurveyResponse records
    - sliderResponses arrays to individual SliderResponse records
    - completionTimestamps to appropriate completion datetime fields

## Dependencies (requirements.txt)
```
Flask>=2.3.0
Flask-SQLAlchemy>=3.0.0
Flask-Security-Too>=5.0.0
Flask-Mail>=0.9.1
Flask-Migrate>=4.0.0
bootstrap-flask>=2.0.0
argon2-cffi>=21.0.0
python-dotenv>=1.0.0
bcrypt>=4.0.0
WTForms>=3.0.0
```