from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_security import login_required, roles_required, current_user
from app.session_mgmt import bp
from app.session_mgmt.forms import CreateSessionForm, UpdateSessionForm
from app.models import Session, User
from app import db
from datetime import datetime, UTC

@bp.route('/')
@login_required
def index():
    """Session management main page"""
    if current_user.has_role('admin'):
        # Show all sessions for admin
        sessions = Session.query.order_by(Session.created_on.desc()).all()
    elif current_user.has_role('enumerator'):
        # Show enumerator's own sessions
        sessions = Session.query.filter_by(enumerator_id=current_user.id).order_by(
            Session.created_on.desc()).all()
    else:
        # Participants cannot view sessions
        flash('You do not have permission to access session management.', 'error')
        return redirect(url_for('main.dashboard'))
    
    return render_template('session_mgmt/index.html', sessions=sessions)

@bp.route('/create', methods=['GET', 'POST'])
@login_required
@roles_required('enumerator')
def create_session():
    """Create a new research session"""
    form = CreateSessionForm()
    
    if form.validate_on_submit():
        # Create new session
        session = Session(
            enumerator_id=current_user.id,
            participant_number=form.participant_number.data,
            notes=form.notes.data or '',
            session_status='active'
        )
        
        db.session.add(session)
        db.session.commit()
        
        flash(f'Created new session for participant {form.participant_number.data}', 'success')
        return redirect(url_for('session_mgmt.view_session', session_id=session.id))
    
    return render_template('session_mgmt/create.html', form=form)

@bp.route('/session/<int:session_id>')
@login_required
def view_session(session_id):
    """View specific research session"""
    session = Session.query.get_or_404(session_id)
    
    # Check permissions
    if not (current_user.has_role('admin') or session.enumerator_id == current_user.id):
        flash('You do not have permission to view this session.', 'error')
        return redirect(url_for('session_mgmt.index'))
    
    # Create form with current session data for updates
    form = UpdateSessionForm()
    if session.enumerator_id == current_user.id:
        form.session_status.data = session.session_status
        form.notes.data = session.notes
    
    return render_template('session_mgmt/session.html', session=session, form=form)

@bp.route('/update/<int:session_id>', methods=['POST'])
@login_required
@roles_required('enumerator')
def update_session(session_id):
    """Update session status and notes"""
    session = Session.query.get_or_404(session_id)
    
    # Check permissions - only session enumerator can update
    if session.enumerator_id != current_user.id:
        flash('You do not have permission to update this session.', 'error')
        return redirect(url_for('session_mgmt.view_session', session_id=session.id))
    
    form = UpdateSessionForm()
    
    if form.validate_on_submit():
        session.session_status = form.session_status.data
        session.notes = form.notes.data or ''
        session.last_updated_on = datetime.now(UTC)
        db.session.commit()
        
        flash('Session updated successfully', 'success')
    else:
        flash('Error updating session. Please try again.', 'error')
    
    return redirect(url_for('session_mgmt.view_session', session_id=session.id))