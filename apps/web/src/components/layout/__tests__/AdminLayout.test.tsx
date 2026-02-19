import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/test-utils';
import AdminLayout from '../AdminLayout';

let isAuthenticated = true;

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      isAuthenticated,
    }),
}));

vi.mock('../../../stores/toastStore', () => ({
  useToastStore: () => ({
    toasts: [],
    removeToast: vi.fn(),
  }),
}));

vi.mock('../Sidebar', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="sidebar">{isOpen ? 'open' : 'closed'}</div>
  ),
}));

vi.mock('../Header', () => ({
  default: ({ onMenuClick }: { onMenuClick: () => void }) => (
    <button onClick={onMenuClick}>Open Menu</button>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div>Outlet Content</div>,
    Navigate: ({ to }: { to: string }) => <div>Redirect:{to}</div>,
  };
});

describe('AdminLayout', () => {
  it('redirects to login when not authenticated', () => {
    isAuthenticated = false;

    render(<AdminLayout />);

    expect(screen.getByText('Redirect:/login')).toBeInTheDocument();
  });

  it('opens sidebar overlay from header menu action', async () => {
    const user = userEvent.setup();
    isAuthenticated = true;

    render(<AdminLayout />);

    expect(screen.getByTestId('sidebar')).toHaveTextContent('closed');
    await user.click(screen.getByRole('button', { name: /open menu/i }));

    expect(screen.getByTestId('sidebar')).toHaveTextContent('open');
    expect(screen.getByText('Outlet Content')).toBeInTheDocument();
  });
});
