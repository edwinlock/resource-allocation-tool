from flask import Blueprint

bp = Blueprint('surveys', __name__)

from app.surveys import routes