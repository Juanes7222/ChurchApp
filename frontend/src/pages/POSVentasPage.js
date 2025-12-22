import React, { useState, useEffect } from 'react';
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
  console.log('POSVentasPage: Component mounted');
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
      console.log('POSVentasPage: Checking active shift...');
      const shift = await loadActiveShift();
      console.log('POSVentasPage: Active shift result:', shift);
      setShiftChecked(true);
    };
    checkShift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        console.log('Inicializando vendedor admin:', adminVendedor);
        initializeShift(currentShift, adminVendedor);
      }
    }
  }, [meseroSession, user, vendedor, currentShift, initializeShift]);
  
  // Nombre del usuario actual (Firebase o mesero)
  const currentUserName = meseroSession?.display_name || vendedor?.nombre || user?.email || 'Sin vendedor';

  // Verificar que hay turno activo (solo después de haber chequeado)
  useEffect(() => {
    if (shiftChecked && !currentShift) {
      console.log('POSVentasPage: No active shift, redirecting...');
      toast.error('No hay turno activo', {
        description: 'Debes abrir un turno antes de realizar ventas',
      });
      navigate('/pos');
    }
  }, [currentShift, navigate, shiftChecked]);

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
  }, [currentTicket]);

  const handleNewTicket = () => {
    if (currentTicket && currentTicket.items.length > 0) {
      if (window.confirm('¿Deseas cancelar la venta actual y crear una nueva?')) {
        newTicket();
        toast.success('Nueva venta iniciada');
      }
    } else {
      newTicket();
    }
  };
  
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
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title={meseroSession ? "Cerrar sesión" : "Volver al POS"}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Punto de Venta</h1>
              <p className="text-sm text-gray-500">
                Registra y procesa las ventas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Info del turno */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                Turno #{currentShift.numero_shift}
              </span>
              <Badge variant="outline" className="bg-green-50">
                {currentShift.estado}
              </Badge>
            </div>

            {/* Info del vendedor */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                {currentUserName}
              </span>
              {meseroSession && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  Mesero
                </Badge>
              )}
            </div>

            {/* Botón nuevo ticket */}
            <Button
              variant="outline"
              onClick={handleNewTicket}
              className="hidden sm:flex"
            >
              Nueva Venta
              <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 rounded border">
                Alt+N
              </kbd>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row">
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
