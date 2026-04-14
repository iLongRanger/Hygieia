import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { requestPasswordTokenChallenge, resetPassword } from '../../lib/profile';
import { extractApiErrorMessage } from '../../lib/api';
import { Shield } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const requestVerificationCode = async () => {
    if (!token) {
      return;
    }

    setSendingCode(true);
    setError('');

    try {
      const result = await requestPasswordTokenChallenge(token);
      setChallengeId(result.challengeId);
      setMaskedEmail(result.maskedEmail);
      setVerificationCode('');
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Failed to send a verification code.'));
    } finally {
      setSendingCode(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    void requestVerificationCode();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('This reset link is invalid.');
      return;
    }

    if (!challengeId || !verificationCode.trim()) {
      setError('Verification code is required.');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(token, password, challengeId, verificationCode.trim());
      setSuccess(true);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Failed to reset password. The link may have expired.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <div className="text-center text-white">
          <h1 className="mb-2 text-2xl font-bold">Invalid Link</h1>
          <p className="text-surface-400">This password reset link is invalid.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <div className="w-full max-w-md rounded-xl bg-surface-900 p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">Password Reset</h1>
          <p className="mb-6 text-surface-400">Your password has been updated. You can sign in with it now.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950">
      <div className="w-full max-w-md rounded-xl bg-surface-900 p-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Choose a new password</h1>
        <p className="mb-6 text-surface-400">
          Set a new password to regain access to your Hygieia account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
            We sent a verification code to <span className="font-medium">{maskedEmail}</span>.
          </div>
          <Input
            label="Verification code"
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value)}
            placeholder="Enter the 6-digit code"
            icon={<Shield className="h-5 w-5" />}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => void requestVerificationCode()}
            isLoading={sendingCode}
          >
            Resend verification code
          </Button>
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" isLoading={loading} className="w-full">
            Reset Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
