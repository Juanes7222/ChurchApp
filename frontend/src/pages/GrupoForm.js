import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { ArrowLeft, Loader2, UsersRound } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const GrupoForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nombre: '',
      descripcion: '',
      tipo: '',
      activo: true,
      privacidad: 'public',
    },
  });

  const activoValue = watch('activo');
  const privacidadValue = watch('privacidad');

  const loadGrupo = useCallback(async () => {
    try {
      const response = await api.get(`/grupos/${id}`);
      const grupo = response.data;

      setValue('nombre', grupo.nombre || '');
      setValue('descripcion', grupo.descripcion || '');
      setValue('tipo', grupo.tipo || '');
      setValue('activo', grupo.activo ?? true);
      setValue('privacidad', grupo.privacidad || 'public');
    } catch (error) {
      console.error('Error loading grupo:', error);
      toast.error('Error al cargar el grupo');
      navigate('/grupos');
    } finally {
      setLoadingData(false);
    }
  }, [id, setValue, navigate]);

  useEffect(() => {
    if (isEdit) {
      loadGrupo();
    }
  }, [isEdit, loadGrupo]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const cleanedData = {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        tipo: data.tipo?.trim() || null,
        activo: data.activo,
        privacidad: data.privacidad,
      };

      if (isEdit) {
        await api.put(`/grupos/${id}`, cleanedData);
        toast.success('Grupo actualizado exitosamente');
      } else {
        await api.post('/grupos', cleanedData);
        toast.success('Grupo creado exitosamente');
      }

      navigate('/grupos');
    } catch (error) {
      console.error('Error saving grupo:', error);
      const errorMessage = error.response?.data?.detail || 'Error al guardar el grupo';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/grupos')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Editar Grupo' : 'Nuevo Grupo'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Modifica la información del grupo' : 'Registra un nuevo grupo'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <UsersRound className="h-5 w-5 text-white" />
              </div>
              Información del Grupo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre del Grupo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Jóvenes, Matrimonios, Alabanza"
                {...register('nombre', {
                  required: 'El nombre es requerido',
                  minLength: {
                    value: 2,
                    message: 'El nombre debe tener al menos 2 caracteres',
                  },
                })}
              />
              {errors.nombre && (
                <p className="text-sm text-red-600">{errors.nombre.message}</p>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Describe el propósito y actividades del grupo..."
                rows={4}
                {...register('descripcion')}
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo/Categoría</Label>
              <Input
                id="tipo"
                placeholder="Ej: Ministerio, Célula, Servicio"
                {...register('tipo')}
              />
              <p className="text-sm text-gray-500">
                Categoría o tipo de grupo (opcional)
              </p>
            </div>

            {/* Activo */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="activo">Grupo Activo</Label>
                <p className="text-sm text-gray-500">
                  Los grupos inactivos no aparecerán en los formularios
                </p>
              </div>
              <Switch
                id="activo"
                checked={activoValue}
                onCheckedChange={(checked) => setValue('activo', checked)}
              />
            </div>

            {/* Privacidad */}
            <div className="space-y-2">
              <Label htmlFor="privacidad">Privacidad</Label>
              <select
                id="privacidad"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={privacidadValue}
                onChange={(e) => setValue('privacidad', e.target.value)}
              >
                <option value="public">Público</option>
                <option value="private">Privado</option>
              </select>
              <p className="text-sm text-gray-500">
                Define si el grupo es público o privado
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex gap-3 justify-end mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/grupos')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>{isEdit ? 'Actualizar Grupo' : 'Crear Grupo'}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default GrupoForm;
