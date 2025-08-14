from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_security import login_required, roles_required, current_user
from app.surveys import bp
from app.models import Survey
from app import db

@bp.route('/')
@login_required
@roles_required('admin', 'enumerator')
def index():
    """Surveys main page"""
    surveys = Survey.query.filter_by(created_by_id=current_user.id).all()
    return render_template('surveys/index.html', surveys=surveys)

@bp.route('/create')
@login_required
@roles_required('admin', 'enumerator')
def create_survey():
    """Create new survey - stub implementation"""
    return render_template('surveys/create.html')

@bp.route('/edit/<int:survey_id>')
@login_required
@roles_required('admin', 'enumerator')
def edit_survey(survey_id):
    """Edit existing survey - stub implementation"""
    survey = Survey.query.get_or_404(survey_id)
    
    # Check if user owns this survey or is admin
    if not current_user.has_role('admin') and survey.created_by != current_user:
        flash('You do not have permission to edit this survey.', 'error')
        return redirect(url_for('surveys.index'))
    
    return render_template('surveys/edit.html', survey=survey)

@bp.route('/preview/<int:survey_id>')
@login_required
@roles_required('admin', 'enumerator')
def preview_survey(survey_id):
    """Preview survey - stub implementation"""
    survey = Survey.query.get_or_404(survey_id)
    return render_template('surveys/preview.html', survey=survey)