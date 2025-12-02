import React from 'react';
import { usePermissions, PERMISSIONS, ROLES } from '../hooks/usePermissions';
import { Can, HasRole } from '../components/PermissionGuard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  TrendingUp,
  Users,
  Settings,
  FileText,
  Clock,
  AlertCircle
} from 'lucide-react';

const POS = () => {
  const { role, hasPermission } = usePermissions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🍽️ Módulo de Restaurante (POS)
          </h1>
          <p className="text-gray-600 mt-2">
            Sistema de punto de venta para el restaurante de la iglesia
          </p>
        </div>
        <Badge variant="default" className="capitalize text-lg px-4 py-2">
          {role?.replace('_', ' ')}
        </Badge>
      </div>

      {/* Información de desarrollo */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">
                Módulo en Desarrollo
              </p>
              <p className="text-sm text-blue-700 mt-1">
                El módulo POS está actualmente en desarrollo. Aquí se implementarán todas las funcionalidades del restaurante.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funcionalidades disponibles según rol */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Ventas */}
        <Can permission={PERMISSIONS.CREATE_SALES}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-green-600" />
                Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Crear y gestionar ventas del restaurante
              </p>
              <Button className="w-full" disabled>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Próximamente
              </Button>
            </CardContent>
          </Card>
        </Can>

        {/* Productos */}
        <Can permission={PERMISSIONS.VIEW_POS}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Ver y gestionar el catálogo de productos
              </p>
              <Button className="w-full" variant="outline" disabled>
                <Package className="h-4 w-4 mr-2" />
                Próximamente
              </Button>
            </CardContent>
          </Card>
        </Can>

        {/* Cuentas de Miembros */}
        <Can permission={PERMISSIONS.VIEW_MEMBER_ACCOUNTS}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Cuentas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Consultar cuentas y saldos de miembros
              </p>
              <Button className="w-full" variant="outline" disabled>
                <Users className="h-4 w-4 mr-2" />
                Próximamente
              </Button>
            </CardContent>
          </Card>
        </Can>

        {/* Gestión de Productos (Solo agente) */}
        <Can permission={PERMISSIONS.MANAGE_PRODUCTS}>
          <Card className="hover:shadow-lg transition-shadow border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-600" />
                Gestión de Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Crear, editar y eliminar productos
              </p>
              <Button className="w-full" variant="outline" disabled>
                <Settings className="h-4 w-4 mr-2" />
                Próximamente
              </Button>
            </CardContent>
          </Card>
        </Can>

        {/* Precios (Solo agente) */}
        <Can permission={PERMISSIONS.EDIT_PRICES}>
          <Card className="hover:shadow-lg transition-shadow border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-600" />
                Gestión de Precios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Actualizar precios de productos
              </p>
              <Button className="w-full" variant="outline" disabled>
                <DollarSign className="h-4 w-4 mr-2" />
                Próximamente
              </Button>
            </CardContent>
          </Card>
        </Can>

        {/* Caja/Turnos (Solo agente) */}
        <Can permission={PERMISSIONS.OPEN_SHIFT}>
          <Card className="hover:shadow-lg transition-shadow border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Gestión de Caja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Abrir y cerrar turnos de caja
              </p>
              <Button className="w-full" variant="outline" disabled>
                <Clock className="h-4 w-4 mr-2" />
                Próximamente
              </Button>
            </CardContent>
          </Card>
        </Can>

        {/* Reportes (Solo agente) */}
        <Can permission={PERMISSIONS.VIEW_SALES_REPORTS}>
          <Card className="hover:shadow-lg transition-shadow border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Reportes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Ver reportes de ventas y estadísticas
              </p>
              <Button className="w-full" variant="outline" disabled>
                <FileText className="h-4 w-4 mr-2" />
                Próximamente
              </Button>
            </CardContent>
          </Card>
        </Can>

        {/* Inventario */}
        <Can permission={PERMISSIONS.VIEW_INVENTORY}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Inventario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Consultar stock disponible
              </p>
              <Button className="w-full" variant="outline" disabled>
                <TrendingUp className="h-4 w-4 mr-2" />
                Próximamente
              </Button>
            </CardContent>
          </Card>
        </Can>
      </div>

      {/* Información sobre permisos */}
      <HasRole roles={[ROLES.AYUDANTE_RESTAURANTE]}>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">
                  Acceso Limitado - Ayudante de Restaurante
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Como ayudante, tienes acceso limitado a las funciones básicas del POS. 
                  No puedes modificar precios, gestionar productos o acceder a reportes completos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </HasRole>

      {/* Referencias */}
      <Card>
        <CardHeader>
          <CardTitle>📚 Documentación de Implementación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600">
            Para implementar las funcionalidades del POS, consulta:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
            <li>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">FRONTEND_POS_GUIDE.md</code> - 
              Guía completa de implementación del frontend
            </li>
            <li>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">backend/routes/products.py</code> - 
              Endpoints de productos, ventas y turnos
            </li>
            <li>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">backend/routes/pos_reportes.py</code> - 
              Endpoints de inventario y reportes
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default POS;
