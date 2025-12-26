import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '../components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Star,
  Search,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getErrorMessage } from '../lib/utils';

// Funciones API para productos
const fetchProductos = async () => {
  const response = await api.get('/pos/productos');
  return response.data.productos || [];
};

const fetchCategorias = async () => {
  const response = await api.get('/pos/categorias');
  return response.data.categorias || [];
};

const createProducto = async (producto) => {
  const response = await api.post('/pos/productos', producto);
  return response.data;
};

const updateProducto = async ({ uuid, ...producto }) => {
  const response = await api.put(`/pos/productos/${uuid}`, producto);
  return response.data;
};

const deleteProducto = async (uuid) => {
  const response = await api.delete(`/pos/productos/${uuid}`);
  return response.data;
};

const POSProductos = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    precio: '',
    categoria_uuid: '',
    favorito: false,
    activo: true,
  });

  // Query productos
  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: fetchProductos,
  });

  // Query categorías
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: fetchCategorias,
  });

  // Mutaciones
  const createMutation = useMutation({
    mutationFn: createProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Producto creado exitosamente');
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al crear producto'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Producto actualizado');
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al actualizar producto'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Producto eliminado');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al eliminar producto'));
    },
  });

  // Filtrar productos por búsqueda
  const filteredProducts = productos.filter(p => 
    p.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        nombre: product.nombre || '',
        codigo: product.codigo || '',
        descripcion: product.descripcion || '',
        precio: product.precio?.toString() || '',
        categoria_uuid: product.categoria_uuid || '',
        favorito: product.favorito || false,
        activo: product.activo !== false,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        nombre: '',
        codigo: '', // Se generará automáticamente en el backend
        descripcion: '',
        precio: '',
        categoria_uuid: '',
        favorito: false,
        activo: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      nombre: '',
      codigo: '',
      descripcion: '',
      precio: '',
      categoria_uuid: '',
      favorito: false,
      activo: true,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      precio: parseFloat(formData.precio) || 0,
      categoria_uuid: formData.categoria_uuid || null,
    };

    if (editingProduct) {
      updateMutation.mutate({ uuid: editingProduct.uuid, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (product) => {
    if (window.confirm(`¿Eliminar "${product.nombre}"?`)) {
      deleteMutation.mutate(product.uuid);
    }
  };

  const getCategoriaName = (uuid) => {
    const cat = categorias.find(c => c.uuid === uuid);
    return cat?.nombre || '-';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/pos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              Gestión de Productos
            </h1>
            <p className="text-gray-600">Crear, editar y eliminar productos del catálogo</p>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de productos */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay productos</p>
              <Button className="mt-4" onClick={() => handleOpenModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer producto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((producto) => (
                  <TableRow key={producto.uuid}>
                    <TableCell className="font-mono text-sm">
                      {producto.codigo || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {producto.nombre}
                        {producto.favorito && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ${parseFloat(producto.precio).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoriaName(producto.categoria_uuid)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={producto.activo ? 'default' : 'secondary'}>
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(producto)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(producto)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de crear/editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {editingProduct && (
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">El código no se puede modificar</p>
                </div>
              )}
              
              {/* {!editingProduct && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    El código se generará automáticamente (ej: PRD-001, PRD-002, etc.)
                  </p>
                </div>
              )} */}
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio *</Label>
                  <Input
                    id="precio"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  placeholder="Nombre del producto"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  placeholder="Descripción opcional"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select
                  value={formData.categoria_uuid}
                  onValueChange={(value) => setFormData({ ...formData, categoria_uuid: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.uuid} value={cat.uuid}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="favorito"
                    checked={formData.favorito}
                    onCheckedChange={(checked) => setFormData({ ...formData, favorito: checked })}
                  />
                  <Label htmlFor="favorito" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Favorito
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                  <Label htmlFor="activo">Activo</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSProductos;
