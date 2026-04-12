import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { KeyRound, Phone, Save, Shield, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  changeOwnPassword,
  getCurrentProfile,
  requestOwnPasswordChangeChallenge,
  updateCurrentProfile,
} from '../../lib/profile';
import { useAuthStore } from '../../stores/authStore';

const ProfilePage = () => {
  const setAuthUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingPasswordCode, setSendingPasswordCode] = useState(false);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: '',
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordChallengeId, setPasswordChallengeId] = useState<string | null>(null);
  const [passwordVerificationCode, setPasswordVerificationCode] = useState('');
  const [maskedPasswordPhone, setMaskedPasswordPhone] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getCurrentProfile();
        setProfile({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone || '',
          avatarUrl: data.avatarUrl || '',
        });
      } catch (error) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const updated = await updateCurrentProfile({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim() || null,
        avatarUrl: profile.avatarUrl.trim() || null,
      });

      setProfile((current) => ({
        ...current,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone || '',
        avatarUrl: updated.avatarUrl || '',
      }));
      setAuthUser({
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.roles?.[0]?.role.key || updated.role || 'cleaner',
        permissions: undefined,
        teamId: undefined,
      });
      toast.success('Profile updated');
    } catch (error) {
      const apiMessage =
        error instanceof AxiosError
          ? (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message
          : undefined;
      toast.error(apiMessage || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!passwordChallengeId) {
      try {
        setSendingPasswordCode(true);
        const challenge = await requestOwnPasswordChangeChallenge();
        setPasswordChallengeId(challenge.challengeId);
        setMaskedPasswordPhone(challenge.maskedPhone);
        setPasswordVerificationCode('');
        toast.success(`Verification code sent to ${challenge.maskedPhone}`);
      } catch (error) {
        const apiMessage =
          error instanceof AxiosError
            ? (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message
            : undefined;
        toast.error(apiMessage || 'Failed to send verification code');
      } finally {
        setSendingPasswordCode(false);
      }

      return;
    }

    if (!passwordVerificationCode.trim()) {
      toast.error('Verification code is required');
      return;
    }

    try {
      setChangingPassword(true);
      const result = await changeOwnPassword(
        passwords.currentPassword,
        passwords.newPassword,
        passwordChallengeId,
        passwordVerificationCode.trim()
      );
      toast.success(result.message);
      setPasswordChallengeId(null);
      setMaskedPasswordPhone('');
      setPasswordVerificationCode('');
      clearAuth();
      window.location.href = '/login';
    } catch (error) {
      const apiMessage =
        error instanceof AxiosError
          ? (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message
          : undefined;
      toast.error(apiMessage || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
          My Profile
        </h1>
        <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
          Manage your own account details and password without going through admin user management.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
              <UserIcon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
                Profile Details
              </h2>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                These fields are only for your own account.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Full Name"
              value={profile.fullName}
              onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))}
            />
            <Input label="Email" value={profile.email} disabled />
            <Input
              label="Phone"
              value={profile.phone}
              onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
              icon={<Phone className="h-5 w-5" />}
            />
            <Input
              label="Avatar URL"
              value={profile.avatarUrl}
              onChange={(event) => setProfile((current) => ({ ...current, avatarUrl: event.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} isLoading={savingProfile}>
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </Button>
          </div>
        </Card>

        <Card className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
                Change Password
              </h2>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Changing your password will sign you out so you can log in again securely.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwords.currentPassword}
              onChange={(event) =>
                setPasswords((current) => ({ ...current, currentPassword: event.target.value }))
              }
            />
            <Input
              label="New Password"
              type="password"
              value={passwords.newPassword}
              onChange={(event) =>
                setPasswords((current) => ({ ...current, newPassword: event.target.value }))
              }
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwords.confirmPassword}
              onChange={(event) =>
                setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))
              }
            />
            {passwordChallengeId && (
              <>
                <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
                  We sent a verification code to <span className="font-medium">{maskedPasswordPhone}</span>.
                </div>
                <Input
                  label="Verification Code"
                  value={passwordVerificationCode}
                  onChange={(event) => setPasswordVerificationCode(event.target.value)}
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
                  onClick={() => {
                    setPasswordChallengeId(null);
                    void handleChangePassword();
                  }}
                  isLoading={sendingPasswordCode}
                >
                  Resend Verification Code
                </Button>
              </>
            )}
          </div>

          <div className="rounded-lg border border-surface-200 bg-surface-100 p-4 text-sm text-surface-600 dark:border-surface-700 dark:bg-surface-800/50 dark:text-surface-300">
            Password policy: at least 8 characters, including uppercase, lowercase, and a number.
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              isLoading={changingPassword || sendingPasswordCode}
              disabled={
                !passwords.currentPassword ||
                !passwords.newPassword ||
                !passwords.confirmPassword
              }
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {passwordChallengeId ? 'Verify and Update Password' : 'Send Verification Code'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
