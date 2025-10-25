# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
