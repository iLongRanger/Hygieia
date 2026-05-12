import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { assignContractTeam } from '../contracts';

vi.mock('../api', () => ({
  default: {
    patch: vi.fn(),
  },
}));

const apiPatch = api.patch as unknown as ReturnType<typeof vi.fn>;

describe('contracts api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiPatch.mockResolvedValue({ data: { data: { id: 'contract-1' } } });
  });

  it('omits subcontractor percentage when assigning hourly compensation', async () => {
    await assignContractTeam(
      'contract-1',
      null,
      '22222222-2222-2222-2222-222222222222',
      undefined,
      null,
      'hourly'
    );

    expect(apiPatch).toHaveBeenCalledWith('/contracts/contract-1/team', {
      teamId: null,
      assignedToUserId: '22222222-2222-2222-2222-222222222222',
      compensationType: 'hourly',
      effectivityDate: null,
    });
  });

  it('includes subcontractor percentage when assigning percentage compensation', async () => {
    await assignContractTeam(
      'contract-1',
      '11111111-1111-1111-1111-111111111111',
      null,
      'standard',
      60,
      'percentage'
    );

    expect(apiPatch).toHaveBeenCalledWith('/contracts/contract-1/team', {
      teamId: '11111111-1111-1111-1111-111111111111',
      assignedToUserId: null,
      compensationType: 'percentage',
      effectivityDate: null,
      subcontractorTier: 'standard',
      subcontractorPercentage: 60,
    });
  });
});
