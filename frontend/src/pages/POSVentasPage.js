import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCatalog from '../components/POS/ProductCatalog';
import TicketPanel from '../components/POS/TicketPanel';
import PaymentModal from '../components/POS/PaymentModal';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { 
  ArrowLeft, 
  User, 
  Clock,
  AlertTriangle
} from 'lucide-react';
import usePOSStore from '../stores/posStore';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

/**
 * Página principal de ventas en el POS
 * Combina el catálogo de productos y el panel del ticket
 */
const POSVentasPage = () => {
  ('POSVentasPage: Component mounted');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Detectar si es un mesero (sin Firebase auth)
  const [meseroSession, setMeseroSession] = useState(null);
  
  useEffect(() => {
    const meseroData = localStorage.getItem('mesero_session');
    if (meseroData) {
      try {
        setMeseroSession(JSON.parse(meseroData));
      } catch (e) {
        console.error('Error parsing mesero session:', e);
      }
    }
  }, []);
  
  const currentShift = usePOSStore(state => state.currentShift);
  const vendedor = usePOSStore(state => state.vendedor);
  const currentTicket = usePOSStore(state => state.currentTicket);
  const newTicket = usePOSStore(state => state.newTicket);
  const initializeShift = usePOSStore(state => state.initializeShift);
  const loadActiveShift = usePOSStore(state => state.loadActiveShift);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [shiftChecked, setShiftChecked] = useState(false);
  
  // Cargar turno activo al montar SIEMPRE
  useEffect(() => {
    const checkShift = async () => {
      ('POSVentasPage: Checking active shift...');
      const shift = await loadActiveShift();
      ('POSVentasPage: Active shift result:', shift);
      setShiftChecked(true);
    };
    checkShift();
  }, []); // Array vacío para ejecutar solo al montar
  
  // Inicializar vendedor desde sesión de mesero o admin
  useEffect(() => {
    if (currentShift && !vendedor) {
      if (meseroSession) {
        // Crear objeto vendedor desde mesero
        const meseroVendedor = {
          uuid: meseroSession.uuid,
          nombre: meseroSession.display_name,
          tipo: 'mesero'
        };
        initializeShift(currentShift, meseroVendedor);
      } else if (user) {
        // Crear objeto vendedor desde usuario admin de Firebase
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const adminVendedor = {
          uuid: userData.uuid || user.uid,
          nombre: userData.nombre || user.email,
          tipo: 'admin'
        };
        ('Inicializando vendedor admin:', adminVendedor);
        initializeShift(currentShift, adminVendedor);
      }
    }
  }, [meseroSession, user, vendedor, currentShift, initializeShift]);
  
  // Nombre del usuario actual (Firebase o mesero) - Memoizado
  const currentUserName = useMemo(
    () => meseroSession?.display_name || vendedor?.nombre || user?.email || 'Sin vendedor',
    [meseroSession?.display_name, vendedor?.nombre, user?.email]
  );

  // Verificar que hay turno activo (solo después de haber chequeado)
  useEffect(() => {
    if (shiftChecked && !currentShift) {
      ('POSVentasPage: No active shift, redirecting...');
      toast.error('No hay turno activo', {
        description: 'Debes abrir un turno antes de realizar ventas',
      });
      navigate('/pos');
    }
  }, [currentShift, navigate, shiftChecked]);

  // Definir handleNewTicket antes de usarlo en useEffect
  const handleNewTicket = useCallback(() => {
    if (currentTicket && currentTicket.items.length > 0) {
      if (window.confirm('¿Deseas cancelar la venta actual y crear una nueva?')) {
        newTicket();
        toast.success('Nueva venta iniciada');
      }
    } else {
      newTicket();
    }
  }, [currentTicket, newTicket]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+N: Nuevo ticket
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        handleNewTicket();
      }
      // Alt+C: Abrir pago (Cobrar)
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        if (currentTicket && currentTicket.items.length > 0) {
          setShowPaymentModal(true);
        }
      }
      // Escape: Cerrar modal
      if (e.key === 'Escape') {
        setShowPaymentModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTicket, handleNewTicket]);
  
  const handleLogout = () => {
    if (meseroSession) {
      if (currentTicket && currentTicket.items.length > 0) {
        if (!window.confirm('Hay una venta en curso. ¿Estás seguro de cerrar sesión?')) {
          return;
        }
      }
      localStorage.removeItem('mesero_session');
      localStorage.removeItem('auth_token'); // Limpiar token JWT también
      toast.success('Sesión cerrada');
      navigate('/mesero-login', { replace: true });
    } else {
      navigate('/pos');
    }
  };

  const handleOpenPayment = () => {
    if (!currentTicket || currentTicket.items.length === 0) {
      toast.error('El ticket está vacío', {
        description: 'Agrega productos antes de procesar el pago',
      });
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (venta) => {
    toast.success('Venta procesada exitosamente', {
      description: `Ticket #${venta.numero_ticket}`,
    });
    setShowPaymentModal(false);
  };

  // Mostrar loading mientras se verifica el turno
  if (!shiftChecked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando turno activo...</p>
        </div>
      </div>
    );
  }

  if (!currentShift) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Turno No Activo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Necesitas abrir un turno antes de realizar ventas.
            </p>
            <Button onClick={() => navigate('/pos')} className="w-full">
              Volver al POS
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title={meseroSession ? "Cerrar sesión" : "Volver al POS"}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold truncate">POS</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {currentUserName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Info compacta en móvil */}
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <Badge variant="outline" className="bg-green-50 text-xs px-1.5 py-0.5">
                T{currentShift.numero_shift}
              </Badge>
              {meseroSession && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs px-1.5 py-0.5">
                  Mesero
                </Badge>
              )}
            </div>

            {/* Botón de cerrar sesión para meseros - más pequeño en móvil */}
            {meseroSession && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-3"
              >
                Salir
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {/* Mobile: Tabs para alternar entre catálogo y ticket */}
        <div className="h-full lg:hidden flex flex-col">
          <div className="bg-white border-b flex">
            <button
              onClick={() => setShowPaymentModal(false)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                !showPaymentModal
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Productos
              <span className="ml-2 text-xs text-gray-400">({currentTicket?.items.length || 0})</span>
            </button>
            <button
              onClick={() => currentTicket?.items.length > 0 && setShowPaymentModal(true)}
              disabled={!currentTicket || currentTicket.items.length === 0}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                showPaymentModal
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ticket
              {currentTicket?.total > 0 && (
                <span className="ml-2 text-xs font-bold">
                  ${currentTicket.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </span>
              )}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {!showPaymentModal ? (
              <ProductCatalog />
            ) : (
              <div className="h-full bg-white">
                <TicketPanel onOpenPayment={handleOpenPayment} />
              </div>
            )}
          </div>
        </div>

        {/* Desktop: Layout de dos columnas */}
        <div className="hidden lg:flex h-full">
          {/* Catálogo de productos - 60% en desktop */}
          <div className="flex-1 lg:w-[60%] overflow-hidden border-r">
            <ProductCatalog />
          </div>

          {/* Panel del ticket - 40% en desktop */}
          <div className="lg:w-[40%] overflow-hidden bg-white">
            <TicketPanel onOpenPayment={handleOpenPayment} />
          </div>
        </div>
      </main>

      {/* Modal de pago */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Atajos de teclado (footer info) */}
      <footer className="hidden lg:block bg-gray-800 text-gray-300 px-4 py-2">
        <div className="flex items-center justify-center gap-6 text-xs">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">Alt+N</kbd>
            {' '}Nueva Venta
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">Alt+C</kbd>
            {' '}Cobrar
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">Esc</kbd>
            {' '}Cerrar Modal
          </span>
        </div>
      </footer>
    </div>
  );
};

export default POSVentasPage;
