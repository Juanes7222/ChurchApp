/**
 * Sync Service - Maneja sincronización online/offline
 * Reintenta automáticamente con backoff exponencial
 */

import { syncPushVentas } from './api';
import db from './db';
import usePOSStore from '../stores/posStore';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.retryTimeouts = new Map();
    this.maxRetries = 5;
    this.baseDelay = 1000; // 1 segundo
    
    // Escuchar cambios de conexión
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  handleOnline() {
    ('🟢 Conexión restaurada');
    usePOSStore.getState().setOnlineStatus(true);
    this.syncAll();
  }

  handleOffline() {
    ('🔴 Sin conexión');
    usePOSStore.getState().setOnlineStatus(false);
  }

  async syncAll() {
    if (this.isSyncing) {
      ('⏳ Sincronización ya en progreso');
      return;
    }

    if (!navigator.onLine) {
      ('⚠️ Sin conexión - sync cancelado');
      return;
    }

    this.isSyncing = true;
    usePOSStore.getState().setLastSyncAttempt(new Date().toISOString());

    try {
      // Obtener ventas pendientes
      const ventasPendientes = await db.getVentasOffline();
      
      if (ventasPendientes.length === 0) {
        ('✅ No hay ventas pendientes de sincronización');
        this.isSyncing = false;
        return;
      }

      (`📤 Sincronizando ${ventasPendientes.length} ventas...`);

      // Preparar payload para batch sync
      const ventasData = ventasPendientes.map(v => ({
        client_ticket_id: v.client_ticket_id,
        shift_uuid: v.shift_uuid,
        vendedor_uuid: v.vendedor_uuid,
        tipo: v.tipo,
        miembro_uuid: v.miembro_uuid,
        is_fiado: v.is_fiado,
        items: v.items,
        pagos: v.pagos,
      }));

      // Enviar al backend
      const result = await syncPushVentas(ventasData);
      
      ('📥 Respuesta del servidor:', result);

      // Procesar resultados
      if (result.resultados) {
        // Marcar exitosas
        for (const exitosa of result.resultados.exitosas || []) {
          await db.markVentaSynced(exitosa.client_ticket_id, exitosa.venta_uuid);
          usePOSStore.getState().markAsSynced(exitosa.client_ticket_id, exitosa.venta_uuid);
        }

        // Marcar duplicadas como sincronizadas
        for (const duplicada of result.resultados.duplicadas || []) {
          await db.markVentaSynced(duplicada.client_ticket_id, duplicada.venta_uuid);
          usePOSStore.getState().markAsSynced(duplicada.client_ticket_id, duplicada.venta_uuid);
        }

        // Marcar fallidas con retry
        for (const fallida of result.resultados.fallidas || []) {
          await db.markVentaFailed(fallida.venta.client_ticket_id, fallida.error);
          usePOSStore.getState().markAsFailed(fallida.venta.client_ticket_id, fallida.error);
          
          // Programar retry con backoff
          this.scheduleRetry(fallida.venta.client_ticket_id);
        }

        (`✅ Sync completado: ${result.resultados.exitosas?.length || 0} exitosas, ${result.resultados.fallidas?.length || 0} fallidas`);
      }

      // Limpiar items antiguos sincronizados
      await db.cleanupOldSyncedItems(7);
      usePOSStore.getState().cleanupSyncQueue();

    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      
      // Si es error de red, programar retry
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network')) {
        ('⚠️ Error de red - reintentando en 30s...');
        setTimeout(() => this.syncAll(), 30000);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  scheduleRetry(clientTicketId) {
    // Cancelar retry anterior si existe
    if (this.retryTimeouts.has(clientTicketId)) {
      clearTimeout(this.retryTimeouts.get(clientTicketId));
    }

    // Obtener número de intentos
    const syncItem = usePOSStore.getState().syncQueue.find(item => item.id === clientTicketId);
    const attempts = syncItem?.attempts || 0;

    if (attempts >= this.maxRetries) {
      console.error(`❌ Max reintentos alcanzado para ${clientTicketId}`);
      return;
    }

    // Calcular delay con backoff exponencial
    const delay = this.baseDelay * Math.pow(2, attempts);
    
    (`⏰ Retry programado para ${clientTicketId} en ${delay}ms (intento ${attempts + 1}/${this.maxRetries})`);

    const timeout = setTimeout(async () => {
      (`🔄 Reintentando ${clientTicketId}...`);
      await this.syncAll();
    }, delay);

    this.retryTimeouts.set(clientTicketId, timeout);
  }

  async syncSingle(venta) {
    try {
      // Guardar en IndexedDB primero
      await db.saveVentaOffline(venta);
      
      // Intentar sincronizar inmediatamente si hay conexión
      if (navigator.onLine) {
        await this.syncAll();
      } else {
        ('⚠️ Sin conexión - venta guardada para sync posterior');
      }
    } catch (error) {
      console.error('❌ Error guardando venta offline:', error);
      throw error;
    }
  }

  async forceSyncNow() {
    ('🔄 Sincronización manual iniciada');
    return await this.syncAll();
  }

  getSyncStatus() {
    const store = usePOSStore.getState();
    const pending = store.syncQueue.filter(item => item.status === 'pending').length;
    const failed = store.syncQueue.filter(item => item.status === 'failed').length;
    
    return {
      isOnline: store.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: pending,
      failedCount: failed,
      lastAttempt: store.lastSyncAttempt,
    };
  }
}

// Singleton instance
const syncService = new SyncService();

// Auto-sync cada 2 minutos si hay conexión
setInterval(() => {
  if (navigator.onLine && !syncService.isSyncing) {
    syncService.syncAll();
  }
}, 120000);

export default syncService;
