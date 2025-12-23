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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{cuentas.length}</p>
                <p className="text-sm text-gray-600">Cuentas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {cuentas.filter(c => (c.saldo_deudor || 0) > 0).length}
                </p>
                <p className="text-sm text-gray-600">Con saldo pendiente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  ${cuentas.reduce((sum, c) => sum + (c.saldo_deudor || 0), 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Total adeudado</p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Miembro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuentas.map((cuenta) => (
                  <TableRow key={cuenta.uuid || cuenta.miembro_uuid}>
                    <TableCell className="font-medium">
                      {getMiembroNombre(cuenta)}
                    </TableCell>
                    
                   
                    <TableCell>
                      {(cuenta.saldo_deudor || 0) > 0 ? (
                        <Badge variant="destructive">Con saldo</Badge>
                      ) : (
                        <Badge variant="secondary">Al día</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleVerDetalle(cuenta)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(cuenta.saldo_deudor || 0) > 0 && (
                          <Button 
                            size="sm"
                            onClick={() => handleAbrirAbono(cuenta)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Abonar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de abono */}
      <Dialog open={showAbonoModal} onOpenChange={setShowAbonoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Registrar Abono
            </DialogTitle>
            <DialogDescription>
              {selectedCuenta && getMiembroNombre(selectedCuenta)}
              <br />
              Saldo actual: <span className="font-bold text-red-600">
                ${(selectedCuenta?.saldo_deudor || 0).toFixed(2)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="monto">Monto del Abono *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCuenta?.saldo_deudor || 0}
                  value={abonoForm.monto}
                  onChange={(e) => setAbonoForm({ ...abonoForm, monto: e.target.value })}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
              {selectedCuenta && (
                <p className="text-sm text-gray-500 mt-1">
                  Máximo: ${(selectedCuenta.saldo_deudor || 0).toFixed(2)}
                </p>
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
