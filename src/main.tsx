import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary';
import App from './App.tsx'
import './index.css'

// Force execute comprehensive migration on app start
import { autoExecuteComprehensiveMigration } from '@/utils/comprehensiveMigration';

// Import test utilities (makes them available in console)
import '@/utils/testMigration';
import '@/utils/testAdminSignIn';

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthErrorBoundary>
      <AuthProvider>
        <CompanyProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CompanyProvider>
      </AuthProvider>
    </AuthErrorBoundary>
  </QueryClientProvider>
);
