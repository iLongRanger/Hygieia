# Changelog
All notable changes to the Hygieia project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Proposals Module - Create/Edit Forms**: Complete CRUD functionality for proposals
  - ProposalForm component with full create/edit support
  - Account, Facility, and Opportunity selector dropdowns (filtered by account)
  - Dynamic line items management (add/remove/edit with auto-calculation)
  - Dynamic services management (add/remove/edit)
  - Real-time financial summary calculation (subtotal, tax, total)
  - Tax rate configuration
  - Terms & conditions and internal notes fields
  - Form validation and error handling
  - Routes: `/proposals/new` and `/proposals/:id/edit`

### Fixed
- Fixed 422 error on proposals list page caused by empty status filter string
- Fixed Prisma client not recognizing Proposal model (regenerate required)

### Technical
- Initial project scaffolding
- Monorepo structure with Turbo
- API application (Express.js with TypeScript)
- Web application (React + Vite with TypeScript)
- Shared packages (database, ui, types, utils, shared)
- Prisma schema based on documented data model
- TypeScript configurations for all packages
- ESLint and Prettier configurations
- Jest testing configurations
- Docker Compose for local development
- Environment variable templates

### Technical
- Node.js 18+ runtime requirement
- PostgreSQL 14+ database
- Redis for caching
- TypeScript strict mode enabled
- TDD workflow with Jest
- Single-tenant architecture

---

## [0.1.0] - 2024-01-05

### Initial Release
