import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterRestaurantPage } from './pages/public/RegisterRestaurantPage';
import { RestaurantStorefrontPage } from './pages/storefront/RestaurantStorefrontPage';
import { OrderTrackingPage } from './pages/storefront/OrderTrackingPage';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { SuperAdminOverview } from './pages/superadmin/SuperAdminOverview';
import { RestaurantsManager } from './pages/superadmin/RestaurantsManager';
import { PlansManager } from './pages/superadmin/PlansManager';
import { PlatformSettingsPage } from './pages/superadmin/PlatformSettingsPage';
import { AuditLogsPage } from './pages/superadmin/AuditLogsPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { LiveOrdersPage } from './pages/admin/LiveOrdersPage';
import { MenuBuilderPage } from './pages/admin/MenuBuilderPage';
import { TablesQrPage } from './pages/admin/TablesQrPage';
import { RestaurantProfilePage } from './pages/admin/RestaurantProfilePage';
import { RestaurantSettingsPage } from './pages/admin/RestaurantSettingsPage';
import { StaffManagerPage } from './pages/admin/StaffManagerPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public & Customer Storefront Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-restaurant" element={<RegisterRestaurantPage />} />
          <Route path="/r/:slug" element={<RestaurantStorefrontPage />} />
          <Route path="/track/:token" element={<OrderTrackingPage />} />

          {/* Super Admin Routes */}
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute requireSuperAdmin>
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SuperAdminOverview />} />
            <Route path="restaurants" element={<RestaurantsManager />} />
            <Route path="plans" element={<PlansManager />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="settings" element={<PlatformSettingsPage />} />
          </Route>

          {/* Restaurant Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <TenantProvider>
                  <AdminLayout />
                </TenantProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<LiveOrdersPage />} />
            <Route path="menu" element={<MenuBuilderPage />} />
            <Route path="tables-qr" element={<TablesQrPage />} />
            <Route
              path="reports"
              element={
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
                  <h2 className="text-lg font-bold text-slate-900">Sales & Reports</h2>
                  <p className="text-sm text-slate-500 mt-1">Coming in Phase 10!</p>
                </div>
              }
            />
            <Route path="profile" element={<RestaurantProfilePage />} />
            <Route path="settings" element={<RestaurantSettingsPage />} />
            <Route path="staff" element={<StaffManagerPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;