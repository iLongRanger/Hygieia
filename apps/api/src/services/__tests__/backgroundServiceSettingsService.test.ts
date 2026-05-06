const mockBackgroundServiceRunLog = {
  create: jest.fn(),
  deleteMany: jest.fn(),
  findMany: jest.fn(),
};

const mockWarn = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    backgroundServiceRunLog: mockBackgroundServiceRunLog,
  },
}));

jest.mock('../../lib/logger', () => ({
  __esModule: true,
  default: {
    warn: mockWarn,
  },
}));

import { createBackgroundServiceRunLog } from '../backgroundServiceSettingsService';

describe('backgroundServiceSettingsService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    mockBackgroundServiceRunLog.create.mockResolvedValue({});
    mockBackgroundServiceRunLog.deleteMany.mockResolvedValue({ count: 0 });
    mockBackgroundServiceRunLog.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    delete process.env.BACKGROUND_SERVICE_LOG_RETENTION_DAYS;
    delete process.env.BACKGROUND_SERVICE_LOG_RETENTION_LIMIT_PER_SERVICE;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('creates a run log and prunes old and excess logs for the service', async () => {
    process.env.BACKGROUND_SERVICE_LOG_RETENTION_DAYS = '30';
    process.env.BACKGROUND_SERVICE_LOG_RETENTION_LIMIT_PER_SERVICE = '10';
    mockBackgroundServiceRunLog.findMany.mockResolvedValue([{ id: 'old-log-1' }, { id: 'old-log-2' }]);

    await createBackgroundServiceRunLog('job_alerts', {
      status: 'success',
      summary: 'Checked upcoming jobs',
      details: { inspected: 3 },
      startedAt: new Date('2026-05-06T11:59:00.000Z'),
      endedAt: new Date('2026-05-06T12:00:00.000Z'),
    });

    expect(mockBackgroundServiceRunLog.create).toHaveBeenCalledWith({
      data: {
        serviceKey: 'job_alerts',
        status: 'success',
        summary: 'Checked upcoming jobs',
        details: { inspected: 3 },
        startedAt: new Date('2026-05-06T11:59:00.000Z'),
        endedAt: new Date('2026-05-06T12:00:00.000Z'),
      },
    });
    expect(mockBackgroundServiceRunLog.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        serviceKey: 'job_alerts',
        createdAt: { lt: new Date('2026-04-06T12:00:00.000Z') },
      },
    });
    expect(mockBackgroundServiceRunLog.findMany).toHaveBeenCalledWith({
      where: { serviceKey: 'job_alerts' },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      skip: 10,
    });
    expect(mockBackgroundServiceRunLog.deleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: { in: ['old-log-1', 'old-log-2'] },
      },
    });
  });

  it('does not run count pruning when the service is within the retention limit', async () => {
    await createBackgroundServiceRunLog('reminders', {
      status: 'failed',
      summary: 'Reminder scan failed',
      startedAt: new Date('2026-05-06T11:59:00.000Z'),
      endedAt: new Date('2026-05-06T12:00:00.000Z'),
    });

    expect(mockBackgroundServiceRunLog.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockBackgroundServiceRunLog.findMany).toHaveBeenCalledWith({
      where: { serviceKey: 'reminders' },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      skip: 250,
    });
  });

  it('logs prune failures without failing run log creation', async () => {
    const pruneError = new Error('database unavailable');
    mockBackgroundServiceRunLog.findMany.mockRejectedValue(pruneError);

    await createBackgroundServiceRunLog('recurring_jobs_autogen', {
      status: 'success',
      summary: 'Generated recurring jobs',
      startedAt: new Date('2026-05-06T11:59:00.000Z'),
      endedAt: new Date('2026-05-06T12:00:00.000Z'),
    });

    expect(mockBackgroundServiceRunLog.create).toHaveBeenCalledTimes(1);
    expect(mockWarn).toHaveBeenCalledWith(
      'Failed to prune background service run logs for "recurring_jobs_autogen"',
      pruneError
    );
  });
});
