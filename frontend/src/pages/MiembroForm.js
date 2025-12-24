import { useState, useEffect } from 'react';
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
  const [grupos, setGrupos] = useState([]);
  const [selectedGrupos, setSelectedGrupos] = useState([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [originalGrupos, setOriginalGrupos] = useState([]); // Grupos originales del miembro

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
      foto_url: '',
    }
  });

  const otraIglesia = watch('otra_iglesia');
  const publicProfile = watch('public_profile');

  useEffect(() => {
    loadGrupos();
    if (isEdit) {
      loadMiembro();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const loadGrupos = async () => {
    try {
      const response = await api.get('/grupos');
      setGrupos(response.data.grupos || []);
    } catch (error) {
      console.error('Error loading grupos:', error);
    }
  };

  const loadMiembro = async () => {
    try {
      const response = await api.get(`/miembros/${id}`);
      const miembro = response.data;
      
      Object.keys(miembro).forEach(key => {
        if (miembro[key] !== null && miembro[key] !== undefined) {
          setValue(key, miembro[key]);
        }
      });

      // Cargar grupos del miembro
      if (miembro.grupos && Array.isArray(miembro.grupos)) {
        const grupoUuids = miembro.grupos.map(g => g.uuid);
        setSelectedGrupos(grupoUuids);
        setOriginalGrupos(grupoUuids); // Guardar grupos originales
      }
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
      // Clean up data - convert empty strings to null for optional fields
      const cleanedData = {
        ...data,
        email: data.email?.trim() || null,
        telefono: data.telefono?.trim() || null,
        direccion: data.direccion?.trim() || null,
        lugar_nac: data.lugar_nac?.trim() || null,
        llamado: data.llamado?.trim() || null,
        notas: data.notas?.trim() || null,
        fecha_nac: data.fecha_nac || null,
        genero: data.genero || null,
        foto_url: data.foto_url?.trim() || null,
      };
      
      let miembroUuid = id;
      
      if (isEdit) {
        await api.put(`/miembros/${id}`, cleanedData);
        toast.success('Miembro actualizado exitosamente');
      } else {
        const response = await api.post('/miembros', cleanedData);
        miembroUuid = response.data.uuid;
        toast.success('Miembro creado exitosamente');
      }

      // Gestionar grupos (agregar nuevos y remover deseleccionados)
      if (miembroUuid) {
        // Calcular diferencias entre grupos originales y seleccionados
        const gruposToAdd = selectedGrupos.filter(g => !originalGrupos.includes(g));
        const gruposToRemove = originalGrupos.filter(g => !selectedGrupos.includes(g));
        
        // Agregar nuevos grupos
        for (const grupoUuid of gruposToAdd) {
          try {
            await api.post(`/grupos/${grupoUuid}/miembros/${miembroUuid}`);
          } catch (error) {
            console.error(`Error asignando grupo ${grupoUuid}:`, error);
            toast.error(`No se pudo asignar uno de los grupos`);
          }
        }
        
        // Remover grupos deseleccionados (solo en edición)
        if (isEdit) {
          for (const grupoUuid of gruposToRemove) {
            try {
              await api.delete(`/grupos/${grupoUuid}/miembros/${miembroUuid}`);
            } catch (error) {
              console.error(`Error removiendo grupo ${grupoUuid}:`, error);
              toast.error(`No se pudo remover uno de los grupos`);
            }
          }
        }
      }

      navigate('/miembros');
    } catch (error) {
      console.error('Error saving member:', error);
      
      // Better error handling for validation errors
      let errorMessage = 'Error al guardar miembro';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // If detail is an array of validation errors
        if (Array.isArray(detail)) {
          errorMessage = detail.map(err => {
            const field = err.loc?.[err.loc.length - 1] || '';
            const msg = err.msg || '';
            return field ? `${field}: ${msg}` : msg;
          }).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail);
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Use JPG, PNG, WEBP o GIF');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo muy grande. Máximo 5MB');
      return;
    }

    setUploadingFoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/miembros/upload-foto', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setValue('foto_url', response.data.url);
      toast.success('Foto subida exitosamente');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(error.response?.data?.detail || 'Error al subir foto');
    } finally {
      setUploadingFoto(false);
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

            <div className="pt-4 border-t">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Foto del Miembro</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    {watch('foto_url') ? 'Foto configurada' : 'Sube una foto directamente'}
                  </p>
                </div>

                {!watch('foto_url') && (
                  <div className="space-y-2">
                    <Label htmlFor="foto_file">Subir Foto</Label>
                    <Input
                      id="foto_file"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleFileUpload}
                      disabled={uploadingFoto}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500">
                      Formatos: JPG, PNG, WEBP, GIF • Máximo: 5MB
                    </p>
                    {uploadingFoto && (
                      <p className="text-sm text-blue-600 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Subiendo foto...
                      </p>
                    )}
                  </div>
                )}

                {watch('foto_url') && (
                  <div className="mt-3">
                    <Label className="text-sm mb-2 block">Foto del miembro:</Label>
                    <div className="relative inline-block">
                      <img
                        src={watch('foto_url')}
                        alt="Vista previa"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2"
                        onClick={() => setValue('foto_url', '')}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                )}
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
              <Label>Grupos</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {grupos.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay grupos disponibles</p>
                ) : (
                  grupos.map((grupo) => (
                    <label
                      key={grupo.uuid}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGrupos.includes(grupo.uuid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGrupos([...selectedGrupos, grupo.uuid]);
                          } else {
                            setSelectedGrupos(selectedGrupos.filter(g => g !== grupo.uuid));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm">{grupo.nombre}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedGrupos.length} grupo(s) seleccionado(s)
              </p>
            </div>

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