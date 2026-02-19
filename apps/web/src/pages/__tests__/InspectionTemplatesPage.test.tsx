import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import InspectionTemplatesPage from '../inspections/InspectionTemplatesPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const listInspectionTemplatesMock = vi.fn();
const createInspectionTemplateMock = vi.fn();
const updateInspectionTemplateMock = vi.fn();
const archiveInspectionTemplateMock = vi.fn();
const restoreInspectionTemplateMock = vi.fn();
const getInspectionTemplateMock = vi.fn();

vi.mock('../../lib/inspections', () => ({
  listInspectionTemplates: (...args: unknown[]) => listInspectionTemplatesMock(...args),
  createInspectionTemplate: (...args: unknown[]) => createInspectionTemplateMock(...args),
  updateInspectionTemplate: (...args: unknown[]) => updateInspectionTemplateMock(...args),
  archiveInspectionTemplate: (...args: unknown[]) => archiveInspectionTemplateMock(...args),
  restoreInspectionTemplate: (...args: unknown[]) => restoreInspectionTemplateMock(...args),
  getInspectionTemplate: (...args: unknown[]) => getInspectionTemplateMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const templateListItem = {
  id: 'tpl-1',
  name: 'Standard Office',
  description: 'Routine checks',
  facilityTypeFilter: null,
  contractId: null,
  createdAt: '2026-02-01T00:00:00.000Z',
  archivedAt: null,
  contract: null,
  createdByUser: { id: 'user-1', fullName: 'Owner User' },
  _count: { items: 2, inspections: 4 },
};

const detail = {
  ...templateListItem,
  createdByUserId: 'user-1',
  updatedAt: '2026-02-01T00:00:00.000Z',
  items: [
    { id: 'item-1', category: 'Lobby', itemText: 'Floors clean', sortOrder: 0, weight: 2 },
    { id: 'item-2', category: 'Lobby', itemText: 'Windows clean', sortOrder: 1, weight: 1 },
  ],
};

describe('InspectionTemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    listInspectionTemplatesMock.mockResolvedValue({
      data: [templateListItem],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    createInspectionTemplateMock.mockResolvedValue(detail);
    updateInspectionTemplateMock.mockResolvedValue(detail);
    archiveInspectionTemplateMock.mockResolvedValue(undefined);
    restoreInspectionTemplateMock.mockResolvedValue(undefined);
    getInspectionTemplateMock.mockResolvedValue(detail);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders templates list', async () => {
    render(<InspectionTemplatesPage />);

    expect(await screen.findByText('Inspection Templates')).toBeInTheDocument();
    expect(screen.getByText('Standard Office')).toBeInTheDocument();
  });

  it('validates create form requirements', async () => {
    const user = userEvent.setup();
    const toast = (await import('react-hot-toast')).default;

    render(<InspectionTemplatesPage />);
    await screen.findByText('Inspection Templates');

    await user.click(screen.getByRole('button', { name: /new template/i }));
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(toast.error).toHaveBeenCalledWith('Name and at least one item are required');
    expect(createInspectionTemplateMock).not.toHaveBeenCalled();
  });

  it('creates template with valid input', async () => {
    const user = userEvent.setup();
    render(<InspectionTemplatesPage />);

    await screen.findByText('Inspection Templates');
    await user.click(screen.getByRole('button', { name: /new template/i }));
    await user.type(screen.getByLabelText(/template name/i), 'Night Shift');
    await user.type(screen.getByPlaceholderText(/category/i), 'Restroom');
    await user.type(screen.getByPlaceholderText(/checklist item text/i), 'Supplies stocked');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(createInspectionTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Night Shift',
          items: [expect.objectContaining({ category: 'Restroom' })],
        })
      );
    });
  });

  it('expands template and shows detail items', async () => {
    const user = userEvent.setup();
    render(<InspectionTemplatesPage />);

    await screen.findByText('Standard Office');
    await user.click(screen.getByText('Standard Office'));

    await waitFor(() => {
      expect(getInspectionTemplateMock).toHaveBeenCalledWith('tpl-1');
    });
    expect(await screen.findByText('Floors clean')).toBeInTheDocument();
  });
});
