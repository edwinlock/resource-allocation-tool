# Frontend Deployment Instructions for GitHub Pages

This document provides step-by-step instructions for deploying the LEARN frontend (static files) to GitHub Pages.

## Prerequisites

- GitHub repository with your code pushed to GitHub
- Backend deployed separately (see `backend/DEPLOY.md`)
- GitHub CLI installed and authenticated (optional - `gh auth login`)

## Deployment Steps

### 1. Configure Frontend to Connect to Backend

Update `frontend/js/modules/constants.js` to point to your deployed backend:

```javascript
export const API_CONFIG = {
    BACKEND_URL: 'https://your-backend.pythonanywhere.com',  // Your backend URL
    UPLOAD_TIMEOUT: 30000,
    ENDPOINTS: {
        UPLOAD_SESSION: '/upload-session',
        HEALTH_CHECK: '/health',
        LOGIN: '/login',
        PROFILE: '/profile'
    }
};
```

Commit this change:

```bash
git add frontend/js/modules/constants.js
git commit -m "Configure frontend for production backend"
git push origin main
```

### 2. Enable GitHub Pages

**Option A: Using GitHub CLI**

```bash
# Enable GitHub Pages from the frontend directory
gh repo edit --enable-pages --pages-source-branch main --pages-source-path /frontend
```

**Option B: Using GitHub Web Interface**

1. Go to your repository on GitHub
2. Click **Settings** > **Pages**
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/frontend`
4. Click **Save**

### 3. Configure Backend CORS

Update your backend to allow requests from your GitHub Pages domain.

Edit `backend/webapp/__init__.py`:

```python
CORS(app,
    origins=[
        'https://YOUR-USERNAME.github.io',
        'http://localhost:8000',  # For local development
    ],
    supports_credentials=True)
```

Deploy this change to your backend (PythonAnywhere or other hosting).

### 4. Wait for Deployment

GitHub Pages typically takes 1-5 minutes to build and deploy. You can monitor the deployment:

**Using GitHub CLI:**
```bash
gh run list --workflow=pages-build-deployment
```

**Using Web Interface:**
Go to your repository > **Actions** tab to see the deployment progress.

### 5. Access Your Frontend

Your frontend will be available at:

```
https://YOUR-USERNAME.github.io/REPOSITORY-NAME/
```

For example:
- Repository: `resource-allocation-tool`
- Username: `edwinlock`
- URL: `https://edwinlock.github.io/resource-allocation-tool/`

## Custom Domain Setup

To use a custom domain (e.g., `learn.yourdomain.com`) instead of the default GitHub Pages URL:

### 1. Configure DNS Records

Add a DNS record with your domain provider (e.g., Cloudflare, Namecheap, GoDaddy):

**For Subdomain (Recommended):**

Add a **CNAME** record:
- **Type**: CNAME
- **Name**: `learn` (or your preferred subdomain)
- **Target**: `YOUR-USERNAME.github.io`
- **TTL**: 3600 (or automatic)

**For Apex Domain (Optional):**

Add **A** records pointing to GitHub's IP addresses:
- **Type**: A
- **Name**: `@`
- **Value**: Add all four IPs:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- **TTL**: 3600 (or automatic)

**For www subdomain (if using apex):**

Add a **CNAME** record:
- **Type**: CNAME
- **Name**: `www`
- **Target**: `YOUR-USERNAME.github.io`

### 2. Configure Custom Domain in GitHub

**Option A: Using GitHub CLI**

```bash
# Add your custom domain
gh api repos/YOUR-USERNAME/REPOSITORY-NAME/pages \
  --method PUT \
  -f cname='learn.yourdomain.com'
```

**Option B: Using Web Interface**

1. Go to **Settings** > **Pages**
2. Under **Custom domain**, enter your domain (e.g., `learn.yourdomain.com`)
3. Click **Save**
4. Wait for DNS check to complete (may take a few minutes)

### 3. Enable HTTPS

After DNS propagation (usually 10-60 minutes):

1. Go to **Settings** > **Pages**
2. Check the box: **Enforce HTTPS**
3. GitHub will automatically provision an SSL certificate

### 4. Update Frontend Configuration

If using a custom domain, update your PWA manifest and any references:

Edit `frontend/manifest.json`:
```json
{
  "start_url": "/",
  "scope": "/"
}
```

### 5. Verify Custom Domain

Test your custom domain:

```bash
# Check DNS resolution
nslookup learn.yourdomain.com

# Test HTTPS
curl -I https://learn.yourdomain.com
```

**Common DNS providers:**
- **Cloudflare**: DNS > Records > Add Record
- **Namecheap**: Domain List > Manage > Advanced DNS
- **GoDaddy**: My Products > DNS > Manage Zones
- **Google Domains**: DNS > Custom records

## Troubleshooting

### Frontend Issues

**404 Error - Page Not Found**
- Ensure repository is **public** (GitHub Pages doesn't work with private repos on free tier)
- Verify Pages is enabled in Settings > Pages
- Check that source is set to `/frontend` folder
- Confirm index.html exists in the frontend directory

**CORS Errors**
- Verify backend CORS configuration includes your GitHub Pages domain
- Check browser console for specific CORS error messages
- Ensure backend is deployed and accessible
- Test backend directly: `curl https://your-backend.com/health`

**PWA Not Installing**
- Verify manifest.json is accessible: `https://your-site.com/manifest.json`
- Check service worker registration in browser DevTools
- Ensure HTTPS is enabled (required for PWAs)
- Clear browser cache and try again

**API Connection Failed**
- Verify `BACKEND_URL` in `frontend/js/modules/constants.js` is correct
- Test backend endpoint: `curl https://your-backend.com/health`
- Check browser Network tab for failed requests
- Ensure backend CORS allows your frontend domain

### Custom Domain Issues

**DNS Not Resolving**
- Wait 10-60 minutes for DNS propagation
- Use `nslookup` or `dig` to check DNS records
- Verify CNAME points to `YOUR-USERNAME.github.io` (not the full repository URL)
- Clear your local DNS cache: `sudo dscacheutil -flushcache` (macOS) or `ipconfig /flushdns` (Windows)

**HTTPS Not Available**
- Wait for DNS to fully propagate
- Ensure custom domain is saved in GitHub Pages settings
- Check that "Enforce HTTPS" is enabled
- May take up to 24 hours for certificate provisioning

**Custom Domain Not Working**
- Verify DNS records are correct (CNAME for subdomain, A records for apex)
- Check that CNAME file exists in repository root (GitHub creates this automatically)
- Ensure domain is verified in GitHub Pages settings
- Try accessing with `http://` first, then enable HTTPS once working

### Build/Deployment Issues

**Pages Build Failing**
- Check Actions tab for build error details
- Ensure all HTML, CSS, JS files are valid
- Verify no broken links or missing resources
- Check that all files are committed and pushed

**Changes Not Appearing**
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check Actions tab to confirm deployment completed
- Wait a few minutes for CDN cache to clear
- Try accessing in incognito/private mode

## Useful Commands

```bash
# Check repository and Pages status
gh repo view
gh api repos/:owner/:repo/pages

# Monitor deployments
gh run list --workflow=pages-build-deployment
gh run watch

# Check DNS propagation
nslookup learn.yourdomain.com
dig learn.yourdomain.com

# Test SSL certificate
curl -vI https://learn.yourdomain.com 2>&1 | grep -i ssl

# Force rebuild Pages (if needed)
gh workflow run pages-build-deployment
```

## Post-Deployment Checklist

- [ ] Frontend is accessible at GitHub Pages URL
- [ ] Backend connection works (check browser console for errors)
- [ ] PWA can be installed on mobile devices
- [ ] Login/logout functionality works
- [ ] Session upload works correctly
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled and working
- [ ] Service worker caching works offline

## Notes

- GitHub Pages deployment is **automatic** - any push to `main` branch triggers a rebuild
- Build time is typically 1-5 minutes
- GitHub provides free SSL certificates via Let's Encrypt
- Pages supports custom domains on free tier
- Static files are served from a global CDN for fast access
- Consider using a subdomain (e.g., `learn.yourdomain.com`) rather than apex domain for easier configuration

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Configuring Custom Domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Troubleshooting Custom Domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)
- [GitHub Pages IP Addresses](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain)