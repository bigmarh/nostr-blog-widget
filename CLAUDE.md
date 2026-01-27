# Claude Code Instructions for nostr-blog-widget

## Deployment Process

When deploying changes, follow this complete workflow:

1. Make code changes
2. Build and verify: `npm run build`
3. Bump version: `npm version patch` (or `minor`/`major` depending on changes)
4. Commit the version bump with the version number as the commit message
5. Create git tag: `git tag v{version}` (e.g., `git tag v0.3.19`)
6. Push with tags: `git push origin main --tags`

The GitHub Actions workflow (`.github/workflows/publish.yml`) triggers on `v*` tags and automatically publishes to npm. CDNs (jsdelivr, unpkg) update automatically after npm publish.

## Quick Deploy Commands

```bash
npm run build
npm version patch --no-git-tag-version
# Commit: git commit -am "0.x.x"
git tag v0.x.x
git push origin main --tags
```

## Architecture Notes

- Built with SolidJS and TypeScript
- Uses IndexedDB for caching (see `src/services/cache.ts`)
- Nostr protocol integration via nostr-tools (see `src/services/nostr.ts`)
- Hash-based routing (see `src/services/router.ts`)

## Key Files

- `src/App.tsx` - Main application component
- `src/services/nostr.ts` - Nostr relay communication and post fetching
- `src/services/cache.ts` - IndexedDB caching layer
- `src/services/router.ts` - Client-side routing
