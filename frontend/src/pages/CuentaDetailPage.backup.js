import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  DollarSign, 
  CreditCard,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Banknote
} from 'lucide-react';

// API functions
const fetchCuentaDetalle = async (miembroUuid) => {
  const { data } = await api.get(`/pos/cuentas/${miembroUuid}`);
  return data;
};

const fetchMovimientos = async (miembroUuid, limit = 50, offset = 0) => {
  const { data } = await api.get(
    `/pos/cuentas/${miembroUuid}/movimientos?limit=${limit}&offset=${offset}`
  );
  return data;
};

const fetchVentaDetalle = async (ventaUuid) => {
  const { data } = await api.get(`/pos/ventas/${ventaUuid}/detalle`);
  return data;
};

const registrarAbono = async ({ miembroUuid, monto, metodoPago, notas }) => {
  const params = new URLSearchParams();
  params.append('monto', monto);
  params.append('metodo_pago', metodoPago);
  if (notas) params.append('notas', notas);
  const { data } = await api.post(`/pos/cuentas/${miembroUuid}/abonos?${params.toString()}`);
  return data;
};

const crearAjuste = async ({ miembroUuid, monto, justificacion }) => {
  const params = new URLSearchParams();
  params.append('monto', monto);
  params.append('justificacion', justificacion);
  const { data } = await api.post(`/pos/cuentas/${miembroUuid}/ajustes?${params.toString()}`);
  return data;
};

const CuentaDetailPage = () => {
  const { miembroUuid } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [abonoForm, setAbonoForm] = useState({
    monto: '',
    metodoPago: 'efectivo',
    notas: ''
  });
  const [ajusteForm, setAjusteForm] = useState({
    monto: '',
    justificacion: ''
  });

  // Queries
  const { data: cuenta, isLoading: loadingCuenta } = useQuery({
    queryKey: ['cuenta-detalle', miembroUuid],
    queryFn: () => fetchCuentaDetalle(miembroUuid),
  });

  const { data: movimientos, isLoading: loadingMovimientos } = useQuery({
    queryKey: ['movimientos', miembroUuid],
    queryFn: () => fetchMovimientos(miembroUuid, 100, 0),
  });

  // Mutations
  const abonoMutation = useMutation({
    mutationFn: registrarAbono,
    onSuccess: (data) => {
      toast.success(`Abono registrado. Nuevo saldo: $${data.nuevo_saldo.toFixed(2)}`);
      queryClient.invalidateQueries(['cuenta-detalle', miembroUuid]);
      queryClient.invalidateQueries(['movimientos', miembroUuid]);
      queryClient.invalidateQueries(['cuentas']);
      setShowAbonoModal(false);
      resetAbonoForm();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al registrar abono'));
    }
  });

  const ajusteMutation = useMutation({
    mutationFn: crearAjuste,
    onSuccess: (data) => {
      toast.success(`Ajuste creado. Nuevo saldo: $${data.nuevo_saldo.toFixed(2)}`);
      queryClient.invalidateQueries(['cuenta-detalle', miembroUuid]);
      queryClient.invalidateQueries(['movimientos', miembroUuid]);
      queryClient.invalidateQueries(['cuentas']);
      setShowAjusteModal(false);
      resetAjusteForm();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al crear ajuste'));
    }
  });

  const resetAbonoForm = () => {
    setAbonoForm({
      monto: '',
      metodoPago: 'efectivo',
      notas: ''
    });
  };

  const resetAjusteForm = () => {
    setAjusteForm({
      monto: '',
      justificacion: ''
    });
  };

  const handleRegistrarAbono = () => {
    if (!abonoForm.monto || parseFloat(abonoForm.monto) <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }

    const saldoActual = cuenta?.cuenta?.saldo_deudor || 0;
    if (parseFloat(abonoForm.monto) > saldoActual) {
      toast.error(`El monto excede el saldo actual ($${saldoActual.toFixed(2)})`);
      return;
    }
    
    abonoMutation.mutate({
      miembroUuid,
      monto: abonoForm.monto,
      metodoPago: abonoForm.metodoPago,
      notas: abonoForm.notas || undefined
    });
  };

  const handleCrearAjuste = () => {
    if (!ajusteForm.monto || parseFloat(ajusteForm.monto) === 0) {
      toast.error('Ingrese un monto válido (puede ser positivo o negativo)');
      return;
    }

    if (!ajusteForm.justificacion || ajusteForm.justificacion.trim().length < 10) {
      toast.error('La justificación debe tener al menos 10 caracteres');
      return;
    }
    
    ajusteMutation.mutate({
      miembroUuid,
      monto: ajusteForm.monto,
      justificacion: ajusteForm.justificacion
    });
  };

  const getMovimientoIcon = (tipo, className = "h-4 w-4") => {
    const baseClasses = tipo === 'cargo' ? 'text-red-500' :
                        tipo === 'pago' ? 'text-green-500' :
                        tipo === 'venta_pagada' ? 'text-emerald-500' :
                        tipo === 'ajuste' ? 'text-blue-500' : 'text-gray-500';
    
    const finalClasses = className.includes('text-') ? className : `${className} ${baseClasses}`;
    
    switch (tipo) {
      case 'cargo':
        return <TrendingUp className={finalClasses} />;
      case 'pago':
        return <TrendingDown className={finalClasses} />;
      case 'venta_pagada':
        return <CheckCircle2 className={finalClasses} />;
      case 'ajuste':
        return <FileText className={finalClasses} />;
      default:
        return <DollarSign className={finalClasses} />;
    }
  };

  const getMovimientoBadgeVariant = (tipo) => {
    switch (tipo) {
      case 'cargo':
        return 'destructive';
      case 'pago':
        return 'default';
      case 'venta_pagada':
        return 'default';
      case 'ajuste':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getBadgeContent = (tipo) => {
    switch (tipo) {
      case 'cargo':
        return (
          <span className="flex items-center gap-1">
            <ShoppingCart className="h-3 w-3" />
            COMPRA AL CRÉDITO
          </span>
        );
      case 'pago':
        return (
          <span className="flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            PAGO
          </span>
        );
      case 'venta_pagada':
        return (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            COMPRA PAGADA
          </span>
        );
      case 'ajuste':
        return (
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            AJUSTE
          </span>
        );
      default:
        return tipo;
    }
  };

  const getMetodoPagoIcon = (metodo) => {
    if (metodo === 'efectivo') {
      return (
        <span className="flex items-center gap-1">
          <Banknote className="h-3 w-3" />
          Efectivo
        </span>
      );
    }
    if (metodo === 'transferencia') {
      return (
        <span className="flex items-center gap-1">
          <Smartphone className="h-3 w-3" />
          Transferencia
        </span>
      );
    }
    return metodo;
  };

  const getMiembroNombre = () => {
    const miembro = cuenta?.cuenta?.miembros || {};
    return `${miembro.nombres || ''} ${miembro.apellidos || ''}`.trim() || 'Sin nombre';
  };

  if (loadingCuenta) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!cuenta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertTriangle className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-gray-600">Cuenta no encontrada</p>
        <Button onClick={() => navigate('/pos/cuentas')} className="mt-4">
          Volver a Cuentas
        </Button>
      </div>
    );
  }

  const saldoActual = cuenta.cuenta?.saldo_deudor || 0;
  const limiteCredito = cuenta.cuenta?.limite_credito || 0;
  const estadisticas = cuenta.estadisticas || {};

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/pos/cuentas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getMiembroNombre()}
            </h1>
            <p className="text-gray-600">
              {cuenta.cuenta?.miembros?.email} • {cuenta.cuenta?.miembros?.telefono}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {saldoActual > 0 && (
            <Button onClick={() => setShowAbonoModal(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowAjusteModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajuste Manual
          </Button>
        </div>
      </div>

      {/* Resumen Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={saldoActual > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className={`h-8 w-8 ${saldoActual > 0 ? 'text-red-600' : 'text-green-600'}`} />
              <div>
                <p className="text-sm text-gray-600">Saldo Actual</p>
                <p className={`text-2xl font-bold ${saldoActual > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${saldoActual.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Límite de Crédito</p>
                <p className="text-2xl font-bold">${limiteCredito.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Cargos</p>
                <p className="text-2xl font-bold text-red-600">
                  ${(estadisticas.total_cargos || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Pagos</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(estadisticas.total_pagos || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {saldoActual > limiteCredito && limiteCredito > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Límite de crédito excedido</p>
                <p className="text-sm text-red-700">
                  El saldo actual (${saldoActual.toFixed(2)}) supera el límite establecido 
                  (${limiteCredito.toFixed(2)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Estado de cuenta detallado con todas las transacciones
          </p>
        </CardHeader>
        <CardContent>
          {loadingMovimientos ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : !movimientos || movimientos.movimientos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay movimientos registrados
            </div>
          ) : (
            <div className="space-y-4 relative">
              {/* Timeline vertical */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
              
              {movimientos.movimientos.map((movimiento) => {
                return (
                  <div key={movimiento.uuid || movimiento.id} className="relative pl-14">
                    {/* Indicador de timeline */}
                    <div className={`absolute left-3 top-4 w-6 h-6 rounded-full border-4 border-white ${
                      movimiento.tipo === 'cargo' ? 'bg-red-500' :
                      movimiento.tipo === 'pago' ? 'bg-green-500' :
                      movimiento.tipo === 'venta_pagada' ? 'bg-emerald-500' :
                      'bg-blue-500'
                    } shadow-md z-10`>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {getMovimientoIcon(movimiento.tipo, 'w-3 h-3 text-white')}
                      </div>
                    </div>

                    {/* Tarjeta del movimiento con acordeón */}
                    <Card className={`shadow-sm hover:shadow-md transition-shadow ${
                      movimiento.tipo === 'cargo' ? 'border-l-4 border-l-red-500' :
                      movimiento.tipo === 'pago' ? 'border-l-4 border-l-green-500' :
                      movimiento.tipo === 'venta_pagada' ? 'border-l-4 border-l-emerald-500' :
                      'border-l-4 border-l-blue-500'
                    }`>
                      <Accordion type="single" collapsible>
                        <AccordionItem value="detalles" className="border-none">
                          <AccordionTrigger className="px-4 pt-4 pb-2 hover:no-underline">
                            <div className="flex items-start justify-between w-full pr-2">
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={getMovimientoBadgeVariant(movimiento.tipo)} className="text-xs">
                                    {getBadgeContent(movimiento.tipo)}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {new Date(movimiento.fecha).toLocaleString('es-ES', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short'
                                    })}
                                  </span>
                                </div>
                                {movimiento.descripcion && (
                                  <p className="text-sm text-gray-600 font-medium">
                                    {movimiento.descripcion}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <p className={`text-2xl font-bold ${
                                  movimiento.tipo === 'cargo' ? 'text-red-600' : 
                                  movimiento.tipo === 'pago' ? 'text-green-600' : 
                                  movimiento.tipo === 'venta_pagada' ? 'text-emerald-600' : 
                                  'text-blue-600'
                                }`}>
                                  {movimiento.tipo === 'cargo' ? '+' : 
                                   movimiento.tipo === 'pago' ? '-' : ''}
                                  ${Math.abs(movimiento.monto || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          
                          <AccordionContent className="px-4 pb-4">
                            {/* Detalles de la compra (si es cargo o venta pagada) */}
                            {(movimiento.tipo === 'cargo' || movimiento.tipo === 'venta_pagada') && (movimiento.venta_uuid || movimiento.venta_id) && (
                              <VentaDetail 
                                key={movimiento.venta_uuid || movimiento.venta_id}
                                ventaUuid={movimiento.venta_uuid || movimiento.venta_id} 
                                esPagada={movimiento.tipo === 'venta_pagada'} 
                              />
                            )}

                            {/* Información adicional */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-4">
                                  <span className="font-mono">
                                    ID: {movimiento.uuid?.slice(0, 8)}
                                  </span>
                                  {movimiento.ventas?.numero_ticket && (
                                    <span className="flex items-center gap-1">
                                      <FileText className="h-3 w-3" />
                                      Ticket #{movimiento.ventas.numero_ticket}
                                    </span>
                                  )}
                                </div>
                                {movimiento.tipo === 'pago' && movimiento.metodo_pago && (
                                  <Badge variant="outline" className="text-xs">
                                    {getMetodoPagoIcon(movimiento.metodo_pago)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </Card>
                  </div>
                );
              })}

              {/* Paginación info */}
              {movimientos.has_more && (
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    Mostrando {movimientos.movimientos.length} de {movimientos.total} movimientos
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" disabled>
                    Cargar más (próximamente)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Abono */}
      <Dialog open={showAbonoModal} onOpenChange={setShowAbonoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Registrar Pago
            </DialogTitle>
            <DialogDescription>
              Saldo actual: <span className="font-bold text-red-600">
                ${saldoActual.toFixed(2)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="monto">Monto del Pago *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={saldoActual}
                  value={abonoForm.monto}
                  onChange={(e) => setAbonoForm({ ...abonoForm, monto: e.target.value })}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Máximo: ${saldoActual.toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="metodoPago">Método de Pago</Label>
              <Select 
                value={abonoForm.metodoPago} 
                onValueChange={(value) => setAbonoForm({ ...abonoForm, metodoPago: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Textarea
                id="notas"
                value={abonoForm.notas}
                onChange={(e) => setAbonoForm({ ...abonoForm, notas: e.target.value })}
                placeholder="Referencia de pago, observaciones..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAbonoModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRegistrarAbono}
              disabled={abonoMutation.isPending || !abonoForm.monto}
            >
              {abonoMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                'Registrar Pago'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Ajuste */}
      <Dialog open={showAjusteModal} onOpenChange={setShowAjusteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Ajuste Administrativo
            </DialogTitle>
            <DialogDescription>
              Crea un ajuste manual en la cuenta. Este movimiento quedará registrado en auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Importante</p>
                  <p>Los ajustes quedan registrados con tu usuario y requieren justificación.</p>
                  <p className="mt-1">• Monto positivo: <strong>incrementa</strong> la deuda</p>
                  <p>• Monto negativo: <strong>reduce</strong> la deuda</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="ajusteMonto">Monto del Ajuste *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="ajusteMonto"
                  type="number"
                  step="0.01"
                  value={ajusteForm.monto}
                  onChange={(e) => setAjusteForm({ ...ajusteForm, monto: e.target.value })}
                  className="pl-8"
                  placeholder="Ej: 50.00 o -25.50"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Puede ser positivo (cargo) o negativo (descuento)
              </p>
            </div>

            <div>
              <Label htmlFor="justificacion">Justificación * (mínimo 10 caracteres)</Label>
              <Textarea
                id="justificacion"
                value={ajusteForm.justificacion}
                onChange={(e) => setAjusteForm({ ...ajusteForm, justificacion: e.target.value })}
                placeholder="Describe claramente el motivo del ajuste..."
                className="mt-1"
                rows={4}
              />
              <p className="text-sm text-gray-500 mt-1">
                {ajusteForm.justificacion.length}/10 caracteres mínimos
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAjusteModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCrearAjuste}
              disabled={ajusteMutation.isPending || !ajusteForm.monto || ajusteForm.justificacion.length < 10}
            >
              {ajusteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                'Crear Ajuste'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente auxiliar para mostrar detalles de venta
const VentaDetail = ({ ventaUuid, esPagada = false }) => {
  const { data: venta, isLoading, error } = useQuery({
    queryKey: ['venta-detalle', ventaUuid],
    queryFn: () => fetchVentaDetalle(ventaUuid),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    console.error('Error cargando detalle de venta:', error);
    return (
      <div className="text-sm text-red-600 py-2">
        Error al cargar los detalles de la venta
      </div>
    );
  }

  if (!venta || !venta.items) {
    return (
      <div className="text-sm text-gray-600 py-2">
        No hay detalles disponibles para esta venta
      </div>
    );
  }

  const bgColor = esPagada ? 'from-emerald-50 to-emerald-100' : 'from-gray-50 to-gray-100';
  const iconBgColor = esPagada ? 'bg-emerald-100' : 'bg-red-100';
  const iconTextColor = esPagada ? 'text-emerald-600' : 'text-red-600';
  const totalColor = esPagada ? 'text-emerald-600' : 'text-red-600';

  return (
    <div className={`mt-3 bg-gradient-to-br ${bgColor} rounded-lg p-4 border border-gray-200`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`${iconBgColor} p-2 rounded-lg`}>
          <ShoppingCart className={`h-4 w-4 ${iconTextColor}`} />
        </div>
        <h5 className="font-bold text-sm text-gray-800">
          Productos Comprados {esPagada && <span className="text-emerald-600">(Pagado)</span>}
        </h5>
      </div>
      
      <div className="space-y-2">
        {venta.items.map((item, idx) => (
          <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {item.productos?.nombre || 'Producto'}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold">Cantidad:</span>
                    {item.cantidad}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold">Precio Unit:</span>
                    ${item.precio_unitario?.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
              <div className="text-right ml-3">
                <p className="text-lg font-bold text-gray-900">
                  ${(item.precio_unitario * item.cantidad).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t-2 border-gray-300">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-700">Total de la Compra:</span>
          <span className={`text-xl font-bold ${totalColor}`}>
            ${venta.total?.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CuentaDetailPage;