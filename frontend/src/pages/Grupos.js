import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { UsersRound, Users, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const Grupos = () => {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6" data-testid="grupos-page">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Grupos</h1>
        <p className="mt-2 text-gray-600">
          {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} registrado{grupos.length !== 1 ? 's' : ''}
        </p>
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
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grupos.map((grupo) => (
            <Card 
              key={grupo.uuid} 
              className="border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
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
              <CardContent>
                {grupo.descripcion && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {grupo.descripcion}
                  </p>
                )}
                {grupo.tipo && (
                  <Badge variant="outline" className="mt-3">
                    {grupo.tipo}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Grupos;