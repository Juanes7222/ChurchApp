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
import api from '../../lib/api';
import usePOSStore from '../../stores/posStore';
import RegistroClienteTemporal from '../RegistroClienteTemporal';

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
  const [searchMiembro, setSearchMiembro] = useState('');
  const [miembros, setMiembros] = useState([]);
  const [selectedMiembro, setSelectedMiembro] = useState(null);
  const [loadingMiembros, setLoadingMiembros] = useState(false);
  const [isFiado, setIsFiado] = useState(false);
  const [showRegistroTemporal, setShowRegistroTemporal] = useState(false);

  const total = currentTicket?.total || 0;
  const vuelto = montoRecibido ? parseFloat(montoRecibido) - total : 0;


  // Reset al abrir
  useEffect(() => {
    if (open) {
      setSelectedMethod('efectivo');
      setMontoRecibido('');
      setReferencia('');
      setSearchMiembro('');
      setMiembros([]);
      setSelectedMiembro(null);
      setIsFiado(false);
      clearPayments();
    }
  }, [open, clearPayments]);

  // Buscar miembros con debounce
  useEffect(() => {
    if (searchMiembro.length >= 2) {
      const timer = setTimeout(async () => {
        setLoadingMiembros(true);
        try {
          const response = await api.get('/miembros', {
            params: { q: searchMiembro, page_size: 10 }
          });
          console.log('Miembros encontrados:', response.data.miembros);
          setMiembros(response.data.miembros || []);
        } catch (error) {
          console.error('Error buscando miembros:', error);
        } finally {
          setLoadingMiembros(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setMiembros([]);
    }
  }, [searchMiembro]);

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
      console.error('Error al procesar venta:', error);
      console.error('Response data:', error.response?.data);
      
      let errorMsg = 'Error al procesar la venta';
      
      // Manejar errores de validación 422
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Errores de validación de Pydantic
          console.error('Validation errors:', detail);
          errorMsg = detail.map(err => {
            const field = err.loc ? err.loc.join('.') : 'campo';
            return `${field}: ${err.msg}`;
          }).join('\n');
        } else if (typeof detail === 'string') {
          errorMsg = detail;
        }
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      toast.error('Error en la venta', {
        description: errorMsg,
        duration: 5000,
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

    if (!vendedor?.uuid) {
      toast.error('No hay vendedor asignado');
      console.error('Vendedor:', vendedor);
      return;
    }

    if (!selectedMiembro) {
      toast.error('Debes seleccionar un miembro');
      return;
    }

    // Validar método de pago (solo si no es fiado)
    if (!isFiado) {
      if (selectedMethod === 'efectivo') {
        const monto = parseFloat(montoRecibido);
        if (!monto || monto < total) {
          toast.error('El monto recibido debe ser mayor o igual al total');
          return;
        }
      } else {
        // Transferencia
        if (!referencia || referencia.trim() === '') {
          toast.error('Ingresa el número de referencia');
          return;
        }
      }
    }

    // Agregar pago al ticket
    const montoPago = selectedMethod === 'efectivo' ? parseFloat(montoRecibido) : total;
    addPayment(selectedMethod, montoPago, referencia || null);

    // Preparar datos de venta
    const ventaData = {
      client_ticket_id: currentTicket.client_ticket_id || null,
      shift_uuid: String(currentShift.uuid),
      tipo: 'mostrador',
      is_fiado: isFiado,
      miembro_uuid: String(selectedMiembro.uuid),
      items: currentTicket.items.map(item => ({
        producto_uuid: String(item.producto_uuid),
        cantidad: parseFloat(item.cantidad),
        precio_unitario: parseFloat(item.precio_unitario),
        descuento: parseFloat(item.descuento || 0),
        total_item: parseFloat(item.total_item),
        notas: item.notas || null,
      })),
      pagos: isFiado ? [] : [{
        metodo: selectedMethod,
        monto: parseFloat(montoPago),
        referencia: referencia || null,
      }],
    };

    console.log('Enviando venta:', JSON.stringify(ventaData, null, 2));

    // Enviar a la API
    procesarVenta(ventaData);
  };

  const paymentMethods = [
    { id: 'efectivo', name: 'Efectivo', icon: Banknote, color: 'bg-green-100 text-green-700 border-green-300' },
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

          {/* Selector de miembro */}
          <div>
            <Label htmlFor="search-miembro" className="mb-2 block text-red-600">
              * Miembro (Obligatorio)
            </Label>
            {selectedMiembro ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium">{selectedMiembro.nombres} {selectedMiembro.apellidos}</p>
                  <p className="text-sm text-gray-600">Doc: {selectedMiembro.documento}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMiembro(null)}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  id="search-miembro"
                  type="text"
                  placeholder="Buscar por nombre o documento..."
                  value={searchMiembro}
                  onChange={(e) => setSearchMiembro(e.target.value)}
                  className="mb-2"
                />
                {loadingMiembros && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                  </div>
                )}
                {miembros.length > 0 && (
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {miembros.map((miembro) => (
                      <button
                        key={miembro.uuid}
                        className="w-full text-left p-2 hover:bg-gray-100 border-b last:border-b-0"
                        onClick={() => {
                          console.log('Miembro seleccionado:', miembro);
                          setSelectedMiembro(miembro);
                          setSearchMiembro('');
                          setMiembros([]);
                        }}
                      >
                        <p className="font-medium">{miembro.nombres} {miembro.apellidos}</p>
                        <p className="text-sm text-gray-600">Doc: {miembro.documento}</p>
                      </button>
                    ))}
                  </div>
                )}
                {searchMiembro.length >= 2 && miembros.length === 0 && !loadingMiembros && (
                  <div className="text-sm text-gray-500 mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="mb-2">No se encontraron miembros</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRegistroTemporal(true)}
                      className="w-full"
                    >
                      + Registrar Cliente Temporal
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Opción de Fiado */}
          <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="is-fiado"
              checked={isFiado}
              onChange={(e) => setIsFiado(e.target.checked)}
              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <Label htmlFor="is-fiado" className="cursor-pointer text-amber-800 font-medium">
              Venta al Crédito (Fiado)
            </Label>
          </div>

          {/* Métodos de pago - Solo mostrar si NO es fiado */}
          {!isFiado && (
            <>
              <div>
                <Label className="mb-2 block">Método de Pago</Label>
                <div className="grid grid-cols-2 gap-2">
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
                {[2000, 5000, 10000, 20000, 50000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setMontoRecibido(String(amount))}
                    className="text-xs"
                  >
                    +{amount/1000}k
                  </Button>
                ))}
              </div>
            </div>
          )}

          {selectedMethod === 'transferencia' && (
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
                Ingresa el código de autorización
              </p>
            </div>
          )}
            </>
          )}

          {/* Mensaje de fiado */}
          {isFiado && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Esta venta se registrará como crédito y se agregará al saldo del cliente seleccionado.
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

      {/* Modal para registrar cliente temporal */}
      <RegistroClienteTemporal
        open={showRegistroTemporal}
        onOpenChange={setShowRegistroTemporal}
        onClienteCreado={(nuevoCliente) => {
          console.log('Cliente temporal creado:', nuevoCliente);
          setSelectedMiembro(nuevoCliente);
          toast.info('Cliente registrado temporalmente', {
            description: 'Requiere verificación de administrador'
          });
        }}
      />
    </Dialog>
  );
};

export default PaymentModal;
