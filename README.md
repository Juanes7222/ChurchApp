# Sistema de Gestión para Iglesia

Sistema web moderno para gestión de miembros de iglesia con autenticación Firebase y base de datos Supabase.

## 🔥 **NUEVA INTEGRACIÓN: Firebase Authentication**

Este proyecto ahora utiliza **Firebase Authentication** para el login con Google, proporcionando una experiencia más robusta y segura.

### 🚀 Inicio Rápido
```powershell
# 1. Instalar dependencias
.\install.ps1

# 2. Configurar variables de entorno (ver documentación)
# frontend/.env y backend/.env

# 3. Ejecutar aplicación
# Terminal 1:
cd backend && uvicorn server:app --reload --port 8001
# Terminal 2:
cd frontend && npm start
```

### 📚 Documentación de Firebase
- **[README_FIREBASE.md](./README_FIREBASE.md)** - 📖 Resumen completo de la integración
- **[QUICKSTART.md](./QUICKSTART.md)** - ⚡ Inicio rápido para desarrollo
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - 🔧 Guía detallada de configuración
- **[FIRST_USER_SETUP.md](./FIRST_USER_SETUP.md)** - 👤 Crear primer usuario admin
- **[COMMANDS.md](./COMMANDS.md)** - 🛠️ Comandos útiles
- **[CHECKLIST.md](./CHECKLIST.md)** - ✅ Verificar configuración completa

---

## 🚀 Características Principales

### Módulo de Miembros (MVP)
- ✅ CRUD completo de miembros
- ✅ Búsqueda avanzada por documento, nombre, apellido
- ✅ Gestión de observaciones por miembro
- ✅ Información detallada (personal, contacto, adicional)
- ✅ Vista de perfil con historial
- ✅ Paginación y filtros

### Gestión de Grupos
- ✅ Visualización de grupos activos
- ✅ Asignación de miembros a grupos
- ✅ Gestión de categorías

### Panel de Administración
- ✅ Dashboard con estadísticas
- ✅ Sistema de invitaciones por rol (Admin, Pastor, Secretaria)
- ✅ Gestión de usuarios
- ✅ Links de invitación con expiración

### Autenticación y Seguridad 🔥 **NUEVO**
- ✅ **Firebase Authentication** con Google Sign-In
- ✅ **Firebase Admin SDK** para verificación server-side
- ✅ Control de acceso basado en roles (RLS)
- ✅ Tokens JWT propios para sesiones
- ✅ Persistencia de sesión automática
- ✅ Seguridad mejorada

### Diseño
- ✅ Responsive mobile-first
- ✅ Tema claro y moderno
- ✅ Componentes Shadcn UI
- ✅ Animaciones suaves
- ✅ Gradientes profesionales azul/índigo

## 🛠️ Stack Tecnológico

### Backend
- **FastAPI** - Framework Python para APIs REST
- **Supabase** - Base de datos PostgreSQL con RLS
- **Firebase Admin SDK** 🔥 - Verificación de tokens
- **JWT** - Tokens de sesión propios

### Frontend
- **React 19** - Framework de UI
- **React Router** - Navegación
- **Firebase SDK** 🔥 - Autenticación
- **Tailwind CSS** - Estilos
- **Shadcn UI** - Componentes
- **Axios** - Cliente HTTP
- **React Hook Form** - Formularios

## 📋 Requisitos Previos

1. **Firebase** - Proyecto con Google Sign-In habilitado (https://console.firebase.google.com)
2. **Supabase** - Base de datos (https://supabase.com)
3. **Node.js 16+** y **Python 3.8+**

## 🔧 Configuración Rápida

### Opción 1: Script Automatizado (Recomendado)
```powershell
.\install.ps1
```

### Opción 2: Manual

**1. Instalar dependencias:**
```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**2. Configurar variables de entorno:**
```bash
# Copiar archivos de ejemplo
Copy-Item frontend\.env.example frontend\.env
Copy-Item backend\.env.example backend\.env

# Editar con tus credenciales
notepad frontend\.env
notepad backend\.env
```

**3. Configurar Firebase:**
- Lee la guía completa en [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

**4. Crear primer usuario admin:**
- Sigue los pasos en [FIRST_USER_SETUP.md](./FIRST_USER_SETUP.md)

## 🚀 Ejecución

```powershell
# Terminal 1 - Backend
cd backend
uvicorn server:app --reload --port 8001

# Terminal 2 - Frontend
cd frontend
npm start
```

Accede a: http://localhost:3000/login

## 📱 Uso del Sistema

### 1. Primer Acceso (Admin)
1. Ve a http://localhost:3000/login
2. Haz clic en "Continuar con Google"
3. Inicia sesión con tu cuenta de Google
4. (Primera vez) Tu Firebase UID aparecerá en los logs del backend
5. Crea tu usuario admin en Supabase usando ese UID
6. Vuelve a iniciar sesión

### 2. Invitar Usuarios
1. Como admin, ve a `/admin`
2. Crea invitaciones para otros roles
3. Comparte el enlace de invitación
4. Los usuarios se registran con su cuenta de Google

### 3. Gestionar Miembros
1. Ve a "Miembros" → "Nuevo Miembro"
2. Rellena el formulario
3. Usa la búsqueda y filtros

## 🔐 Roles y Permisos

- **Admin/TI**: Acceso total, gestión de usuarios
- **Pastor**: Gestión de miembros y grupos
- **Secretaria**: Ver y editar miembros

## 🔒 Seguridad

✅ Autenticación con Firebase (infraestructura de Google)
✅ Verificación de tokens server-side con Firebase Admin SDK
✅ Lista blanca de usuarios en Supabase
✅ JWT tokens con expiración
✅ CORS configurado
✅ Credenciales en variables de entorno
✅ Service Account Key con permisos mínimos

## 🆘 Troubleshooting

| Problema | Solución |
|----------|----------|
| "Usuario no autorizado" | Crear usuario en Supabase (ver [FIRST_USER_SETUP.md](./FIRST_USER_SETUP.md)) |
| "Invalid Firebase token" | Verificar credenciales del backend |
| "Popup bloqueado" | Permitir popups para localhost:3000 |
| CORS error | Verificar `CORS_ORIGINS` en backend/.env |

Para más detalles, consulta [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) sección Troubleshooting.

## 📝 Próximas Funcionalidades

- Módulo POS/Restaurante
- Fotos de perfil
- Reportes avanzados
- Import/Export masivo
- Más proveedores de autenticación (Facebook, Microsoft, etc.)

## 📞 Soporte

1. Revisa la documentación en orden:
   - [README_FIREBASE.md](./README_FIREBASE.md)
   - [QUICKSTART.md](./QUICKSTART.md)
   - [CHECKLIST.md](./CHECKLIST.md)
2. Consulta [COMMANDS.md](./COMMANDS.md) para comandos útiles
3. Revisa los logs del backend y frontend

---

**Versión:** 2.0.0 (con Firebase Authentication)  
**Última actualización:** Diciembre 2025
