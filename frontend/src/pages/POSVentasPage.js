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
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const currentShift = usePOSStore(state => state.currentShift);
  const vendedor = usePOSStore(state => state.vendedor);
  const currentTicket = usePOSStore(state => state.currentTicket);
  const newTicket = usePOSStore(state => state.newTicket);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Verificar que hay turno activo
  useEffect(() => {
    if (!currentShift) {
      toast.error('No hay turno activo', {
        description: 'Debes abrir un turno antes de realizar ventas',
      });
      navigate('/pos');
    }
  }, [currentShift, navigate]);

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
              onClick={() => navigate('/pos')}
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
                {vendedor?.nombre || user?.email || 'Sin vendedor'}
              </span>
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
