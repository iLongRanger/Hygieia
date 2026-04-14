import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api, { extractApiErrorMessage } from '../../lib/api';
import { Shield } from 'lucide-react';

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [challengeRequired, setChallengeRequired] = useState(false);
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
      const response = await api.post('/auth/set-password/challenge', { token });
      const result = response.data.data as
        | { required: true; challengeId: string; maskedEmail: string };

      setChallengeRequired(true);
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

    requestVerificationCode();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (challengeRequired && !verificationCode.trim()) {
      setError('Verification code is required');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/set-password', {
        token,
        password,
        challengeId,
        code: verificationCode.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Failed to set password. The link may have expired.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-surface-500 dark:text-surface-400">This password setup link is invalid.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <div className="w-full max-w-md rounded-xl bg-surface-900 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Password Set!</h1>
          <p className="text-surface-500 dark:text-surface-400 mb-6">Your account is ready. You can now log in.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950">
      <div className="w-full max-w-md rounded-xl bg-surface-900 p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Set Your Password</h1>
        <p className="text-surface-500 dark:text-surface-400 mb-6">Choose a password to activate your Hygieia portal account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {challengeRequired && (
            <>
                <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
                We sent a verification code to <span className="font-medium">{maskedEmail}</span>.
                </div>
              <Input
                label="Verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
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
                onClick={requestVerificationCode}
                isLoading={sendingCode}
              >
                Resend verification code
              </Button>
            </>
          )}
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" isLoading={loading} className="w-full">
            {challengeRequired ? 'Verify and set password' : 'Set Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
