# Hygieia Architecture Diagram

This diagram reflects the current Hygieia architecture: a React web app, Express API, PostgreSQL/Prisma data layer, Redis-backed realtime/background support, public client links, and external services.

## Deployment View

```mermaid
flowchart TB
  subgraph Users["Users"]
    Admin["Owner / Admin / Manager"]
    Field["Cleaner / Subcontractor"]
    Client["Client / Public recipient"]
  end

  subgraph Edge["Public Internet / Domain"]
    AppDomain["Web App URL<br/>FRONTEND_URL / WEB_APP_URL"]
    ApiDomain["API URL<br/>/api/v1"]
  end

  subgraph Web["apps/web - React + Vite"]
    Router["React Router"]
    AuthStore["Zustand auth/session state"]
    ApiClient["Axios API client<br/>access token refresh"]
    Pages["CRM / Sales / Contracts / Ops / Finance UI"]
    PublicPages["Public token pages<br/>proposal / contract / invoice / quote"]
  end

  subgraph Api["apps/api - Express + TypeScript"]
    Express["Express API server"]
    Auth["Auth + JWT + refresh token"]
    RBAC["RBAC + ownership middleware"]
    Routes["Route modules<br/>accounts, proposals, contracts, jobs, finance, photos"]
    Services["Service layer<br/>business rules and workflows"]
    Schedulers["Background schedulers<br/>reminders, recurring jobs, job alerts, amendments"]
    Realtime["Socket.IO realtime notifications"]
  end

  subgraph Data["Data and State"]
    Postgres["PostgreSQL"]
    Prisma["Prisma Client + migrations"]
    Redis["Redis<br/>rate limits, realtime support, background coordination"]
  end

  subgraph Storage["File / Object Storage"]
    R2["Cloudflare R2<br/>photo assets"]
  end

  subgraph External["External Services"]
    Resend["Resend email"]
    Twilio["Twilio SMS"]
    QuickBooks["QuickBooks<br/>future/accounting integration"]
    Maps["Geocoding provider"]
  end

  Admin --> AppDomain
  Field --> AppDomain
  Client --> AppDomain

  AppDomain --> Router
  Router --> Pages
  Router --> PublicPages
  Pages --> ApiClient
  PublicPages --> ApiClient
  ApiClient --> ApiDomain

  ApiDomain --> Express
  Express --> Auth
  Auth --> RBAC
  RBAC --> Routes
  Routes --> Services
  Services --> Prisma
  Prisma --> Postgres

  Express --> Realtime
  Realtime --> Redis
  Schedulers --> Services
  Schedulers --> Redis

  Services --> R2
  Services --> Resend
  Services --> Twilio
  Services --> QuickBooks
  Services --> Maps
```

## Application Module Flow

```mermaid
flowchart LR
  Lead["Lead"]
  Opportunity["Opportunity"]
  Account["Account<br/>commercial or residential"]
  ServiceLocation["Service Location<br/>facility/property unified"]
  Walkthrough["Appointment<br/>walkthrough / visit / inspection"]
  AreasTasks["Areas + Tasks"]
  Proposal["Proposal<br/>commercial / residential / specialized"]
  Contract["Contract + Amendments"]
  Jobs["Jobs"]
  Inspections["Inspections"]
  TimeTracking["Time Tracking"]
  Invoice["Invoice"]
  Payroll["Payroll"]
  Finance["Finance Reports"]

  Lead --> Opportunity
  Opportunity --> Account
  Account --> ServiceLocation
  ServiceLocation --> Walkthrough
  Walkthrough --> AreasTasks
  AreasTasks --> Proposal
  Proposal --> Contract
  Contract --> Jobs
  Jobs --> Inspections
  Jobs --> TimeTracking
  Jobs --> Invoice
  Jobs --> Payroll
  Invoice --> Finance
  Payroll --> Finance
```

## Public Link Flow

```mermaid
sequenceDiagram
  participant Admin as Admin user
  participant Web as Web app
  participant API as API server
  participant DB as PostgreSQL
  participant Email as Resend
  participant Client as Client

  Admin->>Web: Send proposal / contract / invoice
  Web->>API: POST send action
  API->>DB: Create hashed public token
  API->>API: Build URL from FRONTEND_URL / WEB_APP_URL
  API->>Email: Send public link
  Email->>Client: Email with tokenized URL
  Client->>Web: Open public URL
  Web->>API: GET public resource by token
  API->>DB: Validate token hash and load document
  API-->>Web: Public document payload
```

## Photo Upload Flow

```mermaid
sequenceDiagram
  participant User as Admin / field user
  participant Web as Web app
  participant API as API server
  participant DB as PostgreSQL
  participant R2 as Cloudflare R2

  User->>Web: Select photo on service location or appointment
  Web->>API: POST /api/v1/photos/upload-url
  API->>API: Check RBAC and ownership
  API->>DB: Create pending photo asset metadata
  API->>R2: Generate signed PUT URL
  API-->>Web: Upload URL + photo id
  Web->>R2: PUT image directly to R2
  Web->>API: PATCH /api/v1/photos/:id/complete
  API->>DB: Mark photo uploaded
```

## Runtime Responsibilities

| Layer | Responsibility |
| --- | --- |
| Web app | Authenticated UI, public document views, client-side routing, API calls |
| API app | Authentication, RBAC, ownership checks, workflows, public token validation |
| Services | Business logic for CRM, proposals, contracts, jobs, inspections, finance, photos |
| Prisma/PostgreSQL | System of record for accounts, service locations, tasks, proposals, contracts, jobs, invoices, payroll |
| Redis | Rate limiting, realtime support, background coordination |
| Cloudflare R2 | Object storage for service-location and appointment photos |
| Email/SMS | Client documents, reminders, verification, operational notifications |

## Deployment Notes

- `FRONTEND_URL` and `WEB_APP_URL` control generated public links.
- `VITE_API_BASE_URL` controls where the web app sends API requests when the API is on a separate domain.
- `CORS_ORIGIN` must include the deployed web domain.
- R2 uses account-level endpoint plus bucket name, not a bucket path in the endpoint.
- Background schedulers currently run from the API process.
