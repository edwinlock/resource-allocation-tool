# Backend Deployment Instructions for PythonAnywhere

This document provides step-by-step instructions for deploying the LEARN backend (Flask application) to PythonAnywhere.

## Prerequisites

- PythonAnywhere account (free or paid tier)
- GitHub repository with your code
- Basic familiarity with bash/terminal commands

## Deployment Steps

### 1. Upload Backend Code

**Option A: Using Git (Recommended)**

Open a Bash console on PythonAnywhere:

```bash
# Clone your repository
cd ~
git clone https://github.com/YOUR-USERNAME/resource-allocation-tool.git
cd resource-allocation-tool/backend
```

**Option B: Using File Upload**

Upload the `backend/` directory through PythonAnywhere's Files interface.

### 2. Set Up Virtual Environment

```bash
# Create virtual environment
cd ~/resource-allocation-tool/backend
mkvirtualenv --python=/usr/bin/python3.10 learn-env

# Activate virtual environment (if not already activated)
workon learn-env

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy the example environment file and edit it with your values:

```bash
cd ~/resource-allocation-tool/backend
cp .env.example .env
nano .env
```

**IMPORTANT**: The `.env` file contains sensitive credentials and should NEVER be committed to Git.

**Generate secure keys for SECRET_KEY and SECURITY_PASSWORD_SALT:**

```bash
# Generate SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# Generate SECURITY_PASSWORD_SALT
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Update the `.env` file with:
- Your generated SECRET_KEY and SECURITY_PASSWORD_SALT
- Your email provider credentials (SMTP2GO, Gmail, etc.)
- Your admin email address

See `.env.example` for all available configuration options and detailed comments.

### 4. Initialize Database

```bash
cd ~/resource-allocation-tool/backend
workon learn-env

# The database will be created automatically when the app starts
# But you can also create it manually:
python3 -c "from webapp import app, db; app.app_context().push(); db.create_all(); print('Database created')"
```

### 5. Configure WSGI Application

Go to the PythonAnywhere Web tab and create a new web app:
- Choose "Manual configuration"
- Select Python 3.10

Edit the WSGI configuration file (click on the link in the Web tab):

```python
# /var/www/YOUR-USERNAME_pythonanywhere_com_wsgi.py

import sys
import os

# Add your project directory to the sys.path
project_home = '/home/YOUR-USERNAME/resource-allocation-tool/backend'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set environment variables (optional - .env file is loaded by app)
# os.environ['SECRET_KEY'] = 'your-secret-key'

# Import your Flask app
from webapp import app as application
```

### 6. Configure Virtual Environment

In the Web tab, set the virtualenv path:

```
/home/YOUR-USERNAME/.virtualenvs/learn-env
```

### 7. Configure Static Files

In the Web tab, add a static files mapping:

| URL          | Directory                                              |
|--------------|--------------------------------------------------------|
| /static/     | /home/YOUR-USERNAME/resource-allocation-tool/backend/webapp/static |

### 8. Configure CORS (If Needed)

If you're hosting the frontend separately (e.g., on GitHub Pages), you may need to configure CORS to allow your frontend domain.

Edit `webapp/__init__.py` and update the CORS configuration to include your frontend URL:

```python
CORS(app,
    origins=['https://your-frontend-domain.com'],
    supports_credentials=True)
```

### 9. Reload Web App

Click the green "Reload" button in the Web tab.

Your backend API should now be accessible at: `https://YOUR-USERNAME.pythonanywhere.com`

## Database Backup (Automated with Cron)

The repository includes a comprehensive backup script with compression and automatic cleanup.

### 1. Copy Backup Script to Home Directory

The backup script is included in the repository at `backend/backup_database.sh`. Copy it to your home directory:

```bash
cp ~/resource-allocation-tool/backend/backup_database.sh ~/backup_database.sh
chmod +x ~/backup_database.sh
```

**Features:**
- ✅ Automatic gzip compression (saves ~90% disk space)
- ✅ Configurable retention (default: 30 days, max 720 backups)
- ✅ Detailed logging with timestamps and sizes
- ✅ Safe for hourly or daily execution
- ✅ Automatic cleanup of old backups
- ✅ Error handling and reporting

### 2. Configure Backup Settings (Optional)

The script uses environment variables for configuration. You can customize by setting these before running:

```bash
# Example: Custom backup location and retention
export BACKUP_DIR="$HOME/database_backups"
export RETENTION_DAYS=60        # Keep backups for 60 days
export MAX_BACKUPS=1440         # Max 1440 backups (60 days hourly)

~/backup_database.sh
```

**Default settings:**
- Database: `~/resource-allocation-tool/backend/instance/learn.db`
- Backup directory: `~/resource-allocation-tool/backend/backups/`
- Retention: 30 days
- Max backups: 720 (suitable for hourly backups over 30 days)

### 3. Test the Backup Script

```bash
# Run the backup script manually to test
~/backup_database.sh

# Check if compressed backup was created
ls -lh ~/resource-allocation-tool/backend/backups/

# View the log
cat ~/resource-allocation-tool/backend/backups/backup.log
```

Expected output:
```
2025-10-05 11:30:00: Starting database backup...
2025-10-05 11:30:00: Database size: 2.5M
2025-10-05 11:30:00: Backup created: .../learn_db_20251005_113000.db
2025-10-05 11:30:01: Backup compressed: .../learn_db_20251005_113000.db.gz
2025-10-05 11:30:01: Compressed size: 256K
2025-10-05 11:30:01: Backup complete. Total backups: 1, Total size: 256K
```

### 4. Schedule Automated Backups

**For Hourly Backups (Recommended):**

Go to the **Tasks** tab in PythonAnywhere and create a scheduled task:

- **Time**: `Hourly` (or specific hour, e.g., `03:00`)
- **Command**: `/home/YOUR-USERNAME/backup_database.sh`
- **Description**: Hourly database backup (compressed)

**For Daily Backups:**

Adjust retention settings for daily backups:

```bash
# Create a wrapper script for daily backups
cat > ~/backup_database_daily.sh << 'EOF'
#!/bin/bash
export RETENTION_DAYS=90
export MAX_BACKUPS=90
/home/YOUR-USERNAME/backup_database.sh
EOF

chmod +x ~/backup_database_daily.sh
```

Then schedule:
- **Time**: `03:00` UTC (daily at 3 AM)
- **Command**: `/home/YOUR-USERNAME/backup_database_daily.sh`
- **Description**: Daily database backup

**Note**: Free PythonAnywhere accounts get 1 scheduled task. Paid accounts get more.

### 4. Download Backups (Optional)

You can download backups periodically:

```bash
# Compress backups for download
cd ~/backups
tar -czf learn_db_backups.tar.gz learn_db/

# Download via Files tab in PythonAnywhere web interface
```

Or set up automated backup to external storage (Dropbox, S3, etc.) for paid accounts.

## Post-Deployment Checklist

- [ ] Backend is accessible at PythonAnywhere URL
- [ ] Database is initialized with roles and admin user
- [ ] Can log in via web interface
- [ ] API endpoints respond correctly
- [ ] Daily backup cron job is scheduled and tested
- [ ] Email configuration is working (password reset, etc.)
- [ ] HTTPS is enabled
- [ ] Environment variables are properly set

## Troubleshooting

**Error: "ModuleNotFoundError"**
- Make sure virtualenv is correctly configured in Web tab
- Verify all dependencies are installed: `workon learn-env && pip list`

**Error: "500 Internal Server Error"**
- Check error logs in the Web tab
- Check WSGI configuration file
- Verify environment variables in `.env` file

**Database Permission Issues**
- Ensure `instance/` directory exists and is writable
- Check file permissions: `chmod 755 ~/resource-allocation-tool/backend/instance`

**CORS Errors**
- Verify CORS configuration in `webapp/__init__.py`
- Add your frontend domain to allowed origins if hosting separately

**API Connection Failed**
- Check that backend is running and accessible
- Test API endpoints: `curl https://YOUR-USERNAME.pythonanywhere.com/health`

**Backup Issues**

**Cron job not running**
- Check that script path is absolute
- Verify script has execute permissions: `chmod +x ~/backup_learn_db.sh`
- Check PythonAnywhere scheduled tasks logs

**Backup file not created**
- Run script manually to see error messages
- Check that database path is correct
- Verify backup directory has write permissions

## Useful Commands

```bash
# View backend logs
tail -f /var/log/YOUR-USERNAME.pythonanywhere.com.error.log

# Restart web app (after code changes)
# Go to Web tab and click "Reload"

# Check database
cd ~/resource-allocation-tool/backend/instance
sqlite3 learn.db ".tables"

# View backup logs
cat ~/backups/learn_db/backup.log

# Manual backup
~/backup_learn_db.sh

# Update code from Git
cd ~/resource-allocation-tool
git pull origin main
# Then click "Reload" in Web tab
```

## Security Notes

- Keep your `.env` file secure and never commit it to Git
- Regularly update dependencies: `pip list --outdated`
- Monitor error logs for suspicious activity
- Keep backups in a secure location
- Use strong passwords for admin accounts
- Enable two-factor authentication on PythonAnywhere account

## Support

- PythonAnywhere Help: https://help.pythonanywhere.com/
- PythonAnywhere Forums: https://www.pythonanywhere.com/forums/
- Flask Documentation: https://flask.palletsprojects.com/
