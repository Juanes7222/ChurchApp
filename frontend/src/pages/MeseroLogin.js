import React, { useState } from 'react';
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
      const errorMsg = err.response?.data?.detail || 'Error al iniciar sesión. Verifica que el backend esté ejecutándose.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFormData({ ...formData, pin: value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Login Mesero</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Ingresa tu usuario y PIN para acceder al sistema de ventas
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="mesero_001"
                  className="pl-10"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  autoComplete="off"
                  autoFocus
                />
              </div>
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
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || formData.pin.length !== 4}
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>

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
