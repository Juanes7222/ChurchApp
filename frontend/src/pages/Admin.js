import { useEffect, useState } from 'react';
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
    note: '',
    isPermanent: false
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
      // Si es permanente, no enviar expires_days
      const requestData = {
        role: formData.role,
        email: formData.email,
        note: formData.note
      };
      
      if (!formData.isPermanent) {
        requestData.expires_days = formData.expires_days;
      }
      
      const response = await api.post('/admin/invites', requestData);
      toast.success('Invitación creada exitosamente');
      setFormData({ role: 'secretaria', email: '', expires_days: 7, note: '', isPermanent: false });
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

      {/* Matriz de Permisos por Rol */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Sistema de Permisos por Rol
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Cada rol tiene acceso limitado según su función. Nadie accede a lo que no necesita.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Admin */}
            <div className="border border-purple-200 bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-purple-600">Administrador</Badge>
                <span className="text-xs text-purple-600 font-semibold">ACCESO TOTAL</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                Acceso absoluto a todo el sistema. Solo puede ser creado directamente por el sistema.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">✓ Gestión completa de miembros</span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">✓ Gestión completa de grupos</span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">✓ POS completo</span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">✓ Administración de usuarios</span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">✓ Auditorías</span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">✓ Configuraciones</span>
              </div>
            </div>

            {/* Pastor */}
            <div className="border border-green-200 bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-600">Pastor</Badge>
                <span className="text-xs text-green-600 font-semibold">LECTURA + USUARIOS</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                Acceso de lectura completo. Acompañamiento espiritual sin modificar configuraciones técnicas.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">✓ Ver miembros completo</span>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">✓ Ver grupos y liderazgos</span>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">✓ Ver observaciones</span>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">✓ Ver reportes POS</span>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">✓ Ver cuentas (solo lectura)</span>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">✓ Crear/eliminar usuarios</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Modificar configuraciones</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Abrir/cerrar turnos</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Registrar pagos</span>
              </div>
            </div>

            {/* Secretaria */}
            <div className="border border-blue-200 bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-blue-600">Secretaria</Badge>
                <span className="text-xs text-blue-600 font-semibold">OPERATIVO-ADMINISTRATIVO</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                Gestión del día a día: miembros, grupos, observaciones y pagos.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✓ Crear/editar miembros</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✓ Gestión de grupos</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✓ Registrar observaciones</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✓ Registrar abonos/pagos</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✓ Consultar reportes</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">✓ Crear/eliminar usuarios</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Abrir/cerrar turnos</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Anular ventas</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Eliminar miembros</span>
              </div>
            </div>

            {/* Administrador Restaurante */}
            <div className="border border-orange-200 bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-orange-600">Administrador Restaurante</Badge>
                <span className="text-xs text-orange-600 font-semibold">POS COMPLETO</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                Control total del restaurante: turnos, ventas, cuentas, productos y reportes.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">✓ Abrir/cerrar turnos</span>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">✓ Gestión de productos</span>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">✓ Anular ventas</span>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">✓ Registrar abonos/ajustes</span>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">✓ Reportes completos</span>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">✓ Usuarios temporales</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Ver/editar miembros completos</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Gestión de grupos</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Configuraciones globales</span>
              </div>
            </div>

            {/* Líder */}
            <div className="border border-yellow-200 bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-yellow-600">Líder</Badge>
                <span className="text-xs text-yellow-600 font-semibold">SOLO SU GRUPO (FUTURO)</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                Acceso limitado a información básica de los miembros de su grupo únicamente.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">✓ Ver info básica de su grupo</span>
                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">✓ Ver fechas relevantes</span>
                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">✓ Ver observaciones públicas</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Ver info financiera</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Editar datos</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Acceder al restaurante</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Ver otros grupos</span>
              </div>
            </div>

            {/* Usuario Temporal (Mesero) */}
            <div className="border border-gray-200 bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">Usuario Temporal (Mesero)</Badge>
                <span className="text-xs text-gray-600 font-semibold">SOLO DURANTE TURNO</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                Acceso temporal solo para registrar ventas mientras el turno está activo.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">✓ Registrar ventas</span>
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">✓ Seleccionar productos</span>
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">✓ Marcar ventas fiadas</span>
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">✓ Registrar pagos inmediatos</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Ver datos completos de miembros</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Anular ventas</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Ver reportes</span>
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">✗ Persiste después del turno</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Principios del Sistema de Permisos:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Nadie accede a lo que no necesita</strong> - Mínimo privilegio necesario</li>
              <li>• <strong>Registros sensibles solo con autorización</strong> - Pastor y Secretaria por invitación</li>
              <li>• <strong>Acciones críticas auditadas</strong> - Todo cambio importante queda registrado</li>
              <li>• <strong>Usuarios temporales nunca persisten</strong> - Meseros solo existen durante turnos</li>
              <li>• <strong>Admin controla todo</strong> - Único rol con acceso absoluto</li>
            </ul>
          </div>
        </CardContent>
      </Card>

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
                    <SelectItem value="pastor">Pastor</SelectItem>
                    <SelectItem value="secretaria">Secretaria</SelectItem>
                    <SelectItem value="agente_restaurante">Administrador Restaurante</SelectItem>
                    <SelectItem value="lider">Líder (futuro)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Admin solo puede ser creado directamente por el sistema
                </p>
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
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="expires_days">Días de Validez</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPermanent"
                      checked={formData.isPermanent}
                      onChange={(e) => setFormData({ ...formData, isPermanent: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isPermanent" className="text-sm font-normal cursor-pointer">
                      Permanente (sin expiración)
                    </Label>
                  </div>
                </div>
                <Input
                  id="expires_days"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.expires_days}
                  onChange={(e) => setFormData({ ...formData, expires_days: parseInt(e.target.value) })}
                  data-testid="input-expires-days"
                  disabled={formData.isPermanent}
                  className={formData.isPermanent ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
                {formData.isPermanent && (
                  <p className="text-xs text-blue-600 mt-1">
                    ✓ Esta invitación no expirará automáticamente
                  </p>
                )}
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
                        {!invite.expires_at && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            Permanente
                          </Badge>
                        )}
                      </div>
                      {invite.email && (
                        <p className="text-sm text-gray-600 mb-1">{invite.email}</p>
                      )}
                      {invite.note && (
                        <p className="text-sm text-gray-500 italic">{invite.note}</p>
                      )}
                      {invite.expires_at ? (
                        <p className="text-xs text-gray-500 mt-2">
                          Expira: {format(new Date(invite.expires_at), 'dd MMM yyyy', { locale: es })}
                        </p>
                      ) : (
                        <p className="text-xs text-blue-600 mt-2">
                          ✓ Sin fecha de expiración
                        </p>
                      )}
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