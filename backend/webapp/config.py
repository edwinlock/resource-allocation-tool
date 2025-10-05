import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask Core - REQUIRED
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable must be set")

    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///learn.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # Flask-Security-Too - REQUIRED
    SECURITY_PASSWORD_SALT = os.getenv('SECURITY_PASSWORD_SALT')
    if not SECURITY_PASSWORD_SALT:
        raise ValueError("SECURITY_PASSWORD_SALT environment variable must be set")

    SECURITY_DEFAULT_ROLE = 'enumerator'
    SECURITY_TOKEN_MAX_AGE = int(os.getenv('SECURITY_TOKEN_MAX_AGE', '86400'))  # 24 hours default
    SECURITY_USE_VERIFY_PASSWORD_CACHE = True
    SECURITY_LOGIN_WITHOUT_CONFIRMATION = True
    SECURITY_REGISTERABLE = os.getenv('SECURITY_REGISTERABLE', 'true').lower() == 'true'
    SECURITY_RECOVERABLE = True
    SECURITY_CHANGEABLE = True
    SECURITY_TRACKABLE = True

    # CSRF Configuration - protect session/browser but allow token-based API calls
    SECURITY_CSRF_PROTECT_MECHANISMS = ["session", "basic"]
    SECURITY_CSRF_IGNORE_UNAUTH_ENDPOINTS = True
    WTF_CSRF_CHECK_DEFAULT = False

    # Flask-Mail Configuration - REQUIRED for password reset/recovery
    MAIL_SERVER = os.getenv('MAIL_SERVER')
    MAIL_PORT = int(os.getenv('MAIL_PORT', '587'))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')
    if not MAIL_DEFAULT_SENDER:
        raise ValueError("MAIL_DEFAULT_SENDER environment variable must be set")
    SECURITY_EMAIL_SENDER = MAIL_DEFAULT_SENDER