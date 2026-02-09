import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import ProposalTemplatesPage from '../settings/ProposalTemplatesPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const listTemplatesMock = vi.fn();
const createTemplateMock = vi.fn();
const updateTemplateMock = vi.fn();
const archiveTemplateMock = vi.fn();
const restoreTemplateMock = vi.fn();
const deleteTemplateMock = vi.fn();

vi.mock('../../lib/proposalTemplates', () => ({
  listTemplates: (...args: unknown[]) => listTemplatesMock(...args),
  createTemplate: (...args: unknown[]) => createTemplateMock(...args),
  updateTemplate: (...args: unknown[]) => updateTemplateMock(...args),
  archiveTemplate: (...args: unknown[]) => archiveTemplateMock(...args),
  restoreTemplate: (...args: unknown[]) => restoreTemplateMock(...args),
  deleteTemplate: (...args: unknown[]) => deleteTemplateMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const template = {
  id: 'template-1',
  name: 'Default Terms',
  termsAndConditions: 'Payment due in 30 days.',
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  createdByUser: {
    id: 'user-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
  },
};

describe('ProposalTemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTemplatesMock.mockResolvedValue([template]);
    createTemplateMock.mockResolvedValue({ ...template, id: 'template-2', name: 'New Template' });
    updateTemplateMock.mockResolvedValue(template);
    archiveTemplateMock.mockResolvedValue({ ...template, archivedAt: new Date().toISOString() });
    restoreTemplateMock.mockResolvedValue({ ...template, archivedAt: null });
    deleteTemplateMock.mockResolvedValue(undefined);
  });

  it('loads and renders templates', async () => {
    render(<ProposalTemplatesPage />);

    expect(await screen.findByText('Default Terms')).toBeInTheDocument();
    expect(listTemplatesMock).toHaveBeenCalledWith(false);
  });

  it('creates a template from modal form', async () => {
    const user = userEvent.setup();
    render(<ProposalTemplatesPage />);

    await screen.findByText('Default Terms');
    await user.click(screen.getByRole('button', { name: /new template/i }));
    await user.type(screen.getByLabelText(/template name/i), 'Night Shift Terms');
    await user.type(
      screen.getByPlaceholderText(/enter the terms and conditions text/i),
      'Service window is after 8 PM.'
    );
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(createTemplateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Night Shift Terms',
          termsAndConditions: 'Service window is after 8 PM.',
        })
      );
    });
  });

  it('archives template after confirmation', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { container } = render(<ProposalTemplatesPage />);

    await screen.findByText('Default Terms');
    const archiveButton = container.querySelector('button.text-orange-400') as HTMLButtonElement;
    await user.click(archiveButton);

    await waitFor(() => {
      expect(archiveTemplateMock).toHaveBeenCalledWith('template-1');
    });
    confirmSpy.mockRestore();
  });
});
