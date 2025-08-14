from flask import render_template, redirect, url_for, flash, request
from flask_security import login_required, roles_required, current_user
from app.auth import bp

@bp.route('/profile')
@login_required
def profile():
    """User profile page"""
    return render_template('auth/profile.html', user=current_user)

@bp.route('/admin')
@login_required
@roles_required('admin')
def admin_dashboard():
    """Admin dashboard - only accessible to admin users"""
    from app.models import User, Role, Survey
    from app import db
    
    user_count = db.session.query(User).count()
    survey_count = db.session.query(Survey).count()
    
    return render_template('auth/admin_dashboard.html', 
                         user_count=user_count, 
                         survey_count=survey_count)

@bp.route('/enumerator')
@login_required
@roles_required('enumerator')
def enumerator_dashboard():
    """Enumerator dashboard - only accessible to enumerator users"""
    return render_template('auth/enumerator_dashboard.html')

@bp.route('/participant')
@login_required
@roles_required('participant')
def participant_dashboard():
    """Participant dashboard - only accessible to participant users"""
    return render_template('auth/participant_dashboard.html')