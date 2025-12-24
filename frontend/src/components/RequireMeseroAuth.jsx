import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Componente que protege rutas de meseros
 * Verifica que haya una sesión de mesero activa
 */
const RequireMeseroAuth = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const meseroSession = localStorage.getItem('mesero_session');
    
    if (!meseroSession) {
      // No hay sesión, redirigir al login de meseros
      toast.error('Debes iniciar sesión como mesero');
      navigate('/mesero-login', { replace: true });
      return;
    }

    try {
      const session = JSON.parse(meseroSession);
      
      // Verificar que la sesión tenga datos válidos
      if (!session || !session.display_name || !session.access_token) {
        throw new Error('Sesión inválida');
      }

      // Sesión válida, continuar
    } catch (err) {
      // Sesión corrupta o inválida
      localStorage.removeItem('mesero_session');
      localStorage.removeItem('auth_token');
      toast.error('Sesión inválida. Por favor inicia sesión nuevamente');
      navigate('/mesero-login', { replace: true });
    }
  }, [navigate, location]);

  // Prevenir navegación con back button fuera de la aplicación
  useEffect(() => {
    const handlePopState = (e) => {
      // Si intenta ir hacia atrás desde ventas, mantener en la misma página
      const meseroSession = localStorage.getItem('mesero_session');
      if (meseroSession && location.pathname === '/mesero/ventas') {
        e.preventDefault();
        window.history.pushState(null, '', '/mesero/ventas');
      }
    };

    // Agregar estado inicial para prevenir back
    window.history.pushState(null, '', location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location]);

  return children;
};

export default RequireMeseroAuth;
