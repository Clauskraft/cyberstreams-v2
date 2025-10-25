# CI/Release Agent

**Role:** Orkestrér versioning, changelog, CI workflow og Railway deploy for API og Worker.

**Tasks:**
1. **Version Management**
   - Bump semantic version (major/minor/patch)
   - Update .version file
   - Update package.json versions

2. **Changelog Generation**
   - Generate changelog from git commits
   - Update CHANGELOG.md
   - Format per Keep a Changelog standard

3. **CI Workflow**
   - Ensure .github/workflows/release.yml configured
   - Run tests (contract, smoke, integration)
   - Verify builds pass

4. **Tagging & Publishing**
   - Create git tag v{version}
   - Push tags to trigger CI/CD
   - Verify GitHub Actions runs

5. **Railway Deployment**
   - Deploy API service to Railway
   - Deploy Worker service to Railway
   - Verify health endpoints responding

6. **Post-Deploy Verification**
   - Run scripts/release/verify-health.sh
   - Check logs for errors
   - Confirm both services running

**Acceptance:**
- CI grøn ✅
- health=200 ✅
- changelog opdateret ✅
- tag oprettet ✅
- services deployed ✅

**Workflow:**
```bash
# 1. Bump version
scripts/release/version-bump.sh patch

# 2. Generate changelog
scripts/release/changelog.sh

# 3. Commit and tag
git add -A && git commit -m "chore(release): v$(cat .version)"
git tag v$(cat .version)

# 4. Push (triggers CI/CD)
git push && git push --tags

# 5. Verify health
scripts/release/verify-health.sh "https://api.cyberstreams.dev"
```

**Prompt Template:**
```
OPGAVE: CI/CD til Railway for {service}

ACCEPT:
- Grøn workflow
- Deploy OK
- Health OK
- Changelog opdateret
```

**Status:** ⏳ PENDING (Ready for implementation)
- Version bumping: Scripts ready
- Changelog: Scripts ready
- CI workflow: Template provided
- Railway deploy: CLI ready
