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

# Base Session class with polymorphic inheritance
class Session(db.Model):
    __tablename__ = 'session'

    id = db.Column(db.String(255), primary_key=True)  # UUID from frontend
    session_type = db.Column(db.String(50), nullable=False)  # 'child' or 'parent'
    enumerator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Upload tracking
    uploaded_at = db.Column(db.DateTime, nullable=True)
    upload_status = db.Column(db.String(50), default='not_uploaded')

    # Polymorphic configuration
    __mapper_args__ = {
        'polymorphic_on': session_type,
        'polymorphic_identity': 'session',
        'with_polymorphic': '*'
    }

    # Relationship - works for both child and parent sessions
    survey_responses = db.relationship('SurveyResponse', backref='session', lazy='dynamic',
                                      cascade='all, delete-orphan')

    # Constraints
    __table_args__ = (
        db.Index('idx_enumerator_id', 'enumerator_id'),
        db.CheckConstraint("session_type IN ('child', 'parent')", name='check_session_type'),
    )

    def to_dict(self):
        """Convert session to dictionary for JSON serialization."""
        base_dict = {
            'id': self.id,
            'session_type': self.session_type,
            'enumerator_id': self.enumerator_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'upload_status': self.upload_status,
        }
        return base_dict


class ChildSession(Session):
    __tablename__ = 'child_session'

    id = db.Column(db.String(255), db.ForeignKey('session.id'), primary_key=True)
    family_id = db.Column(db.String(255), nullable=False)
    child_id = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    school = db.Column(db.String(255), nullable=False)

    # Survey status tracking
    survey_status = db.Column(db.String(50), default='not_started')
    survey_completed_at = db.Column(db.DateTime, nullable=True)

    # Polymorphic configuration
    __mapper_args__ = {
        'polymorphic_identity': 'child'
    }

    # Constraints
    __table_args__ = (
        db.Index('idx_child_family', 'family_id'),
    )

    def is_complete(self):
        """Returns True if child session is completed."""
        return self.survey_status == 'completed'

    def get_missing_components(self):
        """Returns list of missing components."""
        if self.survey_status != 'completed':
            return ['Child Survey']
        return []

    def to_dict(self):
        """Convert child session to dictionary for JSON serialization."""
        base_dict = super().to_dict()
        base_dict.update({
            'family_id': self.family_id,
            'child_id': self.child_id,
            'name': self.name,
            'school': self.school,
            'survey_status': self.survey_status,
            'survey_completed_at': self.survey_completed_at.isoformat() if self.survey_completed_at else None,
            'is_complete': self.is_complete(),
            'missing_components': self.get_missing_components()
        })
        return base_dict


class ParentSession(Session):
    __tablename__ = 'parent_session'

    id = db.Column(db.String(255), db.ForeignKey('session.id'), primary_key=True)
    family_id = db.Column(db.String(255), nullable=False)
    child1_name = db.Column(db.String(255), nullable=False)
    child2_name = db.Column(db.String(255), nullable=False)
    school = db.Column(db.String(255), nullable=False)
    group_type = db.Column(db.String(50), nullable=False)  # 'treatment' or 'control'

    # Survey status tracking
    survey_status = db.Column(db.String(50), default='not_started')
    survey_completed_at = db.Column(db.DateTime, nullable=True)
    exit_survey_status = db.Column(db.String(50), default='not_started')
    exit_survey_completed_at = db.Column(db.DateTime, nullable=True)

    # Slider tracking
    slider_status = db.Column(db.String(50), default='not_started')
    slider_started_at = db.Column(db.DateTime, nullable=True)
    slider_completed_at = db.Column(db.DateTime, nullable=True)

    # Polymorphic configuration
    __mapper_args__ = {
        'polymorphic_identity': 'parent'
    }

    # Parent sessions have slider responses
    slider_responses = db.relationship('SliderResponse', backref='parent_session', lazy='dynamic',
                                      cascade='all, delete-orphan')

    # Constraints
    __table_args__ = (
        db.Index('idx_parent_family', 'family_id'),
        db.CheckConstraint("group_type IN ('treatment', 'control')", name='check_group_type'),
    )

    def is_complete(self):
        """Returns True if all required components of the parent session are completed."""
        survey_done = self.survey_status == 'completed'
        slider_done = self.slider_status == 'completed'
        exit_done = self.exit_survey_status == 'completed'

        if self.group_type == 'treatment':
            return survey_done and slider_done and exit_done
        else:  # control
            return survey_done

    def get_missing_components(self):
        """Returns list of missing components needed to complete the session."""
        missing = []
        if self.survey_status != 'completed':
            missing.append('Parent Survey')
        if self.group_type == 'treatment':
            if self.slider_status != 'completed':
                missing.append('Slider Exercise')
            if self.exit_survey_status != 'completed':
                missing.append('Exit Survey')
        return missing

    def to_dict(self):
        """Convert parent session to dictionary for JSON serialization."""
        base_dict = super().to_dict()
        base_dict.update({
            'family_id': self.family_id,
            'child1_name': self.child1_name,
            'child2_name': self.child2_name,
            'school': self.school,
            'group_type': self.group_type,
            'survey_status': self.survey_status,
            'survey_completed_at': self.survey_completed_at.isoformat() if self.survey_completed_at else None,
            'exit_survey_status': self.exit_survey_status,
            'exit_survey_completed_at': self.exit_survey_completed_at.isoformat() if self.exit_survey_completed_at else None,
            'slider_status': self.slider_status,
            'slider_started_at': self.slider_started_at.isoformat() if self.slider_started_at else None,
            'slider_completed_at': self.slider_completed_at.isoformat() if self.slider_completed_at else None,
            'is_complete': self.is_complete(),
            'missing_components': self.get_missing_components()
        })
        return base_dict


class SurveyResponse(db.Model):
    id = db.Column(db.String(255), primary_key=True)  # UUID from frontend
    session_id = db.Column(db.String(255), db.ForeignKey('session.id'), nullable=False)
    survey_id = db.Column(db.String(50), nullable=False)  # 'Child', 'Parent', 'Treatment', 'Control', 'Exit'
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
    parent_session_id = db.Column(db.String(255), db.ForeignKey('parent_session.id'), nullable=False)
    scenarios_id = db.Column(db.String(255), nullable=False)  # e.g., "main-v1" or "practice-v1"
    scenario_number = db.Column(db.Integer, nullable=False)
    scenario_name = db.Column(db.String(255), nullable=False)  # e.g., "A", "B", "C" - scenario identifier
    display_order = db.Column(db.Integer, nullable=False)
    child1_investment = db.Column(db.Integer, nullable=False)
    child2_investment = db.Column(db.Integer, nullable=False)  # Stored value, not computed
    allocatable_budget = db.Column(db.Integer, nullable=False)  # Total budget for this scenario set
    completed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Scenario parameters (constant per scenario)
    scenario_gamma = db.Column(db.Float, nullable=False)
    scenario_sigma = db.Column(db.Float, nullable=False)
    scenario_theta = db.Column(db.Float, nullable=False)

    # Session-specific inputs (vary by family)
    pre_earnings1 = db.Column(db.Float, nullable=False)
    pre_earnings2 = db.Column(db.Float, nullable=False)
    high_child = db.Column(db.Integer, nullable=False)  # Which child (1 or 2) has higher pre-earnings

    # Computed economic values
    scenario_alpha = db.Column(db.Float, nullable=False)
    child1_final_earnings = db.Column(db.Float, nullable=False)
    child2_final_earnings = db.Column(db.Float, nullable=False)
    aggregate_final_earnings = db.Column(db.Float, nullable=False)

    # Constraints
    __table_args__ = (
        db.Index('idx_parent_session_display_order', 'parent_session_id', 'display_order'),
        db.Index('idx_scenarios_id', 'scenarios_id'),
    )

    def to_dict(self):
        """Convert slider response to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'parent_session_id': self.parent_session_id,
            'scenarios_id': self.scenarios_id,
            'scenario_number': self.scenario_number,
            'scenario_name': self.scenario_name,
            'display_order': self.display_order,
            'child1_investment': self.child1_investment,
            'child2_investment': self.child2_investment,
            'allocatable_budget': self.allocatable_budget,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'scenario_gamma': self.scenario_gamma,
            'scenario_sigma': self.scenario_sigma,
            'scenario_theta': self.scenario_theta,
            'pre_earnings1': self.pre_earnings1,
            'pre_earnings2': self.pre_earnings2,
            'high_child': self.high_child,
            'scenario_alpha': self.scenario_alpha,
            'child1_final_earnings': self.child1_final_earnings,
            'child2_final_earnings': self.child2_final_earnings,
            'aggregate_final_earnings': self.aggregate_final_earnings
        }


# Add relationships after all models are defined
User.sessions = db.relationship('Session', backref='enumerator', lazy='dynamic')
