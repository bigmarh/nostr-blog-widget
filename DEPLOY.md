# Deployment Guide

## Prerequisites

1. **npm login**: Ensure you're logged into npm
   ```bash
   npm login
   ```

2. **GitHub CLI**: Install and authenticate gh CLI for GitHub Pages
   ```bash
   gh auth login
   ```

## Deployment Steps

### 1. Bump Version

Update version in `package.json` (follow semver):
- Patch (0.3.8 -> 0.3.9): Bug fixes
- Minor (0.3.8 -> 0.4.0): New features
- Major (0.3.8 -> 1.0.0): Breaking changes

### 2. Build

```bash
npm run build
```

### 3. Commit and Push

```bash
git add .
git commit -m "Release v0.3.9"
git push origin main
```

### 4. Publish to npm

```bash
npm publish
```

### 5. Deploy to GitHub Pages

The demo/showcase files are served from GitHub Pages. To update:

```bash
# Install gh-pages if not installed
npm install -D gh-pages

# Deploy dist and demo folders to gh-pages branch
npx gh-pages -d . -e . -b gh-pages --dist '.' --src '{dist/**,demo/**,index.html}'
```

Or manually:
```bash
git checkout -b gh-pages
git push origin gh-pages
```

Then enable GitHub Pages in repo settings (Settings > Pages > Source: gh-pages branch).

### 6. Create GitHub Release (optional)

```bash
gh release create v0.3.9 --title "v0.3.9" --notes "Add 'You may also like' related posts section"
```

## Quick Deploy Script

Add to package.json scripts:
```json
"prepublishOnly": "npm run build",
"release": "npm version patch && npm publish && git push --follow-tags"
```

## CDN URLs

After publishing to npm, the widget is available via:
- unpkg: `https://unpkg.com/nostr-blog-widget@latest/dist/nostr-blog.js`
- jsDelivr: `https://cdn.jsdelivr.net/npm/nostr-blog-widget@latest/dist/nostr-blog.js`
