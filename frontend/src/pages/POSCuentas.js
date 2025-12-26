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
  Users, 
  DollarSign, 
  Eye, 
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// API functions
const fetchCuentas = async (conSaldo, q) => {
  const params = new URLSearchParams();
  if (conSaldo) params.append('con_saldo', 'true');
  if (q) params.append('q', q);
  const { data } = await api.get(`/pos/cuentas?${params.toString()}`);
  return data.cuentas;
};

const fetchCuentaDetalle = async (miembroUuid) => {
  const { data } = await api.get(`/pos/cuentas/${miembroUuid}`);
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

const POSCuentas = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [soloConSaldo, setSoloConSaldo] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState(null);
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [abonoForm, setAbonoForm] = useState({
    monto: '',
    metodoPago: 'efectivo',
    notas: ''
  });

  // Query para lista de cuentas
  const { data: cuentas = [], isLoading, refetch } = useQuery({
    queryKey: ['cuentas', soloConSaldo, search],
    queryFn: () => fetchCuentas(soloConSaldo, search),
  });

  // Mutation para registrar abono
  const abonoMutation = useMutation({
    mutationFn: registrarAbono,
    onSuccess: (data) => {
      toast.success(`Abono registrado. Nuevo saldo: $${data.nuevo_saldo.toFixed(2)}`);
      queryClient.invalidateQueries(['cuentas']);
      queryClient.invalidateQueries(['cuenta-detalle', selectedCuenta?.miembro_uuid]);
      setShowAbonoModal(false);
      resetAbonoForm();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al registrar abono'));
    }
  });

  const resetAbonoForm = () => {
    setAbonoForm({
      monto: '',
      metodoPago: 'efectivo',
      notas: ''
    });
  };

  const handleVerDetalle = (cuenta) => {
    // Navegar a la página de detalle de cuenta
    navigate(`/pos/cuentas/${cuenta.miembro_uuid}`);
  };

  const handleAbrirAbono = (cuenta) => {
    setSelectedCuenta(cuenta);
    setShowAbonoModal(true);
  };

  const handleRegistrarAbono = () => {
    if (!abonoForm.monto || parseFloat(abonoForm.monto) <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    
    abonoMutation.mutate({
      miembroUuid: selectedCuenta.miembro_uuid,
      monto: abonoForm.monto,
      metodoPago: abonoForm.metodoPago,
      notas: abonoForm.notas || undefined
    });
  };

  const getMiembroNombre = (cuenta) => {
    const miembro = cuenta.miembros || {};
    return `${miembro.nombres || ''} ${miembro.apellidos || ''}`.trim() || 'Sin nombre';
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
              <Users className="h-6 w-6 text-purple-600" />
              Cuentas de Miembros
            </h1>
            <p className="text-gray-600">Gestiona saldos y abonos de los miembros</p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold truncate">{cuentas.length}</p>
                <p className="text-xs sm:text-sm text-gray-600">Cuentas Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">
                  {cuentas.filter(c => (c.saldo_deudor || 0) > 0).length}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Con Saldo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-red-600 truncate">
                  ${cuentas.reduce((sum, c) => sum + (c.saldo_deudor || 0), 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Total Adeudado</p>
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
                placeholder="Buscar por nombre del miembro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant={soloConSaldo ? "default" : "outline"}
              onClick={() => setSoloConSaldo(!soloConSaldo)}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              {soloConSaldo ? 'Mostrando con saldo' : 'Solo con saldo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de cuentas */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Cuentas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : cuentas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron cuentas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Miembro</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                    <TableHead className="hidden sm:table-cell">Límite Crédito</TableHead>
                    <TableHead className="hidden sm:table-cell">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentas.map((cuenta) => {
                    const saldo = cuenta.saldo_deudor || 0;
                    const limite = cuenta.limite_credito || 300000;
                    const porcentaje = limite > 0 ? (saldo / limite) * 100 : 0;
                    
                    return (
                      <TableRow key={cuenta.uuid || cuenta.miembro_uuid}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{getMiembroNombre(cuenta)}</span>
                            {cuenta.miembros?.documento && (
                              <span className="text-xs text-gray-500">Doc: {cuenta.miembros.documento}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className={`font-bold text-base ${
                              saldo > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              ${saldo.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                            </span>
                            {saldo > 0 && (
                              <span className="text-xs text-gray-500">
                                {porcentaje.toFixed(0)}% usado
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-gray-600">
                          ${limite.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {saldo > 0 ? (
                            <Badge variant="destructive" className="whitespace-nowrap">
                              Con saldo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Al día</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleVerDetalle(cuenta)}
                              className="h-8 w-8 p-0 sm:w-auto sm:px-3"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline ml-1">Ver</span>
                            </Button>
                            {saldo > 0 && (
                              <Button 
                                size="sm"
                                onClick={() => handleAbrirAbono(cuenta)}
                                className="h-8 whitespace-nowrap"
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Abonar</span>
                                <span className="sm:hidden">$</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de abono */}
      <Dialog open={showAbonoModal} onOpenChange={setShowAbonoModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              Registrar Abono
            </DialogTitle>
            <DialogDescription className="text-sm">
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                <p className="font-medium text-gray-900">{selectedCuenta && getMiembroNombre(selectedCuenta)}</p>
                {selectedCuenta?.miembros?.documento && (
                  <p className="text-xs text-gray-600 mt-1">Doc: {selectedCuenta.miembros.documento}</p>
                )}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-600">Saldo actual:</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${(selectedCuenta?.saldo_deudor || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div>
              <Label htmlFor="monto" className="text-sm">Monto del Abono *</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-base font-medium">$</span>
                <Input
                  id="monto"
                  type="number"
                  step="1"
                  min="1"
                  max={selectedCuenta?.saldo_deudor || 0}
                  value={abonoForm.monto}
                  onChange={(e) => setAbonoForm({ ...abonoForm, monto: e.target.value })}
                  className="pl-8 text-base sm:text-lg font-medium h-11 sm:h-12"
                  placeholder="0"
                  autoFocus
                />
              </div>
              {selectedCuenta && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Máximo:</span>
                  <span className="font-medium">${(selectedCuenta.saldo_deudor || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
                </div>
              )}
              {abonoForm.monto && parseFloat(abonoForm.monto) > 0 && selectedCuenta && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-700">Nuevo saldo:</span>
                    <span className="font-bold text-green-700">
                      ${Math.max(0, (selectedCuenta.saldo_deudor || 0) - parseFloat(abonoForm.monto)).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              )}
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
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
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
                placeholder="Observaciones del abono..."
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
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Registrar Abono
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSCuentas;
