import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getErrorMessage } from '../lib/utils';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Search, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  Edit,
  TrendingUp,
  TrendingDown,
  RefreshCcw
} from 'lucide-react';

// API functions
const fetchInventario = async (bajoStock, categoriaUuid) => {
  const params = new URLSearchParams();
  if (bajoStock) params.append('bajo_stock', 'true');
  if (categoriaUuid) params.append('categoria_uuid', categoriaUuid);
  const { data } = await api.get(`/pos/inventario?${params.toString()}`);
  return data;
};

const fetchCategorias = async () => {
  const { data } = await api.get('/pos/categorias');
  return data.categorias;
};

const ajustarStock = async ({ productoUuid, nuevoStock, motivo }) => {
  const params = new URLSearchParams();
  params.append('nuevo_stock', nuevoStock);
  if (motivo) params.append('motivo', motivo);
  const { data } = await api.put(`/pos/inventario/${productoUuid}/ajustar?${params.toString()}`);
  return data;
};

const POSInventario = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({
    nuevoStock: '',
    motivo: ''
  });

  // Query para inventario
  const { data: inventarioData, isLoading, refetch } = useQuery({
    queryKey: ['inventario', soloBajoStock, categoriaFiltro],
    queryFn: () => fetchInventario(soloBajoStock, categoriaFiltro),
  });

  // Query para categorías
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: fetchCategorias,
  });

  // Mutation para ajustar stock
  const ajusteMutation = useMutation({
    mutationFn: ajustarStock,
    onSuccess: (data) => {
      const diff = data.diferencia;
      const symbol = diff > 0 ? '+' : '';
      toast.success(`Stock ajustado: ${symbol}${diff} unidades`);
      queryClient.invalidateQueries(['inventario']);
      setShowAjusteModal(false);
      resetAjusteForm();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al ajustar stock'));
    }
  });

  const productos = inventarioData?.productos || [];
  const estadisticas = inventarioData?.estadisticas || {};

  // Filtrar por búsqueda local
  const productosFiltrados = productos.filter(p => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(searchLower) ||
      p.codigo?.toLowerCase().includes(searchLower)
    );
  });

  const resetAjusteForm = () => {
    setAjusteForm({
      nuevoStock: '',
      motivo: ''
    });
  };

  const handleAbrirAjuste = (producto) => {
    setSelectedProducto(producto);
    setAjusteForm({
      nuevoStock: producto.stock?.toString() || '0',
      motivo: ''
    });
    setShowAjusteModal(true);
  };

  const handleAjustarStock = () => {
    const nuevoStock = parseInt(ajusteForm.nuevoStock);
    if (isNaN(nuevoStock) || nuevoStock < 0) {
      toast.error('Ingrese un stock válido (número positivo)');
      return;
    }
    
    ajusteMutation.mutate({
      productoUuid: selectedProducto.uuid,
      nuevoStock: nuevoStock,
      motivo: ajusteForm.motivo || undefined
    });
  };

  const getStockStatus = (producto) => {
    const stock = producto.stock || 0;
    const minimo = producto.stock_minimo || 0;
    
    if (stock <= 0) {
      return { status: 'agotado', color: 'destructive', icon: AlertTriangle };
    } else if (stock <= minimo) {
      return { status: 'bajo', color: 'warning', icon: TrendingDown };
    } else {
      return { status: 'ok', color: 'default', icon: CheckCircle };
    }
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
              <Package className="h-6 w-6 text-indigo-600" />
              Control de Inventario
            </h1>
            <p className="text-gray-600">Gestiona el stock de productos</p>
          </div>
        </div>
        <Button onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{estadisticas.total_productos || 0}</p>
                <p className="text-sm text-gray-600">Productos activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={estadisticas.productos_bajo_stock > 0 ? 'border-orange-300 bg-orange-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-8 w-8 ${estadisticas.productos_bajo_stock > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-2xl font-bold">{estadisticas.productos_bajo_stock || 0}</p>
                <p className="text-sm text-gray-600">Bajo stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {productos.reduce((sum, p) => sum + (p.stock || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Unidades totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select 
              value={categoriaFiltro} 
              onValueChange={setCategoriaFiltro}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.uuid} value={cat.uuid}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant={soloBajoStock ? "default" : "outline"}
              onClick={() => setSoloBajoStock(!soloBajoStock)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {soloBajoStock ? 'Mostrando bajo stock' : 'Solo bajo stock'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de inventario */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron productos
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Stock Actual</TableHead>
                  <TableHead className="text-right">Stock Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosFiltrados.map((producto) => {
                  const stockStatus = getStockStatus(producto);
                  const StatusIcon = stockStatus.icon;
                  
                  return (
                    <TableRow 
                      key={producto.uuid}
                      className={stockStatus.status === 'agotado' ? 'bg-red-50' : 
                                stockStatus.status === 'bajo' ? 'bg-orange-50' : ''}
                    >
                      <TableCell className="font-mono text-sm">
                        {producto.codigo || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {producto.nombre}
                      </TableCell>
                      <TableCell>
                        {producto.categorias_producto?.nombre || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${
                          stockStatus.status === 'agotado' ? 'text-red-600' :
                          stockStatus.status === 'bajo' ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {producto.stock || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {producto.stock_minimo || 0}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            stockStatus.status === 'agotado' ? 'destructive' :
                            stockStatus.status === 'bajo' ? 'secondary' :
                            'default'
                          }
                          className="flex items-center gap-1 w-fit"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {stockStatus.status === 'agotado' ? 'Agotado' :
                           stockStatus.status === 'bajo' ? 'Bajo' : 'OK'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${(producto.precio || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAbrirAjuste(producto)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Ajustar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de ajuste de stock */}
      <Dialog open={showAjusteModal} onOpenChange={setShowAjusteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-indigo-600" />
              Ajustar Stock
            </DialogTitle>
            <DialogDescription>
              {selectedProducto?.nombre}
              <br />
              Stock actual: <span className="font-bold">{selectedProducto?.stock || 0}</span> unidades
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nuevoStock">Nuevo Stock *</Label>
              <Input
                id="nuevoStock"
                type="number"
                min="0"
                value={ajusteForm.nuevoStock}
                onChange={(e) => setAjusteForm({ ...ajusteForm, nuevoStock: e.target.value })}
                className="mt-1"
              />
              {selectedProducto && ajusteForm.nuevoStock && (
                <p className="text-sm mt-1">
                  Diferencia: {' '}
                  <span className={
                    parseInt(ajusteForm.nuevoStock) - (selectedProducto.stock || 0) > 0 
                      ? 'text-green-600' 
                      : parseInt(ajusteForm.nuevoStock) - (selectedProducto.stock || 0) < 0
                        ? 'text-red-600'
                        : 'text-gray-500'
                  }>
                    {parseInt(ajusteForm.nuevoStock) - (selectedProducto.stock || 0) > 0 ? '+' : ''}
                    {parseInt(ajusteForm.nuevoStock) - (selectedProducto.stock || 0)} unidades
                  </span>
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="motivo">Motivo del ajuste (opcional)</Label>
              <Textarea
                id="motivo"
                value={ajusteForm.motivo}
                onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
                placeholder="Ej: Conteo físico, merma, reposición..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAjusteModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAjustarStock}
              disabled={ajusteMutation.isPending || !ajusteForm.nuevoStock}
            >
              {ajusteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Guardar Ajuste
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSInventario;
