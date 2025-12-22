import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Shield, Plus, Users, Link as LinkIcon, Loader2, Copy, Check } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [formData, setFormData] = useState({
    role: 'secretaria',
    email: '',
    expires_days: 7,
    note: ''
  });

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin' && user?.role !== 'ti') {
      toast.error('No tienes permisos para acceder a esta sección');
      navigate('/dashboard');
      return;
    }
    loadInvites();
  }, [user, navigate]);

  const loadInvites = async () => {
    try {
      const response = await api.get('/admin/invites');
      setInvites(response.data.invites);
    } catch (error) {
      console.error('Error loading invites:', error);
      toast.error('Error al cargar invitaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await api.post('/admin/invites', formData);
      toast.success('Invitación creada exitosamente');
      setFormData({ role: 'secretaria', email: '', expires_days: 7, note: '' });
      loadInvites();
      
      // Copy invite link
      const inviteLink = `${window.location.origin}/invite/${response.data.token}`;
      navigator.clipboard.writeText(inviteLink);
      toast.success('Enlace de invitación copiado al portapapeles');
    } catch (error) {
      console.error('Error creating invite:', error);
      toast.error(error.response?.data?.detail || 'Error al crear invitación');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = (token) => {
    const inviteLink = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(token);
    toast.success('Enlace copiado al portapapeles');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRevokeInvite = async (token) => {
    try {
      await api.post(`/admin/invites/${token}/revoke`);
      toast.success('Invitación revocada');
      loadInvites();
    } catch (error) {
      console.error('Error revoking invite:', error);
      toast.error('Error al revocar invitación');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="admin-page">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          Administración
        </h1>
        <p className="mt-2 text-gray-600">Gestiona usuarios e invitaciones del sistema</p>
      </div>

      {/* Enlaces rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="border-yellow-200 bg-yellow-50 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/clientes-temporales')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">Clientes Temporales</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Verifica clientes registrados por meseros
                </p>
              </div>
              <Users className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-blue-200 bg-blue-50 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/pos/turnos')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Gestión de Turnos</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Administra turnos de caja del restaurante
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Crear Nueva Invitación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Rol *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="pastor">Pastor</SelectItem>
                    <SelectItem value="secretaria">Secretaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_days">Días de Validez</Label>
                <Input
                  id="expires_days"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.expires_days}
                  onChange={(e) => setFormData({ ...formData, expires_days: parseInt(e.target.value) })}
                  data-testid="input-expires-days"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Nota (opcional)</Label>
                <Input
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Ej: Para Juan Pérez"
                  data-testid="input-note"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={creating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              data-testid="create-invite-button"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Invitación
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Invitaciones Creadas ({invites.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No hay invitaciones creadas</p>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => (
                <div 
                  key={invite.id} 
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={invite.used ? 'secondary' : invite.revoked ? 'destructive' : 'default'}>
                          {invite.used ? 'Usado' : invite.revoked ? 'Revocado' : 'Activo'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {invite.role}
                        </Badge>
                      </div>
                      {invite.email && (
                        <p className="text-sm text-gray-600 mb-1">{invite.email}</p>
                      )}
                      {invite.note && (
                        <p className="text-sm text-gray-500 italic">{invite.note}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Expira: {format(new Date(invite.expires_at), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!invite.used && !invite.revoked && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(invite.token)}
                            data-testid={`copy-invite-${invite.token}`}
                          >
                            {copiedToken === invite.token ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevokeInvite(invite.token)}
                            data-testid={`revoke-invite-${invite.token}`}
                          >
                            Revocar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;