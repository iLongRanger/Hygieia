import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? '');
    if (message.includes('React Router Future Flag Warning')) {
      return;
    }
    originalConsoleWarn(...args);
  });

  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? '');
    if (
      message.includes('not wrapped in act(...)') ||
      message.includes('Warning: An update to')
    ) {
      return;
    }
    originalConsoleError(...args);
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
