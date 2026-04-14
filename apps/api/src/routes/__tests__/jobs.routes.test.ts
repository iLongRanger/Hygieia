import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as jobService from '../../services/jobService';
import * as jobSettlementService from '../../services/jobSettlementService';

const mockAuthUser: { id: string; role: string; teamId?: string } = {
  id: 'user-1',
  role: 'owner',
};

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = mockAuthUser;
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/jobService');
jest.mock('../../services/jobSettlementService');

describe('Job Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthUser.role = 'owner';
    delete mockAuthUser.teamId;
    app = createTestApp();
    const routes = (await import('../jobs')).default;
    setupTestRoutes(app, routes, '/api/v1/jobs');
  });

  it('POST /:id/complete-initial-clean should mark initial clean from a job', async () => {
    (jobService.completeInitialCleanForJob as jest.Mock).mockResolvedValue({ id: 'job-1' });

    const response = await request(app)
      .post('/api/v1/jobs/job-1/complete-initial-clean')
      .send({})
      .expect(200);

    expect(response.body.data.id).toBe('job-1');
    expect(jobService.completeInitialCleanForJob).toHaveBeenCalledWith('job-1', 'user-1');
  });

  it('POST /:id/complete-initial-clean should reject subcontractor users', async () => {
    mockAuthUser.role = 'subcontractor';

    await request(app)
      .post('/api/v1/jobs/job-1/complete-initial-clean')
      .send({})
      .expect(422);

    expect(jobService.completeInitialCleanForJob).not.toHaveBeenCalled();
  });

  it('GET /:id should reject subcontractors outside the assigned team', async () => {
    mockAuthUser.role = 'subcontractor';
    mockAuthUser.teamId = 'team-1';
    (jobService.getJobById as jest.Mock).mockResolvedValue({
      id: 'job-1',
      assignedTeam: { id: 'team-2', name: 'Other Team' },
      assignedToUser: null,
    });

    await request(app)
      .get('/api/v1/jobs/job-1')
      .expect(422);
  });

  it('GET /:id should allow subcontractors for jobs assigned to their team', async () => {
    mockAuthUser.role = 'subcontractor';
    mockAuthUser.teamId = 'team-1';
    (jobService.getJobById as jest.Mock).mockResolvedValue({
      id: 'job-1',
      assignedTeam: { id: 'team-1', name: 'My Team' },
      assignedToUser: null,
    });

    const response = await request(app)
      .get('/api/v1/jobs/job-1')
      .expect(200);

    expect(response.body.data.id).toBe('job-1');
  });

  it('POST /:id/settlement-explanation should submit an explanation for an assigned cleaner', async () => {
    mockAuthUser.role = 'cleaner';
    (jobService.getJobById as jest.Mock).mockResolvedValue({
      id: 'job-1',
      account: { id: 'account-1' },
      assignedTeam: null,
      assignedToUser: { id: 'user-1' },
    });
    (jobSettlementService.submitJobSettlementExplanation as jest.Mock).mockResolvedValue({
      id: 'review-1',
      status: 'needs_review',
    });

    const response = await request(app)
      .post('/api/v1/jobs/job-1/settlement-explanation')
      .send({ explanation: 'Door was locked when I arrived.' })
      .expect(200);

    expect(response.body.data).toEqual({
      id: 'review-1',
      status: 'needs_review',
    });
    expect(jobSettlementService.submitJobSettlementExplanation).toHaveBeenCalledWith(
      'job-1',
      'user-1',
      { explanation: 'Door was locked when I arrived.' }
    );
  });

  it('POST /:id/review-settlement should reject cleaner users', async () => {
    mockAuthUser.role = 'cleaner';

    await request(app)
      .post('/api/v1/jobs/job-1/review-settlement')
      .send({ decision: 'approved_both' })
      .expect(422);

    expect(jobSettlementService.reviewJobSettlement).not.toHaveBeenCalled();
  });

  it('POST /:id/review-settlement should allow owner users to review a settlement', async () => {
    (jobService.getJobById as jest.Mock).mockResolvedValue({
      id: 'job-1',
      account: { id: 'account-1' },
      assignedTeam: null,
      assignedToUser: { id: 'user-2' },
    });
    (jobSettlementService.reviewJobSettlement as jest.Mock).mockResolvedValue({
      id: 'review-1',
      status: 'approved_both',
    });

    const response = await request(app)
      .post('/api/v1/jobs/job-1/review-settlement')
      .send({ decision: 'approved_both', reviewNotes: 'Confirmed manually.' })
      .expect(200);

    expect(response.body.data).toEqual({
      id: 'review-1',
      status: 'approved_both',
    });
    expect(jobSettlementService.reviewJobSettlement).toHaveBeenCalledWith('job-1', 'user-1', {
      decision: 'approved_both',
      reviewNotes: 'Confirmed manually.',
    });
  });
});
