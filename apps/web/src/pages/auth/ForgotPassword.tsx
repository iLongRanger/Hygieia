import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { AxiosError } from 'axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { requestPasswordReset } from '../../lib/profile';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err) {
      const apiMessage =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
          : undefined;
      setError(apiMessage || 'Failed to send reset instructions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-100 via-surface-50 to-primary-50 p-4 dark:from-surface-900 dark:via-surface-900 dark:to-surface-800">
      <Card className="w-full max-w-md space-y-6 animate-fade-in-up">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
            Account Access
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
            Reset your password
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Enter your email and we&apos;ll send reset instructions if your account exists.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-success-200 bg-success-50 p-4 text-sm text-success-700 dark:border-success-900/50 dark:bg-success-900/20 dark:text-success-300">
              If an account exists for that email, a password reset link has been sent.
            </div>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-surface-200 px-4 py-3 text-sm font-medium text-surface-700 transition hover:bg-surface-100 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              label="Email address"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              icon={<Mail className="h-5 w-5" />}
              required
            />

            {error ? (
              <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-900/50 dark:bg-error-900/20 dark:text-error-300">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" isLoading={loading}>
              Send Reset Link
            </Button>

            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-surface-500 transition hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
