import os
from app import create_app

# Create the Flask application instance
app = create_app(os.getenv('FLASK_CONFIG', 'production'))

if __name__ == '__main__':
    app.run()