import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './layouts/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AssetListPage from './pages/assets/AssetListPage';
import AssetDetailPage from './pages/assets/AssetDetailPage';
import AssetFormPage from './pages/assets/AssetFormPage';
import BorrowRequestPage from './pages/borrow/BorrowRequestPage';
import MyRequestsPage from './pages/borrow/MyRequestsPage';
import MyItemsPage from './pages/borrow/MyItemsPage';
import MyHistoryPage from './pages/borrow/MyHistoryPage';
import ApprovalQueuePage from './pages/borrow/ApprovalQueuePage';
import CheckoutPage from './pages/borrow/CheckoutPage';
import ReturnPage from './pages/borrow/ReturnPage';
import BorrowHistoryPage from './pages/borrow/BorrowHistoryPage';
import ExtensionQueuePage from './pages/borrow/ExtensionQueuePage';
import PMDashboardPage from './pages/pm/PMDashboardPage';
import PMPlanListPage from './pages/pm/PMPlanListPage';
import PMRunPage from './pages/pm/PMRunPage';
import DeviceTypesPage from './pages/assets/DeviceTypesPage';
import LocationsPage from './pages/assets/LocationsPage';
import VendorsPage from './pages/assets/VendorsPage';
import AssetStatusesPage from './pages/assets/AssetStatusesPage';
import ImportExportPage from './pages/assets/ImportExportPage';
import BorrowOverduePage from './pages/borrow/BorrowOverduePage';
import PMTemplatePage from './pages/pm/PMTemplatePage';
import ReportAssetsPage from './pages/reports/ReportAssetsPage';
import ReportBorrowPage from './pages/reports/ReportBorrowPage';
import ReportPMPage from './pages/reports/ReportPMPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import UsersPage from './pages/admin/UsersPage';
import SettingsPage from './pages/admin/SettingsPage';
import NotificationLogsPage from './pages/admin/NotificationLogsPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><ErrorBoundary><Layout /></ErrorBoundary></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        {/* Assets */}
        <Route path="assets" element={<AssetListPage />} />
        <Route path="assets/new" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><AssetFormPage /></ProtectedRoute>} />
        <Route path="assets/:id" element={<AssetDetailPage />} />
        <Route path="assets/:id/edit" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><AssetFormPage /></ProtectedRoute>} />
        <Route path="assets/device-types" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><DeviceTypesPage /></ProtectedRoute>} />
        <Route path="assets/locations" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><LocationsPage /></ProtectedRoute>} />
        <Route path="assets/vendors" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><VendorsPage /></ProtectedRoute>} />
        <Route path="assets/statuses" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><AssetStatusesPage /></ProtectedRoute>} />
        <Route path="assets/import-export" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ImportExportPage /></ProtectedRoute>} />
        {/* Borrow - User */}
        <Route path="borrow/new" element={<BorrowRequestPage />} />
        <Route path="borrow/my-requests" element={<MyRequestsPage />} />
        <Route path="borrow/my-items" element={<MyItemsPage />} />
        <Route path="borrow/my-history" element={<MyHistoryPage />} />
        {/* Borrow - IT Admin */}
        <Route path="borrow/approval-queue" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ApprovalQueuePage /></ProtectedRoute>} />
        <Route path="borrow/overdue" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><BorrowOverduePage /></ProtectedRoute>} />
        <Route path="borrow/checkout" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><CheckoutPage /></ProtectedRoute>} />
        <Route path="borrow/return" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ReturnPage /></ProtectedRoute>} />
        <Route path="borrow/history" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><BorrowHistoryPage /></ProtectedRoute>} />
        <Route path="borrow/extensions" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ExtensionQueuePage /></ProtectedRoute>} />
        {/* PM */}
        <Route path="pm" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMDashboardPage /></ProtectedRoute>} />
        <Route path="pm/plans" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMPlanListPage /></ProtectedRoute>} />
        <Route path="pm/runs" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMRunPage /></ProtectedRoute>} />
        <Route path="pm/templates" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMTemplatePage /></ProtectedRoute>} />
        {/* Reports */}
        <Route path="reports/assets" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ReportAssetsPage /></ProtectedRoute>} />
        <Route path="reports/borrow" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ReportBorrowPage /></ProtectedRoute>} />
        <Route path="reports/pm" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ReportPMPage /></ProtectedRoute>} />
        {/* Admin */}
        <Route path="admin/users" element={<ProtectedRoute roles={['SUPERADMIN']}><UsersPage /></ProtectedRoute>} />
        <Route path="admin/settings" element={<ProtectedRoute roles={['SUPERADMIN']}><SettingsPage /></ProtectedRoute>} />
        <Route path="admin/notification-logs" element={<ProtectedRoute roles={['SUPERADMIN']}><NotificationLogsPage /></ProtectedRoute>} />
        <Route path="admin/audit-log" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><AuditLogPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
