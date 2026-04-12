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
  const verifyLoginCodeMock = vi.fn();

  beforeEach(() => {
    navigateMock.mockReset();
    loginMock.mockReset();
    verifyLoginCodeMock.mockReset();
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: loginMock,
      verifyLoginCode: verifyLoginCodeMock,
      logout: vi.fn(),
      setUser: vi.fn(),
      setToken: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
    });
  });

  it('submits credentials and navigates on success', async () => {
    loginMock.mockResolvedValue({
      challengeId: 'challenge-1',
      maskedEmail: 'ad***@example.com',
      expiresInSeconds: 600,
    });
    verifyLoginCodeMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<Login />);

    await user.type(screen.getByLabelText(/email address/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/we sent a verification code to/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify and sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin@example.com', 'password');
      expect(verifyLoginCodeMock).toHaveBeenCalledWith('challenge-1', '123456');
      expect(navigateMock).toHaveBeenCalledWith('/app');
    });
  });

  it('shows error message on failed login', async () => {
    loginMock.mockRejectedValue(new Error('Invalid'));
    const user = userEvent.setup();

    render(<Login />);

    await user.type(screen.getByLabelText(/email address/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/unable to start email verification/i)).toBeInTheDocument();
  });
});
