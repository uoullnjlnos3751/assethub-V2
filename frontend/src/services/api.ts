import axios, { AxiosError } from 'axios';
import { extractApiError } from '../utils/errorHandler';

export const API_ERROR_EVENT = 'api:error';

export function dispatchApiError(err: unknown): void {
  const message = extractApiError(err);
  window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: { message, error: err } }));
}

export const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  // Auth now rides on an httpOnly cookie (assethub_session) instead of a
  // token read from localStorage — withCredentials makes axios send it. No
  // request interceptor is needed to attach anything; the browser does it.
  withCredentials: true,
});

// GET /auth/me is called on every app load to ask "is there a valid session
// cookie?" (see AuthContext). A 401 there just means "not logged in yet" —
// normal, not an error — so it must not trigger the redirect-to-login below
// (which would fire on the login page itself) or the global error toast.
// The other /auth endpoints are excluded for the same reason: LoginPage
// already shows its own error for a failed login/expiry check.
const SILENT_401_PATHS = ['/auth/me', '/auth/login', '/auth/check-expiry', '/auth/logout'];

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const isSilent401 =
      err.response?.status === 401 &&
      SILENT_401_PATHS.some((p) => err.config?.url?.includes(p));

    if (isSilent401) {
      return Promise.reject(err);
    }

    if (err.response?.status === 401) {
      // The session cookie is missing/expired. There is nothing left to
      // clear client-side (no token is ever stored), so just leave the page.
      window.location.href = '/login';
      return Promise.reject(err);
    }
    dispatchApiError(err);
    return Promise.reject(err);
  }
);

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export default api;

// AI Chatbot — streamed via SSE, consumed directly with fetch in Chatbot.tsx
// rather than through the axios instance (see baseURL export above).

// Presence — "who's online right now, doing what" for the admin dashboard
export const presenceAPI = {
  heartbeat: (path: string) => api.post('/presence/heartbeat', { path }),
  online: () => api.get('/presence/online'),
};

// Auth
export const authAPI = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  checkExpiry: (username: string, password: string) => api.post('/auth/check-expiry', { username, password }),
  me: () => api.get('/auth/me'),
  publicSettings: () => api.get('/auth/settings'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
  // Clears the httpOnly session cookie server-side — client-side JS cannot
  // touch an httpOnly cookie itself.
  logout: () => api.post('/auth/logout'),
};

// Assets
export const assetAPI = {
  list: (params?: any) => api.get('/assets', { params }),
  get: (id: number) => api.get(`/assets/${id}`),
  create: (data: any) => api.post('/assets', data),
  upsert: (data: any) => api.post('/assets/upsert', data),
  update: (id: number, data: any) => api.put(`/assets/${id}`, data),
  delete: (id: number) => api.delete(`/assets/${id}`),
  bulkDelete: (ids: number[]) => api.post('/assets/bulk-delete', { ids }),
  bulkDeleteByType: (type: string) => api.post('/assets/bulk-delete-by-type', { type }),
  bulkUpdate: (ids: number[], data: Record<string, any>) => api.post('/assets/bulk-update', { ids, data }),
  exportAssets: (type?: string, filters?: Record<string, string>) => {
    const params: any = type ? { type } : {};
    if (filters) Object.assign(params, filters);
    return api.get('/assets/export/excel', { params, responseType: 'blob' });
  },
  exportCSV: () => api.get('/assets/export/csv', { responseType: 'blob' }),
  exportByIds: (ids: number[]) => api.post('/assets/export/by-ids', { ids }, { responseType: 'blob' }),
  importAssets: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/assets/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importJson: (rows: any[]) => api.post('/assets/import/json', { rows }),
  uploadImage: (id: number, formData: FormData) => {
    return api.post(`/assets/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteImage: (id: number) => api.delete(`/assets/${id}/image`),
  // Documents
  listDocuments: (assetId: number) => api.get(`/assets/${assetId}/documents`),
  uploadDocument: (assetId: number, formData: FormData) => {
    return api.post(`/assets/${assetId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadDocument: (assetId: number, docId: number) => {
    window.open(`/api/assets/${assetId}/documents/${docId}/download`, '_blank');
  },
  deleteDocument: (assetId: number, docId: number) => api.delete(`/assets/${assetId}/documents/${docId}`),
  getGLPISpec: (id: number) => api.get(`/assets/${id}/glpi-spec`),
  queryGLPISpec: (serial: string) => api.get(`/assets/glpi-spec`, { params: { serial } }),
  syncGLPI: (id: number, field?: string) => api.post(`/assets/${id}/glpi-sync`, { field }),
  externalAgent: (id: number) => api.get(`/assets/${id}/external-agent`),
  agentSync: (id: number, field?: string) => api.post(`/assets/${id}/agent-sync`, { field }),
  agentDrift: () => api.get('/assets/agent/drift'),
  agentFillBlanks: (assetIds?: number[]) => api.post('/assets/agent/fill-blanks', { assetIds }),
  getAssetHistory: (id: number, params?: any) => api.get(`/assets/${id}/history`, { params }),
  getGlobalHistory: (params?: any) => api.get('/assets/global-history', { params }),
  searchOwners: (q: string) => api.get('/assets/owners/search-ad', { params: { q } }),
  typeOptions: () => api.get('/assets/options/types'),
  brandOptions: () => api.get('/assets/options/brands'),
  locationOptions: () => api.get('/assets/options/locations'),
  vendorOptions: () => api.get('/assets/options/vendors'),
  statusOptions: () => api.get('/assets/options/statuses'),
  osTypeOptions: () => api.get('/assets/options/os-types'),
  departmentOptions: () => api.get('/assets/options/departments'),
  domainOptions: () => api.get('/assets/options/domains'),
  companyOptions: () => api.get('/assets/options/companies'),
  antivirusOptions: () => api.get('/assets/options/antivirus'),
  nextCode: (params: { company: string; departmentId?: string; type?: string }) => api.get('/assets/next-code', { params }),
  deviceTypes: () => api.get('/assets/device-types'),
  filterOptions: () => api.get('/assets/filter-options'),
  createDeviceType: (data: any) => api.post('/assets/device-types', data),
  updateDeviceType: (id: number, data: any) => api.put(`/assets/device-types/${id}`, data),
  deleteDeviceType: (id: number) => api.delete(`/assets/device-types/${id}`),
  importDeviceTypesFromAssets: () => api.post('/assets/device-types/import-from-assets'),
  locations: () => api.get('/assets/locations'),
  createLocation: (data: any) => api.post('/assets/locations', data),
  updateLocation: (id: number, data: any) => api.put(`/assets/locations/${id}`, data),
  deleteLocation: (id: number) => api.delete(`/assets/locations/${id}`),
  importLocationsFromAssets: () => api.post('/assets/locations/import-from-assets'),
  companies: () => api.get('/assets/companies'),
  createCompany: (data: any) => api.post('/assets/companies', data),
  updateCompany: (id: number, data: any) => api.put(`/assets/companies/${id}`, data),
  deleteCompany: (id: number) => api.delete(`/assets/companies/${id}`),
  importCompaniesFromAssets: () => api.post('/assets/companies/import-from-assets'),
  vendors: () => api.get('/assets/vendors'),
  createVendor: (data: any) => api.post('/assets/vendors', data),
  updateVendor: (id: number, data: any) => api.put(`/assets/vendors/${id}`, data),
  deleteVendor: (id: number) => api.delete(`/assets/vendors/${id}`),
  importVendorsFromAssets: () => api.post('/assets/vendors/import-from-assets'),
  assetStatuses: () => api.get('/assets/asset-statuses'),
  createAssetStatus: (data: any) => api.post('/assets/asset-statuses', data),
  updateAssetStatus: (id: number, data: any) => api.put(`/assets/asset-statuses/${id}`, data),
  deleteAssetStatus: (id: number) => api.delete(`/assets/asset-statuses/${id}`),
  printers: () => api.get('/assets/printers'),
  createPrinter: (data: any) => api.post('/assets/printers', data),
  updatePrinter: (id: number, data: any) => api.put(`/assets/printers/${id}`, data),
  deletePrinter: (id: number) => api.delete(`/assets/printers/${id}`),
  checklistSets: () => api.get('/assets/checklist-sets'),
  createChecklistSet: (data: any) => api.post('/assets/checklist-sets', data),
  updateChecklistSet: (id: number, data: any) => api.put(`/assets/checklist-sets/${id}`, data),
  deleteChecklistSet: (id: number) => api.delete(`/assets/checklist-sets/${id}`),
  checklistItems: (setId: number) => api.get(`/assets/checklist-sets/${setId}/items`),
  createChecklistItem: (setId: number, data: any) => api.post(`/assets/checklist-sets/${setId}/items`, data),
  updateChecklistItem: (setId: number, itemId: number, data: any) => api.put(`/assets/checklist-sets/${setId}/items/${itemId}`, data),
  deleteChecklistItem: (setId: number, itemId: number) => api.delete(`/assets/checklist-sets/${setId}/items/${itemId}`),
  stats: (typeGroup: string) => api.get('/assets/stats', { params: { typeGroup } }),
  checkDuplicate: (params: { assetCode?: string; accountingCode?: string; serialNo?: string; assetName?: string; excludeId?: number }) => api.get('/assets/check-duplicate', { params }),
};

// Borrow
export const borrowAPI = {
  createRequest: (data: any) => api.post('/borrow/requests', data),
  myRequests: (params?: any) => api.get('/borrow/requests', { params }),
  cancelRequest: (id: number) => api.delete(`/borrow/requests/${id}`),
  myItems: () => api.get('/borrow/my-items'),
  myHistory: () => api.get('/borrow/my-history'),
  myExtensions: () => api.get('/borrow/my-extensions'),
  allRequests: (params?: any) => api.get('/borrow/all-requests', { params }),
  stats: () => api.get('/borrow/stats'),
  historyStats: () => api.get('/borrow/history-stats'),
  requesterHistory: (userId: number) => api.get(`/borrow/requester-history/${userId}`),
  overdue: () => api.get('/borrow/overdue'),
  approve: (id: number, data: any) => api.post(`/borrow/requests/${id}/approve`, data),
  checkout: (id: number, data: any) => api.post(`/borrow/requests/${id}/checkout`, data),
  returnItem: (itemId: number, data: any) => api.post(`/borrow/items/${itemId}/return`, data),
  uploadCheckoutImage: (checkoutId: number, file: File, description?: string) => {
    const fd = new FormData();
    fd.append('image', file);
    if (description) fd.append('description', description);
    return api.post(`/borrow/checkouts/${checkoutId}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadReturnImage: (returnId: number, file: File, description?: string) => {
    const fd = new FormData();
    fd.append('image', file);
    if (description) fd.append('description', description);
    return api.post(`/borrow/returns/${returnId}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  sendReminder: (itemId: number, data: any) => api.post(`/borrow/items/${itemId}/reminder`, data),
  history: (params?: any) => api.get('/borrow/history', { params }),
  createExtension: (data: any) => api.post('/borrow/extensions', data),
  approveExtension: (id: number, data: any) => api.put(`/borrow/extensions/${id}`, data),
  extensions: () => api.get('/borrow/extensions'),
};

// PM
export const pmAPI = {
  templates: () => api.get('/pm/templates'),
  createTemplate: (data: any) => api.post('/pm/templates', data),
  updateTemplate: (id: number, data: any) => api.put(`/pm/templates/${id}`, data),
  plans: (params?: any) => api.get('/pm/plans', { params }),
  createPlan: (data: any) => api.post('/pm/plans', data),
  updatePlan: (id: number, data: any) => api.put(`/pm/plans/${id}`, data),
  deletePlan: (id: number) => api.delete(`/pm/plans/${id}`),
  eligibility: (params: any) => api.get('/pm/plans/eligibility', { params }),
  generate: (planId: number) => api.post(`/pm/plans/${planId}/generate`),
  runs: (params?: any) => api.get('/pm/runs', { params }),
  performRun: (runId: number, data: any) => api.post(`/pm/runs/${runId}/perform`, data),
  deleteRun: (id: number) => api.delete(`/pm/runs/${id}`),
  updateRunNotes: (id: number, notes: string) => api.patch(`/pm/runs/${id}/notes`, { notes }),
  dashboard: (params?: any) => api.get('/pm/dashboard', { params }),
  uploadPMPhoto: (runId: number, formData: FormData) => {
    return api.post(`/pm/runs/${runId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadTempFile: (formData: FormData) => {
    return api.post('/pm/upload-temp', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  previewMonitorCode: (company: string, index: number) => api.get('/pm/preview-monitor-code', { params: { company, index } }),
  checkSerial: (serialNo: string) => api.get('/pm/check-serial', { params: { serialNo } }),
  getDisplayFormat: () => api.get('/settings/PM_DISPLAY_FORMAT'),
  previewPrinterCode: (company: string, index: number) => api.get('/pm/preview-printer-code', { params: { company, index } }),
  bulkPerformRun: (data: { runIds: number[]; answers: any[] }) => api.post('/pm/runs/bulk-perform', data),
  getGLPISpec: (runId: number) => api.get(`/pm/runs/${runId}/glpi-spec`),
  // Ad-hoc PM
  adhocSearch: (q: string) => api.get('/pm/runs/adhoc-search', { params: { q } }),
  adhocCheck: (assetId: number) => api.get(`/pm/runs/adhoc-check/${assetId}`),
  adhocCreate: (data: { assetId: number; templateId: number }) => api.post('/pm/runs/adhoc', data),
};

// New Devices & Delivery
export const deliveryAPI = {
  list: (params?: any) => api.get('/delivery/requests', { params }),
  summary: () => api.get('/delivery/requests/summary'),
  get: (id: number) => api.get(`/delivery/requests/${id}`),
  create: (data: any) => api.post('/delivery/requests', data),
  update: (id: number, data: any) => api.put(`/delivery/requests/${id}`, data),
  togglePeripheral: (id: number, itemId: number, data: { prepared?: boolean; delivered?: boolean }) =>
    api.patch(`/delivery/requests/${id}/peripherals/${itemId}`, data),
  markReady: (id: number) => api.patch(`/delivery/requests/${id}/ready`),
  deliver: (id: number) => api.post(`/delivery/requests/${id}/deliver`),
  getChecklistRun: (id: number) => api.get(`/delivery/requests/${id}/checklist-run`),
  performChecklistRun: (id: number, data: { answers: { itemId: number; value: string; note?: string }[]; status?: 'DRAFT' | 'DONE' }) =>
    api.post(`/delivery/requests/${id}/checklist-run/perform`, data),
  // Public — no auth, used by the recipient-facing confirmation page
  getConfirm: (token: string) => api.get(`/delivery/confirm/${token}`),
  confirm: (token: string) => api.post(`/delivery/confirm/${token}`),
};

export const floorPlanAPI = {
  getAll: () => api.get('/floorplans'),
  getById: (id: number) => api.get(`/floorplans/${id}`),
  create: (data: FormData) => api.post('/floorplans', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: FormData) => api.put(`/floorplans/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: number) => api.delete(`/floorplans/${id}`),
  updatePins: (id: number, pins: any[]) => api.put(`/floorplans/${id}/pins`, { pins }),
};

// Admin
export const adminAPI = {
  users: (params?: any) => api.get('/admin/users', { params }),
  getUser: (id: number) => api.get(`/admin/users/${id}`),
  searchADUsers: (q: string) => api.get('/admin/users/search-ad', { params: { q } }),
  createUserFromAD: (data: any) => api.post('/admin/users/from-ad', data),
  createLocalUser: (data: { username: string; password: string; displayName: string; role?: string }) => api.post('/admin/users/local', data),
  setLocalPassword: (id: number, password: string) => api.put(`/admin/users/${id}/local-password`, { password }),
  updateRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  toggleActive: (id: number) => api.put(`/admin/users/${id}/toggle-active`),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),

  // Companies
  syncADCompanies: () => api.post('/admin/sync-companies'),

  settings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  testEmail: (data: any) => api.post('/admin/test-email', data),
  ping: () => api.get('/admin/ping'),
  notificationTemplates: () => api.get('/admin/notification-templates'),
  updateNotificationTemplate: (id: number, data: any) => api.put(`/admin/notification-templates/${id}`, data),
  resetNotificationTemplate: (id: number) => api.post(`/admin/notification-templates/${id}/reset`),
  testNotificationTemplate: (id: number, to: string) => api.post(`/admin/notification-templates/${id}/test`, { to }),
  notificationLogs: (params?: any) => api.get('/admin/notification-logs', { params }),
  externalApiInfo: () => api.get('/admin/external-api-info'),
  forceLogoutAll: () => api.post('/admin/force-logout-all'),
  backup: () => api.get('/admin/backup', { responseType: 'blob' }), // Legacy JSON backup
  restore: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  clearAllAssets: () => api.post('/admin/clear-all-assets'),
  advancedClearData: (options: { clearAssets: boolean; clearBorrow: boolean; clearDonations: boolean; clearMasterData: boolean; clearUsers: boolean }) => api.post('/admin/advanced-clear-data', options),
};

// System Backup (pg_dump)
export const systemBackupAPI = {
  list: () => api.get('/backup'),
  create: () => api.post('/backup'),
  delete: (filename: string) => api.delete(`/backup/${filename}`),
  download: (filename: string) => {
    // window.open navigates the browser directly rather than going through
    // axios, so this can't attach an Authorization header — it used to work
    // around that by putting the token in the URL. That's no longer needed:
    // this is a same-origin GET (nginx serves /api/ and the frontend from
    // the same host), so the httpOnly session cookie rides along
    // automatically, the same as it would for a plain <a href> download.
    window.open(`/api/backup/${filename}/download`, '_blank');
  },
  restore: (filename: string) => api.post(`/backup/${filename}/restore`),
};

// Department Management
export const departmentAPI = {
  list: (params?: any) => api.get('/departments', { params }),
  get: (id: number) => api.get(`/departments/${id}`),
  create: (data: any) => api.post('/departments', data),
  update: (id: number, data: any) => api.put(`/departments/${id}`, data),
  delete: (id: number) => api.delete(`/departments/${id}`),
  syncAD: () => api.post('/departments/sync-ad'),
};

// Dashboard
export const dashboardAPI = {
  assetSummary: () => api.get('/dashboard/asset-summary'),
  dataHealth: () => api.get('/dashboard/data-health'),
  borrowSummary: () => api.get('/dashboard/borrow-summary'),
  pmSummary: (year?: number) => api.get('/dashboard/pm-summary', { params: { year } }),
  borrowTrend: (year: number) => api.get(`/dashboard/borrow-trend?year=${year}`),
  recentActivity: () => api.get('/dashboard/recent-activity'),
  proactiveAlerts: () => api.get('/dashboard/proactive-alerts'),
  warrantyExpiring: (days?: number) => api.get('/dashboard/warranty-expiring', { params: { days } }),
  moduleStatus: () => api.get('/dashboard/module-status'),
  categoryUtilization: () => api.get('/dashboard/category-utilization'),
  inventoryLowStock: () => api.get('/dashboard/inventory-low-stock'),
  externalAgentsSummary: () => api.get('/dashboard/external-agents-summary'),
  custodySummary: () => api.get('/dashboard/custody-summary'),
};

// Inventory
export const inventoryAPI = {
  list: (params?: any) => api.get('/inventory', { params }),
  get: (id: number) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post('/inventory', data),
  update: (id: number, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/inventory/${id}`),
  checkin: (id: number, data: any) => api.post(`/inventory/${id}/checkin`, data),
  checkout: (id: number, data: any) => api.post(`/inventory/${id}/checkout`, data),
  categories: () => api.get('/inventory/categories/list'),
};

// Donations
export const donationAPI = {
  retiredAssets: () => api.get('/donations/assets/retired'),
  list: () => api.get('/donations'),
  get: (id: number) => api.get(`/donations/${id}`),
  create: (data: any) => api.post('/donations', data),
  update: (id: number, data: any) => api.put(`/donations/${id}`, data),
  delete: (id: number) => api.delete(`/donations/${id}`),
  // Batch-level images
  uploadImage: (id: number, file: File, caption?: string) => {
    const fd = new FormData();
    fd.append('image', file);
    if (caption) fd.append('caption', caption);
    return api.post(`/donations/${id}/images`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteImage: (id: number, imageId: number) =>
    api.delete(`/donations/${id}/images/${imageId}`),
  // Item-level images
  uploadItemImage: (id: number, itemId: number, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post(`/donations/${id}/items/${itemId}/image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteItemImage: (id: number, itemId: number) =>
    api.delete(`/donations/${id}/items/${itemId}/image`),
};

// Categories
export const categoryAPI = {
  list: () => api.get('/categories'),
  all: () => api.get('/categories/all'),
  create: (data: any) => api.post('/categories', data),
  update: (id: number, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
  createType: (categoryId: number, data: any) => api.post(`/categories/${categoryId}/types`, data),
  updateType: (typeId: number, data: any) => api.put(`/categories/types/${typeId}`, data),
  deleteType: (typeId: number) => api.delete(`/categories/types/${typeId}`),
  reorderTypes: (categoryId: number, typeIds: number[]) => api.post(`/categories/${categoryId}/types/reorder`, { typeIds }),
};

// Maintenance
export const maintenanceAPI = {
  create: (data: any) => api.post('/maintenance', data),
  update: (id: number, data: any) => api.put(`/maintenance/${id}`, data),
  uploadImage: (id: number, file: File, type: 'BEFORE' | 'AFTER' | 'RECEIPT', description?: string) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('imageType', type);
    if (description) fd.append('description', description);
    return api.post(`/maintenance/${id}/images`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteImage: (imageId: number) => api.delete(`/maintenance/images/${imageId}`),
  getByAsset: (assetId: number) => api.get(`/maintenance/asset/${assetId}`),
  getById: (id: number) => api.get(`/maintenance/${id}`),
  reportAll: (params?: any) => api.get('/maintenance/report/all', { params }),
};

// Contracts (Phase 3)
export const contractAPI = {
  list: (params?: { type?: string; active?: boolean; expiringSoon?: boolean }) => api.get('/contracts', { params }),
  get: (id: number) => api.get(`/contracts/${id}`),
  create: (data: any) => api.post('/contracts', data),
  update: (id: number, data: any) => api.put(`/contracts/${id}`, data),
  delete: (id: number) => api.delete(`/contracts/${id}`),
};

// Software Licenses (Phase 3)
export const licenseAPI = {
  list: (params?: { active?: boolean; expiringSoon?: boolean }) => api.get('/licenses', { params }),
  get: (id: number) => api.get(`/licenses/${id}`),
  create: (data: any) => api.post('/licenses', data),
  update: (id: number, data: any) => api.put(`/licenses/${id}`, data),
  delete: (id: number) => api.delete(`/licenses/${id}`),
  assign: (id: number, data: { assetId?: number; userId?: number; note?: string }) => api.post(`/licenses/${id}/assign`, data),
  unassign: (assignmentId: number) => api.delete(`/licenses/assignments/${assignmentId}`),
};

// Asset Disposals (Phase 2)
export const disposalAPI = {
  list: (params?: { method?: string }) => api.get('/disposals', { params }),
  create: (data: any) => api.post('/disposals', data),
  delete: (id: number) => api.delete(`/disposals/${id}`),
};

// Asset Links / CMDB parent-child (Phase 2)
export const assetLinkAPI = {
  byAsset: (assetId: number) => api.get(`/asset-links/by-asset/${assetId}`),
  create: (data: { parentId: number; childId: number; linkType?: string; note?: string }) => api.post('/asset-links', data),
  delete: (id: number) => api.delete(`/asset-links/${id}`),
};

// Asset custody — HR receiving devices back from leavers (backend/src/routes/custody.ts).
// Deliberately narrow: search is capped server-side at 25 rows and needs 3+
// characters, so HR can look up the machine in their hand but not browse the fleet.
export const custodyAPI = {
  holders: () => api.get('/custody/holders'),
  search: (q: string) => api.get('/custody/search', { params: { q } }),
  set: (assetId: number, data: { holder: string | null; note?: string }) => api.post(`/custody/assets/${assetId}`, data),
  held: (holder?: string) => api.get('/custody/held', { params: holder ? { holder } : {} }),
  summary: () => api.get('/custody/summary'),
};
