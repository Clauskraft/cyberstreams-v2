Trin:
1) scripts/release/version-bump.sh patch
2) scripts/release/changelog.sh
3) git add -A && git commit -m "chore(release): v$(cat .version)" && git tag v$(cat .version)
4) git push && git push --tags
5) scripts/release/verify-health.sh "$API_URL"
Accept: CI grøn, health=ok.
