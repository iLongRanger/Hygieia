# Contributing to Hygieia

Thank you for your interest in contributing to Hygieia! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose
- Git

### Setting Up Development Environment

```bash
# 1. Clone the repository
git clone https://github.com/iLongRanger/Hygieia.git
cd Hygieia

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Set up database
npm run db:migrate
npm run db:seed  # Optional: seed with test data

# 5. Start development servers
npm run dev
```

## Development Workflow

### Documentation-Driven Development (DDD)

Hygieia follows Documentation-Driven Development. All features must be documented before implementation:

1. **Document First**: Write specification in Documentation/ folder or create/update documentation
2. **Review**: Get approval on documentation before coding
3. **Implement**: Write code to match documented specification
4. **Update**: Keep documentation in sync with implementation

### Test-Driven Development (TDD)

We follow the Red-Green-Refactor cycle:

1. **Red**: Write a failing test
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

### Commit Standards

We use conventional commits:

```bash
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Scope**:
- `api`: Backend API changes
- `web`: Frontend web changes
- `database`: Database/migrations
- `docs`: Documentation
- `shared`: Shared packages
- `ui`: Shared UI components

**Examples**:
```bash
feat(api): add lead creation endpoint
fix(web): resolve validation error on login form
docs: update authentication guide
refactor(database): optimize customer query
test(api): add unit tests for lead service
```

## Project Structure

```
hygieia/
├── apps/
│   ├── api/              # Express.js backend
│   └── web/              # React frontend
├── packages/
│   ├── database/          # Prisma schema and client
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Shared utilities
│   └── ui/                # Shared UI components
├── Documentation/         # Project documentation
├── tests/                # Integration and E2E tests
└── scripts/              # Build and deployment scripts
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- All functions must have return types
- Avoid `any` type - use `unknown` instead
- Use interfaces for object shapes
- Leverage type inference where appropriate

### Code Style

- Follow ESLint rules
- Use Prettier for formatting
- Use meaningful variable and function names
- Keep functions small and focused (< 50 lines)
- Maximum file length: 300 lines

### Naming Conventions

**Variables/Functions**: camelCase
```typescript
const userName = 'John';
function getUserById() {}
```

**Classes/Interfaces**: PascalCase
```typescript
class UserService {}
interface UserData {}
```

**Constants**: UPPER_SNAKE_CASE
```typescript
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = '...';
```

**Files**: kebab-case for folders/files, PascalCase for components
```
components/
  user-profile/
  UserProfile.tsx
  UserProfile.module.css
```

## Testing

### Test Coverage

- Minimum 90% coverage for all code
- 100% coverage for business logic and critical paths
- Unit tests for all functions and classes
- Integration tests for all API endpoints
- E2E tests for critical user journeys

### Test Organization

```
apps/api/src/
├── __tests__/
│   ├── unit/
│   │   ├── auth.test.ts
│   │   └── leads.test.ts
│   └── integration/
│       ├── auth.integration.test.ts
│       └── leads.integration.test.ts

apps/web/src/
├── __tests__/
│   ├── components/
│   │   ├── LeadForm.test.tsx
│   │   └── Dashboard.test.tsx
│   └── pages/
│       ├── LoginPage.test.tsx
│       └── DashboardPage.test.tsx
```

### Writing Tests

```typescript
// Good test example
describe('Leads Service', () => {
  beforeEach(async () => {
    await db.truncate();
  });

  describe('create', () => {
    it('should create a lead with valid data', async () => {
      // Arrange
      const leadData = {
        company_name: 'Test Company',
        contact_name: 'John Doe',
        primary_email: 'john@test.com'
      };

      // Act
      const result = await leadsService.create(leadData, mockUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.company_name).toBe('Test Company');
      expect(result.contact_name).toBe('John Doe');
    });

    it('should throw validation error with invalid email', async () => {
      // Arrange
      const leadData = {
        company_name: 'Test Company',
        contact_name: 'John Doe',
        primary_email: 'invalid-email'
      };

      // Act & Assert
      await expect(leadsService.create(leadData, mockUser))
        .rejects
        .toThrow('Invalid email format');
    });
  });
});
```

## Pull Request Process

### Before Submitting

1. **Create feature branch**: `phase-1-module-leads-create`
2. **Write tests**: Ensure tests pass
3. **Update documentation**: Update relevant documentation
4. **Run linting**: `npm run lint` and `npm run lint:fix`
5. **Type check**: `npm run typecheck`
6. **Run tests**: `npm run test` with coverage
7. **Build**: `npm run build` - ensure no build errors

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass locally (`npm run test`)
- [ ] Test coverage meets minimum requirements (90%)
- [ ] No linting errors (`npm run lint`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation is updated if applicable
- [ ] Commits follow conventional commit format
- [ ] PR description explains the what and why

### Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Closes #123

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review of code completed
- [ ] Comments added to complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Code Review Process

### For Reviewers

1. **Check quality gates**: Tests, linting, type checking all pass
2. **Review documentation**: Is the feature well documented?
3. **Test functionality**: Manually test the feature if possible
4. **Check for edge cases**: Does the code handle error cases?
5. **Verify security**: Are there any security concerns?
6. **Check performance**: Will this impact performance?

### Approval Criteria

- All quality gates passed
- At least one approval from project maintainer
- No blocking issues raised
- Documentation is complete
- Tests are adequate

## Branching Strategy

### Branch Names

- `main`: Production-ready code
- `develop`: Integration branch for features
- `phase-{X}-module-{Y}-{feature}`: Feature branches
- `bugfix/{module}-{issue}`: Bug fix branches
- `hotfix/{module}-{issue}`: Critical hotfixes

### Release Process

1. Create release branch from `develop`: `release/v0.1.0`
2. Update CHANGELOG.md with release notes
3. Tag the release: `git tag -a v0.1.0 -m "Release v0.1.0"`
4. Merge release branch to `main` and `develop`
5. Push tags to remote

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to reproduce**: Step-by-step instructions
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Environment**: OS, browser version, Node.js version
6. **Screenshots**: If applicable
7. **Logs**: Relevant error logs

### Feature Requests

When requesting features, please include:

1. **Use case**: Why is this feature needed?
2. **Proposed solution**: How should it work?
3. **Alternatives considered**: What other approaches were considered?
4. **Priority**: Low/Medium/High
5. **Mockups**: If applicable

## Questions & Support

- **GitHub Discussions**: Use for questions and general discussions
- **GitHub Issues**: Use for bug reports and feature requests
- **Documentation**: Check existing docs first
- **Search**: Search existing issues before creating new ones

## Recognition

Contributors who significantly contribute to Hygieia will be recognized in:
- CONTRIBUTORS.md file
- Release notes in CHANGELOG.md
- Annual summary posts

## License

By contributing to Hygieia, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Hygieia! 💚
