import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  ArrowLeft,
  Loader2,
  UsersRound,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const GrupoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [grupo, setGrupo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadGrupo = useCallback(async () => {
    try {
      const response = await api.get(`/grupos/${id}`);
      setGrupo(response.data);
    } catch (error) {
      console.error('Error loading grupo:', error);
      toast.error('Error al cargar el grupo');
      navigate('/grupos');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadGrupo();
  }, [loadGrupo]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/grupos/${id}`);
      toast.success('Grupo eliminado exitosamente');
      navigate('/grupos');
    } catch (error) {
      console.error('Error deleting grupo:', error);
      toast.error('Error al eliminar el grupo');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!grupo) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/grupos')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{grupo.nombre}</h1>
              <Badge variant={grupo.activo ? 'default' : 'secondary'}>
                {grupo.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">
              {grupo.total_miembros || 0} miembro{grupo.total_miembros !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/grupos/${id}/editar`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Información del Grupo */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <UsersRound className="h-5 w-5 text-white" />
            </div>
            Información del Grupo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Nombre</p>
              <p className="text-base text-gray-900 mt-1">{grupo.nombre}</p>
            </div>

            {grupo.tipo && (
              <div>
                <p className="text-sm font-medium text-gray-500">Tipo</p>
                <Badge variant="outline" className="mt-1">
                  {grupo.tipo}
                </Badge>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-500">Privacidad</p>
              <p className="text-base text-gray-900 mt-1 capitalize">
                {grupo.privacidad === 'public' ? 'Público' : 'Privado'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <Badge variant={grupo.activo ? 'default' : 'secondary'} className="mt-1">
                {grupo.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>

          {grupo.descripcion && (
            <div>
              <p className="text-sm font-medium text-gray-500">Descripción</p>
              <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">
                {grupo.descripcion}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-500">Fecha de Creación</p>
            <p className="text-base text-gray-900 mt-1">
              {new Date(grupo.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Miembros del Grupo */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Miembros ({grupo.miembros?.length || 0})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!grupo.miembros || grupo.miembros.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UsersRound className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p>No hay miembros en este grupo</p>
              <p className="text-sm mt-1">
                Los miembros se asignan desde la página de edición de cada miembro
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grupo.miembros.map((miembro) => (
                <div
                  key={miembro.uuid}
                  className="flex items-center gap-3 p-4 rounded-lg border hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                  onClick={() => navigate(`/miembros/${miembro.uuid}`)}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {miembro.nombres?.charAt(0)}{miembro.apellidos?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {miembro.nombres} {miembro.apellidos}
                    </p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {miembro.telefono && (
                        <p className="text-sm text-gray-600 flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          <span className="truncate">{miembro.telefono}</span>
                        </p>
                      )}
                      {miembro.email && (
                        <p className="text-sm text-gray-600 flex items-center gap-1.5">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{miembro.email}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmación de Eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar grupo?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará el grupo "{grupo.nombre}". Los miembros no serán
              eliminados, solo se removerá su asignación a este grupo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar Grupo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GrupoDetalle;
