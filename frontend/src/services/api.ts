import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export default api;

// Auth
export const authAPI = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  checkExpiry: (username: string, password: string) => api.post('/auth/check-expiry', { username, password }),
  me: () => api.get('/auth/me'),
  publicSettings: () => api.get('/auth/settings'),
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
    const token = localStorage.getItem('token');
    return axios.post(`/api/assets/${id}/image`, formData, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
  },
  deleteImage: (id: number) => api.delete(`/assets/${id}/image`),
  // Documents
  listDocuments: (assetId: number) => api.get(`/assets/${assetId}/documents`),
  uploadDocument: (assetId: number, formData: FormData) => {
    const token = localStorage.getItem('token');
    return axios.post(`/api/assets/${assetId}/documents`, formData, {
      headers: { Authorization: token ? `Bearer ${token}` : undefined },
    });
  },
  downloadDocument: (assetId: number, docId: number) => {
    window.open(`/api/assets/${assetId}/documents/${docId}/download`, '_blank');
  },
  deleteDocument: (assetId: number, docId: number) => api.delete(`/assets/${assetId}/documents/${docId}`),
  getGLPISpec: (id: number) => api.get(`/assets/${id}/glpi-spec`),
  queryGLPISpec: (serial: string) => api.get(`/assets/glpi-spec`, { params: { serial } }),
  syncGLPI: (id: number, field?: string) => api.post(`/assets/${id}/glpi-sync`, { field }),
  getAssetHistory: (id: number, params?: any) => api.get(`/assets/${id}/history`, { params }),
  searchOwners: (q: string) => api.get('/assets/owners/search-ad', { params: { q } }),
  typeOptions: () => api.get('/assets/options/types'),
  locationOptions: () => api.get('/assets/options/locations'),
  vendorOptions: () => api.get('/assets/options/vendors'),
  statusOptions: () => api.get('/assets/options/statuses'),
  osTypeOptions: () => api.get('/assets/options/os-types'),
  departmentOptions: () => api.get('/assets/options/departments'),
  domainOptions: () => api.get('/assets/options/domains'),
  companyOptions: () => api.get('/assets/options/companies'),
  antivirusOptions: () => api.get('/assets/options/antivirus'),
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
  stats: (typeGroup: string) => api.get('/assets/stats', { params: { typeGroup } }),
  checkDuplicate: (params: { assetCode?: string; serialNo?: string; assetName?: string; excludeId?: number }) => api.get('/assets/check-duplicate', { params }),
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
  overdue: () => api.get('/borrow/overdue'),
  approve: (id: number, data: any) => api.post(`/borrow/requests/${id}/approve`, data),
  checkout: (id: number, data: any) => api.post(`/borrow/requests/${id}/checkout`, data),
  returnItem: (itemId: number, data: any) => api.post(`/borrow/items/${itemId}/return`, data),
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
  dashboard: (params?: any) => api.get('/pm/dashboard', { params }),
  uploadPMPhoto: (runId: number, formData: FormData) => {
    const token = localStorage.getItem('token');
    return axios.post(`/api/pm/runs/${runId}/upload`, formData, {
      headers: { Authorization: token ? `Bearer ${token}` : undefined },
    });
  },
  bulkPerformRun: (data: { runIds: number[]; answers: any[] }) => api.post('/pm/runs/bulk-perform', data),
  getGLPISpec: (runId: number) => api.get(`/pm/runs/${runId}/glpi-spec`),
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
  syncADCompanies: () => api.get('/admin/ad-companies'),
  saveADCompanies: (companies: string[]) => api.post('/admin/sync-companies', { companies }),

  settings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  testEmail: (data: any) => api.post('/admin/test-email', data),
  ping: () => api.get('/admin/ping'),
  notificationTemplates: () => api.get('/admin/notification-templates'),
  updateNotificationTemplate: (id: number, data: any) => api.put(`/admin/notification-templates/${id}`, data),
  resetNotificationTemplate: (id: number) => api.post(`/admin/notification-templates/${id}/reset`),
  testNotificationTemplate: (id: number, to: string) => api.post(`/admin/notification-templates/${id}/test`, { to }),
  notificationLogs: (params?: any) => api.get('/admin/notification-logs', { params }),
  forceLogoutAll: () => api.post('/admin/force-logout-all'),
  backup: () => api.get('/admin/backup', { responseType: 'blob' }),
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

// Department Management
export const departmentAPI = {
  list: (params?: any) => api.get('/departments', { params }),
  get: (id: number) => api.get(`/departments/${id}`),
  create: (data: any) => api.post('/departments', data),
  update: (id: number, data: any) => api.put(`/departments/${id}`, data),
  delete: (id: number) => api.delete(`/departments/${id}`),
};

// Dashboard
export const dashboardAPI = {
  assetSummary: () => api.get('/dashboard/asset-summary'),
  borrowSummary: () => api.get('/dashboard/borrow-summary'),
  pmSummary: (year?: number) => api.get('/dashboard/pm-summary', { params: { year } }),
  borrowTrend: (year: number) => api.get(`/dashboard/borrow-trend?year=${year}`),
  recentActivity: () => api.get('/dashboard/recent-activity'),
  proactiveAlerts: () => api.get('/dashboard/proactive-alerts'),
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
  getByAsset: (assetId: number) => api.get(`/maintenance/asset/${assetId}`),
  getById: (id: number) => api.get(`/maintenance/${id}`),
  reportAll: (params?: any) => api.get('/maintenance/report/all', { params }),
};
