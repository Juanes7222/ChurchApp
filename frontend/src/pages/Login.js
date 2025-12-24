import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import churchLogo from '../assets/img/logo-mmm.png';

const Login = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success('¡Bienvenido!');
      // Navigation will be handled by AuthContext when user state updates
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Inicio de sesión cancelado');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup bloqueado. Por favor permite popups para este sitio.');
      } else if (error.response?.status === 403) {
        toast.error('Usuario no autorizado. Contacta al administrador.');
      } else {
        toast.error('Error al iniciar sesión. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-none" data-testid="login-card">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto w-24 h-24 flex items-center justify-center">
            <img 
              src={churchLogo} 
              alt="Logo Iglesia" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Sistema de Información MMM Cartago
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Gestión de miembros
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 text-base font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
              data-testid="google-login-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continuar con Google
                </>
              )}
            </Button>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => navigate('/mesero-login')}
              variant="outline"
              className="w-full h-11 text-base font-medium border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
            >
              Soy Mesero
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600 pt-4 border-t">
            <p>¿No tienes acceso?</p>
            <p className="mt-1">Contacta al administrador para obtener una invitación</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;