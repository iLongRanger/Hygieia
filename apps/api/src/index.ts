import './env.js';

import express, { Application } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import {
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
} from './middleware';
import logger from './lib/logger';
import { globalRateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import leadSourcesRoutes from './routes/leadSources';
import leadsRoutes from './routes/leads';
import appointmentsRoutes from './routes/appointments';
import notificationsRoutes from './routes/notifications';
import accountsRoutes from './routes/accounts';
import contactsRoutes from './routes/contacts';
import facilitiesRoutes from './routes/facilities';
import areaTypesRoutes from './routes/areaTypes';
import areasRoutes from './routes/areas';
import taskTemplatesRoutes from './routes/taskTemplates';
import facilityTasksRoutes from './routes/facilityTasks';
import pricingSettingsRoutes from './routes/pricingSettings';
import fixtureTypesRoutes from './routes/fixtureTypes';
import areaTemplatesRoutes from './routes/areaTemplates';
import proposalsRoutes from './routes/proposals';
import proposalTemplatesRoutes from './routes/proposalTemplates';
import contractsRoutes from './routes/contracts';
import dashboardRoutes from './routes/dashboard';
import teamsRoutes from './routes/teams';
import globalSettingsRoutes from './routes/globalSettings';
import jobsRoutes from './routes/jobs';
import inspectionsRoutes from './routes/inspections';
import inspectionTemplatesRoutes from './routes/inspectionTemplates';
import timeTrackingRoutes from './routes/timeTracking';
import invoicesRoutes from './routes/invoices';
import publicProposalsRoutes from './routes/publicProposals';
import publicInvoicesRoutes from './routes/publicInvoices';
import publicContractsRoutes from './routes/publicContracts';
import quotationsRoutes from './routes/quotations';
import publicQuotationsRoutes from './routes/publicQuotations';
import oneTimeServiceCatalogRoutes from './routes/oneTimeServiceCatalog';
import { initializeRealtime } from './lib/realtime';
import { startReminderScheduler } from './services/reminderScheduler';
import { startRecurringJobScheduler } from './services/recurringJobScheduler';
import { startJobAlertScheduler } from './services/jobAlertScheduler';

const app: Application = express();
const PORT = process.env.PORT || 3001;

function parseConfiguredOrigins(): string[] {
  return (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

const allowedOrigins = parseConfiguredOrigins();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);
app.use(globalRateLimiter);

app.get('/health', (req, res) => {
  const basicInfo = { status: 'ok', timestamp: new Date().toISOString() };

  // Detailed info only for internal requests with valid secret
  const internalSecret = process.env.INTERNAL_SECRET;
  const isInternal = internalSecret && req.headers['x-internal-request'] === internalSecret;

  if (isInternal) {
    res.json({
      ...basicInfo,
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } else {
    res.json(basicInfo);
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/lead-sources', leadSourcesRoutes);
app.use('/api/v1/leads', leadsRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/accounts', accountsRoutes);
app.use('/api/v1/contacts', contactsRoutes);
app.use('/api/v1/facilities', facilitiesRoutes);
app.use('/api/v1/area-types', areaTypesRoutes);
app.use('/api/v1/areas', areasRoutes);
app.use('/api/v1/task-templates', taskTemplatesRoutes);
app.use('/api/v1/facility-tasks', facilityTasksRoutes);
app.use('/api/v1/pricing-settings', pricingSettingsRoutes);
app.use('/api/v1/fixture-types', fixtureTypesRoutes);
app.use('/api/v1/area-templates', areaTemplatesRoutes);
app.use('/api/v1/proposals', proposalsRoutes);
app.use('/api/v1/proposal-templates', proposalTemplatesRoutes);
app.use('/api/v1/contracts', contractsRoutes);
app.use('/api/v1/teams', teamsRoutes);
app.use('/api/v1/settings/global', globalSettingsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/inspections', inspectionsRoutes);
app.use('/api/v1/inspection-templates', inspectionTemplatesRoutes);
app.use('/api/v1/time-tracking', timeTrackingRoutes);
app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/quotations', quotationsRoutes);
app.use('/api/v1/one-time-service-catalog', oneTimeServiceCatalogRoutes);

// Public routes (no auth middleware)
app.use('/api/v1/public/proposals', publicProposalsRoutes);
app.use('/api/v1/public/contracts', publicContractsRoutes);
app.use('/api/v1/public/invoices', publicInvoicesRoutes);
app.use('/api/v1/public/quotations', publicQuotationsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);
initializeRealtime(httpServer);
startReminderScheduler();
startRecurringJobScheduler();
startJobAlertScheduler();

httpServer.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
});

export default app;
