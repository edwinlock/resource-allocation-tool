from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_security.core import Security
from flask_mail import Mail
from flask_wtf.csrf import CSRFProtect
from flask_bootstrap import Bootstrap5
from config import config

# Initialize extensions
db = SQLAlchemy()
security = Security()
mail = Mail()
csrf = CSRFProtect()
bootstrap = Bootstrap5()

def create_app(config_name='default'):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions with app
    db.init_app(app)
    mail.init_app(app)
    csrf.init_app(app)
    bootstrap.init_app(app)
    
    # Import models (needed for Flask-Security)
    from app.models import User, Role
    
    # Set up Flask-Security
    from flask_security.datastore import SQLAlchemyUserDatastore
    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    security.init_app(app, user_datastore)
    
    # Register blueprints
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    from app.surveys import bp as surveys_bp
    app.register_blueprint(surveys_bp, url_prefix='/surveys')
    
    from app.session_mgmt import bp as session_mgmt_bp
    app.register_blueprint(session_mgmt_bp, url_prefix='/sessions')
    
    from app.slider import bp as slider_bp
    app.register_blueprint(slider_bp, url_prefix='/slider')
    
    # Main routes
    from app.main import bp as main_bp
    app.register_blueprint(main_bp)
    
    return app