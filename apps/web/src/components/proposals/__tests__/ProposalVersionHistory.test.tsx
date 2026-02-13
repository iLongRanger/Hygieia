import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/test-utils';
import ProposalVersionHistory from '../ProposalVersionHistory';

const getProposalVersionsMock = vi.fn();
const getProposalVersionMock = vi.fn();

vi.mock('../../../lib/proposals', () => ({
  getProposalVersions: (...args: unknown[]) => getProposalVersionsMock(...args),
  getProposalVersion: (...args: unknown[]) => getProposalVersionMock(...args),
}));

describe('ProposalVersionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when there are no versions', async () => {
    getProposalVersionsMock.mockResolvedValue([]);

    const { container } = render(<ProposalVersionHistory proposalId="proposal-1" />);

    await waitFor(() => {
      expect(getProposalVersionsMock).toHaveBeenCalledWith('proposal-1');
    });
    expect(screen.queryByText('Version History')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('loads and renders snapshot details when a version is expanded', async () => {
    const user = userEvent.setup();
    getProposalVersionsMock.mockResolvedValue([
      {
        id: 'version-2',
        versionNumber: 2,
        changeReason: 'Updated service terms',
        createdAt: '2026-02-10T12:00:00.000Z',
        changedByUser: {
          id: 'user-1',
          fullName: 'Admin User',
          email: 'admin@example.com',
        },
      },
    ]);
    getProposalVersionMock.mockResolvedValue({
      id: 'version-2',
      versionNumber: 2,
      snapshot: {
        status: 'sent',
        totalAmount: '1234.56',
        proposalServices: [{ id: 'service-1' }],
        proposalItems: [{ id: 'item-1' }, { id: 'item-2' }],
      },
      changeReason: 'Updated service terms',
      createdAt: '2026-02-10T12:00:00.000Z',
      changedByUser: {
        id: 'user-1',
        fullName: 'Admin User',
        email: 'admin@example.com',
      },
    });

    render(<ProposalVersionHistory proposalId="proposal-1" />);

    const versionToggle = await screen.findByRole('button', { name: /v2/i });
    await user.click(versionToggle);

    await waitFor(() => {
      expect(getProposalVersionMock).toHaveBeenCalledWith('proposal-1', 2);
    });
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('sent')).toBeInTheDocument();
    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    expect(screen.getByText('1 service(s)')).toBeInTheDocument();
    expect(screen.getByText('2 line item(s)')).toBeInTheDocument();
  });

  it('collapses version details when toggled again', async () => {
    const user = userEvent.setup();
    getProposalVersionsMock.mockResolvedValue([
      {
        id: 'version-1',
        versionNumber: 1,
        changeReason: null,
        createdAt: '2026-02-10T12:00:00.000Z',
        changedByUser: {
          id: 'user-1',
          fullName: 'Admin User',
          email: 'admin@example.com',
        },
      },
    ]);
    getProposalVersionMock.mockResolvedValue({
      id: 'version-1',
      versionNumber: 1,
      snapshot: {
        status: 'draft',
        totalAmount: '10',
        proposalServices: [],
        proposalItems: [],
      },
      changeReason: null,
      createdAt: '2026-02-10T12:00:00.000Z',
      changedByUser: {
        id: 'user-1',
        fullName: 'Admin User',
        email: 'admin@example.com',
      },
    });

    render(<ProposalVersionHistory proposalId="proposal-1" />);

    const versionToggle = await screen.findByRole('button', { name: /v1/i });
    await user.click(versionToggle);
    await screen.findByText('Status');

    await user.click(versionToggle);
    await waitFor(() => {
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
    });
  });
});
