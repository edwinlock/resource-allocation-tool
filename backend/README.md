# LEARN Backend

The Learning Experiment Administration Resource Network (LEARN) backend is a Flask web application that allows enumerators to submit experiment data from their offline Progressive Web Apps (PWAs) and administrators to manage and view submitted sessions.

## Features

- **Role-based Authentication**: Separate access levels for administrators and enumerators
- **Login Tracking**: Automatic tracking of user login times and IP addresses
- **Session Management**: Upload, view, and manage experiment sessions
- **Survey Response Handling**: Process complex survey data including arrays and JSON responses
- **Slider Exercise Data**: Handle investment allocation scenarios
- **Bootstrap UI**: Responsive, modern interface using Bootstrap 5
- **Token Authentication**: API endpoints with secure token-based authentication
- **Email Integration**: Password reset functionality via SMTP2GO
- **Internationalization**: Flask-Babel support for multi-language applications

## Quick Start

### Development Setup

1. **Clone and navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a Python virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables (optional)**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration if needed
   ```

5. **Run the development server**:
   ```bash
   flask --app webapp run
   ```

The application will be available at `http://localhost:5000`.

### Demo Accounts

The application comes with pre-configured demo accounts:

- **Administrator**:
  - Email: `administrator@example.com`
  - Password: `learn_administrator`

- **Enumerator**:
  - Email: `enumerator@example.com`
  - Password: `learn_enumerator`

- **Dual Role**:
  - Email: `edwinlock@gmail.com`
  - Password: `learn_edwinlock`

## API Endpoints

### Authentication
- `POST /login` - User login (returns authentication token)
- `POST /logout` - User logout
- `GET /profile` - Get current user profile (requires authentication)

### Session Management
- `POST /upload-session` - Upload session data (requires enumerator role)
- `GET /sessions` - View sessions (administrators see all, enumerators see their own)
- `GET /session/<id>` - View detailed session information

### Administrative
- `GET /enumerators` - List all enumerators (administrators only)

## Data Structure

The application handles complex experiment data including:

### Session Metadata
- Session ID, participant ID, enumerator ID
- Session type (treatment/control)
- Children information (names, abilities, school)
- Completion timestamps

### Survey Responses
- Support for multiple survey types (Child1, Child2, Treatment, Control)
- Complex answer types (strings, numbers, arrays, JSON objects)
- Question-level completion tracking

### Slider Responses
- Investment allocation scenarios
- Display order tracking
- Automatic calculation of complementary investments

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required
SECRET_KEY=your_secret_key_here
SECURITY_PASSWORD_SALT=your_password_salt_here

# Optional - Database (defaults to SQLite)
DATABASE_URL=sqlite:///learn.db

# Optional - Email (for password reset)
SMTP2GO_USERNAME=your_smtp2go_username
SMTP2GO_PASSWORD=your_smtp2go_password
MAIL_DEFAULT_SENDER=your_verified_sender_email@domain.com
```

### Email Configuration (Optional)

To enable password reset emails:

1. Create a free account at [SMTP2GO](https://www.smtp2go.com)
2. Verify your sender email address
3. Get your SMTP credentials from Settings > SMTP Users
4. Add the credentials to your `.env` file

## Production Deployment

### Using Gunicorn

1. **Install Gunicorn**:
   ```bash
   pip install gunicorn
   ```

2. **Run with Gunicorn**:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:8000 "webapp:app"
   ```

### Environment Configuration

For production, ensure:
- Set secure `SECRET_KEY` and `SECURITY_PASSWORD_SALT` values
- Use a production database (PostgreSQL recommended)
- Configure proper SMTP settings for email functionality
- Set up SSL/TLS termination
- Configure proper logging

### Database Setup

The application automatically creates the SQLite database and demo accounts on first run. No manual database setup is required for development.

## Development

### Project Structure

```
backend/
├── requirements.txt    # Python dependencies
├── README.md          # Documentation
├── .env.example       # Environment variables template
├── instance/          # Flask instance folder (contains SQLite database)
├── venv/             # Python virtual environment
└── webapp/           # Main application package
    ├── __init__.py   # Flask app initialization and user creation
    ├── config.py     # Configuration settings
    ├── models.py     # SQLAlchemy models with Flask-Security-Too
    ├── routes.py     # Application routes
    ├── forms.py      # WTForms definitions
    └── templates/    # Jinja2 templates
        ├── base.html
        ├── index.html
        ├── sessions.html
        ├── session_details.html
        ├── enumerators.html
        └── security/ # Flask-Security-Too templates
```

### Adding New Features

1. **Models**: Add new SQLAlchemy models to `webapp/models.py`
2. **Routes**: Add new endpoints to `webapp/routes.py`
3. **Templates**: Create new Jinja2 templates in `webapp/templates/`
4. **Configuration**: Update settings in `webapp/config.py`

### Testing

Run the application in development mode:

```bash
flask --app webapp run --debug
```

Test the API endpoints using the demo accounts and sample data.

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure the database file has proper permissions
2. **Template not found**: Check that all templates are in the `templates/` directory
3. **Authentication issues**: Verify that users exist and have correct roles
4. **Email errors**: Check SMTP2GO credentials and sender verification

### Logging

The application logs errors to the console in development mode. For production, configure proper logging to files.

## Support

For questions or issues, please refer to the Flask documentation:
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Flask-Security-Too Documentation](https://flask-security-too.readthedocs.io/)
- [Flask-SQLAlchemy Documentation](https://flask-sqlalchemy.palletsprojects.com/)