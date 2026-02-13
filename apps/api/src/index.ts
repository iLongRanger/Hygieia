import './env.js';

import express, { Application } from 'express';
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
import publicProposalsRoutes from './routes/publicProposals';
import publicContractsRoutes from './routes/publicContracts';

const app: Application = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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

// Public routes (no auth middleware)
app.use('/api/v1/public/proposals', publicProposalsRoutes);
app.use('/api/v1/public/contracts', publicContractsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
});

export default app;
