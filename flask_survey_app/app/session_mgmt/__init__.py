from flask import Blueprint

bp = Blueprint('session_mgmt', __name__)

from app.session_mgmt import routes