
import { authBridge } from './authBridge';

// Use Vite env var when available; fallback to runtime detection or localhost
// Ensure the base URL ends with `/api` so frontend requests target the API routes.
const buildTimeBackend = (import.meta as any).env?.VITE_BACKEND_URL;
let rawBackend = buildTimeBackend || '';
if (!rawBackend) {
  try {
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    // If served from a real host (not localhost) assume API is co-located under the same origin
    if (origin && !/localhost|127\.0\.0\.1/.test(origin)) {
      rawBackend = origin;
    } else {
      rawBackend = 'https://gestockprov1-1-9-fevrier.onrender.com';
      //rawBackend = 'http://localhost:3000'; // During development, point to local backend
    }
  } catch (e) {
    //rawBackend = 'http://localhost:3000';
    rawBackend = 'https://gestockprov1-1-9-fevrier.onrender.com';
  }
}
//const rawBackend = (import.meta as any).env?.VITE_BACKEND_URL || 'https://gestockprov1-1-9-fevrier.onrender.com';
const BACKEND_URL = rawBackend.endsWith('/api') ? rawBackend : `${rawBackend.replace(/\/+$/, '')}/api`;

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const session = authBridge.getSession();
    
    // Ne pas définir Content-Type si headers est un objet vide (pour FormData)
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(session?.token ? { 'Authorization': `Bearer ${session.token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Construction d'une erreur riche basée sur la réponse du Kernel
        const errorContext: ApiError = {
          error: data.error || 'UnknownError',
          message: data.message || 'Une erreur inattendue est survenue sur le serveur.',
          status: response.status
        };
        
        // Gestion spécifique des sessions expirées
        if (response.status === 401 || response.status === 403) {
          if (data.message?.toLowerCase().includes('expirée')) {
            authBridge.clearSession();
            window.location.reload();
          }
        }

        throw errorContext;
      }

      return data;
    } catch (err: any) {
      if (err.status) throw err; // C'est déjà une ApiError
      
      // Erreur réseau (Backend injoignable)
      throw {
        error: 'NetworkError',
        message: 'Impossible de joindre le Kernel AlwaysData. Vérifiez votre connexion internet.',
        status: 0
      } as ApiError;
    }
  },

  get: (e: string) => apiClient.request(e, { method: 'GET' }),
  post: (e: string, b: any) => apiClient.request(e, { method: 'POST', body: JSON.stringify(b) }),
  put: (e: string, b: any) => apiClient.request(e, { method: 'PUT', body: JSON.stringify(b) }),
  patch: (e: string, b?: any) => apiClient.request(e, { method: 'PATCH', body: b ? JSON.stringify(b) : undefined }),
  delete: (e: string) => apiClient.request(e, { method: 'DELETE' }),
};

// Compatibility helper: returns the raw fetch Response so existing components can call `res.json()`
export async function fetchWithToken(endpoint: string, options: RequestInit = {}) {
  const session = authBridge.getSession();
  const headers: any = {
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...options.headers,
  };

  return fetch(`${BACKEND_URL}${endpoint}`, { ...options, headers });
}

// ============== LEAVE (CONGÉS) API ==============
export const leaveApi = {
  getAll: (params?: {
    employeeId?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortDir?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return apiClient.get(`/hr/leaves${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => apiClient.get(`/hr/leaves/${id}`),

  create: (data: {
    employeeId: string;
    type: 'PAID' | 'SICK' | 'MATERNITY' | 'UNPAID' | 'ANNUAL';
    startDate: string;
    endDate: string;
    reason?: string;
    document?: File;
  } | FormData) => {
    // Si c'est déjà un FormData, l'utiliser directement
    if (data instanceof FormData) {
      console.log('📎 API reçoit FormData directement');
      return apiClient.request('/hr/leaves', {
        method: 'POST',
        body: data,
        headers: {} // Laisser le navigateur gérer Content-Type pour FormData
      });
    }
    
    // Si un document est fourni dans l'objet, utiliser FormData
    if (data.document) {
      const formData = new FormData();
      formData.append('employeeId', data.employeeId);
      formData.append('type', data.type);
      formData.append('startDate', data.startDate);
      formData.append('endDate', data.endDate);
      if (data.reason) formData.append('reason', data.reason);
      formData.append('document', data.document);

      console.log('📎 API crée FormData depuis objet avec document');
      return apiClient.request('/hr/leaves', {
        method: 'POST',
        body: formData,
        headers: {} // Laisser le navigateur gérer Content-Type pour FormData
      });
    } else {
      // Sinon, utiliser JSON classique
      console.log('📎 API utilise JSON classique');
      return apiClient.post('/hr/leaves', {
        employeeId: data.employeeId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason
      });
    }
  },

  update: (id: string, data: FormData | Partial<{
    employeeId: string;
    type: 'PAID' | 'SICK' | 'MATERNITY' | 'UNPAID' | 'ANNUAL';
    startDate: string;
    endDate: string;
    reason?: string;
  }>) => {
    // Si data est FormData, utiliser la requête avec FormData
    if (data instanceof FormData) {
      return apiClient.request(`/hr/leaves/${id}`, {
        method: 'PUT',
        body: data,
        headers: {} // Laisser le navigateur gérer Content-Type pour FormData
      });
    } else {
      // Sinon, utiliser JSON classique
      return apiClient.put(`/hr/leaves/${id}`, data);
    }
  },

  approve: (id: string, rejectionReason?: string) => 
    apiClient.post(`/hr/leaves/${id}/approve`, { rejectionReason }),

  delete: (id: string) => apiClient.delete(`/hr/leaves/${id}`),
};

// ============== EMPLOYEE API (for Leave form) ==============
export const employeeApi = {
  getAll: () => apiClient.get('/hr/employees'),
  getById: (id: string) => apiClient.get(`/hr/employees/${id}`),
};

// Export apiClient as api for convenience
export const api = apiClient;
