import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import {
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
} from './middleware';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import leadSourcesRoutes from './routes/leadSources';
import leadsRoutes from './routes/leads';
import accountsRoutes from './routes/accounts';
import contactsRoutes from './routes/contacts';
import opportunitiesRoutes from './routes/opportunities';
import facilitiesRoutes from './routes/facilities';
import areaTypesRoutes from './routes/areaTypes';
import areasRoutes from './routes/areas';
import taskTemplatesRoutes from './routes/taskTemplates';
import facilityTasksRoutes from './routes/facilityTasks';
import pricingRulesRoutes from './routes/pricingRules';
import pricingOverridesRoutes from './routes/pricingOverrides';
import proposalsRoutes from './routes/proposals';
import contractsRoutes from './routes/contracts';

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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/lead-sources', leadSourcesRoutes);
app.use('/api/v1/leads', leadsRoutes);
app.use('/api/v1/accounts', accountsRoutes);
app.use('/api/v1/contacts', contactsRoutes);
app.use('/api/v1/opportunities', opportunitiesRoutes);
app.use('/api/v1/facilities', facilitiesRoutes);
app.use('/api/v1/area-types', areaTypesRoutes);
app.use('/api/v1/areas', areasRoutes);
app.use('/api/v1/task-templates', taskTemplatesRoutes);
app.use('/api/v1/facility-tasks', facilityTasksRoutes);
app.use('/api/v1/pricing-rules', pricingRulesRoutes);
app.use('/api/v1/pricing-overrides', pricingOverridesRoutes);
app.use('/api/v1/proposals', proposalsRoutes);
app.use('/api/v1/contracts', contractsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

export default app;
