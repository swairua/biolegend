import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  roles?: string[];
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({
  children,
  permission,
  roles,
  fallback,
  requireAuth = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission, profile, loading } = useAuth();

  // TEMPORARY BYPASS: Skip all protection checks to view changes
  const BYPASS_PROTECTION = true;

  if (BYPASS_PROTECTION) {
    return <>{children}</>;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-4">
              Please sign in to access this page.
            </p>
            <Button onClick={() => window.location.reload()}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role-based access
  if (roles && profile && !roles.includes(profile.role)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-2">
              You don't have the required role to access this page.
            </p>
            <p className="text-sm text-muted-foreground">
              Required: {roles.join(' or ')} | Your role: {profile?.role}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check permission-based access
  if (permission && !hasPermission(permission)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Insufficient Permissions</h3>
            <p className="text-muted-foreground mb-2">
              You don't have permission to access this feature.
            </p>
            <p className="text-sm text-muted-foreground">
              Required permission: {permission}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User account status checks
  if (profile?.status === 'inactive') {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Lock className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Account Inactive</h3>
            <p className="text-muted-foreground">
              Your account has been deactivated. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile?.status === 'pending') {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Account Pending</h3>
            <p className="text-muted-foreground">
              Your account is pending approval. Please wait for an administrator to activate it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component for protecting routes
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  protection: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...protection}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook for conditional rendering based on permissions
export function usePermissionCheck() {
  const { hasPermission, profile, isAuthenticated } = useAuth();

  const checkPermission = (permission: string) => {
    return isAuthenticated && hasPermission(permission);
  };

  const checkRole = (roles: string | string[]) => {
    if (!isAuthenticated || !profile) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(profile.role);
  };

  const checkMultiple = (permissions: string[]) => {
    return permissions.every(permission => hasPermission(permission));
  };

  const checkAny = (permissions: string[]) => {
    return permissions.some(permission => hasPermission(permission));
  };

  return {
    checkPermission,
    checkRole,
    checkMultiple,
    checkAny,
    isAdmin: profile?.role === 'admin',
    isAccountant: profile?.role === 'accountant',
    isStockManager: profile?.role === 'stock_manager',
    isUser: profile?.role === 'user',
  };
}
