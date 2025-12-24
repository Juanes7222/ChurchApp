import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const MeseroLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    pin: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Verificar si ya hay una sesión activa al cargar
  useEffect(() => {
    const meseroSession = localStorage.getItem('mesero_session');
    if (meseroSession) {
      try {
        const session = JSON.parse(meseroSession);
        if (session && session.display_name) {
          // Ya hay sesión activa, redirigir
          toast.info(`Sesión activa: ${session.display_name}`);
          navigate('/mesero/ventas', { replace: true });
        }
      } catch (err) {
        // Sesión corrupta, limpiar
        localStorage.removeItem('mesero_session');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      ('Intentando login mesero:', { username: formData.username });
      const response = await api.post('/pos/meseros/login', formData);
      ('Respuesta login mesero:', response.data);
      
      const meseroData = response.data;
      
      // Guardar token JWT en localStorage (para axios interceptor)
      if (meseroData.access_token) {
        localStorage.setItem('auth_token', meseroData.access_token);
      }
      
      // Guardar sesión de mesero en localStorage
      localStorage.setItem('mesero_session', JSON.stringify(meseroData));
      
      toast.success(`Bienvenido ${meseroData.display_name}`);
      
      // Navegar después de un pequeño delay para asegurar que el toast se muestre
      setTimeout(() => {
        navigate('/mesero/ventas', { replace: true });
      }, 100);
    } catch (err) {
      console.error('Error login mesero:', err);
      
      // Limpiar cualquier sesión previa en caso de error
      localStorage.removeItem('mesero_session');
      localStorage.removeItem('auth_token');
      
      // Determinar mensaje de error específico
      let errorMsg = 'Error al iniciar sesión';
      
      if (err.response) {
        // El servidor respondió con un error
        if (err.response.status === 401) {
          errorMsg = 'Usuario o PIN incorrecto. Verifica tus credenciales.';
        } else if (err.response.status === 403) {
          errorMsg = 'Acceso denegado. Tu cuenta puede estar inactiva o expirada.';
        } else if (err.response.status === 404) {
          errorMsg = 'Usuario no encontrado. Verifica tu nombre de usuario.';
        } else {
          errorMsg = err.response.data?.detail || 'Error en el servidor. Intenta nuevamente.';
        }
      } else if (err.request) {
        // La petición se hizo pero no hubo respuesta
        errorMsg = 'No se pudo conectar con el servidor. Verifica tu conexión.';
      }
      
      setError(errorMsg);
      toast.error(errorMsg, {
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFormData({ ...formData, pin: value });
  };

  const handleLogout = () => {
    localStorage.removeItem('mesero_session');
    localStorage.removeItem('auth_token');
    toast.success('Sesión cerrada');
    setFormData({ username: '', pin: '' });
  };

  // Verificar si hay sesión activa para mostrar botón de logout
  const meseroSession = localStorage.getItem('mesero_session');
  const hasActiveSession = meseroSession ? JSON.parse(meseroSession) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Login Mesero</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Ingresa tu número de documento y tu PIN de 4 dígitos para acceder al sistema de ventas
          </p>
          {hasActiveSession && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                Ya tienes una sesión activa como <span className="font-semibold">{hasActiveSession.display_name}</span>
              </p>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Número de Documento</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="1234567890"
                  className="pl-10"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500">
                Ingresa tu número de cédula o documento de identidad
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="4"
                  placeholder="••••"
                  className="pl-10 text-center text-2xl tracking-widest"
                  value={formData.pin}
                  onChange={handlePinInput}
                  required
                />
              </div>
              <p className="text-xs text-gray-500">PIN de 4 dígitos</p>
            </div>

            {error && (
              <div className="flex items-start gap-3 text-sm text-red-700 bg-red-100 border-2 border-red-300 p-4 rounded-lg shadow-md animate-shake">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold mb-1">Error de autenticación</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700" 
              disabled={loading || formData.pin.length !== 4}
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>

            {error && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setError('');
                  setFormData({ username: '', pin: '' });
                }}
              >
                Limpiar e Intentar de Nuevo
              </Button>
            )}

            <div className="text-center pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Volver al login principal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeseroLogin;
