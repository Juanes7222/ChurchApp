import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  DollarSign, 
  CreditCard, 
  Smartphone,
  Banknote,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { createVenta } from '../../services/api';
import usePOSStore from '../../stores/posStore';

/**
 * Modal de pago para finalizar venta
 * Soporta efectivo, tarjeta y transferencia
 */
const PaymentModal = ({ open, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const currentTicket = usePOSStore(state => state.currentTicket);
  const currentShift = usePOSStore(state => state.currentShift);
  const vendedor = usePOSStore(state => state.vendedor);
  const addPayment = usePOSStore(state => state.addPayment);
  const clearPayments = usePOSStore(state => state.clearPayments);
  const finalizeSale = usePOSStore(state => state.finalizeSale);
  const newTicket = usePOSStore(state => state.newTicket);

  const [selectedMethod, setSelectedMethod] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [referencia, setReferencia] = useState('');

  const total = currentTicket?.total || 0;
  const vuelto = montoRecibido ? parseFloat(montoRecibido) - total : 0;

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setSelectedMethod('efectivo');
      setMontoRecibido('');
      setReferencia('');
      clearPayments();
    }
  }, [open, clearPayments]);

  // Mutación para crear venta
  const { mutate: procesarVenta, isPending } = useMutation({
    mutationFn: createVenta,
    onSuccess: (data) => {
      toast.success('Venta procesada exitosamente', {
        description: `Ticket #${data.numero_ticket}`,
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      
      // Crear nuevo ticket
      newTicket();
      
      // Llamar callback de éxito
      if (onSuccess) {
        onSuccess(data);
      }
      
      onClose();
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || 'Error al procesar la venta';
      toast.error('Error en la venta', {
        description: errorMsg,
      });
    },
  });

  const handleConfirmPayment = () => {
    if (!currentTicket || currentTicket.items.length === 0) {
      toast.error('No hay items en el ticket');
      return;
    }

    if (!currentShift) {
      toast.error('No hay turno activo');
      return;
    }

    // Validar método de pago
    if (selectedMethod === 'efectivo') {
      const monto = parseFloat(montoRecibido);
      if (!monto || monto < total) {
        toast.error('El monto recibido debe ser mayor o igual al total');
        return;
      }
    } else {
      // Tarjeta o transferencia
      if (!referencia || referencia.trim() === '') {
        toast.error('Ingresa el número de referencia');
        return;
      }
    }

    // Agregar pago al ticket
    const montoPago = selectedMethod === 'efectivo' ? parseFloat(montoRecibido) : total;
    addPayment(selectedMethod, montoPago, referencia || null);

    // Preparar datos de venta
    const ventaData = {
      client_ticket_id: currentTicket.client_ticket_id,
      shift_uuid: currentShift.uuid,
      vendedor_uuid: vendedor?.uuid,
      tipo: 'mostrador',
      is_fiado: false,
      miembro_uuid: null,
      items: currentTicket.items.map(item => ({
        producto_uuid: item.producto_uuid,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        descuento: item.descuento || 0,
        total_item: item.total_item,
        notas: item.notas || null,
      })),
      pagos: [{
        metodo: selectedMethod,
        monto: montoPago,
        referencia: referencia || null,
      }],
    };

    // Enviar a la API
    procesarVenta(ventaData);
  };

  const paymentMethods = [
    { id: 'efectivo', name: 'Efectivo', icon: Banknote, color: 'bg-green-100 text-green-700 border-green-300' },
    { id: 'tarjeta', name: 'Tarjeta', icon: CreditCard, color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { id: 'transferencia', name: 'Transferencia', icon: Smartphone, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Procesar Pago
          </DialogTitle>
          <DialogDescription>
            Selecciona el método de pago y confirma la transacción
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total a pagar */}
          <div className="bg-gray-50 rounded-lg p-4 text-center border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total a Pagar</p>
            <p className="text-3xl font-bold text-green-600">
              ${total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
            </p>
          </div>

          {/* Métodos de pago */}
          <div>
            <Label className="mb-2 block">Método de Pago</Label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.id}
                    variant={selectedMethod === method.id ? 'default' : 'outline'}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`h-20 flex flex-col gap-2 ${
                      selectedMethod === method.id ? method.color : ''
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs">{method.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Campos según método */}
          {selectedMethod === 'efectivo' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="monto-recibido">Monto Recibido</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="monto-recibido"
                    type="number"
                    placeholder="0"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    className="pl-7 text-lg font-medium"
                    autoFocus
                  />
                </div>
              </div>

              {/* Vuelto */}
              {montoRecibido && (
                <div className={`p-3 rounded-lg border-2 ${
                  vuelto >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {vuelto >= 0 ? 'Vuelto:' : 'Falta:'}
                    </span>
                    <span className={`text-xl font-bold ${
                      vuelto >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      ${Math.abs(vuelto).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Botones rápidos */}
              <div className="grid grid-cols-4 gap-2">
                {[5000, 10000, 20000, 50000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setMontoRecibido(String(total + amount))}
                    className="text-xs"
                  >
                    +{amount/1000}k
                  </Button>
                ))}
              </div>
            </div>
          )}

          {(selectedMethod === 'tarjeta' || selectedMethod === 'transferencia') && (
            <div>
              <Label htmlFor="referencia">Número de Referencia</Label>
              <Input
                id="referencia"
                type="text"
                placeholder="Últimos 4 dígitos o código"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Ingresa el código de autorización o últimos dígitos
              </p>
            </div>
          )}

          {/* Advertencia si está offline */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              La venta se procesará inmediatamente y se registrará en el sistema.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Pago
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
