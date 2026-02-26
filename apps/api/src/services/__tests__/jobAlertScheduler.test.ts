import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const runJobNearingEndNoCheckInAlertCycleMock = jest.fn();
const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();
const loggerErrorMock = jest.fn();

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
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
    process.env = { ...originalEnv };
  });

  it('does not start when JOB_ALERTS_ENABLED is false', async () => {
    process.env.NODE_ENV = 'development';
    process.env.JOB_ALERTS_ENABLED = 'false';

    const { startJobAlertScheduler } = await import('../jobAlertScheduler');
    startJobAlertScheduler();

    expect(runJobNearingEndNoCheckInAlertCycleMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith('Job alert scheduler disabled');
  });

  it('starts scheduler, runs initial cycle, then runs on interval', async () => {
    process.env.NODE_ENV = 'development';
    process.env.JOB_ALERTS_ENABLED = 'true';
    process.env.JOB_ALERTS_INTERVAL_MS = '60000';

    const { startJobAlertScheduler } = await import('../jobAlertScheduler');
    startJobAlertScheduler();

    await Promise.resolve();
    expect(runJobNearingEndNoCheckInAlertCycleMock).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60000);
    await Promise.resolve();
    expect(runJobNearingEndNoCheckInAlertCycleMock).toHaveBeenCalledTimes(2);
  });
});
