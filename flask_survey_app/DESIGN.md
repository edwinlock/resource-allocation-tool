# Flask Survey Application - Design Document

## Overview

This Flask web application is designed for development economists to conduct surveys and economic experiments. It follows modern Flask conventions with a modular blueprint architecture, Flask-Security-Too for authentication, and Bootstrap 5 for the UI.

## Architecture

### Application Structure
```
flask_survey_app/
├── app/                        # Main application package
│   ├── __init__.py            # Application factory
│   ├── models.py              # SQLAlchemy database models
│   ├── auth/                  # Authentication blueprint
│   │   ├── __init__.py
│   │   └── routes.py          # Role-based dashboards
│   ├── main/                  # Main application routes
│   │   ├── __init__.py
│   │   └── routes.py          # Homepage, dashboard routing
│   ├── session_mgmt/          # Survey session management
│   │   ├── __init__.py
│   │   └── routes.py          # Session CRUD operations
│   ├── slider/                # Resource allocation tool
│   │   ├── __init__.py
│   │   └── routes.py          # Slider app and API endpoints
│   └── survey_builder/        # Survey creation interface
│       ├── __init__.py
│       └── routes.py          # Survey management (stub)
├── templates/                  # Jinja2 templates
│   ├── base.html              # Base template with Bootstrap 5
│   ├── index.html             # Homepage
│   ├── dashboard.html         # User dashboard
│   ├── auth/                  # Authentication templates
│   ├── session_mgmt/          # Session management templates  
│   ├── slider/                # Resource allocation templates
│   └── survey_builder/        # Survey builder templates
├── static/                     # Static assets
│   ├── css/slider.css         # Slider-specific styles
│   └── js/slider.js           # Slider JavaScript logic
├── config.py                   # Environment-based configuration
├── run.py                      # Application entry point
├── requirements.txt            # Python dependencies
├── .env.template              # Environment variables template
└── README.md                  # Setup and usage instructions
```

## Technology Stack

### Backend
- **Flask 2.3+**: Web framework
- **Flask-SQLAlchemy 3.0+**: Database ORM
- **Flask-Security-Too 5.1+**: Authentication and authorization
- **Flask-Mail 0.9+**: Email functionality
- **Flask-WTF 1.1+**: Form handling and CSRF protection
- **Bootstrap-Flask 2.2+**: Bootstrap 5 integration

### Frontend
- **Bootstrap 5**: CSS framework
- **Vanilla JavaScript**: No frontend framework dependencies
- **Jinja2**: Server-side templating

### Database
- **SQLite**: Default development database
- **PostgreSQL/MySQL**: Production database options

## Core Components

### 1. Authentication System (Flask-Security-Too)

**User Roles:**
- **Admin**: Full system access, user management
- **Enumerator**: Create/manage surveys, monitor sessions
- **Participant**: Participate in surveys and experiments

**Features:**
- Email-based registration and login
- Password reset and change functionality
- Email confirmation (configurable)
- Session tracking and security monitoring
- Role-based access control

**Default Users (Development Only):**
- admin@example.com / admin123
- enumerator@example.com / enum123
- participant@example.com / participant123

### 2. Database Models

**User Model (Flask-Security-Too):**
```python
class User(db.Model, UserMixin):
    id, email, username, password, first_name, last_name
    active, fs_uniquifier, confirmed_at
    last_login_at, current_login_at, login_count
    created_at, updated_at
    roles (Many-to-Many with Role)
```

**Role Model:**
```python
class Role(db.Model, RoleMixin):
    id, name, description  # admin, enumerator, participant
    users (Many-to-Many with User)
```

**Survey Model:**
```python  
class Survey(db.Model):
    id, title, description
    created_by_id, created_at, updated_at, is_active
    created_by (Foreign Key to User)
```

**SurveySession Model (Legacy):**
```python
class SurveySession(db.Model):
    id, survey_id, respondent_id, session_token
    started_at, completed_at, status
    survey, respondent (Foreign Keys)
```

**Session Model (Research Sessions):**
```python
class Session(db.Model):
    id, enumerator_id, participant_number
    session_status, notes
    created_on, last_updated_on
    enumerator (Foreign Key)
```

### 3. Blueprint Architecture

#### Auth Blueprint (`/auth`)
- **Purpose**: Role-specific dashboards and user profile management
- **Routes**: `/profile`, `/admin`, `/enumerator`, `/participant`
- **Access Control**: Role-based route protection
- **Templates**: User dashboards, profile management

#### Main Blueprint (`/`)
- **Purpose**: Homepage, general navigation, unified dashboard
- **Routes**: `/`, `/dashboard`
- **Logic**: Role-based dashboard routing
- **Templates**: Homepage, general dashboard

#### Session Management Blueprint (`/sessions`)
- **Purpose**: Research session lifecycle management with participant tracking
- **Routes**: `/`, `/create`, `/session/<id>`, `/update/<id>`
- **Features**: Session creation, participant management, performance tracking, status updates
- **Status**: Fully implemented with WTForms validation

#### Survey Builder Blueprint (`/survey-builder`)
- **Purpose**: Survey creation and management interface
- **Routes**: `/`, `/create`, `/edit/<id>`, `/preview/<id>`
- **Access Control**: Admin and Enumerator roles only
- **Status**: Stub implementation with basic templates

#### Slider Blueprint (`/slider`)
- **Purpose**: Resource allocation experiment tool
- **Routes**: `/`, `/app`, `/api/scenarios`, `/api/calculate`
- **Features**: Interactive slider, economic calculations, real-time feedback
- **Status**: Full implementation from original sliderapp

### 4. Session Management System

**Core Features:**
- **Session Creation**: Enumerators create research sessions with participant data
- **Status Management**: Track session lifecycle (active, completed, cancelled)
- **Notes System**: Enumerator observations and session notes
- **Access Control**: Role-based permissions (enumerators only)
- **Participant Management**: Track participants with custom identifiers

**Data Model:**
```python
class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    enumerator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    participant_number = db.Column(db.String(50), nullable=False)
    session_status = db.Column(db.String(20), default='active')
    notes = db.Column(db.Text, nullable=True)
    created_on = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated_on = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Form Validation (WTForms):**
- **Required Fields**: Participant number
- **Text Length**: Participant number and notes validation
- **CSRF Protection**: Automatic token handling
- **Bootstrap Integration**: Flask-Bootstrap render_form() usage

**Workflow:**
1. Enumerator logs in and navigates to session management
2. Creates new session with participant number and optional notes
3. Session created with active status
4. Session status and notes can be updated throughout research
5. Session completion tracked with timestamps

**Security Model:**
- **Role Restriction**: Only enumerators can create/manage sessions
- **Ownership Control**: Enumerators can only edit their own sessions
- **CSRF Protection**: All forms protected against cross-site attacks

### 5. Economic Calculation Engine

**Resource Allocation Model:**
- **Budget**: 9 allocatable sessions between two children
- **Ability Levels**: Child 1 (high ability), Child 2 (low ability)
- **Investment Allocation**: Real-time slider interface

**Production Functions:**
- **Cobb-Douglas**: `H = a^γ * x^(1-γ)` (σ=0)
- **Additive**: `H = γ*a + (1-γ)*x` (σ=1)
- **CES**: `H = [γ*a^σ + (1-γ)*x^σ]^(1/σ)` (σ ∈ [-4,-3,-2,0.5])

**Earnings Calculation:**
- **Base Formula**: `E = α * H^θ`
- **Parameters**: γ=0.5, θ ∈ [1,2] (linear vs convex returns)
- **Initial Earnings**: Child 1 = 1.0, Child 2 = 5.0

### 5. Configuration Management

**Environment-Based Config:**
- Development, Production configurations
- Environment variables for secrets
- SMTP configuration for email
- Database URL configuration

**Security Settings:**
- Configurable email confirmation
- Password complexity requirements  
- Session security settings
- CSRF protection (Flask-WTF)

## User Interface Design

### Navigation Structure
- **Bootstrap 5 Navbar**: Responsive, role-based visibility
- **Menu Items**: Login, Sessions, Survey, Survey Builder, Slider
- **User Dropdown**: Profile, Dashboard, Logout
- **Access Control**: Menu items filtered by user role

### Template Hierarchy
- **base.html**: Bootstrap 5, navigation, flash messages, footer
- **Role-specific dashboards**: Customized based on user permissions
- **Responsive Design**: Mobile-first, touch-friendly interfaces
- **Consistent Styling**: Bootstrap theme, custom CSS for slider

### User Experience Flow
1. **Registration/Login**: Flask-Security-Too default templates
2. **Dashboard**: Role-based redirect to appropriate interface
3. **Navigation**: Role-filtered menu options
4. **Session Management**: Track survey participation
5. **Slider Tool**: Interactive economic experiment interface

## Security Model

### Authentication & Authorization
- **Flask-Security-Too**: Industry-standard security implementation
- **Role-Based Access**: Three-tier permission system
- **Session Management**: Secure session handling
- **Password Security**: Hashed passwords, configurable complexity

### Data Protection
- **CSRF Protection**: Flask-WTF integration
- **SQL Injection Prevention**: SQLAlchemy ORM usage
- **XSS Prevention**: Jinja2 auto-escaping
- **Secure Headers**: Configurable security headers

### Email Security
- **SMTP Configuration**: Environment variable-based
- **Email Validation**: Flask-Security-Too validation
- **Confirmation Emails**: Configurable email verification
- **Password Reset**: Secure token-based reset flow

## Development Considerations

### Code Organization
- **Blueprint Modularity**: Clean separation of concerns  
- **Application Factory**: Proper Flask app initialization
- **Model Relationships**: Well-defined database relationships
- **Template Inheritance**: DRY template structure

### Extension Points
- **Survey Builder**: Expandable to full survey creation system
- **Session Management**: Extensible to complex workflow management
- **Economic Models**: Additional calculation engines can be added
- **User Roles**: Additional roles can be defined as needed

### Testing Strategy
- **Unit Tests**: Model and utility function testing
- **Integration Tests**: Blueprint and route testing
- **Security Tests**: Authentication and authorization testing
- **UI Tests**: Template rendering and form validation

## Deployment Architecture

### Development Setup
- **SQLite Database**: File-based, zero-configuration
- **Debug Mode**: Enabled for development
- **Local SMTP**: Optional for email testing
- **Hot Reload**: Flask development server

### Production Considerations
- **Database Migration**: PostgreSQL/MySQL for production
- **Environment Variables**: All secrets externalized
- **WSGI Server**: Gunicorn or similar for production
- **Reverse Proxy**: Nginx for static files and SSL termination
- **Security Headers**: Production security configuration

## Future Enhancements

### Survey Builder Evolution
- **Question Types**: Text, multiple choice, scales, matrices
- **Logic Branching**: Conditional question flows
- **Template Library**: Pre-built survey templates
- **Export/Import**: Survey definition portability

### Session Management Enhancement
- **Slider Integration**: Connect session performance data with slider experiments
- **Data Export**: Session data in multiple formats (CSV, JSON)
- **Analytics Dashboard**: Session analysis and reporting
- **Bulk Operations**: Mass session status updates

### Economic Model Expansion
- **Multiple Scenarios**: Additional production functions
- **Parameter Configuration**: Admin-configurable economic parameters
- **Data Visualization**: Charts and graphs for results
- **Export Capabilities**: Data export for analysis

## Known Issues and Limitations

### Current Implementation Status
- **Survey Builder**: Stub implementation, needs full development
- **Session Management**: Fully implemented with participant tracking and performance validation
- **Email Configuration**: Requires proper SMTP setup
- **Production Deployment**: Needs production-ready configuration

### Technical Debt
- **Error Handling**: Needs comprehensive error handling
- **Input Validation**: Form validation needs enhancement
- **API Documentation**: API endpoints need documentation
- **Performance Optimization**: Database queries need optimization

This design provides a solid foundation for a comprehensive survey platform while maintaining flexibility for future expansion and customization based on specific research requirements.