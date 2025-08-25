import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedLogin } from '@/components/auth/EnhancedLogin';
import { AuthStateDebugWithNetwork } from '@/components/debug/AuthStateDebug';
import { EmergencyAuthReset } from '@/components/auth/EmergencyAuthReset';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [loadingStartTime] = useState(Date.now());
  const [showEmergencyReset, setShowEmergencyReset] = useState(false);

  console.log('🔍 Layout render - loading:', loading, 'isAuthenticated:', isAuthenticated);

  // Check for loading timeout and show emergency reset after 15 seconds
  useEffect(() => {
    if (!loading) {
      setShowEmergencyReset(false);
      return;
    }

    const timer = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ App has been loading for more than 15 seconds - showing emergency reset');
        setShowEmergencyReset(true);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timer);
  }, [loading]);

  // Routes that don't require authentication
  const publicRoutes = ['/auth-test', '/manual-setup', '/database-fix-page', '/auto-fix', '/audit', '/auto-payment-sync', '/payment-sync'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // Show simple login for non-authenticated users (only when not loading and not on public routes)
  if (!loading && !isAuthenticated && !isPublicRoute) {
    return <EnhancedLogin />;
  }

  // Show loading debug if stuck loading for authenticated users
  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mb-4 text-center">
          <h2 className="text-lg font-semibold mb-2">Loading Debug</h2>
          <p className="text-muted-foreground">App appears to be stuck in loading state...</p>
        </div>
        <AuthStateDebugWithNetwork />
      </div>
    );
  }

  // Show loading spinner if loading and no authentication state yet
  if (loading) {
    const loadingDuration = Math.floor((Date.now() - loadingStartTime) / 1000);

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-6 w-full max-w-lg">
          {!showEmergencyReset ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <div>
                <p className="text-muted-foreground">Loading...</p>
                {loadingDuration > 5 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Loading for {loadingDuration} seconds...
                  </p>
                )}
                {loadingDuration > 10 && (
                  <p className="text-sm text-yellow-600 mt-1">
                    This is taking longer than usual. If the app doesn't load soon, an emergency reset option will appear.
                  </p>
                )}
              </div>
            </>
          ) : (
            <EmergencyAuthReset />
          )}
        </div>
      </div>
    );
  }

  // Show simple layout for public routes
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-background">
        <main className="w-full">
          {children}
        </main>
      </div>
    );
  }

  // Show authenticated layout
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
