#!/usr/bin/env bash
set -euo pipefail
ver=$(cat .version)
date=$(date +%Y-%m-%d)
echo -e "## $ver - $date\n" > .changelog_fragment
git log --pretty=format:"- %s (%h)" $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD >> .changelog_fragment
if [[ -f CHANGELOG.md ]]; then
  { echo -e "## $ver - $date\n"; cat .changelog_fragment; echo; cat CHANGELOG.md; } > CHANGELOG.tmp
  mv CHANGELOG.tmp CHANGELOG.md
else
  { echo -e "# Changelog\n\n## $ver - $date\n"; cat .changelog_fragment; } > CHANGELOG.md
fi
rm -f .changelog_fragment
echo "CHANGELOG updated for $ver"
