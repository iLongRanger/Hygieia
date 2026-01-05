# Hygieia - Architecture Overview

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Browser                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              React Application                       │   │
│  │  - Dashboard & CRM                                 │   │
│  │  - Facility Management                             │   │
│  │  - Task Management                                │   │
│  │  - Reporting                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                 Application Server                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Express.js API                        │   │
│  │  - Authentication Middleware                       │   │
│  │  - Route Handlers                                 │   │
│  │  - Business Logic                                 │   │
│  │  - Validation Layer                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                 │
                                 │ SQL
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Application Data                        │   │
│  │  - Users, Leads, Customers                        │   │
│  │  - Facilities, Areas, Tasks                        │   │
│  │  - Proposals, Work Orders                         │   │
│  │  - Audit Logs                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    External Services                      │
│  • Email Service (Nodemailer/Resend)                     │
│  • File Storage (Local/S3)                              │
│  • Optional: QuickBooks API                              │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Architecture

#### React Application Structure
```
apps/web/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/             # Base UI components (Button, Input, etc.)
│   │   ├── forms/          # Form-specific components
│   │   └── layouts/        # Layout components
│   ├── pages/              # Page components and routes
│   │   ├── dashboard/
│   │   ├── crm/
│   │   ├── facilities/
│   │   ├── tasks/
│   │   └── reports/
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API service layer
│   ├── store/              # State management (Zustand)
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript type definitions
```

#### Key Frontend Technologies
- **React 18+**: Modern React with hooks and concurrent features
- **TypeScript**: Type safety and better developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation
- **TanStack Query**: Server state management and caching
- **Zustand**: Client state management
- **Recharts**: Data visualization

### Backend Architecture

#### Express.js API Structure
```
apps/api/
├── src/
│   ├── controllers/        # Route handlers
│   ├── services/          # Business logic layer
│   ├── models/            # Data access layer (Prisma)
│   ├── middleware/        # Express middleware
│   ├── routes/            # Route definitions
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript types
│   ├── config/            # Configuration files
│   └── validation/        # Schema definitions
```

#### Key Backend Technologies
- **Node.js 18+**: JavaScript runtime
- **Express.js**: Web application framework
- **TypeScript**: Type safety
- **Prisma**: ORM and database toolkit
- **JWT**: Authentication tokens
- **bcrypt**: Password hashing
- **Zod**: Runtime validation
- **Nodemailer/Resend**: Email sending
- **Multer**: File upload handling

### Database Architecture

#### PostgreSQL Database
- **Version**: PostgreSQL 14+
- **ORM**: Prisma
- **Migrations**: Database version control
- **Seeding**: Initial data population

#### Database Schema Organization
- **Users & Authentication**: User accounts, roles, sessions
- **CRM Module**: Leads, customers, contacts, opportunities
- **Facility Management**: Facilities, areas, specifications
- **Operations**: Tasks, work orders, schedules
- **Estimating**: Proposals, pricing rules, templates
- **System**: Audit logs, settings, file references

## Data Flow Architecture

### Authentication Flow
```
1. User Login Request → API
2. API validates credentials
3. API generates JWT token
4. Token returned to client
5. Client stores token (localStorage/httpOnly cookie)
6. Client includes token in subsequent requests
7. API middleware validates token on protected routes
8. User context attached to request
```

### API Request Flow
```
Client Request
    ↓
Express Router
    ↓
Authentication Middleware
    ↓
Validation Middleware
    ↓
Route Controller
    ↓
Business Logic Service
    ↓
Database Layer (Prisma)
    ↓
Database (PostgreSQL)
    ↓
Response Processing
    ↓
Client Response
```

### State Management Flow
```
Client Action
    ↓
Component State
    ↓
API Service Call (TanStack Query)
    ↓
Server API Request
    ↓
Database Operation
    ↓
API Response
    ↓
Cache Update (TanStack Query)
    ↓
Component Re-render
```

## Security Architecture

### Authentication & Authorization
- **JWT-based Authentication**: Stateless token authentication
- **Role-based Access Control**: User roles with permission levels
- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: Token expiration and refresh

### Data Security
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Prevention**: Input sanitization and output encoding
- **CSRF Protection**: CSRF tokens for state-changing requests

### Infrastructure Security
- **HTTPS Only**: SSL/TLS encryption in production
- **Environment Variables**: Secure configuration management
- **Rate Limiting**: Request rate limiting per IP/user
- **Security Headers**: Security-focused HTTP headers

## Performance Architecture

### Frontend Performance
- **Code Splitting**: Route-based component splitting
- **Lazy Loading**: Dynamic imports for large components
- **Image Optimization**: Next.js Image optimization
- **Caching**: Browser caching and CDN distribution

### Backend Performance
- **Database Indexing**: Optimized database queries
- **Connection Pooling**: Efficient database connections
- **Caching**: Redis for frequently accessed data
- **Compression**: Gzip compression for responses

### Monitoring & Optimization
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Comprehensive error logging
- **Health Checks**: Application health monitoring
- **Analytics**: User behavior and system performance

## Development Architecture

### Development Environment
- **Docker Compose**: Local development setup
- **Hot Reloading**: Development servers with auto-reload
- **Database Migrations**: Version-controlled schema changes
- **Seed Data**: Consistent development data

### Testing Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Unit Tests    │    │ Integration     │    │   E2E Tests     │
│                 │    │ Tests           │    │                 │
│ • Functions     │    │ • API Endpoints │    │ • User Flows    │
│ • Components    │    │ • Database      │    │ • Critical      │
│ • Hooks         │    │   Operations    │    │   Paths         │
│ • Utils         │    │ • Middleware    │    │ • UI Testing    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Code Quality
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Husky**: Git hooks for quality gates
- **Conventional Commits**: Standardized commit messages

## Deployment Architecture

### Production Deployment
```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                          │
│                        (Nginx)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌─────────────────┐        ┌─────────────────┐
│   Web Server    │        │   API Server    │
│  (React Build)  │        │  (Express.js)   │
│   Nginx/Apache  │        │      PM2        │
└─────────────────┘        └─────────────────┘
                                     │
                                     ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │    Database     │
                        └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Supporting Services                     │
│  • Redis (Caching)                                        │
│  • File Storage (Local/S3)                               │
│  • Email Service (Nodemailer/Resend)                      │
│  • Monitoring & Logging                                   │
└─────────────────────────────────────────────────────────────┘
```

### Infrastructure Options

#### Single Server Deployment
- **Initial Deployment**: Single server with Docker Compose
- **Database**: PostgreSQL on same server
- **Reverse Proxy**: Nginx for both frontend and backend
- **Process Management**: PM2 for Node.js processes

#### Cloud Deployment Options
- **VPS**: DigitalOcean, Linode, Vultr
- **PaaS**: Heroku, Render
- **Container**: AWS ECS, Google Cloud Run
- **Full Cloud**: AWS, Google Cloud, Azure

### CI/CD Pipeline
```
Git Push
    ↓
GitHub Actions
    ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Lint Check     │    │   Test Suite    │    │   Build Step    │
│                 │    │                 │    │                 │
│ • ESLint        │    │ • Unit Tests    │    │ • Frontend      │
│ • Prettier      │    │ • Integration   │    │   Build         │
│ • TypeScript    │    │   Tests         │    │ • Backend       │
│   Check         │    │ • E2E Tests     │    │   Build         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                   │
                                   ▼
                           ┌─────────────────┐
                           │   Deploy to     │
                           │   Production    │
                           └─────────────────┘
```

## Scalability Considerations

### Horizontal Scaling
- **Load Balancing**: Multiple API server instances
- **Database Scaling**: Read replicas for scaling
- **Caching Layer**: Redis for reducing database load
- **CDN**: Static asset distribution

### Performance Optimization
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient resource usage
- **Async Processing**: Background job processing
- **Monitoring**: Performance metrics and alerting

### Future Growth Paths
1. **Multi-server deployment** with load balancing
2. **Database clustering** for high availability
3. **Microservices architecture** for modular scaling
4. **Cloud-native deployment** with Kubernetes

This architecture provides a solid foundation for a commercial cleaning management system while maintaining simplicity for a single-tenant application.