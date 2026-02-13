import { io, Socket } from 'socket.io-client';
import type { Notification } from '../types/crm';

type NotificationCreatedPayload = {
  notification: Notification;
  unreadCount: number;
};

type NotificationUpdatedPayload = {
  notification: Notification;
  unreadCount: number;
};

type NotificationAllReadPayload = {
  markedCount: number;
  unreadCount: number;
};

const EVENT_CREATED = 'notification-created';
const EVENT_UPDATED = 'notification-updated';
const EVENT_ALL_READ = 'notification-all-read';

const eventBus = new EventTarget();
let socket: Socket | null = null;
let listenersBound = false;

function isTestMode(): boolean {
  return import.meta.env.MODE === 'test';
}

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

function getRealtimeBaseUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  if (/^https?:\/\//.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/v1\/?$/, '');
  }

  return window.location.origin;
}

function getSocket(): Socket | null {
  if (isTestMode()) {
    return null;
  }

  if (socket) {
    return socket;
  }

  socket = io(getRealtimeBaseUrl(), {
    autoConnect: false,
    withCredentials: true,
    transports: ['websocket'],
    auth: (cb: (data: { token: string | null }) => void) => {
      cb({ token: getAccessToken() });
    },
  });

  if (!listenersBound) {
    socket.on('connect_error', (error) => {
      if (error.message === 'Unauthorized') {
        socket?.disconnect();
      }
    });

    socket.on('notification:created', (payload: NotificationCreatedPayload) => {
      eventBus.dispatchEvent(new CustomEvent(EVENT_CREATED, { detail: payload }));
    });

    socket.on('notification:updated', (payload: NotificationUpdatedPayload) => {
      eventBus.dispatchEvent(new CustomEvent(EVENT_UPDATED, { detail: payload }));
    });

    socket.on('notification:all-read', (payload: NotificationAllReadPayload) => {
      eventBus.dispatchEvent(new CustomEvent(EVENT_ALL_READ, { detail: payload }));
    });

    listenersBound = true;
  }

  return socket;
}

export function connectNotificationsRealtime(): void {
  const instance = getSocket();
  if (!instance) {
    return;
  }

  if (!instance.connected) {
    instance.connect();
  }
}

export function disconnectNotificationsRealtime(): void {
  if (!socket) {
    return;
  }

  socket.disconnect();
}

export function subscribeNotificationCreated(
  handler: (payload: NotificationCreatedPayload) => void
): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<NotificationCreatedPayload>).detail);
  };

  eventBus.addEventListener(EVENT_CREATED, listener);
  return () => eventBus.removeEventListener(EVENT_CREATED, listener);
}

export function subscribeNotificationUpdated(
  handler: (payload: NotificationUpdatedPayload) => void
): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<NotificationUpdatedPayload>).detail);
  };

  eventBus.addEventListener(EVENT_UPDATED, listener);
  return () => eventBus.removeEventListener(EVENT_UPDATED, listener);
}

export function subscribeNotificationAllRead(
  handler: (payload: NotificationAllReadPayload) => void
): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<NotificationAllReadPayload>).detail);
  };

  eventBus.addEventListener(EVENT_ALL_READ, listener);
  return () => eventBus.removeEventListener(EVENT_ALL_READ, listener);
}
