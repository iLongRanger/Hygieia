# Hygieia Development Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
    ```bash
    cp .env.example .env
    # Edit .env with your configuration
    ```

3. **Start development servers**
   ```bash
   npm run dev
   ```
   This will start both API (:3001) and Web (:3000) servers

4. **Set up database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## Project Structure

```
hygieia/
├── apps/
│   ├── api/           # Express.js backend
│   └── web/           # React frontend
├── packages/
│   ├── database/       # Prisma schema and client
│   ├── types/          # Shared TypeScript types
│   ├── utils/          # Shared utilities
│   └── ui/            # Shared UI components
└── scripts/           # Build and deployment scripts
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
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Type check all packages

### Build
- `npm run build` - Build all packages

## Development Rules

1. **Follow Documentation-Driven Development (DDD)**
   - All features must be documented before implementation
   - Follow specifications in Documentation/ folder

2. **Use Test-Driven Development (TDD)**
   - Write failing test first
   - Implement code to make test pass
   - Refactor while keeping tests green

3. **Commit Standards**
   - Use conventional commits: `feat(scope): description`
   - Branch naming: `phase-{X}-module-{Y}-{feature}`

4. **Quality Gates**
   - All tests must pass before commit
   - Minimum 90% test coverage required
   - No type errors allowed
   - Security review required for changes

## Docker Setup

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Next Steps

1. **Phase 1 - Core CRM** (Months 1-3)
   - Authentication & Authorization
   - Lead Management
   - Customer Management
   - Contact Management
   - Basic Dashboard

2. Choose a module and start development!

For detailed specifications, see [Documentation/README.md](./Documentation/README.md)
