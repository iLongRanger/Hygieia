# Hygieia - Commercial Cleaning Management System

A comprehensive single-tenant web application for managing commercial cleaning operations, customer relationships, proposals, contracts, and day-to-day facility management tasks.

## Overview

Hygieia is a modern web application designed specifically for commercial cleaning businesses to streamline their operations from lead generation to service delivery and billing.

## Key Features

### 🏢 **CRM & Sales Management**
- Lead tracking and pipeline management
- Customer account management
- Contact management and communication history
- Opportunity tracking with probability scoring
- Lead source analytics

### 📍 **Facility Management**
- Customer facility profiles and specifications
- Area categorization (offices, restrooms, kitchens, etc.)
- Facility condition assessments
- Access instructions and special requirements
- Square footage tracking and pricing parameters

### 📋 **Task & Operations Management**
- Customizable task templates
- Daily/weekly/monthly cleaning schedules
- Work order generation and assignment
- Task completion tracking and verification
- Staff assignment and time tracking

### 💰 **Estimating & Proposals**
- Automated quote generation based on facility specifications
- Multiple pricing models (hourly, square foot, fixed)
- Proposal template management
- Digital proposal delivery and e-signatures

### 📊 **Reporting & Analytics**
- Business performance dashboards
- Revenue and profitability tracking
- Customer retention metrics
- Staff productivity reports
- Service completion analytics

### 🔧 **System Administration**
- User role management (Owner, Admin, Manager, Staff)
- System configuration and settings
- Data backup and recovery
- Audit trails and activity logs

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with component library
- **State Management**: Zustand or Redux Toolkit
- **UI Components**: Headless UI + custom components
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts or Chart.js
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 14+ with Prisma ORM
- **Authentication**: JWT with bcrypt
- **Validation**: Zod schemas
- **File Storage**: Local filesystem or S3-compatible
- **Email**: Nodemailer or Resend
- **Caching**: Redis (optional)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (production)
- **Process Manager**: PM2
- **Monitoring**: Custom health checks + logging
- **CI/CD**: GitHub Actions
- **Deployment**: Single server or cloud instance

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)
- Docker & Docker Compose (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hygieia
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies
   npm install
   ```

3. **Set up environment variables**
    ```bash
    cp .env.example .env
    # Edit .env with your configuration
    ```

4. **Set up the database**
   ```bash
   # Run database migrations
   npm run db:migrate
   
   # Seed with sample data (optional)
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Admin Dashboard: http://localhost:3000/admin

## Development Workflow

### Project Structure
```
hygieia/
├── apps/
│   ├── web/                 # React frontend application
│   └── api/                 # Express.js backend application
├── packages/
│   ├── shared/              # Shared utilities and types
│   ├── ui/                  # Reusable UI components
│   └── database/            # Database schemas and migrations
├── docs/                    # Documentation
├── scripts/                 # Build and deployment scripts
└── docker-compose.yml       # Local development setup
```

### Development Commands
```bash
# Development
npm run dev                  # Start both frontend and backend
npm run dev:web             # Start frontend only
npm run dev:api             # Start backend only

# Database
npm run db:migrate          # Run migrations
npm run db:seed            # Seed database
npm run db:reset           # Reset database
npm run db:studio          # Open Prisma Studio

# Testing
npm run test               # Run all tests
npm run test:unit          # Run unit tests
npm run test:integration   # Run integration tests
npm run test:e2e          # Run E2E tests

# Build & Deploy
npm run build              # Build for production
npm run deploy            # Deploy to production
```

## Documentation

- [🏗️ Architecture Overview](./ARCHITECTURE.md)
- [📊 Data Model](./Complete_Data_Model.md)
- [🔐 Authentication Guide](./AUTHENTICATION.md)
- [🧪 Testing Strategy](./Testing_Strategy.md)
- [🔌 Security Implementation](./Security_Implementation_Guide.md)
- [📋 API Error Handling](./API_Error_Handling.md)
- [🔌 Integration Specifications](./Integration_Specifications.md)
- [🚀 Deployment Configuration](./Deployment_Configuration.md)
- [🤝 Contributing Guide](./CONTRIBUTING.md)

## Project Roadmap

### Phase 1: Core CRM (Months 1-3)
- [x] User authentication and authorization
- [x] Lead management system
- [x] Customer account management
- [x] Contact management
- [x] Basic dashboard and reporting

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
- [ ] QuickBooks integration (optional)

## Contributing

Please read our [Contributing Guide](./docs/CONTRIBUTING.md) before making contributions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- 📧 Email: support@hygieia.com
- 📖 Documentation: [docs/](./docs/)
- 🐛 Issues: [GitHub Issues](issues)

---

**Hygieia** - Streamlining commercial cleaning operations for business growth.