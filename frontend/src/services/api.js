/**
 * API Service - Comunicación con backend
 * Incluye manejo de errores, retry logic y modo offline
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Configuración de axios
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pos_token');
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
      // Token expirado o inválido
      localStorage.removeItem('pos_token');
      window.location.href = '/pos/login';
    }
    return Promise.reject(error);
  }
);

// ============= AUTH =============

export const loginTempUser = async (username, pin, shiftUuid) => {
  const response = await api.post('/pos/pos/login-temp', null, {
    params: { username, pin, shift_uuid: shiftUuid }
  });
  
  if (response.data.access_token) {
    localStorage.setItem('pos_token', response.data.access_token);
  }
  
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('pos_token');
  localStorage.removeItem('current_shift');
  localStorage.removeItem('vendedor_info');
};

// ============= PRODUCTOS =============

export const fetchProductos = async (params = {}) => {
  const response = await api.get('/pos/productos', { params });
  return response.data.productos || response.data;
};

export const fetchCategorias = async () => {
  const response = await api.get('/pos/categorias');
  return response.data.categorias || response.data;
};

// ============= VENTAS =============

export const createVenta = async (ventaData) => {
  const response = await api.post('/pos/ventas', ventaData);
  return response.data;
};

export const fetchVentas = async (params = {}) => {
  const response = await api.get('/pos/ventas', { params });
  return response.data;
};

export const getVentaDetail = async (ventaUuid) => {
  const response = await api.get(`/pos/ventas/${ventaUuid}`);
  return response.data;
};

export const anularVenta = async (ventaUuid, motivo) => {
  const response = await api.post(`/pos/ventas/${ventaUuid}/anular`, null, {
    params: { motivo }
  });
  return response.data;
};

// ============= SHIFTS =============

export const fetchShifts = async (params = {}) => {
  const response = await api.get('/pos/caja-shifts', { params });
  return response.data.shifts || response.data;
};

export const getShiftSummary = async (shiftUuid) => {
  const response = await api.get(`/pos/caja-shifts/${shiftUuid}/summary`);
  return response.data;
};

export const closeShift = async (shiftUuid, efectivoRecuento, notas = null) => {
  const response = await api.post(`/pos/caja-shifts/${shiftUuid}/cerrar`, null, {
    params: { efectivo_recuento: efectivoRecuento, notas }
  });
  return response.data;
};

// ============= MIEMBROS (para fiado) =============

export const searchMiembros = async (query) => {
  const response = await api.get('/miembros', {
    params: { q: query, page_size: 10 }
  });
  return response.data.miembros || [];
};

export const getMiembroCuenta = async (miembroUuid) => {
  const response = await api.get(`/pos/reportes/cuentas-pendientes`);
  const cuentas = response.data.cuentas || [];
  return cuentas.find(c => c.miembro_uuid === miembroUuid);
};

// ============= SINCRONIZACIÓN =============

export const syncPushVentas = async (ventas) => {
  const response = await api.post('/pos/sync/push', { ventas });
  return response.data;
};

export const getSyncPending = async () => {
  const response = await api.get('/pos/sync/pending');
  return response.data;
};

// ============= INVENTARIO =============

export const fetchInventario = async (params = {}) => {
  const response = await api.get('/pos/inventario', { params });
  return response.data.inventario || response.data;
};

// ============= REPORTES =============

export const getReporteVentas = async (params = {}) => {
  const response = await api.get('/pos/reportes/ventas', { params });
  return response.data;
};

export const getReporteCuentasPendientes = async (params = {}) => {
  const response = await api.get('/pos/reportes/cuentas-pendientes', { params });
  return response.data;
};

export default api;
