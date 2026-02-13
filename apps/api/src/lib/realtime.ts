import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getJwtSecret, jwtConfig } from '../config/jwt';
import { prisma } from './prisma';
import logger from './logger';

interface JwtPayload {
  sub: string;
}

let io: Server | null = null;

export const REALTIME_EVENTS = {
  notificationCreated: 'notification:created',
  notificationUpdated: 'notification:updated',
  notificationAllRead: 'notification:all-read',
} as const;

function getUserRoom(userId: string): string {
  return `user:${userId}`;
}

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

function normalizeToken(rawToken: unknown): string | null {
  if (typeof rawToken !== 'string' || rawToken.length === 0) {
    return null;
  }

  if (rawToken.startsWith('Bearer ')) {
    return rawToken.slice(7);
  }

  return rawToken;
}

function getHandshakeToken(socket: Socket): string | null {
  const authToken = normalizeToken(socket.handshake.auth?.token);
  if (authToken) {
    return authToken;
  }

  const headerToken = normalizeToken(socket.handshake.headers.authorization);
  if (headerToken) {
    return headerToken;
  }

  return null;
}

async function authenticateSocket(socket: Socket): Promise<string | null> {
  try {
    const token = getHandshakeToken(socket);
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      clockTolerance: jwtConfig.clockTolerance,
    }) as JwtPayload;

    if (!decoded?.sub) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, status: true },
    });

    if (!user || user.status !== 'active') {
      return null;
    }

    return user.id;
  } catch {
    return null;
  }
}

export function initializeRealtime(server: HttpServer): Server {
  if (io) {
    return io;
  }

  const allowedOrigins = parseConfiguredOrigins();

  io = new Server(server, {
    cors: {
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
    },
  });

  io.use(async (socket, next) => {
    const userId = await authenticateSocket(socket);
    if (!userId) {
      next(new Error('Unauthorized'));
      return;
    }

    socket.data.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(getUserRoom(userId));
    socket.emit('realtime:ready', { userId });

    socket.on('disconnect', () => {
      logger.debug('Realtime client disconnected', {
        userId,
        socketId: socket.id,
      });
    });
  });

  logger.info('Realtime server initialized');
  return io;
}

export function emitToUser<T>(userId: string, event: string, payload: T): void {
  if (!io) {
    return;
  }

  io.to(getUserRoom(userId)).emit(event, payload);
}
