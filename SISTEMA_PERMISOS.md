# Sistema de Permisos - ChurchApp

## Filosofía del Sistema

El sistema de permisos parte de una idea central: **no todos los usuarios son iguales ni necesitan saber cómo funciona todo**. La aplicación oculta complejidad, no la expone. Cada rol existe para cumplir una función clara y limitada, y ningún usuario tiene más permisos de los estrictamente necesarios para su tarea.

## Principios Fundamentales

1. **Nadie accede a lo que no necesita** - Principio de mínimo privilegio
2. **Nadie se registra en roles sensibles sin autorización explícita** - Invitaciones controladas
3. **Las acciones críticas siempre quedan registradas** - Auditoría completa
4. **Los usuarios temporales nunca persisten** - Meseros solo durante turnos
5. **El administrador siempre puede ver y hacer todo** - Control centralizado
6. **El sistema debe ser comprensible incluso si el admin no está presente** - Documentación clara

---

## Roles del Sistema

### 1. Administrador (admin)

**Descripción**: El dueño técnico y funcional del sistema. Control absoluto.

**Características**:
- ✅ Acceso completo sin restricciones
- ✅ Único rol que puede ser creado, no invitado
- ✅ Solo puede existir si es creado explícitamente por el sistema
- ✅ Todas sus acciones quedan auditadas

**Permisos**:
- Dashboard completo
- **Miembros**: Ver, crear, editar, eliminar
- **Grupos**: Ver, crear, editar, eliminar
- **Observaciones**: Ver, crear, editar, eliminar
- **POS**:
  - Gestión completa de productos y categorías
  - Edición de precios
  - Gestión de inventario
  - Crear, ver y anular ventas
  - Ver cuentas de miembros
  - Registrar pagos y abonos
  - Abrir y cerrar turnos
  - Ver resumen de caja
  - Acceso a todos los reportes
- **Administración**:
  - Gestionar usuarios
  - Crear invitaciones
  - Ver auditorías
  - Gestionar usuarios temporales
  - Configurar parámetros globales

**Restricciones**: Ninguna

---

### 2. Pastor

**Descripción**: Rol de alta confianza para acompañamiento espiritual. Acceso de lectura completo.

**Características**:
- ✅ Solo registro mediante invitación del administrador
- ✅ Puede ver información completa de miembros
- ✅ No acceso a configuraciones técnicas
- ✅ Puede crear y eliminar usuarios

**Permisos**:
- Dashboard
- **Miembros**: Solo lectura (ver información completa)
- **Grupos**: Solo lectura (ver grupos y liderazgos)
- **Observaciones**: Solo lectura (ver historial)
- **POS**: Solo lectura
  - Ver ventas
  - Ver cuentas de miembros (consulta)
  - Ver reportes generales
- **Administración**:
  - Crear y eliminar usuarios

**Restricciones**:
- ❌ No puede modificar configuraciones del sistema
- ❌ No puede abrir ni cerrar turnos
- ❌ No puede modificar ventas ni cuentas
- ❌ No puede registrar pagos ni abonos
- ❌ No puede anular información histórica
- ❌ No puede editar ni eliminar miembros

---

### 3. Secretaria

**Descripción**: Rol operativo-administrativo. Gestión del día a día.

**Características**:
- ✅ Solo registro mediante invitación del administrador
- ✅ Puede interactuar con datos bajo reglas claras
- ✅ Rol activo, no solo de consulta
- ✅ Puede crear y eliminar usuarios

**Permisos**:
- Dashboard
- **Miembros**: Crear, editar (NO eliminar)
- **Grupos**: Crear, editar, asignar miembros
- **Observaciones**: Crear, editar, registrar
- **POS**:
  - Ver ventas históricas
  - Ver cuentas de miembros
  - Registrar pagos y abonos
  - Ver reportes básicos
- **Administración**:
  - Crear y eliminar usuarios

**Restricciones**:
- ❌ No puede asignar roles
- ❌ No puede modificar configuraciones globales
- ❌ No puede abrir ni cerrar turnos
- ❌ No puede crear usuarios temporales
- ❌ No puede anular ventas
- ❌ No puede eliminar movimientos financieros
- ❌ No puede eliminar miembros

---

### 4. Líder (lider)

**Descripción**: Rol descentralizado para líderes de grupos. Acceso limitado a su grupo.

**Características**:
- ✅ Pensado para el futuro (escalable)
- ✅ Solo registro mediante invitación del administrador
- ✅ Acceso limitado a información de su grupo únicamente
- ⚠️ Actualmente en desarrollo

**Permisos**:
- Dashboard básico
- **Miembros**: Ver información básica solo de su grupo
  - Datos de contacto
  - Fechas relevantes
- **Grupos**: Ver estructura de su liderazgo
- **Observaciones**: Ver solo observaciones públicas

**Restricciones**:
- ❌ No puede ver información financiera
- ❌ No puede ver observaciones privadas
- ❌ No puede editar datos de miembros
- ❌ No puede acceder al restaurante
- ❌ No puede ver otros grupos

---

### 5. Administrador del Restaurante (agente_restaurante)

**Descripción**: Control total del módulo POS. Sin acceso a información sensible de la iglesia.

**Características**:
- ✅ Solo registro mediante invitación del administrador
- ✅ Foco en que el dinero cuadre
- ✅ Gestión completa del restaurante
- ✅ Puede reconstruir cualquier día de operación

**Permisos**:
- Dashboard del restaurante
- **POS Completo**:
  - Abrir y cerrar turnos
  - Ver estado del turno activo
  - Crear, activar y desactivar usuarios temporales (meseros)
  - Ver todas las ventas (turno e historial)
  - Anular ventas (con motivo obligatorio)
  - Gestionar productos, categorías y precios
  - Gestionar inventario
  - Ver y consultar cuentas de miembros
  - Registrar pagos y abonos
  - Registrar ajustes de cuenta (con justificación)
  - Ver detalle completo de ventas
  - Ver historial de movimientos financieros
  - Ver diferencias de caja y cierres anteriores
  - Acceso a todos los reportes del restaurante

**Restricciones**:
- ❌ No puede crear, modificar o eliminar miembros
- ❌ No puede editar información personal de miembros
- ❌ No puede crear usuarios de tipo pastor, secretaria o admin
- ❌ No puede asignar roles globales
- ❌ No puede modificar estructura de grupos o liderazgos
- ❌ No puede cambiar configuraciones técnicas del sistema
- ❌ No puede acceder a auditorías generales fuera del restaurante

---

### 6. Usuario Temporal - Mesero (ayudante_restaurante)

**Descripción**: Rol especial no permanente. Existe solo durante turnos activos.

**Características**:
- ⚠️ **No es una cuenta tradicional**
- ⚠️ **No usa Google Authentication**
- ⚠️ **Solo existe mientras el restaurante está abierto**
- ✅ Creado por admin o agente_restaurante
- ✅ Autenticación mediante PIN de 4 dígitos
- ✅ Debe estar vinculado a un miembro

**Permisos**:
- Acceso únicamente al módulo de ventas
- Registrar ventas
- Seleccionar productos
- Asociar ventas a miembros
- Marcar ventas como fiadas
- Registrar pagos inmediatos
- Crear miembros temporales (para clientes nuevos)

**Restricciones**:
- ❌ No puede ver datos completos de miembros
- ❌ No puede ver cuentas históricas
- ❌ No puede registrar abonos
- ❌ No puede anular ventas
- ❌ No puede ver reportes
- ❌ No puede acceder al panel administrativo
- ❌ **Cuando el turno se cierra, deja de existir funcionalmente**

---

### 7. Sistema (implícito)

**Descripción**: Rol invisible que representa acciones automáticas del sistema.

**Funciones**:
- Ejecuta sincronizaciones
- Registra auditorías automáticas
- Valida reglas de negocio
- Bloquea acciones no permitidas
- Marca inconsistencias
- Genera reportes automáticos

**Restricción**: Ningún usuario humano puede asumir este rol.

---

## Matriz de Permisos

| Permiso | Admin | Pastor | Secretaria | Líder | Agente Rest. | Mesero |
|---------|-------|--------|------------|-------|--------------|--------|
| **Miembros** |
| Ver miembros | ✅ | ✅ | ✅ | ✅¹ | ❌ | ❌ |
| Crear miembros | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Editar miembros | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Eliminar miembros | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Grupos** |
| Ver grupos | ✅ | ✅ | ✅ | ✅¹ | ❌ | ❌ |
| Crear grupos | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Editar grupos | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Eliminar grupos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Observaciones** |
| Ver observaciones | ✅ | ✅ | ✅ | ✅² | ❌ | ❌ |
| Crear observaciones | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Editar observaciones | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Eliminar observaciones | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **POS - Productos** |
| Gestionar productos | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Editar precios | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Gestionar inventario | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Ver inventario | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **POS - Ventas** |
| Crear ventas | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ver ventas | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Anular ventas | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **POS - Cuentas** |
| Ver cuentas | ✅ | ✅³ | ✅ | ❌ | ✅ | ✅⁴ |
| Registrar pagos/abonos | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **POS - Caja** |
| Abrir/cerrar turnos | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Ver resumen de caja | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Gestionar meseros | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **POS - Reportes** |
| Ver reportes ventas | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Ver reportes inventario | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ver reportes cuentas | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Administración** |
| Gestionar usuarios | ✅ | ✅⁵ | ✅⁵ | ❌ | ❌ | ❌ |
| Crear invitaciones | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver auditorías | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configuraciones | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Notas**:
- ¹ Solo de su grupo
- ² Solo observaciones públicas
- ³ Solo lectura
- ⁴ Solo para asociar ventas
- ⁵ Crear/eliminar, no asignar roles

---

## Flujo de Registro por Rol

### Administrador
```
Sistema → Creación directa en BD → No disponible para invitación
```

### Pastor / Secretaria / Líder / Agente Restaurante
```
1. Admin crea invitación con rol específico
2. Se genera enlace único con expiración
3. Usuario accede al enlace
4. Autenticación con Google
5. Sistema valida invitación y crea usuario
6. Rol asignado automáticamente
```

### Usuario Temporal (Mesero)
```
1. Admin o Agente Restaurante abre turno
2. Selecciona miembro para crear usuario temporal
3. Asigna PIN de 4 dígitos
4. Usuario temporal activo mientras turno esté abierto
5. Al cerrar turno, usuario temporal se desactiva
```

---

## Validación de Permisos

### En Backend

Todos los endpoints críticos validan permisos usando decoradores:

```python
# Require rol específico
@app.get("/endpoint")
async def endpoint(current_user: Dict = Depends(require_admin)):
    ...

# Require permiso específico
@app.get("/endpoint")
async def endpoint(current_user: Dict = Depends(require_permission(Permission.VIEW_MIEMBROS))):
    ...

# Require cualquiera de varios permisos
@app.get("/endpoint")
async def endpoint(current_user: Dict = Depends(require_any_permission([Permission.VIEW_SALES, Permission.CREATE_SALES]))):
    ...

# Require acceso a sección
@app.get("/endpoint")
async def endpoint(current_user: Dict = Depends(require_pos_access)):
    ...
```

### En Frontend

Los componentes validan permisos antes de renderizar:

```jsx
import { Can, HasRole } from '../components/PermissionGuard';

// Mostrar solo si tiene permiso
<Can permission="view_miembros">
  <MiembrosSection />
</Can>

// Mostrar solo si tiene rol
<HasRole role="admin">
  <AdminPanel />
</HasRole>

// Múltiples permisos
<Can anyOf={["create_sales", "view_sales"]}>
  <SalesSection />
</Can>
```

---

## Auditoría

Todas las acciones críticas quedan registradas:

- **Quién**: UID del usuario
- **Qué**: Acción realizada
- **Cuándo**: Timestamp UTC
- **Dónde**: Módulo/sección
- **Contexto**: Datos relevantes (IDs afectados)

Acciones auditadas:
- Creación/modificación/eliminación de miembros
- Modificaciones de grupos
- Creación/anulación de ventas
- Registro de pagos y abonos
- Apertura/cierre de turnos
- Ajustes de inventario
- Cambios de roles
- Creación de usuarios

---

## Implementación Técnica

### Archivos Clave

**Backend**:
- `/backend/utils/permissions.py` - Definición de permisos y roles
- `/backend/utils/auth.py` - Guards y decoradores
- `/backend/routes/admin.py` - Gestión de invitaciones
- `/backend/models/models.py` - Modelos de datos

**Frontend**:
- `/frontend/src/components/PermissionGuard.jsx` - Componentes de permisos
- `/frontend/src/hooks/usePermissions.js` - Hook de permisos
- `/frontend/src/pages/Admin.js` - Panel de administración
- `/frontend/src/context/AuthContext.js` - Contexto de autenticación

### Base de Datos

**Tablas relacionadas**:
- `app_users` - Usuarios del sistema con roles
- `invite_links` - Enlaces de invitación
- `usuarios_temporales` - Usuarios temporales (meseros)
- `audit_logs` - Registro de auditoría (futuro)

---

## Buenas Prácticas

1. **Nunca confiar en el frontend**: La validación siempre ocurre en el backend
2. **Principio de mínimo privilegio**: Cada rol tiene solo lo que necesita
3. **Auditar todo lo crítico**: Si modifica datos importantes, debe quedar registrado
4. **Validar en múltiples capas**: Frontend (UX) + Backend (seguridad) + BD (constraints)
5. **Mensajes claros de error**: Explicar por qué se denegó el acceso
6. **No exponer estructura interna**: Usuarios no deben conocer la implementación
7. **Roles claros y simples**: Evitar permisos granulares complejos
8. **Documentación actualizada**: Este documento debe reflejar la implementación real

---

## Migración de Roles Existentes

Si existen usuarios con roles antiguos:

```sql
-- Ejemplo de migración
UPDATE app_users 
SET role = 'agente_restaurante' 
WHERE role = 'pos_admin';

UPDATE app_users 
SET role = 'ayudante_restaurante' 
WHERE role = 'mesero';
```

---

## Preguntas Frecuentes

**P: ¿Puede un pastor crear otros pastores?**  
R: No. Aunque puede crear usuarios, no puede asignar roles. Solo el admin puede crear invitaciones con roles específicos.

**P: ¿Qué pasa si un mesero intenta acceder después de cerrar el turno?**  
R: Su usuario temporal está desactivado. No puede autenticarse hasta que se abra un nuevo turno y sea reactivado.

**P: ¿Puede el agente de restaurante ver datos sensibles de miembros?**  
R: No. Solo puede ver información mínima necesaria para ventas (nombre, cuenta). No accede a observaciones, grupos ni información personal completa.

**P: ¿Cómo se crea el primer admin?**  
R: El primer admin debe ser creado directamente en la base de datos o mediante un script de inicialización del sistema.

**P: ¿Un líder puede ver información financiera de su grupo?**  
R: No. El rol líder está diseñado específicamente para excluir información financiera y del restaurante.

---

## Estado de Implementación

| Componente | Estado |
|------------|--------|
| Definición de roles | ✅ Completo |
| Definición de permisos | ✅ Completo |
| Guards backend | ✅ Completo |
| Validación frontend | ✅ Completo |
| Sistema de invitaciones | ✅ Completo |
| Usuarios temporales | ✅ Completo |
| Auditoría | ⚠️ Parcial |
| Rol Líder | ⚠️ En desarrollo |
| Tests unitarios | ❌ Pendiente |

---

**Última actualización**: 23 de diciembre de 2025  
**Versión del documento**: 1.0  
**Autor**: Sistema ChurchApp
