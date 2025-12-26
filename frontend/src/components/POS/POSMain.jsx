/**
 * POSMain - Pantalla principal del punto de venta
 * Layout: Catálogo izquierda | Ticket derecha
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProductos, fetchCategorias } from '../../services/api';
import db from '../../services/db';
import usePOSStore from '../../stores/posStore';
import ProductCatalog from './ProductCatalog';
import TicketPanel from './TicketPanel';
import PaymentModal from './PaymentModal';
import POSHeader from './POSHeader';
import { Toaster } from '../ui/sonner';
import { toast } from 'sonner';

export default function POSMain() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { currentTicket, isOnline } = usePOSStore();

  // Query de productos con fallback a IndexedDB
  const { data: productos = [], isLoading: loadingProductos } = useQuery({
    queryKey: ['productos', selectedCategory, searchQuery],
    queryFn: async () => {
      try {
        if (isOnline) {
          const data = await fetchProductos({
            categoria_uuid: selectedCategory,
            q: searchQuery,
            activo: true,
          });
          // Cache en IndexedDB
          await db.cacheProductos(data);
          return data;
        } else {
          // Modo offline: leer de IndexedDB
          return await db.getProductos({
            categoria_uuid: selectedCategory,
            q: searchQuery,
            activo: true,
          });
        }
      } catch (error) {
        console.error('Error fetching productos:', error);
        // Fallback a cache local
        return await db.getProductos({
          categoria_uuid: selectedCategory,
          q: searchQuery,
          activo: true,
        });
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Query de categorías
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      try {
        if (isOnline) {
          const data = await fetchCategorias();
          await db.cacheCategorias(data);
          return data;
        } else {
          return await db.getCategorias();
        }
      } catch (error) {
        return await db.getCategorias();
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
  });

  // Atajos de teclado
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Alt+N: Nuevo ticket
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        handleNewTicket();
      }
      
      // Alt+C: Cobrar
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        if (currentTicket && currentTicket.items.length > 0) {
          setShowPaymentModal(true);
        }
      }
      
      // Alt+F: Focus búsqueda
      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('product-search')?.focus();
      }

      // Escape: Cerrar modales
      if (e.key === 'Escape') {
        setShowPaymentModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentTicket]);

  const handleNewTicket = () => {
    const newTicket = usePOSStore.getState().newTicket();
    toast.success('Nuevo ticket creado');
  };

  const handlePaymentComplete = () => {
    setShowPaymentModal(false);
    toast.success('Venta completada');
    setTimeout(() => {
      handleNewTicket();
    }, 500);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <POSHeader onNewTicket={handleNewTicket} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel Izquierdo - Catálogo */}
        <div className="flex-1 flex flex-col border-r">
          <ProductCatalog
            productos={productos}
            categorias={categorias}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoading={loadingProductos}
          />
        </div>

        {/* Panel Derecho - Ticket */}
        <div className="w-[420px] flex flex-col bg-white shadow-lg">
          <TicketPanel
            onOpenPayment={() => setShowPaymentModal(true)}
            onNewTicket={handleNewTicket}
          />
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* Toast Notifications */}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
