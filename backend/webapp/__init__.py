from flask_bootstrap import Bootstrap5
from flask import Flask
from flask_wtf import CSRFProtect
from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_security import Security, SQLAlchemyUserDatastore, hash_password
from flask_security.models import fsqla
from flask_login.signals import user_logged_in
from flask_babel import Babel
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_security.signals import user_registered
from werkzeug.middleware.proxy_fix import ProxyFix


app = Flask(__name__)
app.config.from_object('webapp.config.Config')

# Configure ProxyFix for PythonAnywhere reverse proxy
# This allows Flask to see the real client IP from X-Forwarded-For headers
app.wsgi_app = ProxyFix(
    app.wsgi_app,
    x_for=1,      # Trust X-Forwarded-For from 1 proxy
    x_proto=1,    # Trust X-Forwarded-Proto from 1 proxy
    x_host=1,     # Trust X-Forwarded-Host from 1 proxy
    x_prefix=1    # Trust X-Forwarded-Prefix from 1 proxy
)

# Initialise plugins
csrf = CSRFProtect(app)
bootstrap = Bootstrap5(app)
db = SQLAlchemy(app)
migrate = Migrate(app, db)
mail = Mail(app)
babel = Babel(app)

# Configure CORS for development - allow localhost origins with credentials
CORS(app,
    #  origins=['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
     supports_credentials=True)
# CORS(
#     app,
#     supports_credentials=True,  # needed for cross domain cookie support
#     resources="/*",
#     allow_headers="*",
#     origins="https://www.example.com",
#     expose_headers="Authorization,Content-Type,Authentication-Token,XSRF-TOKEN",
# )

# Initialize rate limiter
# limiter = Limiter(
#     key_func=get_remote_address,
#     default_limits=["200 per day", "50 per hour"],
#     storage_uri="memory://",
# )
# limiter.init_app(app)

# Set up Flask-Security
# Define models for Flask-Security
fsqla.FsModels.set_db_info(db)
from webapp.models import User, Role
user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)

from webapp import routes
from webapp import models

# Create users if they don't already exist
def create_users():
    import os

    # Create roles if they don't exist
    admin_role = Role.query.filter_by(name='administrator').first()
    if not admin_role:
        admin_role = Role(name='administrator', description='Administrator role')
        db.session.add(admin_role)

    enum_role = Role.query.filter_by(name='enumerator').first()
    if not enum_role:
        enum_role = Role(name='enumerator', description='Enumerator role')
        db.session.add(enum_role)

    supervisor_role = Role.query.filter_by(name='supervisor').first()
    if not supervisor_role:
        supervisor_role = Role(name='supervisor', description='Supervisor role')
        db.session.add(supervisor_role)

    db.session.commit()

    # Create Edwin
    edwin_email = os.environ.get('EDWIN_EMAIL', 'edwinlock@gmail.com')
    if not user_datastore.find_user(email=edwin_email):
        edwin_user = user_datastore.create_user(
            email=edwin_email,
            password=hash_password("learn_edwinlock"),
            active=True
        )
        user_datastore.add_role_to_user(edwin_user, admin_role)
        user_datastore.add_role_to_user(edwin_user, enum_role)

    # Create Michelle   
    michelle_email = os.environ.get('MICHELLE_EMAIL', 'michelle.gonzalez.am@gmail.com')
    if not user_datastore.find_user(email=michelle_email):
        michelle_user = user_datastore.create_user(
            email=michelle_email,
            password=hash_password("learn_michelle"),
            active=True
        )
        user_datastore.add_role_to_user(michelle_user, admin_role)
        user_datastore.add_role_to_user(michelle_user, enum_role)

    # Create Esther   
    esther_email = os.environ.get('ESTHER_EMAIL', 'esther.gehrke@wur.nl')
    if not user_datastore.find_user(email=esther_email):
        esther_user = user_datastore.create_user(
            email=esther_email,
            password=hash_password("learn_esther"),
            active=True
        )
        user_datastore.add_role_to_user(esther_user, admin_role)
        user_datastore.add_role_to_user(esther_user, enum_role)

    db.session.commit()

@user_registered.connect_via(app)
def user_registered_sighandler(sender, user, **extra):
    default_role = user_datastore.find_role("enumerator")
    user_datastore.add_role_to_user(user, default_role)
    db.session.commit()

# Initialize default users on first request
# Note: Database tables are created via flask db upgrade (migrations)
@app.before_request
def before_first_request():
    """Create default users if they don't exist."""
    if not hasattr(app, '_users_created'):
        create_users()
        app._users_created = True
