from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_security import login_required, current_user
from app.slider import bp

@bp.route('/')
def index():
    """Resource allocation slider application page"""
    return render_template('slider/app.html')