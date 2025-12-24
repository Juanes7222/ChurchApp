import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Plus, Minus, X, ShoppingCart, FileText } from 'lucide-react';
import usePOSStore from '../../stores/posStore';

/**
 * Panel lateral del ticket actual
 * Muestra items, totales y acciones del ticket
 */
const TicketPanel = ({ onOpenPayment }) => {
  const currentTicket = usePOSStore(state => state.currentTicket);
  const updateItemQuantity = usePOSStore(state => state.updateItemQuantity);
  const removeItem = usePOSStore(state => state.removeItem);
  const newTicket = usePOSStore(state => state.newTicket);

  const handleIncrementQuantity = (index) => {
    const item = currentTicket.items[index];
    updateItemQuantity(index, item.cantidad + 1);
  };

  const handleDecrementQuantity = (index) => {
    const item = currentTicket.items[index];
    if (item.cantidad > 1) {
      updateItemQuantity(index, item.cantidad - 1);
    }
  };

  const handleRemoveItem = (index) => {
    removeItem(index);
  };

  const handleNewTicket = () => {
    if (currentTicket && currentTicket.items.length > 0) {
      if (window.confirm('¿Deseas crear un nuevo ticket? Se perderá el actual.')) {
        newTicket();
      }
    } else {
      newTicket();
    }
  };

  const hasItems = currentTicket && currentTicket.items.length > 0;

  return (
    <Card className="h-full flex flex-col rounded-none sm:rounded-lg border-0 sm:border">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="flex items-center justify-between text-base sm:text-lg">
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Ticket</span>
          </span>
          {currentTicket && (
            <Badge variant="outline" className="text-xs">
              {currentTicket.items.length} items
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-2 sm:p-4 pt-0">
        {/* Lista de items */}
        <ScrollArea className="flex-1 mb-3 sm:mb-4">
          {!currentTicket || currentTicket.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-gray-400">
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 mb-2 sm:mb-3 opacity-20" />
              <p className="text-xs sm:text-sm">No hay items</p>
              <p className="text-xs mt-1 hidden sm:block">Agrega productos del catálogo</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {currentTicket.items.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-1 sm:mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.nombre}</p>
                      <p className="text-xs text-gray-600">
                        ${item.precio_unitario.toLocaleString('es-CO')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-red-600 hover:bg-red-50 flex-shrink-0"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Control de cantidad */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecrementQuantity(index)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 sm:w-12 text-center font-medium text-sm">
                        {item.cantidad}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleIncrementQuantity(index)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Total del item */}
                    <div className="text-right">
                      <p className="text-sm sm:text-base font-bold text-green-600">
                        ${item.total_item.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  {item.descuento > 0 && (
                    <div className="mt-1 sm:mt-2 text-xs text-orange-600">
                      Descuento: -${item.descuento.toLocaleString('es-CO')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Totales */}
        {hasItems && (
          <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
            <Separator />
            <div className="flex justify-between text-xs sm:text-sm pt-1 sm:pt-2">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">
                ${currentTicket.subtotal.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
              </span>
            </div>
            {currentTicket.descuento_total > 0 && (
              <div className="flex justify-between text-xs sm:text-sm text-orange-600">
                <span>Descuentos:</span>
                <span>-${currentTicket.descuento_total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center pt-1 sm:pt-2">
              <span className="font-bold text-base sm:text-lg">Total:</span>
              <span className="font-bold text-xl sm:text-2xl text-green-600">
                ${currentTicket.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-2">
          <Button
            onClick={onOpenPayment}
            disabled={!hasItems}
            className="w-full h-11 sm:h-12 text-base sm:text-lg font-semibold bg-green-600 hover:bg-green-700"
          >
            <span className="sm:hidden">Cobrar</span>
            <span className="hidden sm:inline">Cobrar (Alt+C)</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleNewTicket}
            className="w-full h-10 sm:h-auto text-sm sm:text-base"
          >
            <span className="sm:hidden">Nuevo</span>
            <span className="hidden sm:inline">Nuevo Ticket (Alt+N)</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketPanel;
