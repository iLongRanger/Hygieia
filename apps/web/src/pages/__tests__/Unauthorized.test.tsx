import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import Unauthorized from '../Unauthorized';

let mockLocationState: Record<string, unknown> | null = null;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  );

  return {
    ...actual,
    useLocation: () => ({ state: mockLocationState }),
  };
});

describe('Unauthorized page', () => {
  beforeEach(() => {
    mockLocationState = null;
  });

  it('renders access denied copy and dashboard link', () => {
    render(<Unauthorized />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(
      screen.getByText('Your account does not have permission to view this page.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to Dashboard' })
    ).toHaveAttribute('href', '/');
  });

  it('does not render missing permissions text when state is empty', () => {
    mockLocationState = { from: '/users' };

    render(<Unauthorized />);

    expect(screen.queryByText(/Missing permissions:/i)).not.toBeInTheDocument();
  });

  it('renders missing permissions only in development mode', () => {
    mockLocationState = {
      from: '/settings/global',
      missingPermissions: ['settings_write', 'users_write'],
    };

    render(<Unauthorized />);

    const missingText = screen.queryByText(
      /Missing permissions: settings_write, users_write/i
    );

    if (import.meta.env.DEV) {
      expect(missingText).toBeInTheDocument();
    } else {
      expect(missingText).not.toBeInTheDocument();
    }
  });
});
