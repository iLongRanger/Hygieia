import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import TeamsList from '../teams/TeamsList';
import type { Team } from '../../types/team';

const listTeamsMock = vi.fn();
const createTeamMock = vi.fn();
const updateTeamMock = vi.fn();
const archiveTeamMock = vi.fn();
const restoreTeamMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('../../lib/teams', () => ({
  listTeams: (...args: unknown[]) => listTeamsMock(...args),
  createTeam: (...args: unknown[]) => createTeamMock(...args),
  updateTeam: (...args: unknown[]) => updateTeamMock(...args),
  archiveTeam: (...args: unknown[]) => archiveTeamMock(...args),
  restoreTeam: (...args: unknown[]) => restoreTeamMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const activeTeam: Team = {
  id: 'team-1',
  name: 'Alpha Team',
  contactName: 'Alice',
  contactEmail: 'alice@example.com',
  contactPhone: '555-000-1111',
  notes: 'Core team',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
};

const archivedTeam: Team = {
  ...activeTeam,
  id: 'team-2',
  name: 'Legacy Team',
  archivedAt: new Date().toISOString(),
  isActive: false,
};

describe('TeamsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTeamsMock.mockResolvedValue({
      data: [activeTeam],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    createTeamMock.mockResolvedValue({ id: 'team-3' });
    updateTeamMock.mockResolvedValue({ ...activeTeam, name: 'Alpha Team Updated' });
    archiveTeamMock.mockResolvedValue({ ...activeTeam, archivedAt: new Date().toISOString() });
    restoreTeamMock.mockResolvedValue({ ...archivedTeam, archivedAt: null, isActive: true });
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders teams from API', async () => {
    render(<TeamsList />);

    expect(await screen.findByText('Alpha Team')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('validates required team name before submit', async () => {
    const user = userEvent.setup();
    render(<TeamsList />);

    await user.click(screen.getByRole('button', { name: /new team/i }));
    await user.click(await screen.findByRole('button', { name: /create team/i }));

    expect(createTeamMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('Team name is required');
  });

  it('creates a team with trimmed payload values', async () => {
    const user = userEvent.setup();
    render(<TeamsList />);

    await user.click(screen.getByRole('button', { name: /new team/i }));
    await user.type(await screen.findByLabelText(/team name/i), '  Bravo Team  ');
    await user.type(screen.getByLabelText(/contact name/i), '  Bob  ');
    await user.type(screen.getByLabelText(/contact email/i), '  bob@example.com  ');
    await user.type(screen.getByLabelText(/contact phone/i), '  555-222-3333  ');
    const notesField = screen.getByRole('dialog').querySelector('textarea');
    expect(notesField).not.toBeNull();
    await user.type(notesField as HTMLTextAreaElement, '  Night shift  ');
    await user.click(screen.getByRole('button', { name: /create team/i }));

    await waitFor(() => {
      expect(createTeamMock).toHaveBeenCalledWith({
        name: 'Bravo Team',
        contactName: 'Bob',
        contactEmail: 'bob@example.com',
        contactPhone: '555-222-3333',
        notes: 'Night shift',
        isActive: true,
      });
    });
  });

  it('updates an existing team', async () => {
    const user = userEvent.setup();
    render(<TeamsList />);

    await user.click(await screen.findByRole('button', { name: /^edit$/i }));
    const teamNameInput = await screen.findByLabelText(/team name/i);
    await user.clear(teamNameInput);
    await user.type(teamNameInput, 'Alpha Team Updated');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateTeamMock).toHaveBeenCalledWith(
        'team-1',
        expect.objectContaining({ name: 'Alpha Team Updated' })
      );
    });
  });

  it('archives and restores teams', async () => {
    const user = userEvent.setup();
    listTeamsMock
      .mockResolvedValueOnce({
        data: [activeTeam],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        data: [archivedTeam],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        data: [{ ...archivedTeam, archivedAt: null, isActive: true }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

    render(<TeamsList />);

    await user.click(await screen.findByRole('button', { name: /archive/i }));
    await waitFor(() => {
      expect(archiveTeamMock).toHaveBeenCalledWith('team-1');
    });

    await user.click(await screen.findByRole('button', { name: /restore/i }));
    await waitFor(() => {
      expect(restoreTeamMock).toHaveBeenCalledWith('team-2');
    });
  });
});
