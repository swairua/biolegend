import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { enableResizeObserverErrorSuppression } from "@/utils/resizeObserverErrorHandler";
import { useDatabaseDiagnostics } from "@/hooks/useDatabaseDiagnostics";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ComprehensiveMigrationBanner } from "@/components/ComprehensiveMigrationBanner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { autoMigrateIfNeeded } from "@/utils/executeMigrationNow";
import Index from "./pages/Index";
import Quotations from "./pages/Quotations";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import DeliveryNotes from "./pages/DeliveryNotes";
import Proforma from "./pages/Proforma";
import SalesReports from "./pages/reports/SalesReports";
import InventoryReports from "./pages/reports/InventoryReports";
import StatementOfAccounts from "./pages/reports/StatementOfAccounts";
import CompanySettings from "./pages/settings/CompanySettings";
import UserManagement from "./pages/settings/UserManagement";
import RemittanceAdvice from "./pages/RemittanceAdvice";
import LPOs from "./pages/LPOs";
import CreditNotes from "./pages/CreditNotes";
import NotFound from "./pages/NotFound";
import TestLogin from "./pages/TestLogin";
import SupabaseQuickFix from "./pages/SupabaseQuickFix";
import ForceMigration from "./pages/ForceMigration";
import AutoSetup from "./pages/AutoSetup";

const App = () => {
  // Run database diagnostics safely without setState during render
  const diagnostics = useDatabaseDiagnostics();

  useEffect(() => {
    // Suppress ResizeObserver loop errors
    enableResizeObserverErrorSuppression();

    // Log successful fix
    console.log('✅ App loaded without setState during render errors');

    // Auto-check for missing tables and suggest migration
    autoMigrateIfNeeded().catch(console.error);
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ComprehensiveMigrationBanner />
      <Layout>
        <Routes>
          {/* Public/Dashboard Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute permission="view_dashboard">
                <Index />
              </ProtectedRoute>
            } 
          />

          {/* Sales & Customer Management */}
          <Route 
            path="/quotations" 
            element={
              <ProtectedRoute permission="create_quotations">
                <Quotations />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quotations/new" 
            element={
              <ProtectedRoute permission="create_quotations">
                <Quotations />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers" 
            element={
              <ProtectedRoute permission="view_customers">
                <Customers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers/new" 
            element={
              <ProtectedRoute permission="view_customers">
                <Customers />
              </ProtectedRoute>
            } 
          />

          {/* Financial Management */}
          <Route 
            path="/invoices" 
            element={
              <ProtectedRoute permission="manage_invoices">
                <Invoices />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/invoices/new" 
            element={
              <ProtectedRoute permission="manage_invoices">
                <Invoices />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payments" 
            element={
              <ProtectedRoute permission="manage_payments">
                <Payments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payments/new" 
            element={
              <ProtectedRoute permission="manage_payments">
                <Payments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/credit-notes" 
            element={
              <ProtectedRoute permission="manage_credit_notes">
                <CreditNotes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/credit-notes/new" 
            element={
              <ProtectedRoute permission="manage_credit_notes">
                <CreditNotes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/proforma" 
            element={
              <ProtectedRoute permission="create_quotations">
                <Proforma />
              </ProtectedRoute>
            } 
          />

          {/* Procurement & Inventory */}
          <Route 
            path="/lpos" 
            element={
              <ProtectedRoute permission="manage_lpos">
                <LPOs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/lpos/new" 
            element={
              <ProtectedRoute permission="manage_lpos">
                <LPOs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory" 
            element={
              <ProtectedRoute permission="manage_inventory">
                <Inventory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory/new" 
            element={
              <ProtectedRoute permission="manage_inventory">
                <Inventory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/delivery-notes" 
            element={
              <ProtectedRoute permission="manage_delivery_notes">
                <DeliveryNotes />
              </ProtectedRoute>
            } 
          />

          {/* Additional Features */}
          <Route 
            path="/remittance" 
            element={
              <ProtectedRoute permission="manage_payments">
                <RemittanceAdvice />
              </ProtectedRoute>
            } 
          />

          {/* Reports - Most require view_reports permission */}
          <Route 
            path="/reports/sales" 
            element={
              <ProtectedRoute permission="view_reports">
                <SalesReports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports/inventory" 
            element={
              <ProtectedRoute permission="view_reports">
                <InventoryReports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports/statements" 
            element={
              <ProtectedRoute permission="view_reports">
                <StatementOfAccounts />
              </ProtectedRoute>
            } 
          />

          {/* Settings - Admin and specific role access */}
          <Route
            path="/settings/company"
            element={
              <ProtectedRoute permission="manage_company">
                <CompanySettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/users"
            element={
              <ProtectedRoute permission="manage_users">
                <UserManagement />
              </ProtectedRoute>
            }
          />

          {/* Test & Debug Routes */}
          <Route
            path="/test-login"
            element={<TestLogin />}
          />
          <Route
            path="/supabase-fix"
            element={<SupabaseQuickFix />}
          />
          <Route
            path="/force-migration"
            element={<ForceMigration />}
          />
          <Route
            path="/auto-setup"
            element={<AutoSetup />}
          />

          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </TooltipProvider>
  );
};

export default App;
