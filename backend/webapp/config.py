import os
import secrets
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask Core
    SECRET_KEY = os.getenv('SECRET_KEY') or 'x0NRB_1d1SnOrQPap_NdurTSDv9z2v9D5kKE7rH8ieg'
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL') or 'sqlite:///learn.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Flask-Security-Too
    SECURITY_PASSWORD_SALT = os.getenv('SECURITY_PASSWORD_SALT') or 'bgsgS0T3qLaQDQ6RRSkE5acVMCAPgTcV2VF_E-eQdZE'
    SECURITY_DEFAULT_ROLE = 'enumerator'
    SECURITY_TOKEN_AUTHENTICATION_HEADER = 'Authorization'
    SECURITY_TOKEN_AUTHENTICATION_KEY = 'auth_token'
    SECURITY_TOKEN_MAX_AGE = 86400  # 24 hours
    SECURITY_USE_VERIFY_PASSWORD_CACHE = True
    SECURITY_LOGIN_WITHOUT_CONFIRMATION = True
    SECURITY_REGISTERABLE = True
    SECURITY_RECOVERABLE = True
    SECURITY_CHANGEABLE = True
    SECURITY_TRACKABLE = True

    # Flask-Mail (SMTP2GO)
    MAIL_SERVER = 'mail.smtp2go.com'
    MAIL_PORT = 2525
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('SMTP2GO_USERNAME')
    MAIL_PASSWORD = os.getenv('SMTP2GO_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')
    SECURITY_EMAIL_SENDER = os.getenv('MAIL_DEFAULT_SENDER')