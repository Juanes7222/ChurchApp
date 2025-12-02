import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

// Cache global para evitar múltiples llamadas al API
let permissionsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Hook para gestionar permisos del usuario actual
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    role: null,
    permissions: [],
    sections: {
      dashboard: false,
      miembros: false,
      grupos: false,
      pos: false,
      admin: false,
    },
    loading: true,
    error: null,
  });
  
  const fetchedRef = useRef(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions({
          role: null,
          permissions: [],
          sections: {
            dashboard: false,
            miembros: false,
            grupos: false,
            pos: false,
            admin: false,
          },
          loading: false,
          error: null,
        });
        return;
      }

      // Verificar si hay cache válido
      const now = Date.now();
      if (permissionsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        setPermissions({
          ...permissionsCache,
          loading: false,
          error: null,
        });
        return;
      }

      // Evitar múltiples llamadas simultáneas
      if (fetchedRef.current) {
        return;
      }
      fetchedRef.current = true;

      try {
        const response = await api.get('/auth/permissions');
        const permData = {
          ...response.data,
          loading: false,
          error: null,
        };
        
        // Guardar en cache
        permissionsCache = response.data;
        cacheTimestamp = Date.now();
        
        setPermissions(permData);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      } finally {
        fetchedRef.current = false;
      }
    };

    fetchPermissions();
  }, [user]);

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const hasPermission = (permission) => {
    return permissions.permissions.includes(permission);
  };

  /**
   * Verifica si el usuario tiene al menos uno de los permisos
   */
  const hasAnyPermission = (permissionList) => {
    return permissionList.some(perm => permissions.permissions.includes(perm));
  };

  /**
   * Verifica si el usuario tiene todos los permisos
   */
  const hasAllPermissions = (permissionList) => {
    return permissionList.every(perm => permissions.permissions.includes(perm));
  };

  /**
   * Verifica si el usuario puede acceder a una sección
   */
  const canAccessSection = (section) => {
    return permissions.sections[section] === true;
  };

  /**
   * Verifica si el usuario tiene un rol específico
   */
  const hasRole = (role) => {
    return permissions.role === role;
  };

  /**
   * Verifica si el usuario tiene al menos uno de los roles
   */
  const hasAnyRole = (roleList) => {
    return roleList.includes(permissions.role);
  };

  return {
    ...permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessSection,
    hasRole,
    hasAnyRole,
  };
};

// Función para limpiar el cache (útil al hacer logout)
export const clearPermissionsCache = () => {
  permissionsCache = null;
  cacheTimestamp = null;
};

/**
 * Constantes de permisos (sincronizadas con el backend)
 */
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',
  
  // Miembros
  VIEW_MIEMBROS: 'view_miembros',
  CREATE_MIEMBROS: 'create_miembros',
  EDIT_MIEMBROS: 'edit_miembros',
  DELETE_MIEMBROS: 'delete_miembros',
  
  // Grupos
  VIEW_GRUPOS: 'view_grupos',
  CREATE_GRUPOS: 'create_grupos',
  EDIT_GRUPOS: 'edit_grupos',
  DELETE_GRUPOS: 'delete_grupos',
  
  // Observaciones
  VIEW_OBSERVACIONES: 'view_observaciones',
  CREATE_OBSERVACIONES: 'create_observaciones',
  EDIT_OBSERVACIONES: 'edit_observaciones',
  DELETE_OBSERVACIONES: 'delete_observaciones',
  
  // POS - Gestión
  VIEW_POS: 'view_pos',
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_CATEGORIES: 'manage_categories',
  EDIT_PRICES: 'edit_prices',
  VIEW_INVENTORY: 'view_inventory',
  MANAGE_INVENTORY: 'manage_inventory',
  
  // POS - Operaciones
  CREATE_SALES: 'create_sales',
  VIEW_SALES: 'view_sales',
  CANCEL_SALES: 'cancel_sales',
  VIEW_MEMBER_ACCOUNTS: 'view_member_accounts',
  MANAGE_PAYMENTS: 'manage_payments',
  
  // POS - Caja
  OPEN_SHIFT: 'open_shift',
  CLOSE_SHIFT: 'close_shift',
  VIEW_SHIFT_SUMMARY: 'view_shift_summary',
  
  // POS - Reportes
  VIEW_SALES_REPORTS: 'view_sales_reports',
  VIEW_INVENTORY_REPORTS: 'view_inventory_reports',
  VIEW_ACCOUNTS_REPORTS: 'view_accounts_reports',
  
  // Administración
  MANAGE_USERS: 'manage_users',
  MANAGE_INVITES: 'manage_invites',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_TEMP_USERS: 'manage_temp_users',
};

/**
 * Constantes de roles
 */
export const ROLES = {
  ADMIN: 'admin',
  PASTOR: 'pastor',
  SECRETARIA: 'secretaria',
  AGENTE_RESTAURANTE: 'agente_restaurante',
  AYUDANTE_RESTAURANTE: 'ayudante_restaurante',
  TI: 'ti',
};
