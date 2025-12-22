import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { UserCheck, UserX, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getErrorMessage } from '../lib/utils';

const ClientesTemporales = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedMiembro, setSelectedMiembro] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Obtener clientes temporales pendientes
  const { data, isLoading } = useQuery({
    queryKey: ['clientes-temporales-pendientes'],
    queryFn: async () => {
      const response = await api.get('/miembros/temporales/pendientes');
      return response.data;
    },
  });

  // Mutación para verificar
  const verificarMutation = useMutation({
    mutationFn: async (miembroUuid) => {
      const response = await api.post(`/miembros/${miembroUuid}/verificar`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes-temporales-pendientes'] });
      toast.success('Cliente verificado exitosamente');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al verificar cliente'));
    },
  });

  // Mutación para rechazar
  const rechazarMutation = useMutation({
    mutationFn: async ({ miembroUuid, motivo }) => {
      const response = await api.delete(`/miembros/${miembroUuid}/rechazar`, {
        params: { motivo }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes-temporales-pendientes'] });
      toast.success('Cliente rechazado y eliminado');
      setShowRejectModal(false);
      setSelectedMiembro(null);
      setMotivoRechazo('');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al rechazar cliente'));
    },
  });

  const handleVerificar = (miembro) => {
    verificarMutation.mutate(miembro.uuid);
  };

  const handleRechazarClick = (miembro) => {
    setSelectedMiembro(miembro);
    setShowRejectModal(true);
  };

  const handleRechazar = () => {
    if (selectedMiembro) {
      rechazarMutation.mutate({
        miembroUuid: selectedMiembro.uuid,
        motivo: motivoRechazo
      });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const miembrosPendientes = data?.miembros_pendientes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              Clientes Temporales Pendientes
            </h1>
            <p className="text-gray-600">
              Verifica los clientes registrados por meseros
            </p>
          </div>
        </div>
        {miembrosPendientes.length > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {miembrosPendientes.length} pendientes
          </Badge>
        )}
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes por Verificar</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : miembrosPendientes.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No hay clientes pendientes de verificación</p>
              <p className="text-gray-400 text-sm mt-2">
                Todos los clientes temporales han sido verificados
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Nombres</TableHead>
                  <TableHead>Apellidos</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Registrado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {miembrosPendientes.map((miembro) => (
                  <TableRow key={miembro.uuid}>
                    <TableCell className="font-medium">
                      {miembro.documento}
                    </TableCell>
                    <TableCell>{miembro.nombres}</TableCell>
                    <TableCell>{miembro.apellidos}</TableCell>
                    <TableCell>{miembro.telefono || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(miembro.created_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleVerificar(miembro)}
                        disabled={verificarMutation.isPending}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Verificar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRechazarClick(miembro)}
                        disabled={rechazarMutation.isPending}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Rechazo */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="h-5 w-5" />
              Rechazar Cliente Temporal
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de rechazar este cliente? Esta acción eliminará el registro.
            </DialogDescription>
          </DialogHeader>
          
          {selectedMiembro && (
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-md space-y-2 mb-4">
                <p><strong>Documento:</strong> {selectedMiembro.documento}</p>
                <p><strong>Nombre:</strong> {selectedMiembro.nombres} {selectedMiembro.apellidos}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo del rechazo (opcional)</Label>
                <Input
                  id="motivo"
                  placeholder="Ej: Documento inválido, datos incorrectos..."
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setSelectedMiembro(null);
                setMotivoRechazo('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={rechazarMutation.isPending}
            >
              {rechazarMutation.isPending ? 'Rechazando...' : 'Rechazar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientesTemporales;
