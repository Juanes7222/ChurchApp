/**
 * POS Store - Estado global del punto de venta
 * Maneja ticket actual, carrito, shift activo y estado offline
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Función simple para generar UUIDs sin dependencias externas
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const usePOSStore = create(
  persist(
    (set, get) => ({
      // Estado del shift actual
      currentShift: null,
      vendedor: null,
      
      // Ticket actual
      currentTicket: null,
      
      // Cola de sincronización
      syncQueue: [],
      isOnline: navigator.onLine,
      lastSyncAttempt: null,
      
      // Configuración
      config: {
        showFavorites: true,
        enableKeyboardShortcuts: true,
        defaultPaymentMethod: 'efectivo',
      },

      // ============= ACTIONS =============
      
      // Cargar turno activo del servidor
      loadActiveShift: async () => {
        try {
          const api = (await import('../lib/api')).default;
          const response = await api.get('/pos/caja-shifts/activo');
          console.log(response);
          console.log('loadActiveShift response:', response.data);
          if (response.data && response.data.shift) {
            console.log('Setting currentShift:', response.data.shift);
            set({ currentShift: response.data.shift });
            return response.data.shift;
          } else {
            console.log('No active shift found');
            set({ currentShift: null });
            return null;
          }
        } catch (error) {
          console.error('Error loading active shift:', error);
          set({ currentShift: null });
          return null;
        }
      },
      
      // Inicializar shift y vendedor
      initializeShift: (shift, vendedor) => {
        set({ currentShift: shift, vendedor });
      },
      
      // Limpiar shift y vendedor
      clearShift: () => {
        set({ currentShift: null, vendedor: null, currentTicket: null });
      },

      // Crear nuevo ticket
      newTicket: () => {
        const ticket = {
          client_ticket_id: generateUUID(),
          shift_uuid: get().currentShift?.uuid,
          vendedor_uuid: get().vendedor?.uuid,
          tipo: 'mostrador',
          items: [],
          pagos: [],
          is_fiado: false,
          miembro_uuid: null,
          estado: 'abierto',
          subtotal: 0,
          total: 0,
          descuento_total: 0,
          created_at: new Date().toISOString(),
        };
        set({ currentTicket: ticket });
        return ticket;
      },

      // Agregar producto al ticket
      addItem: (producto, cantidad = 1) => {
        // Validar que el producto tenga UUID
        if (!producto.uuid) {
          console.error('Producto sin UUID:', producto);
          throw new Error(`Producto "${producto.nombre}" no tiene UUID. Contacte al administrador.`);
        }

        const ticket = get().currentTicket;
        if (!ticket) {
          get().newTicket();
        }

        const currentTicket = get().currentTicket;
        const existingItemIndex = currentTicket.items.findIndex(
          item => item.producto_uuid === producto.uuid
        );

        let updatedItems;
        if (existingItemIndex >= 0) {
          // Incrementar cantidad si ya existe
          updatedItems = [...currentTicket.items];
          updatedItems[existingItemIndex].cantidad += cantidad;
          updatedItems[existingItemIndex].total_item = 
            updatedItems[existingItemIndex].cantidad * updatedItems[existingItemIndex].precio_unitario - 
            (updatedItems[existingItemIndex].descuento || 0);
        } else {
          // Agregar nuevo item
          const newItem = {
            producto_uuid: producto.uuid,
            nombre: producto.nombre,
            cantidad,
            precio_unitario: parseFloat(producto.precio),
            descuento: 0,
            total_item: cantidad * parseFloat(producto.precio),
            notas: null,
          };
          updatedItems = [...currentTicket.items, newItem];
        }

        const updatedTicket = get().calculateTotals({ ...currentTicket, items: updatedItems });
        set({ currentTicket: updatedTicket });
      },

      // Actualizar cantidad de item
      updateItemQuantity: (index, cantidad) => {
        const ticket = get().currentTicket;
        if (!ticket) return;

        const updatedItems = [...ticket.items];
        if (cantidad <= 0) {
          updatedItems.splice(index, 1);
        } else {
          updatedItems[index].cantidad = cantidad;
          updatedItems[index].total_item = 
            cantidad * updatedItems[index].precio_unitario - (updatedItems[index].descuento || 0);
        }

        const updatedTicket = get().calculateTotals({ ...ticket, items: updatedItems });
        set({ currentTicket: updatedTicket });
      },

      // Aplicar descuento a item
      applyItemDiscount: (index, descuento) => {
        const ticket = get().currentTicket;
        if (!ticket) return;

        const updatedItems = [...ticket.items];
        updatedItems[index].descuento = descuento;
        updatedItems[index].total_item = 
          updatedItems[index].cantidad * updatedItems[index].precio_unitario - descuento;

        const updatedTicket = get().calculateTotals({ ...ticket, items: updatedItems });
        set({ currentTicket: updatedTicket });
      },

      // Agregar nota a item
      addItemNote: (index, nota) => {
        const ticket = get().currentTicket;
        if (!ticket) return;

        const updatedItems = [...ticket.items];
        updatedItems[index].notas = nota;

        set({ currentTicket: { ...ticket, items: updatedItems } });
      },

      // Remover item
      removeItem: (index) => {
        const ticket = get().currentTicket;
        if (!ticket) return;

        const updatedItems = ticket.items.filter((_, i) => i !== index);
        const updatedTicket = get().calculateTotals({ ...ticket, items: updatedItems });
        set({ currentTicket: updatedTicket });
      },

      // Calcular totales
      calculateTotals: (ticket) => {
        const subtotal = ticket.items.reduce((sum, item) => sum + item.total_item, 0);
        const descuento_total = ticket.items.reduce((sum, item) => sum + (item.descuento || 0), 0);
        const impuesto = 0; // TODO: Implementar lógica de impuestos si aplica
        const total = subtotal + impuesto;

        return {
          ...ticket,
          subtotal,
          descuento_total,
          impuesto,
          total,
        };
      },

      // Configurar fiado
      setFiado: (isFiado, miembroUuid = null) => {
        const ticket = get().currentTicket;
        if (!ticket) return;

        set({
          currentTicket: {
            ...ticket,
            is_fiado: isFiado,
            miembro_uuid: miembroUuid,
          },
        });
      },

      // Agregar pago
      addPayment: (metodo, monto, referencia = null) => {
        const ticket = get().currentTicket;
        if (!ticket) return;

        const pago = {
          metodo,
          monto: parseFloat(monto),
          referencia,
        };

        set({
          currentTicket: {
            ...ticket,
            pagos: [...ticket.pagos, pago],
          },
        });
      },

      // Limpiar pagos
      clearPayments: () => {
        const ticket = get().currentTicket;
        if (!ticket) return;

        set({
          currentTicket: {
            ...ticket,
            pagos: [],
          },
        });
      },

      // Finalizar venta (agregar a cola de sync)
      finalizeSale: async () => {
        const ticket = get().currentTicket;
        if (!ticket || ticket.items.length === 0) {
          throw new Error('Ticket vacío');
        }

        const saleData = {
          ...ticket,
          estado: 'cerrado',
          completed_at: new Date().toISOString(),
        };

        // Agregar a cola de sincronización
        set(state => ({
          syncQueue: [...state.syncQueue, {
            id: ticket.client_ticket_id,
            data: saleData,
            attempts: 0,
            status: 'pending',
            created_at: new Date().toISOString(),
          }],
          currentTicket: null,
        }));

        return saleData;
      },

      // Marcar item como sincronizado
      markAsSynced: (clientTicketId, ventaUuid) => {
        set(state => ({
          syncQueue: state.syncQueue.map(item =>
            item.id === clientTicketId
              ? { ...item, status: 'synced', venta_uuid: ventaUuid, synced_at: new Date().toISOString() }
              : item
          ),
        }));
      },

      // Marcar item como fallido
      markAsFailed: (clientTicketId, error) => {
        set(state => ({
          syncQueue: state.syncQueue.map(item =>
            item.id === clientTicketId
              ? { ...item, status: 'failed', error, attempts: item.attempts + 1, last_attempt: new Date().toISOString() }
              : item
          ),
        }));
      },

      // Actualizar estado de conexión
      setOnlineStatus: (isOnline) => {
        set({ isOnline });
      },

      // Actualizar último intento de sync
      setLastSyncAttempt: (timestamp) => {
        set({ lastSyncAttempt: timestamp });
      },

      // Limpiar items sincronizados antiguos (>7 días)
      cleanupSyncQueue: () => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        set(state => ({
          syncQueue: state.syncQueue.filter(item => {
            if (item.status === 'synced') {
              const syncedTime = new Date(item.synced_at).getTime();
              return syncedTime > sevenDaysAgo;
            }
            return true;
          }),
        }));
      },

      // Cerrar sesión y limpiar
      logout: () => {
        set({
          currentShift: null,
          vendedor: null,
          currentTicket: null,
        });
      },
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({
        syncQueue: state.syncQueue,
        config: state.config,
        currentTicket: state.currentTicket, // Persistir ticket en progreso
      }),
    }
  )
);

export default usePOSStore;
