import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const runJobNearingEndNoCheckInAlertCycleMock = jest.fn();
const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();
const loggerErrorMock = jest.fn();
const getBackgroundServiceSettingMock = jest.fn();
const markBackgroundServiceRunStartMock = jest.fn();
const markBackgroundServiceRunSuccessMock = jest.fn();
const markBackgroundServiceRunFailureMock = jest.fn();
const createBackgroundServiceRunLogMock = jest.fn();

jest.mock('../jobService', () => ({
  runJobNearingEndNoCheckInAlertCycle: (...args: unknown[]) =>
    runJobNearingEndNoCheckInAlertCycleMock(...args),
}));

jest.mock('../../lib/logger', () => ({
  __esModule: true,
  default: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

jest.mock('../backgroundServiceSettingsService', () => ({
  getBackgroundServiceSetting: (...args: unknown[]) =>
    getBackgroundServiceSettingMock(...args),
  markBackgroundServiceRunStart: (...args: unknown[]) =>
    markBackgroundServiceRunStartMock(...args),
  markBackgroundServiceRunSuccess: (...args: unknown[]) =>
    markBackgroundServiceRunSuccessMock(...args),
  markBackgroundServiceRunFailure: (...args: unknown[]) =>
    markBackgroundServiceRunFailureMock(...args),
  createBackgroundServiceRunLog: (...args: unknown[]) =>
    createBackgroundServiceRunLogMock(...args),
}));

const originalEnv = { ...process.env };

describe('jobAlertScheduler', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
    runJobNearingEndNoCheckInAlertCycleMock.mockResolvedValue({
      checked: 0,
      alerted: 0,
      notifications: 0,
      settlementReviewsTriggered: 0,
    });
    markBackgroundServiceRunStartMock.mockResolvedValue(undefined);
    markBackgroundServiceRunSuccessMock.mockResolvedValue(undefined);
    markBackgroundServiceRunFailureMock.mockResolvedValue(undefined);
    createBackgroundServiceRunLogMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
    process.env = { ...originalEnv };
  });

  it('does not start when background service setting is disabled', async () => {
    process.env.NODE_ENV = 'development';
    getBackgroundServiceSettingMock.mockResolvedValue({
      enabled: false,
      intervalMs: 900000,
    });

    const { startJobAlertScheduler } = await import('../jobAlertScheduler');
    startJobAlertScheduler();

    // Allow the async configureJobAlertScheduler to resolve
    await jest.runAllTimersAsync();

    expect(runJobNearingEndNoCheckInAlertCycleMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith('Job alert scheduler disabled');
  });

  it('does not start when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';

    const { startJobAlertScheduler } = await import('../jobAlertScheduler');
    startJobAlertScheduler();

    await jest.runAllTimersAsync();

    expect(runJobNearingEndNoCheckInAlertCycleMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith('Job alert scheduler disabled');
  });

  it('starts scheduler and runs cycle when timeout fires', async () => {
    process.env.NODE_ENV = 'development';
    getBackgroundServiceSettingMock.mockResolvedValue({
      enabled: true,
      intervalMs: 900000,
    });

    const { startJobAlertScheduler } = await import('../jobAlertScheduler');
    startJobAlertScheduler();

    // Let configureJobAlertScheduler resolve (sets up setTimeout)
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.stringContaining('Starting job alert scheduler')
    );

    // The cycle hasn't run yet - it's on a setTimeout
    expect(runJobNearingEndNoCheckInAlertCycleMock).not.toHaveBeenCalled();

    // Advance timers to trigger the scheduled run
    jest.advanceTimersByTime(15 * 60 * 1000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(runJobNearingEndNoCheckInAlertCycleMock).toHaveBeenCalledTimes(1);
  });
});
