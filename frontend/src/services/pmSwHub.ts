import api from './api';

export interface PMSwHubItem {
  id: number;
  pmSwHubId: number;
  category: string;
  checkItem: string;
  status: string | null;
  note: string | null;
  resolveStatus: string | null;
  resolvedAt: string | null;
}

export interface PMSwHub {
  id: number;
  formId: string;
  floor: string;
  date: string;
  technician: string;
  period: string;
  remark: string | null;
  signTech: string | null;
  signMgr: string | null;
  status: string;
  photoBeforeUrl: string | null;
  photoAfterUrl: string | null;
  createdAt: string;
  updatedAt: string;
  items: PMSwHubItem[];
}

export interface PMSwHubTemplateItem {
  id?: number;
  templateId?: number;
  group: string;
  key: string;
  label: string;
  type: string;
  required?: boolean;
  order: number;
}

export interface PMSwHubTemplate {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  items: PMSwHubTemplateItem[];
}

export interface PMSwHubPlan {
  id: number;
  year: number;
  floor: string;
  period: string;
  startDate: string | null;
  endDate: string | null;
  technician: string | null;
  status: string;
  templateId: number | null;
  template?: PMSwHubTemplate | null;
}

export const pmSwHubService = {
  getAll: async () => {
    const response = await api.get<PMSwHub[]>('/pm-sw-hub');
    return response.data;
  },

  getByPlanId: async (planId: number) => {
    const response = await api.get<PMSwHub>(`/pm-sw-hub/by-plan/${planId}`);
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<PMSwHub>(`/pm-sw-hub/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<PMSwHub>('/pm-sw-hub', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put<PMSwHub>(`/pm-sw-hub/${id}`, data);
    return response.data;
  },

  uploadImage: async (id: number, file: File, type: 'BEFORE' | 'AFTER') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);
    const response = await api.post<PMSwHub>(`/pm-sw-hub/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  uploadTempImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<{imageUrl: string}>(`/pm-sw-hub/upload-temp`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  resolveItem: async (itemId: number, resolveStatus: string) => {
    const response = await api.patch<PMSwHubItem>(`/pm-sw-hub/item/${itemId}/resolve`, { resolveStatus });
    return response.data;
  }
};

export const pmSwHubPlanService = {
  getAll: async () => {
    const response = await api.get<PMSwHubPlan[]>('/pm-sw-hub-plan');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<PMSwHubPlan>('/pm-sw-hub-plan', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put<PMSwHubPlan>(`/pm-sw-hub-plan/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/pm-sw-hub-plan/${id}`);
    return response.data;
  }
};

export const pmSwHubTemplateService = {
  getAll: async () => {
    const response = await api.get<PMSwHubTemplate[]>('/pm-sw-hub-template');
    return response.data;
  },

  getActive: async () => {
    const response = await api.get<PMSwHubTemplate>('/pm-sw-hub-template/active');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<PMSwHubTemplate>(`/pm-sw-hub-template/${id}`);
    return response.data;
  },
  
  save: async (data: any) => {
    const response = await api.post<PMSwHubTemplate>('/pm-sw-hub-template/save', data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/pm-sw-hub-template/${id}`);
    return response.data;
  }
};
