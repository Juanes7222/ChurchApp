import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const TOKEN_KEY = 'auth_token'; // Cambiado de 'pos_token' a 'auth_token' para consistencia
const SHIFT_KEY = 'current_shift';
const VENDEDOR_KEY = 'vendedor_info';

// Endpoints base
const ENDPOINTS = {
  AUTH: '/api/pos/pos',
  POS: '/api/pos',
  MIEMBROS: '/api/miembros',
  SYNC: '/api/pos/sync',
  REPORTES: '/api/pos/reportes',
};

// Configuración de axios
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Utilidades para manejo de tokens
const tokenManager = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SHIFT_KEY);
    localStorage.removeItem(VENDEDOR_KEY);
  },
};

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenManager.remove();
      window.location.href = '/pos/login';
    }
    return Promise.reject(error);
  }
);

// ============= AUTH =============

export const authService = {
  loginTempUser: async (username, pin, shiftUuid) => {
    const response = await api.post(`${ENDPOINTS.AUTH}/login-temp`, null, {
      params: { username, pin, shift_uuid: shiftUuid }
    });
    
    if (response.data.access_token) {
      tokenManager.set(response.data.access_token);
    }
    
    return response.data;
  },

  logout: () => {
    tokenManager.remove();
  },
};

// ============= PRODUCTOS =============

export const productosService = {
  getAll: async (params = {}) => {
    const response = await api.get(`${ENDPOINTS.POS}/productos`, { params });
    return response.data.productos || response.data;
  },

  getCategorias: async () => {
    const response = await api.get(`${ENDPOINTS.POS}/categorias`);
    return response.data.categorias || response.data;
  },
};

// ============= VENTAS =============

export const ventasService = {
  create: async (ventaData) => {
    const response = await api.post(`${ENDPOINTS.POS}/ventas`, ventaData);
    return response.data;
  },

  getAll: async (params = {}) => {
    const response = await api.get(`${ENDPOINTS.POS}/ventas`, { params });
    return response.data;
  },

  getById: async (ventaUuid) => {
    const response = await api.get(`${ENDPOINTS.POS}/ventas/${ventaUuid}`);
    return response.data;
  },

  anular: async (ventaUuid, motivo) => {
    const response = await api.post(`${ENDPOINTS.POS}/ventas/${ventaUuid}/anular`, null, {
      params: { motivo }
    });
    return response.data;
  },
};

// ============= SHIFTS =============

export const shiftsService = {
  getAll: async (params = {}) => {
    const response = await api.get(`${ENDPOINTS.POS}/caja-shifts`, { params });
    return response.data.shifts || response.data;
  },

  getSummary: async (shiftUuid) => {
    const response = await api.get(`${ENDPOINTS.POS}/caja-shifts/${shiftUuid}/summary`);
    return response.data;
  },

  close: async (shiftUuid, efectivoRecuento, notas = null) => {
    const response = await api.post(`${ENDPOINTS.POS}/caja-shifts/${shiftUuid}/cerrar`, null, {
      params: { efectivo_recuento: efectivoRecuento, notas }
    });
    return response.data;
  },
};

// ============= MIEMBROS (para fiado) =============

export const miembrosService = {
  search: async (query) => {
    const response = await api.get(ENDPOINTS.MIEMBROS, {
      params: { q: query, page_size: 10 }
    });
    return response.data.miembros || [];
  },

  getCuenta: async (miembroUuid) => {
    const response = await api.get(`${ENDPOINTS.REPORTES}/cuentas-pendientes`);
    const cuentas = response.data.cuentas || [];
    return cuentas.find(c => c.miembro_uuid === miembroUuid);
  },
};

// ============= SINCRONIZACIÓN =============

export const syncService = {
  pushVentas: async (ventas) => {
    const response = await api.post(`${ENDPOINTS.SYNC}/push`, { ventas });
    return response.data;
  },

  getPending: async () => {
    const response = await api.get(`${ENDPOINTS.SYNC}/pending`);
    return response.data;
  },
};

// ============= INVENTARIO =============

export const inventarioService = {
  getAll: async (params = {}) => {
    const response = await api.get(`${ENDPOINTS.POS}/inventario`, { params });
    return response.data.inventario || response.data;
  },
};

// ============= REPORTES =============

export const reportesService = {
  getVentas: async (params = {}) => {
    const response = await api.get(`${ENDPOINTS.REPORTES}/ventas`, { params });
    return response.data;
  },

  getCuentasPendientes: async (params = {}) => {
    const response = await api.get(`${ENDPOINTS.REPORTES}/cuentas-pendientes`, { params });
    return response.data;
  },
};

// Exportaciones legacy para compatibilidad (puedes eliminarlas después de actualizar imports)
export const loginTempUser = authService.loginTempUser;
export const logout = authService.logout;
export const fetchProductos = productosService.getAll;
export const fetchCategorias = productosService.getCategorias;
export const createVenta = ventasService.create;
export const fetchVentas = ventasService.getAll;
export const getVentaDetail = ventasService.getById;
export const anularVenta = ventasService.anular;
export const fetchShifts = shiftsService.getAll;
export const getShiftSummary = shiftsService.getSummary;
export const closeShift = shiftsService.close;
export const searchMiembros = miembrosService.search;
export const getMiembroCuenta = miembrosService.getCuenta;
export const syncPushVentas = syncService.pushVentas;
export const getSyncPending = syncService.getPending;
export const fetchInventario = inventarioService.getAll;
export const getReporteVentas = reportesService.getVentas;
export const getReporteCuentasPendientes = reportesService.getCuentasPendientes;

export default api;