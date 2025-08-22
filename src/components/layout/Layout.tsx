import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedLogin } from '@/components/auth/EnhancedLogin';
import { AuthStateDebug } from '@/components/debug/AuthStateDebug';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, loading } = useAuth();

  console.log('🔍 Layout render - loading:', loading, 'isAuthenticated:', isAuthenticated);

  // TEMPORARY BYPASS: Skip authentication to view changes
  const BYPASS_AUTH = true;

  if (BYPASS_AUTH) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Authentication bypassed for demo purposes. Navigate to Invoices to see footer changes.
              </p>
            </div>
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Show simple login for non-authenticated users (only when not loading)
  if (!loading && !isAuthenticated) {
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
        <AuthStateDebug />
      </div>
    );
  }

  // Show loading spinner if loading and no authentication state yet
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
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
