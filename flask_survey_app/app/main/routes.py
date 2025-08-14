from flask import render_template, redirect, url_for
from flask_security import current_user
from app.main import bp

@bp.route('/')
def index():
    """Main landing page"""
    return render_template('index.html')

@bp.route('/dashboard')
def dashboard():
    """User dashboard - redirects based on role"""
    if not current_user.is_authenticated:
        return redirect(url_for('security.login'))
    
    # Redirect based on user's primary role
    if current_user.has_role('admin'):
        return redirect(url_for('auth.admin_dashboard'))
    elif current_user.has_role('enumerator'):
        return redirect(url_for('auth.enumerator_dashboard'))
    elif current_user.has_role('participant'):
        return redirect(url_for('auth.participant_dashboard'))
    else:
        return render_template('dashboard.html')