import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './layouts/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import { Chatbot } from './components/Chatbot';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AssetListPage = lazy(() => import('./pages/assets/AssetListPage'));
const AssetDetailPage = lazy(() => import('./pages/assets/AssetDetailPage'));
const AssetFormPage = lazy(() => import('./pages/assets/AssetFormPage'));
const BorrowRequestPage = lazy(() => import('./pages/borrow/BorrowRequestPage'));
const MyRequestsPage = lazy(() => import('./pages/borrow/MyRequestsPage'));
const MyItemsPage = lazy(() => import('./pages/borrow/MyItemsPage'));
const MyHistoryPage = lazy(() => import('./pages/borrow/MyHistoryPage'));
const MyExtensionsPage = lazy(() => import('./pages/borrow/MyExtensionsPage'));
const AllRequestsPage = lazy(() => import('./pages/borrow/AllRequestsPage'));
const ApprovalQueuePage = lazy(() => import('./pages/borrow/ApprovalQueuePage'));
const CheckoutPage = lazy(() => import('./pages/borrow/CheckoutPage'));
const ReturnPage = lazy(() => import('./pages/borrow/ReturnPage'));
const BorrowHistoryPage = lazy(() => import('./pages/borrow/BorrowHistoryPage'));
const ExtensionQueuePage = lazy(() => import('./pages/borrow/ExtensionQueuePage'));
const PMDashboardPage = lazy(() => import('./pages/pm/PMDashboardPage'));
const PMPlanListPage = lazy(() => import('./pages/pm/PMPlanListPage'));
const PMRunPage = lazy(() => import('./pages/pm/PMRunPage'));
const PMSchedulePage = lazy(() => import('./pages/pm/PMSchedulePage'));
const PMFloorPlanPage = lazy(() => import('./pages/pm/PMFloorPlanPage'));
const DeviceTypesPage = lazy(() => import('./pages/assets/DeviceTypesPage'));
const LocationsPage = lazy(() => import('./pages/assets/LocationsPage'));
const VendorsPage = lazy(() => import('./pages/assets/VendorsPage'));
const AssetStatusesPage = lazy(() => import('./pages/assets/AssetStatusesPage'));
const ImportExportPage = lazy(() => import('./pages/assets/ImportExportPage'));
const PrintQRPage = lazy(() => import('./pages/assets/PrintQRPage'));
const DonationListPage = lazy(() => import('./pages/donations/DonationListPage'));
const DonationFormPage = lazy(() => import('./pages/donations/DonationFormPage'));
const DonationDetailPage = lazy(() => import('./pages/donations/DonationDetailPage'));
const DisposalsPage = lazy(() => import('./pages/disposals/DisposalsPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const CategoryPage = lazy(() => import('./pages/categories/CategoryPage'));
const BorrowOverduePage = lazy(() => import('./pages/borrow/BorrowOverduePage'));
const PMTemplatePage = lazy(() => import('./pages/pm/PMTemplatePage'));
const PMSwHubDashboardPage = lazy(() => import('./pages/pm/PMSwHubDashboardPage'));
const PMSwHubFormPage = lazy(() => import('./pages/pm/PMSwHubFormPage'));
const PMSwHubPlanListPage = lazy(() => import('./pages/pm/PMSwHubPlanListPage'));
const PMSwHubTemplateListPage = lazy(() => import('./pages/pm/PMSwHubTemplateListPage'));
const PMSwHubTemplatePage = lazy(() => import('./pages/pm/PMSwHubTemplatePage'));
const ReportAssetsPage = lazy(() => import('./pages/reports/ReportAssetsPage'));
const ReportBorrowPage = lazy(() => import('./pages/reports/ReportBorrowPage'));
const ReportPMPage = lazy(() => import('./pages/reports/ReportPMPage'));
const ReportMaintenancePage = lazy(() => import('./pages/reports/ReportMaintenancePage'));
const EmployeeClearancePage = lazy(() => import('./pages/reports/EmployeeClearancePage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const MasterDataManagementPage = lazy(() => import('./pages/admin/MasterDataManagementPage'));
const AssetHistoryPage = lazy(() => import('./pages/assets/AssetHistoryPage'));
const ContractsPage = lazy(() => import('./pages/contracts/ContractsPage'));
const LicensesPage = lazy(() => import('./pages/licenses/LicensesPage'));
const DeliveryPage = lazy(() => import('./pages/delivery/DeliveryPage'));
const DeliveryConfirmPage = lazy(() => import('./pages/delivery/DeliveryConfirmPage'));

// System Settings
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FlowchartsPage = lazy(() => import('./pages/admin/FlowchartsPage'));

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
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        {/* Public — no login required, resolved by a one-click token link emailed to the recipient */}
        <Route path="/delivery-confirm/:token" element={<DeliveryConfirmPage />} />
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
          <Route path="assets/print-qr" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PrintQRPage /></ProtectedRoute>} />
          <Route path="delivery" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><DeliveryPage /></ProtectedRoute>} />
          <Route path="inventory" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><InventoryPage /></ProtectedRoute>} />
          <Route path="categories" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><CategoryPage /></ProtectedRoute>} />
          {/* Borrow - User */}
          <Route path="borrow/new" element={<BorrowRequestPage />} />
          <Route path="borrow/my-requests" element={<MyRequestsPage />} />
          <Route path="borrow/my-items" element={<MyItemsPage />} />
          <Route path="borrow/my-history" element={<MyHistoryPage />} />
          <Route path="borrow/my-extensions" element={<MyExtensionsPage />} />
          {/* Borrow - IT Admin */}
          <Route path="borrow/all-requests" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><AllRequestsPage /></ProtectedRoute>} />
          <Route path="borrow/approval-queue" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ApprovalQueuePage /></ProtectedRoute>} />
          <Route path="borrow/overdue" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><BorrowOverduePage /></ProtectedRoute>} />
          <Route path="borrow/checkout" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><CheckoutPage /></ProtectedRoute>} />
          <Route path="borrow/return" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ReturnPage /></ProtectedRoute>} />
          <Route path="borrow/history" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><BorrowHistoryPage /></ProtectedRoute>} />
          <Route path="borrow/extensions" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ExtensionQueuePage /></ProtectedRoute>} />
          {/* PM */}
          <Route path="pm" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMDashboardPage /></ProtectedRoute>} />
          <Route path="pm/sw-hub" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMSwHubDashboardPage /></ProtectedRoute>} />
          <Route path="pm/sw-hub/new" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMSwHubFormPage /></ProtectedRoute>} />
          <Route path="pm/sw-hub/plans" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMSwHubPlanListPage /></ProtectedRoute>} />
          <Route path="pm/sw-hub/template" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMSwHubTemplateListPage /></ProtectedRoute>} />
          <Route path="pm/sw-hub/template/:id" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMSwHubTemplatePage /></ProtectedRoute>} />
          <Route path="pm/sw-hub/template/:id/edit" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMSwHubTemplatePage /></ProtectedRoute>} />

          <Route path="pm/plans" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMPlanListPage /></ProtectedRoute>} />
          <Route path="pm/runs" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMRunPage /></ProtectedRoute>} />
          <Route path="pm/schedule" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMSchedulePage /></ProtectedRoute>} />
          <Route path="pm/floorplan" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMFloorPlanPage /></ProtectedRoute>} />
          <Route path="pm/templates" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><PMTemplatePage /></ProtectedRoute>} />
          {/* Reports */}
          <Route path="reports" element={<Navigate to="/reports/assets" replace />} />
          <Route path="reports/assets" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN', 'VIEWER']}><ReportAssetsPage /></ProtectedRoute>} />
          <Route path="reports/borrow" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN', 'VIEWER']}><ReportBorrowPage /></ProtectedRoute>} />
          <Route path="reports/pm" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN', 'VIEWER']}><ReportPMPage /></ProtectedRoute>} />
          <Route path="reports/maintenance" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN', 'VIEWER']}><ReportMaintenancePage /></ProtectedRoute>} />
          <Route path="reports/user-clearance" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><EmployeeClearancePage /></ProtectedRoute>} />
          {/* Admin */}
          <Route path="admin/users" element={<Navigate to="/admin/settings?tab=8" replace />} />
          <Route path="admin/settings" element={<ProtectedRoute roles={['SUPERADMIN', 'IT_ADMIN']}><SettingsPage /></ProtectedRoute>} />
          <Route path="admin/backup" element={<Navigate to="/admin/settings?tab=12" replace />} />
          <Route path="admin/notification-logs" element={<Navigate to="/admin/settings?tab=2" replace />} />
          <Route path="admin/audit-log" element={<Navigate to="/admin/settings?tab=13" replace />} />
          <Route path="admin/master-data" element={<ProtectedRoute roles={['SUPERADMIN', 'IT_ADMIN']}><MasterDataManagementPage /></ProtectedRoute>} />
          <Route path="admin/flowcharts" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><FlowchartsPage /></ProtectedRoute>} />
          
          <Route path="assets/:id/history" element={<AssetHistoryPage />} />
          {/* Contracts & Licenses (Phase 3) */}
          <Route path="contracts" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><ContractsPage /></ProtectedRoute>} />
          <Route path="licenses" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><LicensesPage /></ProtectedRoute>} />
          <Route path="profile" element={<ProfilePage />} />
          {/* Donations */}
          <Route path="donations" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><DonationListPage /></ProtectedRoute>} />
          <Route path="donations/new" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><DonationFormPage /></ProtectedRoute>} />
          <Route path="donations/:id" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><DonationDetailPage /></ProtectedRoute>} />
          <Route path="disposals" element={<ProtectedRoute roles={['IT_ADMIN', 'SUPERADMIN']}><DisposalsPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
      {user && <Chatbot />}
    </Suspense>
  );
}
