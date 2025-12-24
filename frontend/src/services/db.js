/**
 * IndexedDB Service - Persistencia local con Dexie
 * Maneja cache de productos, ventas offline y cola de sincronización
 */

import Dexie from 'dexie';

class POSDatabase extends Dexie {
  constructor() {
    super('POSDatabase');
    
    this.version(1).stores({
      productos: 'uuid, nombre, codigo, categoria_uuid, favorito, activo, last_updated',
      categorias: 'uuid, nombre, orden',
      ventas_offline: 'client_ticket_id, vendedor_uuid, shift_uuid, created_at, sync_status',
      shifts: 'uuid, estado, apertura_fecha',
      usuarios_temp: 'uuid, username, fin_validity, activo',
      sync_queue: '++id, client_ticket_id, status, attempts, created_at',
      config: 'key',
    });

    // Tablas tipadas
    this.productos = this.table('productos');
    this.categorias = this.table('categorias');
    this.ventas_offline = this.table('ventas_offline');
    this.shifts = this.table('shifts');
    this.usuarios_temp = this.table('usuarios_temp');
    this.sync_queue = this.table('sync_queue');
    this.config = this.table('config');
  }

  // ============= PRODUCTOS =============

  async cacheProductos(productos) {
    const timestamp = new Date().toISOString();
    const productosConTimestamp = productos.map(p => ({
      ...p,
      last_updated: timestamp,
    }));
    
    await this.productos.bulkPut(productosConTimestamp);
    await this.setConfig('productos_last_sync', timestamp);
  }

  async getProductos(filters = {}) {
    let query = this.productos;
    
    if (filters.activo !== undefined) {
      query = query.where('activo').equals(filters.activo);
    }
    
    if (filters.favorito !== undefined) {
      query = query.where('favorito').equals(filters.favorito);
    }
    
    if (filters.categoria_uuid) {
      query = query.where('categoria_uuid').equals(filters.categoria_uuid);
    }
    
    const productos = await query.toArray();
    
    // Filtro adicional por búsqueda de texto
    if (filters.q) {
      const search = filters.q.toLowerCase();
      return productos.filter(p => 
        p.nombre?.toLowerCase().includes(search) ||
        p.codigo?.toLowerCase().includes(search)
      );
    }
    
    return productos;
  }

  async getProducto(uuid) {
    return await this.productos.get(uuid);
  }

  // ============= CATEGORÍAS =============

  async cacheCategorias(categorias) {
    await this.categorias.bulkPut(categorias);
  }

  async getCategorias() {
    return await this.categorias.orderBy('orden').toArray();
  }

  // ============= VENTAS OFFLINE =============

  async saveVentaOffline(venta) {
    const ventaData = {
      ...venta,
      sync_status: 'pending',
      saved_at: new Date().toISOString(),
    };
    
    await this.ventas_offline.put(ventaData);
    
    // Agregar a cola de sync
    await this.sync_queue.add({
      client_ticket_id: venta.client_ticket_id,
      data: ventaData,
      status: 'pending',
      attempts: 0,
      created_at: new Date().toISOString(),
    });
    
    return ventaData;
  }

  async getVentasOffline() {
    return await this.ventas_offline
      .where('sync_status')
      .anyOf(['pending', 'failed'])
      .toArray();
  }

  async markVentaSynced(clientTicketId, ventaUuid) {
    await this.ventas_offline.update(clientTicketId, {
      sync_status: 'synced',
      venta_uuid: ventaUuid,
      synced_at: new Date().toISOString(),
    });
    
    await this.sync_queue
      .where('client_ticket_id')
      .equals(clientTicketId)
      .modify({
        status: 'synced',
        venta_uuid: ventaUuid,
        synced_at: new Date().toISOString(),
      });
  }

  async markVentaFailed(clientTicketId, error) {
    await this.ventas_offline.update(clientTicketId, {
      sync_status: 'failed',
      last_error: error,
      last_attempt: new Date().toISOString(),
    });
    
    await this.sync_queue
      .where('client_ticket_id')
      .equals(clientTicketId)
      .modify(item => {
        item.status = 'failed';
        item.error = error;
        item.attempts = (item.attempts || 0) + 1;
        item.last_attempt = new Date().toISOString();
      });
  }

  // ============= COLA DE SINCRONIZACIÓN =============

  async getSyncQueue() {
    return await this.sync_queue
      .where('status')
      .anyOf(['pending', 'failed'])
      .toArray();
  }

  async getPendingSyncCount() {
    return await this.sync_queue
      .where('status')
      .equals('pending')
      .count();
  }

  async cleanupOldSyncedItems(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffTimestamp = cutoffDate.toISOString();
    
    // Limpiar ventas sincronizadas antiguas
    await this.ventas_offline
      .where('sync_status')
      .equals('synced')
      .and(venta => venta.synced_at < cutoffTimestamp)
      .delete();
    
    // Limpiar cola de sync
    await this.sync_queue
      .where('status')
      .equals('synced')
      .and(item => item.synced_at < cutoffTimestamp)
      .delete();
  }

  // ============= CONFIGURACIÓN =============

  async setConfig(key, value) {
    await this.config.put({ key, value });
  }

  async getConfig(key, defaultValue = null) {
    const config = await this.config.get(key);
    return config ? config.value : defaultValue;
  }

  // ============= SHIFTS =============

  async cacheShift(shift) {
    await this.shifts.put(shift);
  }

  async getCurrentShift() {
    return await this.shifts
      .where('estado')
      .equals('abierta')
      .first();
  }

  // ============= UTILIDADES =============

  async clearAllCache() {
    await this.productos.clear();
    await this.categorias.clear();
    await this.shifts.clear();
    await this.usuarios_temp.clear();
    ('Cache cleared');
  }

  async getStorageStats() {
    const stats = {
      productos: await this.productos.count(),
      categorias: await this.categorias.count(),
      ventas_offline: await this.ventas_offline.count(),
      sync_queue: await this.sync_queue.count(),
      pending_sync: await this.getPendingSyncCount(),
    };
    
    return stats;
  }
}

// Singleton instance
const db = new POSDatabase();

export default db;
