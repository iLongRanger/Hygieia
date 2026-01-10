import { Application } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { requestIdMiddleware, errorHandler, notFoundHandler } from '../middleware';

export function createTestApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestIdMiddleware);

  return app;
}

export function setupTestRoutes(app: Application, router: any, path: string) {
  app.use(path, router);
  app.use(notFoundHandler);
  app.use(errorHandler);
}

export const mockAuthMiddleware = (userId = 'test-user-id', role = 'owner') => {
  return (req: any, _res: any, next: any) => {
    req.user = {
      sub: userId,
      email: 'test@example.com',
      role,
    };
    next();
  };
};
