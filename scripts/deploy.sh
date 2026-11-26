#!/usr/bin/env bash
# Publish dist/ to the gh-pages branch of the current repo's origin remote.
# Uses your existing git/gh credentials; stores no tokens.
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE_URL="$(git remote get-url origin)"
npm run verify
npm run build
TMP="$(mktemp -d)"
cp -r dist/. "$TMP/"
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name || echo deploy)" -c user.email="$(git -C "$OLDPWD" config user.email || echo deploy@localhost)" commit -qm "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -f "$REMOTE_URL" gh-pages
cd - >/dev/null
rm -rf "$TMP"
echo "Published dist/ to gh-pages"
