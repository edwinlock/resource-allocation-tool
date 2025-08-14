from flask import Blueprint

bp = Blueprint('slider', __name__)

from app.slider import routes