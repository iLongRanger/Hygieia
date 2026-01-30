# Changelog
All notable changes to the Hygieia project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Clean Slate UI Theme**: Complete UI/UX redesign with modern, professional styling
  - New color palette with teal primary (#0f766e), amber accents, and semantic colors
  - Light mode first design with dark mode toggle support
  - Theme persistence using Zustand store with localStorage
  - Toast notification system with success/error/warning/info variants
  - Improved typography with Inter font family
  - Custom soft shadows and animations (fade-in, slide-in, scale-in)
  - Skeleton loading states for better perceived performance
  - Updated all UI components (Button, Card, Input, Select, Modal, Badge, Table, Textarea)
  - Redesigned layout components (Sidebar, Header, AdminLayout)
  - Theme toggle button in header (sun/moon icons)
  - Responsive design improvements maintained

- **Contracts Module - Backend Implementation (Phase 14)**: Service agreements and contract management
  - Complete Contract data model with Prisma schema
  - Contract service layer with business logic
    - Auto-generate contract numbers (format: CONT-YYYYMM-XXXX)
    - Create contracts manually or from accepted proposals
    - Status workflow: draft → pending_signature → active → expired/terminated
    - Sign, terminate, archive, and restore operations
  - RESTful API endpoints for all contract operations
    - List contracts with pagination and filtering
    - CRUD operations with validation
    - Special endpoints for signing and terminating contracts
    - Create contract from proposal conversion
  - Comprehensive Zod validation schemas
  - Database migration for contracts table
  - Routes: `/api/v1/contracts/*`

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
- **Area Templates & Items**: Default area tasks and items (fixtures/furniture) with per-hour minutes
  - Area Templates module (owner/admin) to configure default tasks, items, and sqft per area type
  - Item types include category + default minutes per item
  - Facility area creation auto-applies template defaults with editable counts and task inclusion
  - Area Types configurator available under Area Templates

### Changed
- **Responsive Admin UI**: Mobile-friendly admin layout and page grids
  - Collapsible sidebar with overlay on small screens and menu toggle in header
  - Responsive padding and content container updates in admin layout
  - Form and filter rows stack on small screens to avoid horizontal overflow
  - Multi-column page sections now collapse to single-column on small screens

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
