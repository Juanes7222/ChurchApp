import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
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
  Clock, 
  Play, 
  Square, 
  ArrowLeft,
  DollarSign,
  User,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import usePOSStore from '../stores/posStore';
import api from '../lib/api';
import { getErrorMessage } from '../lib/utils';

// Funciones API para turnos
const fetchShifts = async () => {
  const response = await api.get('/pos/caja-shifts');
  return response.data.shifts || [];
};

const fetchMiembros = async () => {
  const response = await api.get('/miembros');
  return response.data.miembros || [];
};

const openShift = async (shiftData) => {
  const response = await api.post('/pos/caja-shifts', shiftData);
  return response.data;
};

const closeShift = async ({ shiftUuid, ...closeData }) => {
  const response = await api.post(`/pos/caja-shifts/${shiftUuid}/close`, closeData);
  return response.data;
};

const getShiftSummary = async (shiftUuid) => {
  const response = await api.get(`/pos/caja-shifts/${shiftUuid}/summary`);
  return response.data;
};

const POSTurnos = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const currentShift = usePOSStore(state => state.currentShift);
  const initializeShift = usePOSStore(state => state.initializeShift);
  const clearShift = usePOSStore(state => state.clearShift);
  const loadActiveShift = usePOSStore(state => state.loadActiveShift);
  
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [shiftSummary, setShiftSummary] = useState(null);
  const [openFormData, setOpenFormData] = useState({
    monto_apertura: '',
    notas: '',
    meseros: [{ pin: '', miembro_uuid: '' }], // Incluir miembro_uuid
  });
  const [closeFormData, setCloseFormData] = useState({
    monto_cierre: '',
    notas: '',
  });

  // Query turnos
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['caja-shifts'],
    queryFn: fetchShifts,
  });

  // Query miembros para selector
  const { data: miembros = [] } = useQuery({
    queryKey: ['miembros'],
    queryFn: fetchMiembros,
  });

  // Mutación para abrir turno
  const openMutation = useMutation({
    mutationFn: openShift,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['caja-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });

      ('Turno abierto:', user, data);
      
      // Recargar turno activo del backend para asegurar sincronización
      await loadActiveShift();
      
      // Mostrar cuántos meseros se crearon
      const meserosMsg = data.meseros_creados && data.meseros_creados.length > 0
        ? ` (${data.meseros_creados.length} meseros creados)`
        : '';
      
      toast.success(`Turno abierto exitosamente${meserosMsg}`);
      setShowOpenModal(false);
      setOpenFormData({ monto_apertura: '', notas: '', meseros: [{ pin: '', miembro_uuid: '' }] });
      
      // Navegar a ventas automáticamente
      navigate('/pos/ventas');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al abrir turno'));
    },
  });

  // Mutación para cerrar turno
  const closeMutation = useMutation({
    mutationFn: closeShift,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['caja-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      
      // Limpiar el shift del store
      if (clearShift) clearShift();
      
      // Recargar para asegurar que no hay turno activo
      await loadActiveShift();
      
      toast.success('Turno cerrado exitosamente');
      setShowCloseModal(false);
      setCloseFormData({ monto_cierre: '', notas: '' });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al cerrar turno'));
    },
  });

  const handleOpenShift = (e) => {
    e.preventDefault();
    
    // Validar que cada mesero tenga PIN y miembro asociado
    const meserosValidos = openFormData.meseros.filter(m => 
      m.pin && 
      m.pin.trim().length === 4 && 
      m.miembro_uuid && 
      m.miembro_uuid.trim() !== ''
    );
    
    if (meserosValidos.length === 0) {
      toast.error('Debes agregar al menos un mesero con PIN y miembro asociado');
      return;
    }
    
    openMutation.mutate({
      apertura_por: user?.uid,
      // efectivo_inicial: parseFloat(openFormData.monto_apertura) || 0, // DESACTIVADO
      meseros: meserosValidos,
    });
  };

  const addMesero = () => {
    setOpenFormData({
      ...openFormData,
      meseros: [...openFormData.meseros, { pin: '', miembro_uuid: '' }]
    });
  };

  const removeMesero = (index) => {
    const newMeseros = openFormData.meseros.filter((_, i) => i !== index);
    setOpenFormData({
      ...openFormData,
      meseros: newMeseros.length > 0 ? newMeseros : [{ pin: '', miembro_uuid: '' }]
    });
  };

  const updateMeseroPin = (index, pin) => {
    const newMeseros = [...openFormData.meseros];
    newMeseros[index] = { ...newMeseros[index], pin };
    setOpenFormData({
      ...openFormData,
      meseros: newMeseros
    });
  };

  const updateMeseroMiembro = (index, miembro_uuid) => {
    const newMeseros = [...openFormData.meseros];
    newMeseros[index] = { ...newMeseros[index], miembro_uuid };
    setOpenFormData({
      ...openFormData,
      meseros: newMeseros
    });
  };

  const handleCloseShift = (e) => {
    e.preventDefault();
    closeMutation.mutate({
      shiftUuid: selectedShift?.uuid,
      // efectivo_recuento ya no se envía - se calcula automáticamente en el backend
      notas: closeFormData.notas || null,
    });
  };

  const handleViewSummary = async (shift) => {
    try {
      const summary = await getShiftSummary(shift.uuid);
      setShiftSummary(summary);
      setSelectedShift(shift);
      setShowSummaryModal(true);
    } catch (error) {
      toast.error('Error al cargar resumen del turno');
    }
  };

  const handleCloseClick = (shift) => {
    setSelectedShift(shift);
    setShowCloseModal(true);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const formatMoney = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Verificar si hay un turno activo
  const activeShift = shifts.find(s => s.estado === 'abierto' || s.estado === 'abierta');

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
              <Clock className="h-6 w-6 text-orange-600" />
              Gestión de Caja
            </h1>
            <p className="text-gray-600">Abrir y cerrar turnos de caja</p>
          </div>
        </div>
        {!activeShift && (
          <Button onClick={() => setShowOpenModal(true)}>
            <Play className="h-4 w-4 mr-2" />
            Abrir Turno
          </Button>
        )}
      </div>

      {/* Turno activo */}
      {activeShift && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Play className="h-5 w-5" />
              Turno Activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Cajero</p>
                <p className="font-medium">{activeShift.cajero_nombre || user?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Apertura</p>
                <p className="font-medium">{formatDateTime(activeShift.apertura_fecha)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monto Apertura</p>
                <p className="font-medium text-green-600">{formatMoney(activeShift.monto_apertura)}</p>
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleViewSummary(activeShift)}
                >
                  Ver Resumen
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleCloseClick(activeShift)}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Cerrar Turno
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aviso si no hay turno */}
      {!activeShift && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">
                  No hay turno activo
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Debes abrir un turno de caja antes de poder realizar ventas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de turnos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Turnos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay turnos registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cajero</TableHead>
                  <TableHead>Apertura</TableHead>
                  <TableHead>Cierre</TableHead>
                  <TableHead>Monto Apertura</TableHead>
                  <TableHead>Monto Cierre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.uuid}>
                    <TableCell>
                      <Badge variant={shift.estado === 'abierto' || shift.estado === 'abierta' ? 'default' : 'secondary'}>
                        {shift.estado === 'abierto' || shift.estado === 'abierta' ? 'Abierto' : 'Cerrado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      {shift.cajero_nombre || 'N/A'}
                    </TableCell>
                    <TableCell>{formatDateTime(shift.apertura_fecha)}</TableCell>
                    <TableCell>{formatDateTime(shift.cierre_fecha)}</TableCell>
                    <TableCell className="text-green-600">{formatMoney(shift.monto_apertura)}</TableCell>
                    <TableCell className="text-blue-600">{formatMoney(shift.monto_cierre)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewSummary(shift)}
                      >
                        Ver Resumen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Abrir Turno */}
      <Dialog open={showOpenModal} onOpenChange={setShowOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Abrir Turno de Caja
            </DialogTitle>
            <DialogDescription>
              Ingresa el monto inicial de caja para comenzar el turno.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOpenShift}>
            <div className="grid gap-4 py-4">
              {/* DESACTIVADO: Campo de monto de apertura - Para reactivar, descomentar este bloque
              <div className="space-y-2">
                <Label htmlFor="monto_apertura">Monto de Apertura *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="monto_apertura"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-10"
                    value={openFormData.monto_apertura}
                    onChange={(e) => setOpenFormData({ ...openFormData, monto_apertura: e.target.value })}
                    required
                  />
                </div>
              </div>
              */}
              
              {/* Sección de Meseros */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Meseros *</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addMesero}
                  >
                    + Agregar Mesero
                  </Button>
                </div>
                <div className="space-y-3">
                  {openFormData.meseros.map((mesero, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Mesero {index + 1}</span>
                        {openFormData.meseros.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMesero(index)}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Miembro Asociado *</Label>
                        <Select
                          value={mesero.miembro_uuid}
                          onValueChange={(value) => updateMeseroMiembro(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un miembro" />
                          </SelectTrigger>
                          <SelectContent>
                            {miembros.map((m) => (
                              <SelectItem key={m.uuid} value={m.uuid}>
                                {m.nombres} {m.apellidos}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">PIN (4 dígitos) *</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength="4"
                          placeholder="Ej: 1234"
                          value={mesero.pin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            updateMeseroPin(index, val);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Los meseros podrán registrar pedidos y clientes. Se desactivarán automáticamente a las 4 PM.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notas_apertura">Notas (opcional)</Label>
                <Input
                  id="notas_apertura"
                  placeholder="Observaciones al abrir el turno..."
                  value={openFormData.notas}
                  onChange={(e) => setOpenFormData({ ...openFormData, notas: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={openMutation.isPending}>
                {openMutation.isPending ? 'Abriendo...' : 'Abrir Turno'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Cerrar Turno */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="h-5 w-5 text-red-600" />
              Cerrar Turno de Caja
            </DialogTitle>
            <DialogDescription>
              El monto de cierre se calculará automáticamente según las ventas en efectivo del turno.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseShift}>
            <div className="grid gap-4 py-4">
              {/* ELIMINADO: Monto de cierre manual - Ahora se calcula automáticamente
              <div className="space-y-2">
                <Label htmlFor="monto_cierre">Monto de Cierre *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="monto_cierre"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-10"
                    value={closeFormData.monto_cierre}
                    onChange={(e) => setCloseFormData({ ...closeFormData, monto_cierre: e.target.value })}
                    required
                  />
                </div>
              </div>
              */}
              <div className="space-y-2">
                <Label htmlFor="notas_cierre">Notas (opcional)</Label>
                <Input
                  id="notas_cierre"
                  placeholder="Observaciones al cerrar el turno..."
                  value={closeFormData.notas}
                  onChange={(e) => setCloseFormData({ ...closeFormData, notas: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCloseModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={closeMutation.isPending}>
                {closeMutation.isPending ? 'Cerrando...' : 'Cerrar Turno'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Resumen */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Resumen del Turno</DialogTitle>
          </DialogHeader>
          {shiftSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Total Ventas</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatMoney(shiftSummary.total_ventas)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Cantidad de Ventas</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {shiftSummary.cantidad_ventas || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {shiftSummary.pagos_por_metodo && shiftSummary.pagos_por_metodo.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Desglose por Método de Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {shiftSummary.pagos_por_metodo.map((pago, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="capitalize">{pago.metodo}</span>
                          <span className="font-medium">{formatMoney(pago.total)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cajero/Admin */}
              {shiftSummary.cajero && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cajero/Administrador</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="font-medium">{shiftSummary.cajero.nombre}</p>
                        {shiftSummary.cajero_vendio && (
                          <Badge variant="default" className="text-xs">Vendió</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Meseros */}
              {shiftSummary.meseros && shiftSummary.meseros.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Meseros Asignados al Turno</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {shiftSummary.meseros.map((mesero, index) => (
                        <div key={index} className="flex justify-between items-start border-b pb-2 last:border-0">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{mesero.display_name}</p>
                              {mesero.hizo_ventas ? (
                                <Badge variant="default" className="text-xs">Vendió</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Sin ventas</Badge>
                              )}
                            </div>
                            {mesero.miembro_nombre && (
                              <p className="text-sm text-gray-500">{mesero.miembro_nombre}</p>
                            )}
                            <p className="text-xs text-gray-400">{mesero.username}</p>
                          </div>
                          {mesero.pin && (
                            <div className="text-right">
                              <p className="text-xs text-gray-500">PIN</p>
                              <p className="text-lg font-mono font-bold text-blue-600">{mesero.pin}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Otros vendedores */}
              {shiftSummary.otros_vendedores && shiftSummary.otros_vendedores.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Otros Vendedores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {shiftSummary.otros_vendedores.map((vendedor, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <p className="font-medium">{vendedor.nombre}</p>
                          <Badge variant="default" className="text-xs">Vendió</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowSummaryModal(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSTurnos;
