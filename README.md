# Hygieia - Commercial Cleaning Management System

A comprehensive single-tenant web application for managing commercial cleaning operations, customer relationships, proposals, contracts, and day-to-day facility management tasks.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose (recommended for local development)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env

# 3. Set up the database
npm run db:migrate

# 4. Start development servers
npm run dev
```

This will start:
- **API Server**: http://localhost:3001
- **Web Application**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Documentation

For detailed documentation, see the [Documentation/](./Documentation/) folder:
- [Getting Started Guide](./Documentation/README.md)
- [Development Guide](./DEVELOPMENT.md)
- [Architecture Overview](./Documentation/ARCHITECTURE.md)
- [Data Model](./Documentation/Complete_Data_Model.md)
- [Testing Strategy](./Documentation/Testing_Strategy.md)
- [Security Implementation](./Documentation/Security_Implementation_Guide.md)
- [API Error Handling](./Documentation/API_Error_Handling.md)

## Project Structure

```
hygieia/
├── apps/
│   ├── api/              # Express.js backend (Node.js + TypeScript)
│   └── web/              # React frontend (Vite + TypeScript)
├── packages/
│   ├── database/          # Prisma schema and database client
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Shared utility functions
│   └── ui/                # Shared UI components
├── Documentation/         # Project documentation
├── DEVELOPMENT.md         # Development workflow guide
├── CHANGELOG.md          # Version history
├── docker-compose.yml      # Local development setup
└── package.json          # Root package configuration
```

## Available Scripts

### Development
- `npm run dev` - Start both API and Web in parallel
- `npm run dev:api` - Start API only
- `npm run dev:web` - Start Web only

### Database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database

### Testing
- `npm run test` - Run all tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests
- `npm run test:coverage` - Generate coverage report

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Type check all packages

### Build
- `npm run build` - Build all packages

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand or Redux Toolkit
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 14+ with Prisma ORM
- **Authentication**: JWT with bcrypt
- **Validation**: Zod schemas

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Process Manager**: PM2 (production)
- **CI/CD**: GitHub Actions

## Development Workflow

1. **Follow Documentation-Driven Development (DDD)**: All features must be documented before implementation
2. **Use Test-Driven Development (TDD)**: Write failing tests first, implement code to pass
3. **Commit Standards**: Use conventional commits: `feat(scope): description`
4. **Quality Gates**: All tests must pass, minimum 90% test coverage, no type errors

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development guidelines.

## Project Roadmap

### Phase 1: Core CRM (Months 1-3)
- [ ] User authentication and authorization
- [ ] Lead management system
- [ ] Customer account management
- [ ] Contact management
- [ ] Basic dashboard and reporting

### Phase 2: Facility Management (Months 4-5)
- [ ] Facility profiles and specifications
- [ ] Area categorization system
- [ ] Condition assessment tools
- [ ] Access and requirements management

### Phase 3: Operations & Tasks (Months 6-7)
- [ ] Task template system
- [ ] Work order generation
- [ ] Staff assignment and tracking
- [ ] Task completion verification

### Phase 4: Estimating & Proposals (Months 8-9)
- [ ] Automated quote generation
- [ ] Proposal template system
- [ ] Digital proposal delivery
- [ ] E-signature integration

### Phase 5: Advanced Features (Months 10-12)
- [ ] Advanced reporting and analytics
- [ ] Mobile-responsive interface
- [ ] Email automation
- [ ] QuickBooks integration

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- 📖 Documentation: [Documentation/](./Documentation/)
- 🐛 Issues: [GitHub Issues](https://github.com/iLongRanger/Hygieia/issues)

---

**Hygieia** - Streamlining commercial cleaning operations for business growth.
