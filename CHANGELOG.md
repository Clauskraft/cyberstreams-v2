# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-11-01

### Added
- **Web Console**: Complete React-based operations dashboard with search, real-time SSE stream, and agent management
- **Modular API Architecture**: Refactored from monolithic to modular design (src/server.js, services/, routes/, middleware/)
- **Security Features**: Authentication (API key + JWT), rate limiting, security headers, circuit breaker patterns
- **Agent Operations Dashboard**: Visual UI for managing build, test, design, and release agents
- **OSINT Toolkit Integration**: Dark web OSINT panel with predefined search tools and agent delegation
- **Comprehensive Data Sources**: DK, EU, Nordic, and Global source bundles (YAML)
- **Enhanced Worker**: OpenSearch integration, improved normalization, batch processing
- **Production Hardening**: Graceful degradation, error handling, structured logging

### Changed
- **API Version**: 0.1.0 → 0.2.0 (modular architecture)
- **Web Version**: 0.1.0 → 0.1.1 (accessibility improvements)
- **Docker Build**: Switched to `npm install` for monorepo workspace support
- **Accessibility**: All form elements now have proper labels and ARIA attributes
- **Git Ignore**: Removed package-lock.json from ignore list for reproducible builds

### Fixed
- Web console accessibility issues (select elements, textareas)
- Docker monorepo build failures for workspace dependencies
- Missing package-lock.json files preventing builds
- Improved error handling and validation throughout

### Infrastructure
- Production-ready modular architecture with services and middleware separation
- Redis service with connection pooling and circuit breaker
- OpenSearch client ready for production use
- Comprehensive audit logging and monitoring hooks

[0.2.0]: https://github.com/yourusername/cyberstreams-v2/releases/tag/v0.2.0

---

## [0.1.0] - 2025-10-25

### Added
- Initial MVP release of Cyberstreams V2
- Fastify-based API service with health endpoint (`/api/v1/health`)
- RSS parser worker for feed ingestion
- Railway deployment pipeline
- Makefile orchestration for build, scaffold, and deploy
- Audit system for source validation and contract coverage
- Cursor workspace rules and agent configuration
- Project structure: modular layout with apps/, scripts/, docs/

### Infrastructure
- Railway integration for containerized deployments
- GitHub Actions CI/CD workflow template
- Version bumping and changelog automation
- Health check verification scripts

[0.1.0]: https://github.com/yourusername/cyberstreams-v2/releases/tag/v0.1.0
