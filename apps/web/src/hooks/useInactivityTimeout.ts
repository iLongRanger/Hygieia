import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE = 60 * 1000; // warn 1 minute before logout
const THROTTLE_MS = 30 * 1000; // update lastActivity at most every 30s
const STORAGE_KEY = 'lastActivity';

function getLastActivity(): number {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : Date.now();
}

function setLastActivity(time: number): void {
  sessionStorage.setItem(STORAGE_KEY, String(time));
}

export function useInactivityTimeout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const warningShownRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  const scheduleTimers = useCallback(
    (lastActivity: number) => {
      clearTimers();
      warningShownRef.current = false;

      const elapsed = Date.now() - lastActivity;
      const timeUntilLogout = INACTIVITY_TIMEOUT - elapsed;
      const timeUntilWarning = INACTIVITY_TIMEOUT - WARNING_BEFORE - elapsed;

      if (timeUntilLogout <= 0) {
        // Already past timeout
        logout();
        navigate('/login?reason=inactivity', { replace: true });
        return;
      }

      if (timeUntilWarning > 0) {
        warningTimerRef.current = setTimeout(() => {
          warningShownRef.current = true;
          toast.warning(
            'Session expiring soon',
            'You will be logged out in 1 minute due to inactivity.'
          );
        }, timeUntilWarning);
      } else if (!warningShownRef.current) {
        // Past warning threshold but not yet timed out — show warning immediately
        warningShownRef.current = true;
        toast.warning(
          'Session expiring soon',
          'You will be logged out in 1 minute due to inactivity.'
        );
      }

      logoutTimerRef.current = setTimeout(() => {
        logout();
        navigate('/login?reason=inactivity', { replace: true });
      }, timeUntilLogout);
    },
    [clearTimers, logout, navigate]
  );

  const resetActivity = useCallback(() => {
    const now = Date.now();

    // Throttle storage writes
    if (now - lastUpdateRef.current < THROTTLE_MS) return;

    lastUpdateRef.current = now;
    setLastActivity(now);
    scheduleTimers(now);
  }, [scheduleTimers]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialize from sessionStorage or set now
    const lastActivity = getLastActivity();
    const elapsed = Date.now() - lastActivity;

    // If no stored value or it's unreasonably old, reset to now
    if (elapsed < 0 || elapsed > INACTIVITY_TIMEOUT * 2) {
      const now = Date.now();
      setLastActivity(now);
      scheduleTimers(now);
    } else {
      scheduleTimers(lastActivity);
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const;
    events.forEach((event) => window.addEventListener(event, resetActivity, { passive: true }));

    return () => {
      clearTimers();
      events.forEach((event) => window.removeEventListener(event, resetActivity));
    };
  }, [isAuthenticated, resetActivity, scheduleTimers, clearTimers]);
}
