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

export default api;

// Auth
export const authAPI = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  checkExpiry: (username: string, password: string) => api.post('/auth/check-expiry', { username, password }),
  me: () => api.get('/auth/me'),
};

// Assets
export const assetAPI = {
  list: (params?: any) => api.get('/assets', { params }),
  get: (id: number) => api.get(`/assets/${id}`),
  create: (data: any) => api.post('/assets', data),
  upsert: (data: any) => api.post('/assets/upsert', data),
  update: (id: number, data: any) => api.put(`/assets/${id}`, data),
  delete: (id: number) => api.delete(`/assets/${id}`),
  exportAssets: (type?: string) => api.get('/assets/export/excel', { params: type ? { type } : undefined, responseType: 'blob' }),
  importAssets: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/assets/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadImage: (id: number, formData: FormData) => {
    const token = localStorage.getItem('token');
    return axios.post(`/api/assets/${id}/image`, formData, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
  },
  deleteImage: (id: number) => api.delete(`/assets/${id}/image`),
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
};

// Borrow
export const borrowAPI = {
  createRequest: (data: any) => api.post('/borrow/requests', data),
  myRequests: (params?: any) => api.get('/borrow/requests', { params }),
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
  plans: (params?: any) => api.get('/pm/plans', { params }),
  createPlan: (data: any) => api.post('/pm/plans', data),
  generate: (planId: number) => api.post(`/pm/plans/${planId}/generate`),
  runs: (params?: any) => api.get('/pm/runs', { params }),
  performRun: (runId: number, data: any) => api.post(`/pm/runs/${runId}/perform`, data),
  dashboard: (params?: any) => api.get('/pm/dashboard', { params }),
};

// Admin
export const adminAPI = {
  users: (params?: any) => api.get('/admin/users', { params }),
  searchADUsers: (q: string) => api.get('/admin/users/search-ad', { params: { q } }),
  createUserFromAD: (data: any) => api.post('/admin/users/from-ad', data),
  updateRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  toggleActive: (id: number) => api.put(`/admin/users/${id}/toggle-active`),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  settings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  notificationTemplates: () => api.get('/admin/notification-templates'),
  updateNotificationTemplate: (id: number, data: any) => api.put(`/admin/notification-templates/${id}`, data),
  notificationLogs: (params?: any) => api.get('/admin/notification-logs', { params }),
};

// Dashboard
export const dashboardAPI = {
  assetSummary: () => api.get('/dashboard/asset-summary'),
  borrowSummary: () => api.get('/dashboard/borrow-summary'),
  pmSummary: () => api.get('/dashboard/pm-summary'),
  recentActivity: () => api.get('/dashboard/recent-activity'),
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
