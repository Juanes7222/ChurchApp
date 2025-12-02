import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Componente que solo renderiza sus hijos si el usuario tiene el permiso requerido
 */
export const Can = ({ permission, permissions, children, fallback = null }) => {
  const { hasPermission, hasAnyPermission, loading } = usePermissions();

  if (loading) {
    return null;
  }

  // Si se especifica un solo permiso
  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  // Si se especifica un array de permisos (requiere AL MENOS UNO)
  if (permissions && !hasAnyPermission(permissions)) {
    return fallback;
  }

  return <>{children}</>;
};

/**
 * Componente que solo renderiza sus hijos si el usuario puede acceder a la sección
 */
export const CanAccessSection = ({ section, children, fallback = null }) => {
  const { canAccessSection, loading } = usePermissions();

  if (loading) {
    return null;
  }

  if (!canAccessSection(section)) {
    return fallback;
  }

  return <>{children}</>;
};

/**
 * HOC que protege una ruta verificando permisos
 */
export const ProtectedRoute = ({ 
  permission, 
  permissions, 
  section,
  role,
  roles,
  children, 
  redirectTo = '/dashboard',
  fallback = null 
}) => {
  const { 
    hasPermission, 
    hasAnyPermission, 
    canAccessSection,
    hasRole,
    hasAnyRole,
    loading 
  } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Verificar rol específico
  if (role && !hasRole(role)) {
    return fallback || <Navigate to={redirectTo} replace />;
  }

  // Verificar al menos uno de los roles
  if (roles && !hasAnyRole(roles)) {
    return fallback || <Navigate to={redirectTo} replace />;
  }

  // Verificar permiso específico
  if (permission && !hasPermission(permission)) {
    return fallback || <Navigate to={redirectTo} replace />;
  }

  // Verificar al menos uno de los permisos
  if (permissions && !hasAnyPermission(permissions)) {
    return fallback || <Navigate to={redirectTo} replace />;
  }

  // Verificar acceso a sección
  if (section && !canAccessSection(section)) {
    return fallback || <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

/**
 * Componente que muestra contenido solo si el usuario tiene un rol específico
 */
export const HasRole = ({ role, roles, children, fallback = null }) => {
  const { hasRole: checkRole, hasAnyRole, loading } = usePermissions();

  if (loading) {
    return null;
  }

  // Si se especifica un solo rol
  if (role && !checkRole(role)) {
    return fallback;
  }

  // Si se especifica un array de roles
  if (roles && !hasAnyRole(roles)) {
    return fallback;
  }

  return <>{children}</>;
};

/**
 * Componente que deshabilita un botón/input si el usuario no tiene permiso
 */
export const DisableIfCannot = ({ permission, permissions, children, className = '' }) => {
  const { hasPermission, hasAnyPermission } = usePermissions();

  let canPerform = true;

  if (permission && !hasPermission(permission)) {
    canPerform = false;
  }

  if (permissions && !hasAnyPermission(permissions)) {
    canPerform = false;
  }

  return React.cloneElement(children, {
    disabled: !canPerform,
    className: `${children.props.className || ''} ${!canPerform ? 'opacity-50 cursor-not-allowed' : ''}`,
    title: !canPerform ? 'No tienes permisos para esta acción' : children.props.title,
  });
};

/**
 * Hook personalizado para verificar permisos de forma imperativa
 */
export const useCanPerform = () => {
  const permissions = usePermissions();

  const canPerform = (permission) => {
    return permissions.hasPermission(permission);
  };

  const canPerformAny = (permissionList) => {
    return permissions.hasAnyPermission(permissionList);
  };

  const canPerformAll = (permissionList) => {
    return permissions.hasAllPermissions(permissionList);
  };

  return {
    canPerform,
    canPerformAny,
    canPerformAll,
    ...permissions,
  };
};
