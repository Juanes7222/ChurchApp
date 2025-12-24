import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { UsersRound, Users, Loader2, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import api from '../lib/api';
import { toast } from 'sonner';

const Grupos = () => {
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [grupoToDelete, setGrupoToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadGrupos();
  }, []);

  const loadGrupos = async () => {
    try {
      const response = await api.get('/grupos');
      setGrupos(response.data.grupos);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (grupo) => {
    setGrupoToDelete(grupo);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!grupoToDelete) return;

    setDeleting(true);
    try {
      await api.delete(`/grupos/${grupoToDelete.uuid}`);
      toast.success('Grupo eliminado exitosamente');
      setDeleteDialogOpen(false);
      setGrupoToDelete(null);
      loadGrupos();
    } catch (error) {
      console.error('Error deleting grupo:', error);
      toast.error('Error al eliminar el grupo');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="grupos-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Grupos</h1>
          <p className="mt-2 text-gray-600">
            {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} registrado{grupos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/grupos/nuevo')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Grupo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : grupos.length === 0 ? (
        <Card className="border-none shadow-md">
          <CardContent className="text-center py-12">
            <UsersRound className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">No se encontraron grupos</p>
            <Button onClick={() => navigate('/grupos/nuevo')} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Crear Primer Grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grupos.map((grupo) => (
            <Card 
              key={grupo.uuid} 
              className="border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative group"
              data-testid={`grupo-card-${grupo.uuid}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                    <UsersRound className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant={grupo.activo ? 'default' : 'secondary'}>
                    {grupo.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <CardTitle className="mt-4">{grupo.nombre}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {grupo.descripcion && (
                  <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
                    {grupo.descripcion}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  {grupo.tipo && (
                    <Badge variant="outline">
                      {grupo.tipo}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{grupo.total_miembros || 0}</span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => navigate(`/grupos/${grupo.uuid}`)}
                  >
                    <Eye className="h-4 w-4" />
                    Ver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => navigate(`/grupos/${grupo.uuid}/editar`)}
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(grupo);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Confirmación de Eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar grupo?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará el grupo "{grupoToDelete?.nombre}". Los miembros no
              serán eliminados, solo se removerá su asignación a este grupo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
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

export default Grupos;