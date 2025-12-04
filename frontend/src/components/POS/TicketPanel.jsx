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
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Ticket Actual
          </span>
          {currentTicket && (
            <Badge variant="outline" className="text-xs">
              {currentTicket.items.length} items
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        {/* Lista de items */}
        <ScrollArea className="flex-1 mb-4">
          {!currentTicket || currentTicket.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText className="h-16 w-16 mb-3 opacity-20" />
              <p className="text-sm">No hay items en el ticket</p>
              <p className="text-xs mt-1">Agrega productos del catálogo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentTicket.items.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.nombre}</p>
                      <p className="text-xs text-gray-600">
                        ${item.precio_unitario.toLocaleString('es-CO')} c/u
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Control de cantidad */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecrementQuantity(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-12 text-center font-medium">
                        {item.cantidad}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleIncrementQuantity(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Total del item */}
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">
                        ${item.total_item.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  {item.descuento > 0 && (
                    <div className="mt-2 text-xs text-orange-600">
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
          <div className="space-y-2 mb-4">
            <Separator />
            <div className="flex justify-between text-sm pt-2">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">
                ${currentTicket.subtotal.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
              </span>
            </div>
            {currentTicket.descuento_total > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>Descuentos:</span>
                <span>-${currentTicket.descuento_total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-lg">Total:</span>
              <span className="font-bold text-2xl text-green-600">
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
            className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
          >
            Cobrar (Alt+C)
          </Button>
          <Button
            variant="outline"
            onClick={handleNewTicket}
            className="w-full"
          >
            Nuevo Ticket (Alt+N)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketPanel;
