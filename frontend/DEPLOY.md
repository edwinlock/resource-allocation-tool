# Deployment Instructions for GitHub Pages

This document provides step-by-step instructions for deploying the Resource Allocation Tool to GitHub Pages using the GitHub CLI (`gh`).

## Prerequisites

- GitHub CLI installed and authenticated (`gh auth login`)
- Git repository with your code pushed to GitHub
- GitHub repository with Pages enabled

## Deployment Steps

### 1. Enable GitHub Pages

```bash
# Enable GitHub Pages for the repository
gh repo edit --enable-pages --pages-source-branch main --pages-source-path /
```

### 2. Configure Repository Settings

```bash
# Set the repository visibility (if needed)
gh repo edit --visibility public

# Add a description to your repository
gh repo edit --description "Resource Allocation Tool - A tool for resource allocation and performance tracking"
```

### 3. Push Your Code

```bash
# Ensure all changes are committed and pushed
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### 4. Verify Deployment

```bash
# Check the deployment status
gh repo view --web

# Or check Pages deployment directly
gh api repos/:owner/:repo/pages
```

### 5. Access Your Site

Your site will be available at: `https://[username].github.io/[repository-name]/`

For this repository, the site should be accessible at the URL configured in the manifest.json file.

## Troubleshooting

### Common Issues

1. **404 Error**: Ensure your repository is public and Pages is enabled
2. **Build Failures**: Check that all files are properly committed and pushed
3. **Path Issues**: Verify the `start_url` in manifest.json matches your GitHub Pages URL

### Useful Commands

```bash
# Check repository status
gh repo view

# View repository settings
gh repo edit --help

# Check deployment logs
gh run list

# Force rebuild Pages
gh workflow run pages-build-deployment
```

## Notes

- GitHub Pages typically takes a few minutes to deploy after pushing changes
- The site uses the `/resource-allocation-tool/` base path as configured in manifest.json
- Any updates to the main branch will automatically trigger a new deployment
- Custom domains can be configured through the repository settings or using `gh repo edit --add-pages-domain`