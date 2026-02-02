import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { verifyToken } from '../../lib/auth';
import { logger } from '../../lib/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

/**
 * ProtectedRoute component that:
 * 1. Checks if user is authenticated
 * 2. Validates token with backend (optional, on mount)
 * 3. Verifies user has required roles (if specified)
 * 4. Redirects to login if not authenticated
 * 5. Redirects to unauthorized if missing required role
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
}) => {
  const location = useLocation();
  const { isAuthenticated, user, token, clearAuth } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    let mounted = true;

    const validateAuth = async () => {
      // No token means not authenticated
      if (!token) {
        if (mounted) {
          setIsValid(false);
          setIsValidating(false);
        }
        return;
      }

      try {
        // Verify token with backend
        const valid = await verifyToken();

        if (mounted) {
          setIsValid(valid);

          if (!valid) {
            logger.info('Token validation failed, clearing auth', {
              component: 'ProtectedRoute',
            });
            clearAuth();
          }
        }
      } catch (error) {
        logger.error('Token validation error', {
          component: 'ProtectedRoute',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (mounted) {
          setIsValid(false);
          clearAuth();
        }
      } finally {
        if (mounted) {
          setIsValidating(false);
        }
      }
    };

    validateAuth();

    return () => {
      mounted = false;
    };
  }, [token, clearAuth]);

  // Show loading spinner while validating
  if (isValidating) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-50 dark:bg-surface-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated or token invalid
  if (!isAuthenticated || !isValid) {
    logger.debug('Redirecting to login - not authenticated', {
      component: 'ProtectedRoute',
      path: location.pathname,
    });

    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRoles && requiredRoles.length > 0 && user) {
    const userRole = user.role;

    if (!requiredRoles.includes(userRole)) {
      logger.warn('Access denied - insufficient permissions', {
        component: 'ProtectedRoute',
        userRole,
        requiredRoles: requiredRoles.join(', '),
        path: location.pathname,
      });

      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
