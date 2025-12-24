import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  ArrowLeft, 
  Edit, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Users
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MiembroDetalle = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [miembro, setMiembro] = useState(null);
  const [observaciones, setObservaciones] = useState([]);
  const [nuevaObs, setNuevaObs] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingObs, setSavingObs] = useState(false);
  const [showFoto, setShowFoto] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [miembroRes, obsRes] = await Promise.all([
        api.get(`/miembros/${id}`),
        api.get(`/miembros/${id}/observaciones`)
      ]);
      setMiembro(miembroRes.data);
      setObservaciones(obsRes.data.observaciones);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos del miembro');
      navigate('/miembros');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddObservacion = async (e) => {
    e.preventDefault();
    if (!nuevaObs.trim()) return;

    setSavingObs(true);
    try {
      await api.post(`/miembros/${id}/observaciones`, { texto: nuevaObs });
      toast.success('Observación agregada');
      setNuevaObs('');
      // Reload observations
      const obsRes = await api.get(`/miembros/${id}/observaciones`);
      setObservaciones(obsRes.data.observaciones);
    } catch (error) {
      console.error('Error adding observation:', error);
      toast.error('Error al agregar observación');
    } finally {
      setSavingObs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!miembro) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="miembro-detalle-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
              {miembro.nombres} {miembro.apellidos}
            </h1>
            <p className="text-gray-600 mt-1">{miembro.documento}</p>
            {miembro.foto_url && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowFoto(true)}
                className="mt-1 p-0 h-auto text-blue-600"
              >
                Ver foto
              </Button>
            )}
          </div>
        </div>
        <Button
          onClick={() => navigate(`/miembros/${id}/editar`)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          data-testid="edit-button"
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-600 text-sm">Tipo de Documento</Label>
                    <p className="font-medium">{miembro.tipo_documento || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm">Documento</Label>
                    <p className="font-medium">{miembro.documento}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm">Fecha de Nacimiento</Label>
                    <p className="font-medium">
                      {miembro.fecha_nac 
                        ? format(new Date(miembro.fecha_nac), 'dd MMMM yyyy', { locale: es })
                        : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm">Género</Label>
                    <p className="font-medium">
                      {miembro.genero === 'M' ? 'Masculino' : miembro.genero === 'F' ? 'Femenino' : '-'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-600 text-sm">Lugar de Nacimiento</Label>
                    <p className="font-medium">{miembro.lugar_nac || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm">Llamado</Label>
                    <p className="font-medium">{miembro.llamado || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm">Otra Iglesia</Label>
                    <Badge variant={miembro.otra_iglesia ? 'default' : 'secondary'}>
                      {miembro.otra_iglesia ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm">Perfil Público</Label>
                    <Badge variant={miembro.public_profile ? 'default' : 'secondary'}>
                      {miembro.public_profile ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <div>
                    <Label className="text-gray-600 text-sm">Teléfono</Label>
                    <p className="font-medium">{miembro.telefono || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <Label className="text-gray-600 text-sm">Email</Label>
                    <p className="font-medium">{miembro.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <Label className="text-gray-600 text-sm">Dirección</Label>
                    <p className="font-medium">{miembro.direccion || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Grupos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!miembro.grupos || miembro.grupos.length === 0 ? (
                <p className="text-sm text-gray-600">No pertenece a ningún grupo</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {miembro.grupos.map((grupo) => (
                    <Badge 
                      key={grupo.uuid} 
                      variant="secondary"
                      className="px-3 py-1"
                    >
                      {grupo.nombre}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {miembro.notas && (
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{miembro.notas}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddObservacion} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="observacion">Nueva Observación</Label>
                  <Textarea
                    id="observacion"
                    value={nuevaObs}
                    onChange={(e) => setNuevaObs(e.target.value)}
                    rows={3}
                    placeholder="Escribe una observación..."
                    disabled={savingObs}
                    data-testid="input-observacion"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={savingObs || !nuevaObs.trim()}
                  className="w-full"
                  data-testid="add-observacion-button"
                >
                  {savingObs ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Agregar
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 space-y-4">
                {observaciones.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-4">
                    No hay observaciones
                  </p>
                ) : (
                  observaciones.map((obs) => (
                    <div key={obs.uuid} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{obs.texto}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {format(new Date(obs.fecha), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Metadatos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label className="text-gray-600 text-xs">Creado</Label>
                <p className="font-medium">
                  {format(new Date(miembro.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                </p>
              </div>
              <div>
                <Label className="text-gray-600 text-xs">Última Actualización</Label>
                <p className="font-medium">
                  {format(new Date(miembro.updated_at), 'dd MMM yyyy HH:mm', { locale: es })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para mostrar foto */}
      <Dialog open={showFoto} onOpenChange={setShowFoto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Foto de {miembro.nombres} {miembro.apellidos}
            </DialogTitle>
            <DialogDescription>
              Vista previa de la fotografía del miembro
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center p-4">
            {miembro.foto_url ? (
              <img
                src={miembro.foto_url}
                alt={`${miembro.nombres} ${miembro.apellidos}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(_) => {
                  console.error('Error cargando imagen:', miembro.foto_url);
                  toast.error(`Error al cargar la imagen. URL: ${miembro.foto_url}`);
                  setShowFoto(false);
                }}
              />
            ) : (
              <p className="text-gray-500">No hay URL de foto disponible</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MiembroDetalle;