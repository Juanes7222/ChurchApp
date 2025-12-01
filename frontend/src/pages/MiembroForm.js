import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const MiembroForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      documento: '',
      tipo_documento: 'CC',
      nombres: '',
      apellidos: '',
      fecha_nac: '',
      telefono: '',
      email: '',
      direccion: '',
      genero: '',
      lugar_nac: '',
      llamado: '',
      otra_iglesia: false,
      notas: '',
      public_profile: false,
    }
  });

  const otraIglesia = watch('otra_iglesia');
  const publicProfile = watch('public_profile');

  useEffect(() => {
    if (isEdit) {
      loadMiembro();
    }
  }, [id]);

  const loadMiembro = async () => {
    try {
      const response = await api.get(`/miembros/${id}`);
      const miembro = response.data;
      
      Object.keys(miembro).forEach(key => {
        if (miembro[key] !== null && miembro[key] !== undefined) {
          setValue(key, miembro[key]);
        }
      });
    } catch (error) {
      console.error('Error loading member:', error);
      toast.error('Error al cargar miembro');
      navigate('/miembros');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/miembros/${id}`, data);
        toast.success('Miembro actualizado exitosamente');
      } else {
        await api.post('/miembros', data);
        toast.success('Miembro creado exitosamente');
      }
      navigate('/miembros');
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error(error.response?.data?.detail || 'Error al guardar miembro');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="miembro-form-page">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/miembros')}
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Editar Miembro' : 'Nuevo Miembro'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Actualiza la información del miembro' : 'Registra un nuevo miembro'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nombres">Nombres *</Label>
                <Input
                  id="nombres"
                  {...register('nombres', { required: 'Nombres es requerido' })}
                  data-testid="input-nombres"
                />
                {errors.nombres && (
                  <p className="text-sm text-red-600">{errors.nombres.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apellidos">Apellidos *</Label>
                <Input
                  id="apellidos"
                  {...register('apellidos', { required: 'Apellidos es requerido' })}
                  data-testid="input-apellidos"
                />
                {errors.apellidos && (
                  <p className="text-sm text-red-600">{errors.apellidos.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_documento">Tipo Documento</Label>
                <Select
                  value={watch('tipo_documento')}
                  onValueChange={(value) => setValue('tipo_documento', value)}
                >
                  <SelectTrigger data-testid="select-tipo-documento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                    <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                    <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                    <SelectItem value="PA">Pasaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documento">Documento *</Label>
                <Input
                  id="documento"
                  {...register('documento', { required: 'Documento es requerido' })}
                  data-testid="input-documento"
                />
                {errors.documento && (
                  <p className="text-sm text-red-600">{errors.documento.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_nac">Fecha de Nacimiento</Label>
                <Input
                  id="fecha_nac"
                  type="date"
                  {...register('fecha_nac')}
                  data-testid="input-fecha-nac"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="genero">Género</Label>
                <Select
                  value={watch('genero') || ''}
                  onValueChange={(value) => setValue('genero', value)}
                >
                  <SelectTrigger data-testid="select-genero">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md mt-6">
          <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  {...register('telefono')}
                  data-testid="input-telefono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  {...register('direccion')}
                  data-testid="input-direccion"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lugar_nac">Lugar de Nacimiento</Label>
                <Input
                  id="lugar_nac"
                  {...register('lugar_nac')}
                  data-testid="input-lugar-nac"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="llamado">Llamado</Label>
                <Input
                  id="llamado"
                  {...register('llamado')}
                  placeholder="Ej: Pastor, Líder, etc."
                  data-testid="input-llamado"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md mt-6">
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                {...register('notas')}
                rows={4}
                data-testid="input-notas"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="otra_iglesia" className="text-base">
                  ¿Viene de otra iglesia?
                </Label>
                <p className="text-sm text-gray-600">
                  Indica si el miembro proviene de otra congregación
                </p>
              </div>
              <Switch
                id="otra_iglesia"
                checked={otraIglesia}
                onCheckedChange={(checked) => setValue('otra_iglesia', checked)}
                data-testid="switch-otra-iglesia"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="public_profile" className="text-base">
                  Perfil Público
                </Label>
                <p className="text-sm text-gray-600">
                  Permitir que el perfil sea visible públicamente
                </p>
              </div>
              <Switch
                id="public_profile"
                checked={publicProfile}
                onCheckedChange={(checked) => setValue('public_profile', checked)}
                data-testid="switch-public-profile"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/miembros')}
            disabled={loading}
            data-testid="cancel-button"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            data-testid="submit-button"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEdit ? 'Actualizar' : 'Crear'} Miembro
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MiembroForm;