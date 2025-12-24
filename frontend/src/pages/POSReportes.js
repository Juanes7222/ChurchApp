import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { 
  ArrowLeft, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Package,
  Calendar,
  RefreshCcw,
  BarChart3,
  CreditCard,
  Users
} from 'lucide-react';

// API functions
const fetchReporteVentas = async (fechaDesde, fechaHasta) => {
  const params = new URLSearchParams();
  if (fechaDesde) params.append('fecha_desde', fechaDesde);
  if (fechaHasta) params.append('fecha_hasta', fechaHasta);
  const { data } = await api.get(`/pos/reportes/ventas?${params.toString()}`);
  return data;
};

const fetchReporteProductos = async (fechaDesde, fechaHasta) => {
  const params = new URLSearchParams();
  if (fechaDesde) params.append('fecha_desde', fechaDesde);
  if (fechaHasta) params.append('fecha_hasta', fechaHasta);
  const { data } = await api.get(`/pos/reportes/productos?${params.toString()}`);
  return data;
};

const fetchReporteDeudas = async () => {
  const { data } = await api.get('/pos/reportes/deudas');
  return data;
};

const POSReportes = () => {
  const navigate = useNavigate();
  
  // Fechas por defecto: último mes
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  
  const [fechaDesde, setFechaDesde] = useState(lastMonth.toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(today.toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('ventas');

  // Query para reporte de ventas
  const { 
    data: reporteVentas, 
    isLoading: loadingVentas,
    refetch: refetchVentas 
  } = useQuery({
    queryKey: ['reporte-ventas', fechaDesde, fechaHasta],
    queryFn: () => fetchReporteVentas(fechaDesde, fechaHasta),
  });

  // Query para reporte de productos
  const { 
    data: reporteProductos, 
    isLoading: loadingProductos,
    refetch: refetchProductos 
  } = useQuery({
    queryKey: ['reporte-productos', fechaDesde, fechaHasta],
    queryFn: () => fetchReporteProductos(fechaDesde, fechaHasta),
  });

  // Query para reporte de deudas
  const { 
    data: reporteDeudas, 
    isLoading: loadingDeudas,
    refetch: refetchDeudas 
  } = useQuery({
    queryKey: ['reporte-deudas'],
    queryFn: () => fetchReporteDeudas(),
  });

  const handleRefresh = () => {
    refetchVentas();
    refetchProductos();
    refetchDeudas();
  };

  const formatCurrency = (value) => {
    return `$${(value || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/pos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-orange-600" />
              Reportes del POS
            </h1>
            <p className="text-gray-600">Estadísticas y reportes de ventas</p>
          </div>
        </div>
        <Button onClick={handleRefresh}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Filtros de fecha */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="fechaDesde">Desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="mt-1 w-40"
              />
            </div>
            <div>
              <Label htmlFor="fechaHasta">Hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="mt-1 w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setFechaDesde(today.toISOString().split('T')[0]);
                  setFechaHasta(today.toISOString().split('T')[0]);
                }}
              >
                Hoy
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setFechaDesde(weekAgo.toISOString().split('T')[0]);
                  setFechaHasta(today.toISOString().split('T')[0]);
                }}
              >
                Última semana
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                  setFechaDesde(monthAgo.toISOString().split('T')[0]);
                  setFechaHasta(today.toISOString().split('T')[0]);
                }}
              >
                Último mes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de reportes */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ventas" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Reporte de Ventas
          </TabsTrigger>
          <TabsTrigger value="productos" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Productos más Vendidos
          </TabsTrigger>
          <TabsTrigger value="deudas" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Cuentas por Cobrar
          </TabsTrigger>
        </TabsList>

        {/* Tab de Ventas */}
        <TabsContent value="ventas" className="space-y-6">
          {loadingVentas ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : reporteVentas && (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {formatCurrency(reporteVentas.resumen?.total_ventas)}
                        </p>
                        <p className="text-sm text-gray-600">Total Ventas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {formatCurrency(reporteVentas.resumen?.total_efectivo)}
                        </p>
                        <p className="text-sm text-gray-600">Ventas Efectivo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {formatCurrency(reporteVentas.resumen?.total_fiado)}
                        </p>
                        <p className="text-sm text-gray-600">Ventas Fiadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {reporteVentas.resumen?.num_transacciones || 0}
                        </p>
                        <p className="text-sm text-gray-600">Transacciones</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ventas por día */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Ventas por Día
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(reporteVentas.ventas_por_dia || {}).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Sin ventas en el período seleccionado</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Transacciones</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(reporteVentas.ventas_por_dia)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .map(([fecha, data]) => (
                            <TableRow key={fecha}>
                              <TableCell className="font-medium">
                                {formatDate(fecha)}
                              </TableCell>
                              <TableCell className="text-right">
                                {data.cantidad}
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-600">
                                {formatCurrency(data.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Lista de ventas */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalle de Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                  {(reporteVentas.ventas || []).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Sin ventas</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha/Hora</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reporteVentas.ventas.slice(0, 50).map((venta) => (
                          <TableRow key={venta.uuid}>
                            <TableCell>
                              {new Date(venta.created_at).toLocaleString('es-ES')}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(venta.total)}
                            </TableCell>
                            <TableCell>
                              {venta.is_fiado ? (
                                <Badge variant="secondary">Fiado</Badge>
                              ) : (
                                <Badge variant="default">Contado</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  venta.estado === 'completada' ? 'default' : 
                                  venta.estado === 'anulada' ? 'destructive' : 
                                  'secondary'
                                }
                              >
                                {venta.estado}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab de Productos */}
        <TabsContent value="productos" className="space-y-6">
          {loadingProductos ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : reporteProductos && (
            <>
              {/* Estadísticas */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {reporteProductos.total_productos || 0}
                      </p>
                      <p className="text-sm text-gray-600">Productos vendidos diferentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top productos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top 20 Productos más Vendidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(reporteProductos.productos_vendidos || []).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Sin datos de productos</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reporteProductos.productos_vendidos.map((item, index) => (
                          <TableRow key={item.producto?.uuid || index}>
                            <TableCell>
                              <Badge variant={index < 3 ? 'default' : 'secondary'}>
                                {index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.producto?.nombre || 'Producto desconocido'}
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {item.producto?.codigo || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.cantidad_total}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(item.ingresos_total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab de Deudas */}
        <TabsContent value="deudas" className="space-y-6">
          {loadingDeudas ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : reporteDeudas && (
            <>
              {/* Resumen de deudas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-8 w-8 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(reporteDeudas.resumen?.deuda_total || 0)}
                        </p>
                        <p className="text-sm text-gray-600">Deuda Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {reporteDeudas.resumen?.miembros_con_deuda || 0}
                        </p>
                        <p className="text-sm text-gray-600">Miembros con Deuda</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold">
                          {formatCurrency(reporteDeudas.resumen?.deuda_promedio || 0)}
                        </p>
                        <p className="text-sm text-gray-600">Deuda Promedio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top 10 mayores deudas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top 10 Mayores Deudas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(reporteDeudas.top_deudas || []).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay deudas registradas</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Miembro</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead className="text-right">Saldo Deudor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reporteDeudas.top_deudas.map((item, index) => (
                          <TableRow key={item.cuenta_uuid}>
                            <TableCell>
                              <Badge variant={index < 3 ? 'destructive' : 'secondary'}>
                                {index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.miembro_nombre || 'Miembro desconocido'}
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {item.miembro_documento || '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {formatCurrency(item.saldo_deudor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Todas las cuentas con deuda */}
              <Card>
                <CardHeader>
                  <CardTitle>Todas las Cuentas con Deuda</CardTitle>
                </CardHeader>
                <CardContent>
                  {(reporteDeudas.todas_cuentas || []).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay deudas registradas</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Miembro</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead className="text-right">Saldo Deudor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reporteDeudas.todas_cuentas.map((item) => (
                          <TableRow 
                            key={item.cuenta_uuid}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => navigate(`/pos/cuentas/${item.cuenta_uuid}`)}
                          >
                            <TableCell className="font-medium">
                              {item.miembro_nombre || 'Miembro desconocido'}
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {item.miembro_documento || '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {formatCurrency(item.saldo_deudor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default POSReportes;
