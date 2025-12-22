import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UserPlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { getErrorMessage } from '../lib/utils';

/**
 * Modal para registrar clientes temporales desde el POS
 * Los meseros pueden registrar clientes que luego deben ser verificados por admin
 */
const RegistroClienteTemporal = ({ open, onOpenChange, onClienteCreado }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    documento: '',
    nombres: '',
    apellidos: '',
    telefono: '',
  });

  const crearClienteMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/miembros/temporal', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['miembros'] });
      toast.success('Cliente registrado temporalmente. Requiere verificación de administrador.');
      
      // Resetear formulario
      setFormData({
        documento: '',
        nombres: '',
        apellidos: '',
        telefono: '',
      });
      
      // Notificar al componente padre
      if (onClienteCreado) {
        onClienteCreado(data);
      }
      
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Error al registrar cliente'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    crearClienteMutation.mutate({
      ...formData,
      tipo_documento: 'CC',
      otra_iglesia: false,
      public_profile: false,
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Registrar Cliente Temporal
          </DialogTitle>
          <DialogDescription>
            El cliente será registrado temporalmente y requiere verificación de un administrador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documento">Documento *</Label>
            <Input
              id="documento"
              type="text"
              placeholder="Número de documento"
              value={formData.documento}
              onChange={(e) => handleChange('documento', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombres">Nombres *</Label>
              <Input
                id="nombres"
                type="text"
                placeholder="Nombres"
                value={formData.nombres}
                onChange={(e) => handleChange('nombres', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input
                id="apellidos"
                type="text"
                placeholder="Apellidos"
                value={formData.apellidos}
                onChange={(e) => handleChange('apellidos', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              type="tel"
              placeholder="Número de teléfono"
              value={formData.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Este cliente será registrado como <strong>temporal</strong> y deberá ser 
              verificado por un administrador antes de poder ser utilizado completamente.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={crearClienteMutation.isPending}
            >
              {crearClienteMutation.isPending ? 'Registrando...' : 'Registrar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RegistroClienteTemporal;
