import { useState, useEffect, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProductos, fetchCategorias } from '../../services/api';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Search, Star, Package } from 'lucide-react';
import { toast } from 'sonner';
import usePOSStore from '../../stores/posStore';

/**
 * Catálogo de productos para el POS
 * Muestra productos organizados por categorías con búsqueda
 */
const ProductCatalog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const addItem = usePOSStore(state => state.addItem);

  // Cargar productos
  const { data: productos = [], isLoading: loadingProductos } = useQuery({
    queryKey: ['productos', selectedCategory, searchQuery],
    queryFn: () => fetchProductos({
      categoria_uuid: selectedCategory !== 'todos' ? selectedCategory : undefined,
      q: searchQuery || undefined,
      activo: true,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Cargar categorías
  const { data: categorias = [], isLoading: loadingCategorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: fetchCategorias,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  // Productos favoritos
  const productosFavoritos = productos.filter(p => p.favorito);

  const handleProductClick = (producto) => {
    try {
      addItem(producto, 1);
      toast.success(`${producto.nombre} agregado`);
    } catch (error) {
      toast.error('Error al agregar producto');
    }
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Alt + F para focus en búsqueda
      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('product-search')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (loadingCategorias) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Búsqueda */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="product-search"
            type="text"
            placeholder="Buscar productos... (Alt+F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs de categorías */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="favoritos" className="gap-2">
              <Star className="h-4 w-4" />
              Favoritos
            </TabsTrigger>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            {categorias.map((cat) => (
              <TabsTrigger key={cat.uuid} value={cat.uuid}>
                {cat.nombre}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Favoritos */}
          <TabsContent value="favoritos" className="flex-1 mt-4">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {productosFavoritos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Star className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No hay productos favoritos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {productosFavoritos.map((producto) => (
                    <ProductCard
                      key={producto.uuid}
                      producto={producto}
                      onClick={() => handleProductClick(producto)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Todos */}
          <TabsContent value="todos" className="flex-1 mt-4">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {loadingProductos ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : productos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No se encontraron productos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {productos.map((producto) => (
                    <ProductCard
                      key={producto.uuid}
                      producto={producto}
                      onClick={() => handleProductClick(producto)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Categorías */}
          {categorias.map((categoria) => (
            <TabsContent key={categoria.uuid} value={categoria.uuid} className="flex-1 mt-4">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {loadingProductos ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : productos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No hay productos en esta categoría</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {productos.map((producto) => (
                      <ProductCard
                        key={producto.uuid}
                        producto={producto}
                        onClick={() => handleProductClick(producto)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

/**
 * Tarjeta de producto individual - Optimizada con React.memo
 */
const ProductCard = memo(({ producto, onClick }) => {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-green-50 hover:border-green-500 transition-all"
    >
      <div className="w-full flex items-start justify-between">
        <span className="font-medium text-left line-clamp-2 flex-1">
          {producto.nombre}
        </span>
        {producto.favorito && (
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0 ml-1" />
        )}
      </div>
      
      {producto.codigo && (
        <Badge variant="secondary" className="text-xs">
          {producto.codigo}
        </Badge>
      )}
      
      <div className="w-full text-left">
        <span className="text-lg font-bold text-green-600">
          ${parseFloat(producto.precio).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
        </span>
      </div>
    </Button>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si el producto cambió
  return prevProps.producto.uuid === nextProps.producto.uuid &&
         prevProps.producto.stock === nextProps.producto.stock &&
         prevProps.producto.precio === nextProps.producto.precio &&
         prevProps.producto.favorito === nextProps.producto.favorito;
});

export default ProductCatalog;
