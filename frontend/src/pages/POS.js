import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions, PERMISSIONS, ROLES } from '../hooks/usePermissions';
import { Can, HasRole } from '../components/PermissionGuard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import usePOSStore from '../stores/posStore';
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  TrendingUp,
  Users,
  Settings,
  FileText,
  Clock,
  AlertCircle,
  Play
} from 'lucide-react';

const POS = () => {
  const navigate = useNavigate();
  const { role, hasPermission } = usePermissions();
  const currentShift = usePOSStore(state => state.currentShift);
  const loadActiveShift = usePOSStore(state => state.loadActiveShift);
  
  // Cargar turno activo al montar el componente
  useEffect(() => {
    loadActiveShift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Estado del turno */}
      {currentShift ? (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Play className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900">
                  Turno Activo
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Puedes realizar ventas. El turno se abrió el {new Date(currentShift.apertura_fecha).toLocaleString('es-ES')}.
                </p>
              </div>
              <Button onClick={() => navigate('/pos/ventas')}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ir a Ventas
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900">
                  No hay turno activo
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Debes abrir un turno de caja antes de poder realizar ventas.
                </p>
              </div>
              <Can permission={PERMISSIONS.OPEN_SHIFT}>
                <Button onClick={() => navigate('/pos/turnos')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Abrir Turno
                </Button>
              </Can>
            </div>
          </CardContent>
        </Card>
      )}

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
              <Button 
                className="w-full" 
                onClick={() => navigate('/pos/ventas')}
                disabled={!currentShift}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {currentShift ? 'Ir a Ventas' : 'Requiere turno activo'}
              </Button>
            </CardContent>
          </Card>
        </Can>

        {/* Productos e Inventario - SOLO UNA TARJETA */}
        <Can permission={PERMISSIONS.VIEW_POS}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Productos e Inventario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Catálogo, precios y stock de productos
              </p>
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={() => navigate('/pos/productos')}
              >
                <Package className="h-4 w-4 mr-2" />
                Ver Productos
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
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={() => navigate('/pos/cuentas')}
              >
                <Users className="h-4 w-4 mr-2" />
                Ver Cuentas
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
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={() => navigate('/pos/turnos')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Gestionar Turnos
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
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={() => navigate('/pos/reportes')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Ver Reportes
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
    </div>
  );
};

export default POS;