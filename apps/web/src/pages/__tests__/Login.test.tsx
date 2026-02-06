import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import Login from '../Login';
import { useAuthStore } from '../../stores/authStore';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Login', () => {
  const loginMock = vi.fn();

  beforeEach(() => {
    navigateMock.mockReset();
    loginMock.mockReset();
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: loginMock,
      logout: vi.fn(),
      setUser: vi.fn(),
      setToken: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
    });
  });

  it('submits credentials and navigates on success', async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<Login />);

    await user.type(screen.getByLabelText(/email address/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin@example.com', 'password');
      expect(navigateMock).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message on failed login', async () => {
    loginMock.mockRejectedValue(new Error('Invalid'));
    const user = userEvent.setup();

    render(<Login />);

    await user.type(screen.getByLabelText(/email address/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
