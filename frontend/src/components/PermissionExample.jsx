import React, { useState } from 'react';
import { usePermissions, PERMISSIONS } from '../hooks/usePermissions';
import { Can, DisableIfCannot, HasRole, ROLES } from '../components/PermissionGuard';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Edit, 
  Trash2, 
  Plus, 
  Eye,
  ShieldAlert,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Componente de ejemplo que demuestra el uso del sistema de permisos
 * Este componente muestra diferentes formas de controlar el acceso a funcionalidades
 */
const PermissionExample = () => {
  const {
    role,
    permissions,
    sections,
    hasPermission,
    canAccessSection,
    hasRole,
    loading,
  } = usePermissions();

  const [selectedItem, setSelectedItem] = useState(null);

  // Ejemplo de verificación imperativa
  const handleDelete = (item) => {
    if (!hasPermission(PERMISSIONS.DELETE_MIEMBROS)) {
      toast.error('No tienes permiso para eliminar miembros');
      return;
    }
    
    // Lógica de eliminación
    toast.success(`Miembro ${item.nombre} eliminado`);
  };

  const handleEdit = (item) => {
    if (!hasPermission(PERMISSIONS.EDIT_MIEMBROS)) {
      toast.error('No tienes permiso para editar miembros');
      return;
    }
    
    setSelectedItem(item);
    toast.success('Editando miembro...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const demoMiembros = [
    { id: 1, nombre: 'Juan Pérez', documento: '123456789' },
    { id: 2, nombre: 'María García', documento: '987654321' },
    { id: 3, nombre: 'Pedro López', documento: '456789123' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Información del Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Tu Información de Permisos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Rol Actual:</p>
            <Badge variant="default" className="mt-1 capitalize">
              {role?.replace('_', ' ')}
            </Badge>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Secciones Accesibles:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sections).map(([section, hasAccess]) => (
                <Badge
                  key={section}
                  variant={hasAccess ? "default" : "outline"}
                  className="capitalize"
                >
                  {hasAccess ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {section}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">
              Permisos ({permissions.length}):
            </p>
            <div className="max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {permissions.map((perm) => (
                  <Badge
                    key={perm}
                    variant="outline"
                    className="text-xs"
                  >
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ejemplo 1: Botones Condicionales con <Can> */}
      <Card>
        <CardHeader>
          <CardTitle>Ejemplo 1: Botones Visibles según Permisos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600 mb-4">
            Los botones solo se muestran si tienes el permiso correspondiente:
          </p>
          
          <div className="flex gap-2 flex-wrap">
            {/* Solo visible si puede ver miembros */}
            <Can permission={PERMISSIONS.VIEW_MIEMBROS}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Ver Miembros
              </Button>
            </Can>

            {/* Solo visible si puede crear miembros */}
            <Can permission={PERMISSIONS.CREATE_MIEMBROS}>
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Miembro
              </Button>
            </Can>

            {/* Solo visible si puede editar miembros */}
            <Can permission={PERMISSIONS.EDIT_MIEMBROS}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar Miembro
              </Button>
            </Can>

            {/* Solo visible si puede eliminar miembros */}
            <Can permission={PERMISSIONS.DELETE_MIEMBROS}>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Miembro
              </Button>
            </Can>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Si no ves algún botón, es porque tu rol no tiene ese permiso.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ejemplo 2: Botones Deshabilitados con <DisableIfCannot> */}
      <Card>
        <CardHeader>
          <CardTitle>Ejemplo 2: Botones Deshabilitados sin Permiso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600 mb-4">
            Los botones se muestran pero están deshabilitados si no tienes permiso:
          </p>
          
          <div className="flex gap-2 flex-wrap">
            <DisableIfCannot permission={PERMISSIONS.VIEW_MIEMBROS}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Ver Miembros
              </Button>
            </DisableIfCannot>

            <DisableIfCannot permission={PERMISSIONS.CREATE_MIEMBROS}>
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Miembro
              </Button>
            </DisableIfCannot>

            <DisableIfCannot permission={PERMISSIONS.EDIT_MIEMBROS}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar Miembro
              </Button>
            </DisableIfCannot>

            <DisableIfCannot permission={PERMISSIONS.DELETE_MIEMBROS}>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Miembro
              </Button>
            </DisableIfCannot>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Los botones deshabilitados muestran un cursor "not-allowed" al pasar el mouse.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ejemplo 3: Contenido Condicional por Rol */}
      <Card>
        <CardHeader>
          <CardTitle>Ejemplo 3: Contenido según Rol</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Solo Admin ve esto */}
          <HasRole role={ROLES.ADMIN}>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm font-medium text-purple-900">
                🔐 Contenido exclusivo para ADMIN
              </p>
              <p className="text-sm text-purple-700 mt-1">
                Como administrador, puedes ver estadísticas avanzadas y configuración del sistema.
              </p>
            </div>
          </HasRole>

          {/* Solo Pastor y Secretaria ven esto */}
          <HasRole roles={[ROLES.PASTOR, ROLES.SECRETARIA]}>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                📋 Contenido para Pastor y Secretaria
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Puedes gestionar miembros, grupos y observaciones de la iglesia.
              </p>
            </div>
          </HasRole>

          {/* Solo Agente Restaurante ve esto */}
          <HasRole role={ROLES.AGENTE_RESTAURANTE}>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">
                🍽️ Contenido para Agente de Restaurante
              </p>
              <p className="text-sm text-green-700 mt-1">
                Tienes acceso completo al módulo POS: productos, precios, inventario y reportes.
              </p>
            </div>
          </HasRole>

          {/* Solo Ayudante Restaurante ve esto */}
          <HasRole role={ROLES.AYUDANTE_RESTAURANTE}>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-900">
                🛎️ Contenido para Ayudante de Restaurante
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Puedes crear ventas y consultar cuentas. Acceso limitado por 1 día.
              </p>
            </div>
          </HasRole>
        </CardContent>
      </Card>

      {/* Ejemplo 4: Tabla con Acciones Condicionales */}
      <Card>
        <CardHeader>
          <CardTitle>Ejemplo 4: Tabla con Acciones según Permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium">Nombre</th>
                  <th className="text-left p-3 text-sm font-medium">Documento</th>
                  <th className="text-right p-3 text-sm font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {demoMiembros.map((miembro) => (
                  <tr key={miembro.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm">{miembro.nombre}</td>
                    <td className="p-3 text-sm">{miembro.documento}</td>
                    <td className="p-3 text-sm">
                      <div className="flex justify-end gap-2">
                        {/* Ver - Siempre visible si tiene VIEW_MIEMBROS */}
                        <Can permission={PERMISSIONS.VIEW_MIEMBROS}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.info(`Viendo ${miembro.nombre}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Can>

                        {/* Editar - Solo si tiene EDIT_MIEMBROS */}
                        <Can permission={PERMISSIONS.EDIT_MIEMBROS}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(miembro)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Can>

                        {/* Eliminar - Solo si tiene DELETE_MIEMBROS */}
                        <Can permission={PERMISSIONS.DELETE_MIEMBROS}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(miembro)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Las acciones en la tabla se muestran dinámicamente según tus permisos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ejemplo 5: Verificaciones Imperativas */}
      <Card>
        <CardHeader>
          <CardTitle>Ejemplo 5: Verificación en Código (Imperativa)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            También puedes verificar permisos directamente en funciones:
          </p>

          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-xs">
{`const handleDelete = (item) => {
  if (!hasPermission(PERMISSIONS.DELETE_MIEMBROS)) {
    toast.error('No tienes permiso');
    return;
  }
  
  // Lógica de eliminación
  deleteItem(item.id);
};

const handleCreate = () => {
  if (!hasPermission(PERMISSIONS.CREATE_MIEMBROS)) {
    toast.error('No tienes permiso');
    return;
  }
  
  navigate('/miembros/nuevo');
};`}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (!hasPermission(PERMISSIONS.CREATE_MIEMBROS)) {
                  toast.error('No tienes permiso para crear miembros');
                  return;
                }
                toast.success('Navegando a formulario de creación...');
              }}
            >
              Crear con Verificación
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                if (!hasPermission(PERMISSIONS.DELETE_MIEMBROS)) {
                  toast.error('No tienes permiso para eliminar miembros');
                  return;
                }
                toast.success('Eliminando...');
              }}
            >
              Eliminar con Verificación
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ejemplo 6: Acceso por Sección */}
      <Card>
        <CardHeader>
          <CardTitle>Ejemplo 6: Verificar Acceso a Secciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Verifica si el usuario puede acceder a secciones completas:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries({
              dashboard: '📊 Dashboard',
              miembros: '👥 Miembros',
              grupos: '👨‍👩‍👧‍👦 Grupos',
              pos: '🍽️ Restaurante',
              admin: '⚙️ Administración',
            }).map(([section, label]) => {
              const hasAccess = canAccessSection(section);
              return (
                <div
                  key={section}
                  className={`p-4 rounded-lg border-2 ${
                    hasAccess
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{label}</span>
                    {hasAccess ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {hasAccess ? 'Tienes acceso' : 'Sin acceso'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionExample;
