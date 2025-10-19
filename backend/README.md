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

4. **Set up environment variables (REQUIRED)**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Generate secure keys:
   ```bash
   python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
   python3 -c "import secrets; print('SECURITY_PASSWORD_SALT=' + secrets.token_hex(32))"
   ```

   Update `.env` with the generated keys and your email configuration.

5. **Initialize the database**:
   ```bash
   export FLASK_APP=webapp
   flask db upgrade
   ```

6. **Run the development server**:
   ```bash
   flask run
   ```

The application will be available at `http://localhost:5000`.

### Default Admin Account

On first run, the application automatically creates one admin/enumerator account:

- **Email**: Set via `EDWIN_EMAIL` in `.env` (defaults to `edwinlock@gmail.com`)
- **Password**: `learn_edwinlock`

This account has both administrator and enumerator roles. You can create additional users through the registration page or admin interface.

## API Endpoints

### Authentication
- `POST /login` - User login (returns authentication token)
- `POST /logout` - User logout
- `GET /profile` - Get current user profile (requires authentication)

### Session Management
- `POST /upload-session` - Upload session data (requires enumerator role)
- `GET /sessions` - View sessions (administrators see all, enumerators see their own)
- `GET /session/<id>` - View detailed session information

### Data Export
- `GET /data` - Data export page (administrators only)
- `GET /data/child_sessions` - Download child sessions CSV
- `GET /data/parent_sessions` - Download parent sessions CSV
- `GET /data/survey_responses` - Download survey responses CSV
- `GET /data/slider_responses` - Download slider responses CSV with economic parameters
- `GET /data/enumerators` - Download enumerators CSV
- `GET /data/download_all` - Download all data as ZIP

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
- Economic parameters: gamma, sigma, theta
- Pre-earnings for both children
- Computed values: alpha, final earnings (individual and aggregate)

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required - Security
SECRET_KEY=your_secret_key_here
SECURITY_PASSWORD_SALT=your_password_salt_here

# Optional - Database (defaults to SQLite)
DATABASE_URL=sqlite:///learn.db

# Required - Email (for password reset)
MAIL_SERVER=mail.smtp2go.com
MAIL_PORT=2525
MAIL_USE_TLS=true
MAIL_USERNAME=your_smtp_username
MAIL_PASSWORD=your_smtp_password
MAIL_DEFAULT_SENDER=noreply@yourdomain.com

# Optional - Admin account
EDWIN_EMAIL=your-email@example.com
```

**Important**: The application will **not start** without `SECRET_KEY`, `SECURITY_PASSWORD_SALT`, and `MAIL_DEFAULT_SENDER` set.

### Email Configuration

Email is required for password reset functionality:

1. Create a free account at [SMTP2GO](https://www.smtp2go.com) or use another SMTP provider
2. Verify your sender email address
3. Get your SMTP credentials from Settings > SMTP Users
4. Add the credentials to your `.env` file

**Note**: Email settings are required to start the application. If you don't need password reset functionality during development, you can set dummy values, but the variables must be present.

## Production Deployment

See [DEPLOY.md](DEPLOY.md) for detailed instructions on deploying to PythonAnywhere.

### Quick Overview

1. **PythonAnywhere** (Recommended):
   - Follow the step-by-step guide in `DEPLOY.md`
   - Includes WSGI configuration, virtual environment setup, and daily database backups
   - Free tier available

2. **Using Gunicorn** (Self-hosted):
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:8000 "webapp:app"
   ```

### Production Checklist

- ✅ Generate secure `SECRET_KEY` and `SECURITY_PASSWORD_SALT` values
- ✅ Configure SMTP settings for email functionality
- ✅ Set up SSL/TLS termination
- ✅ Configure daily database backups
- ✅ Set `EDWIN_EMAIL` to your admin email
- ✅ Consider using PostgreSQL instead of SQLite for larger deployments

### Database Setup

The application uses **Flask-Migrate** (Alembic) for database schema management.

#### Initial Setup:
```bash
export FLASK_APP=webapp
flask db upgrade
```

This creates the SQLite database with all tables and the admin accounts.

#### Schema Changes:
When modifying models in `webapp/models.py`:

```bash
# 1. Create a migration
flask db migrate -m "Description of changes"

# 2. Review the generated migration in migrations/versions/

# 3. Apply the migration
flask db upgrade
```

**Important**: Always commit migration files to git and run `flask db upgrade` on the server after deploying.

## Development

### Project Structure

```
backend/
├── requirements.txt    # Python dependencies
├── README.md          # Documentation
├── .env.example       # Environment variables template
├── instance/          # Flask instance folder (contains SQLite database)
├── migrations/        # Flask-Migrate database migrations
│   ├── versions/      # Migration scripts
│   ├── env.py         # Alembic environment
│   └── alembic.ini    # Alembic configuration
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

1. **Models**: Add new SQLAlchemy models to `webapp/models.py`, then create a migration
2. **Routes**: Add new endpoints to `webapp/routes.py`
3. **Templates**: Create new Jinja2 templates in `webapp/templates/`
4. **Configuration**: Update settings in `webapp/config.py`
5. **Migrations**: Run `flask db migrate -m "description"` after model changes

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