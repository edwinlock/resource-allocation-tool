from webapp import app, db
from flask_security.models import fsqla
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import datetime

import json

# Flask-Security-Too Models using fsqla mixins
class Role(db.Model, fsqla.FsRoleMixin):
    pass

class User(db.Model, fsqla.FsUserMixin):
    pass

class Session(db.Model):
    id = db.Column(db.String(255), primary_key=True)  # UUID from frontend
    participant_id = db.Column(db.String(255), nullable=False)
    enumerator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Survey status tracking
    child1_survey_status = db.Column(db.String(50), default='not_started')
    child1_survey_completed_at = db.Column(db.DateTime, nullable=True)
    child2_survey_status = db.Column(db.String(50), default='not_started')
    child2_survey_completed_at = db.Column(db.DateTime, nullable=True)
    treatment_survey_status = db.Column(db.String(50), default='not_started')
    treatment_survey_completed_at = db.Column(db.DateTime, nullable=True)
    control_survey_status = db.Column(db.String(50), default='not_started')
    control_survey_completed_at = db.Column(db.DateTime, nullable=True)

    # Slider tracking
    slider_started_at = db.Column(db.DateTime, nullable=True)
    slider_completed_at = db.Column(db.DateTime, nullable=True)
    slider_status = db.Column(db.String(50), default='not_started')

    # Session data
    child1_ability = db.Column(db.Integer, nullable=False)
    child2_ability = db.Column(db.Integer, nullable=False)
    child1_name = db.Column(db.String(255), nullable=False)
    child2_name = db.Column(db.String(255), nullable=False)
    school = db.Column(db.String(255), nullable=False)
    session_type = db.Column(db.String(50), nullable=False)  # 'treatment' or 'control'

    # Upload tracking
    uploaded_at = db.Column(db.DateTime, nullable=True)
    upload_status = db.Column(db.String(50), default='not_uploaded')

    # Relationships
    survey_responses = db.relationship('SurveyResponse', backref='session', lazy='dynamic',
                                     cascade='all, delete-orphan')
    slider_responses = db.relationship('SliderResponse', backref='session', lazy='dynamic',
                                     cascade='all, delete-orphan')

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('participant_id', 'enumerator_id', name='unique_participant_enumerator'),
        db.Index('idx_enumerator_id', 'enumerator_id'),
        db.CheckConstraint('child1_ability >= 0 AND child1_ability <= 100', name='check_child1_ability'),
        db.CheckConstraint('child2_ability >= 0 AND child2_ability <= 100', name='check_child2_ability'),
        db.CheckConstraint("session_type IN ('treatment', 'control')", name='check_session_type'),
    )

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

class SurveyResponse(db.Model):
    id = db.Column(db.String(255), primary_key=True)  # UUID from frontend
    session_id = db.Column(db.String(255), db.ForeignKey('session.id'), nullable=False)
    survey_id = db.Column(db.String(50), nullable=False)  # 'Child1', 'Child2', 'Treatment', 'Control'
    question_id = db.Column(db.String(255), nullable=False)
    answer = db.Column(db.Text, nullable=False)  # JSON for complex answers, plain text for simple
    completed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Constraints
    __table_args__ = (
        db.Index('idx_session_survey', 'session_id', 'survey_id'),
        db.UniqueConstraint('session_id', 'survey_id', 'question_id', name='unique_session_survey_question'),
    )

    def to_dict(self):
        """Convert survey response to dictionary for JSON serialization."""
        # Try to parse answer as JSON, fall back to string if it fails
        try:
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

class SliderResponse(db.Model):
    id = db.Column(db.String(255), primary_key=True)  # UUID from frontend
    session_id = db.Column(db.String(255), db.ForeignKey('session.id'), nullable=False)
    scenario_number = db.Column(db.Integer, nullable=False)
    display_order = db.Column(db.Integer, nullable=False)
    child1_investment = db.Column(db.Integer, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Constraints
    __table_args__ = (
        db.Index('idx_session_display_order', 'session_id', 'display_order'),
        db.CheckConstraint('child1_investment >= 0 AND child1_investment <= 9', name='check_child1_investment'),
    )

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

# Add relationships after all models are defined
User.sessions = db.relationship('Session', backref='enumerator', lazy='dynamic')