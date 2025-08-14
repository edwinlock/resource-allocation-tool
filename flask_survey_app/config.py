import os
from pathlib import Path
from dotenv import load_dotenv

basedir = Path(__file__).parent.absolute()

# Load environment variables from .env file
load_dotenv(basedir / '.env')

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f'sqlite:///{basedir}/survey_app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Flask-Security settings
    SECURITY_REGISTERABLE = False
    SECURITY_RECOVERABLE = True
    SECURITY_TRACKABLE = True
    SECURITY_CHANGEABLE = True
    SECURITY_CONFIRMABLE = True
    SECURITY_PASSWORD_SALT = os.environ.get('SECURITY_PASSWORD_SALT') or 'dev-password-salt'
    SECURITY_SEND_REGISTER_EMAIL = True
    SECURITY_SEND_PASSWORD_RESET_EMAIL = True
    SECURITY_SEND_PASSWORD_CHANGE_EMAIL = True
    
    # Flask-Security template settings
    SECURITY_FLASH_MESSAGES = True
    SECURITY_EMAIL_SUBJECT_REGISTER = 'Welcome to Survey App'
    
    # Flask-Security URLs
    SECURITY_POST_LOGIN_REDIRECT_ENDPOINT = 'main.dashboard'
    SECURITY_POST_LOGOUT_REDIRECT_ENDPOINT = 'main.index'
    SECURITY_POST_REGISTER_REDIRECT_ENDPOINT = 'main.dashboard'
    
    # Bootstrap Flask settings
    # BOOTSTRAP_BOOTSWATCH_THEME = 'bootstrap'  # Use default Bootstrap theme
    
    # Mail settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', '1') == '1'
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', '0') == '1'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or os.environ.get('MAIL_USERNAME')
    
    # Security email settings
    SECURITY_EMAIL_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or os.environ.get('MAIL_USERNAME')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SECURITY_SEND_REGISTER_EMAIL = False
    SECURITY_SEND_PASSWORD_RESET_EMAIL = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SECURITY_SEND_REGISTER_EMAIL = True
    SECURITY_SEND_PASSWORD_RESET_EMAIL = True

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}