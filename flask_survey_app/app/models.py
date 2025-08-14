from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin
from decimal import Decimal
import enum
from app import db

# Enums
class QuestionType(enum.Enum):
    """Question types for development economics surveys"""
    TEXT = 'text'
    NUMBER = 'number'
    MULTIPLE_CHOICE = 'multiple_choice'
    SINGLE_CHOICE = 'single_choice'
    RATING = 'rating'
    CURRENCY = 'currency'
    DATE = 'date'
    TIME = 'time'
    LOCATION = 'location'
    EMAIL = 'email'
    PHONE = 'phone'
    BOOLEAN = 'boolean'
    TEXTAREA = 'textarea'
    MATRIX = 'matrix'
    RANKING = 'ranking'

# Flask-Security models
roles_users = db.Table('roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)

class Role(db.Model, RoleMixin):
    """User roles: admin, enumerator, subject"""
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255))
    
    def __repr__(self):
        return f'<Role {self.name}>'

class User(db.Model, UserMixin):
    """User model with Flask-Security integration"""
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(64), unique=True, nullable=True)
    password = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(64), nullable=True)
    last_name = db.Column(db.String(64), nullable=True)
    
    # Flask-Security fields
    active = db.Column(db.Boolean(), default=True)
    fs_uniquifier = db.Column(db.String(64), unique=True, nullable=False)
    confirmed_at = db.Column(db.DateTime())
    
    # Tracking fields
    last_login_at = db.Column(db.DateTime())
    current_login_at = db.Column(db.DateTime())
    last_login_ip = db.Column(db.String(100))
    current_login_ip = db.Column(db.String(100))
    login_count = db.Column(db.Integer)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    roles = db.relationship('Role', secondary=roles_users, backref=db.backref('users', lazy='dynamic'))
    
    def __repr__(self):
        return f'<User {self.email}>'
    
    @property
    def full_name(self):
        """Return full name or email if names not provided"""
        if self.first_name and self.last_name:
            return f'{self.first_name} {self.last_name}'
        elif self.first_name:
            return self.first_name
        elif self.username:
            return self.username
        return self.email

# Survey models - Comprehensive schema for development economics
class Survey(db.Model):
    """Survey definition - main container"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    version = db.Column(db.String(50), default='1.0')
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    created_by = db.relationship('User', backref='surveys')
    section_placements = db.relationship('SectionPlacement', backref='survey', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Survey {self.title} v{self.version}>'

class Section(db.Model):
    """Reusable section template"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    instructions = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    question_placements = db.relationship('QuestionPlacement', backref='section', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Section {self.title}>'

class Question(db.Model):
    """Individual question template"""
    id = db.Column(db.Integer, primary_key=True)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.Enum(QuestionType), nullable=False)
    help_text = db.Column(db.Text)
    validation_rules = db.Column(db.Text)  # JSON string for validation rules
    required = db.Column(db.Boolean, default=False)
    
    # Type-specific fields
    min_value = db.Column(db.Float)
    max_value = db.Column(db.Float)
    max_length = db.Column(db.Integer)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    options = db.relationship('QuestionOption', backref='question', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Question {self.question_text[:50]}...>'

class QuestionOption(db.Model):
    """Options for choice-based questions"""
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    option_text = db.Column(db.String(500), nullable=False)
    option_value = db.Column(db.String(100))
    sort_order = db.Column(db.Integer, nullable=False)  # Static ordering, no reordering
    is_other = db.Column(db.Boolean, default=False)  # "Other" option flag
    
    def __repr__(self):
        return f'<QuestionOption {self.option_text}>'

class SectionPlacement(db.Model):
    """Links sections to surveys with ordering"""
    id = db.Column(db.Integer, primary_key=True)
    survey_id = db.Column(db.Integer, db.ForeignKey('survey.id'), nullable=False)
    section_id = db.Column(db.Integer, db.ForeignKey('section.id'), nullable=False)
    sort_order = db.Column(db.Numeric(precision=10, scale=2), nullable=False)  # Fractional ordering
    
    # Optional overrides
    section_title_override = db.Column(db.String(200))
    section_instructions_override = db.Column(db.Text)
    
    # Uniqueness constraint: each section appears at most once per survey
    __table_args__ = (db.UniqueConstraint('survey_id', 'section_id'),)
    
    # Relationships
    section = db.relationship('Section', backref='section_placements')
    
    def __repr__(self):
        return f'<SectionPlacement Survey:{self.survey_id} Section:{self.section_id} Order:{self.sort_order}>'

class QuestionPlacement(db.Model):
    """Links questions to sections with ordering"""
    id = db.Column(db.Integer, primary_key=True)
    section_id = db.Column(db.Integer, db.ForeignKey('section.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    sort_order = db.Column(db.Numeric(precision=10, scale=2), nullable=False)  # Fractional ordering
    
    # Optional overrides
    question_text_override = db.Column(db.Text)
    required_override = db.Column(db.Boolean)
    
    # Uniqueness constraint: each question appears at most once per section
    __table_args__ = (db.UniqueConstraint('section_id', 'question_id'),)
    
    # Relationships
    question = db.relationship('Question', backref='question_placements')
    
    def __repr__(self):
        return f'<QuestionPlacement Section:{self.section_id} Question:{self.question_id} Order:{self.sort_order}>'

class SurveySession(db.Model):
    """Survey session/response tracking"""
    id = db.Column(db.Integer, primary_key=True)
    survey_id = db.Column(db.Integer, db.ForeignKey('survey.id'), nullable=False)
    respondent_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    session_token = db.Column(db.String(128), unique=True, nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='started')  # started, in_progress, completed, abandoned
    
    # Relationships
    survey = db.relationship('Survey', backref='sessions')
    respondent = db.relationship('User', backref='survey_sessions')
    
    def __repr__(self):
        return f'<SurveySession {self.session_token}>'

class Session(db.Model):
    """Session model for enumerator-participant research sessions"""
    id = db.Column(db.Integer, primary_key=True)
    enumerator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    participant_number = db.Column(db.String(50), nullable=False)
    session_status = db.Column(db.String(20), nullable=False, default='active')  # active, completed, cancelled
    notes = db.Column(db.Text, nullable=True)
    created_on = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_updated_on = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    enumerator = db.relationship('User', backref='research_sessions')
    
    def __repr__(self):
        return f'<Session {self.id}: P{self.participant_number} by {self.enumerator.email}>'