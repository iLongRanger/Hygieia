import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getJwtSecret, jwtConfig } from '../config/jwt';
import { prisma } from './prisma';

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

  return normalizeToken(socket.handshake.headers.authorization);
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

  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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
  });

  return io;
}

export function emitToUser<T>(userId: string, event: string, payload: T): void {
  if (!io) {
    return;
  }

  io.to(getUserRoom(userId)).emit(event, payload);
}

