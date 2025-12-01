# Configuración de Firebase Authentication con Google

Esta guía te ayudará a configurar Firebase Authentication para usar inicio de sesión con Google en la aplicación ChurchApp.

## 📋 Requisitos Previos

- Cuenta de Google
- Acceso a [Firebase Console](https://console.firebase.google.com/)
- Node.js y npm/yarn instalados
- Python 3.8+ instalado

## 🔥 Paso 1: Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto" o selecciona tu proyecto existente `churchapp-3fb9a`
3. Sigue los pasos del asistente de configuración

## 🔐 Paso 2: Habilitar Google Authentication

1. En Firebase Console, ve a **Authentication** en el menú lateral
2. Haz clic en la pestaña **Sign-in method**
3. Encuentra **Google** en la lista de proveedores
4. Haz clic en **Google** y luego en **Habilitar**
5. Configura:
   - **Correo electrónico de asistencia del proyecto**: Tu email
   - Haz clic en **Guardar**

## 🌐 Paso 3: Configurar Aplicación Web

### 3.1 Registrar aplicación web en Firebase

1. En Firebase Console, ve a **Configuración del proyecto** (icono de engranaje)
2. En la sección "Tus apps", haz clic en el ícono web `</>`
3. Registra tu app:
   - **Sobrenombre de la app**: ChurchApp Web
   - Marca la casilla **También configura Firebase Hosting** (opcional)
   - Haz clic en **Registrar app**

### 3.2 Obtener configuración de Firebase

Después de registrar, verás algo como:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "churchapp-3fb9a.firebaseapp.com",
  projectId: "churchapp-3fb9a",
  storageBucket: "churchapp-3fb9a.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

**Guarda esta información**, la necesitarás para el frontend.

## 🔑 Paso 4: Configurar Google OAuth

### 4.1 Obtener Client ID

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto de Firebase (se crea automáticamente)
3. Ve a **APIs & Services** > **Credentials**
4. Busca el **Client ID de OAuth 2.0** (se creó automáticamente con Firebase)
5. Haz clic en el nombre del client ID
6. Agrega los **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://tu-dominio.com
   ```
7. Agrega los **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/callback
   https://tu-dominio.com/auth/callback
   ```
8. Guarda los cambios

### 4.2 Obtener Service Account Key (Backend)

Ya tienes este archivo: `backend/secrets/churchapp-3fb9a-firebase-adminsdk-fbsvc-98a491b42c.json`

Si necesitas generar uno nuevo:

1. En Firebase Console, ve a **Configuración del proyecto** > **Cuentas de servicio**
2. Haz clic en **Generar nueva clave privada**
3. Guarda el archivo JSON en `backend/secrets/`

## ⚙️ Paso 5: Configurar Variables de Entorno

### 5.1 Frontend (.env)

Crea un archivo `.env` en `frontend/`:

```bash
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8001

# Supabase
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu_anon_key

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=churchapp-3fb9a.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=churchapp-3fb9a
REACT_APP_FIREBASE_STORAGE_BUCKET=churchapp-3fb9a.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# Development
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

### 5.2 Backend (.env)

Crea un archivo `.env` en `backend/`:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_ANON_KEY=tu_anon_key

# Firebase Configuration
FIREBASE_PROJECT_ID=churchapp-3fb9a
FIREBASE_CREDENTIALS_PATH=./secrets/churchapp-3fb9a-firebase-adminsdk-fbsvc-98a491b42c.json

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id.apps.googleusercontent.com

# JWT Configuration
JWT_SECRET_KEY=tu_clave_secreta_super_segura_aqui
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
CORS_ORIGINS=http://localhost:3000,https://tu-dominio.com

# App Configuration
ENVIRONMENT=development
```

## 📦 Paso 6: Instalar Dependencias

### 6.1 Frontend

```bash
cd frontend
npm install firebase
```

O si usas yarn:

```bash
cd frontend
yarn add firebase
```

### 6.2 Backend

```bash
cd backend
pip install -r requirements.txt
```

O con un entorno virtual:

```bash
cd backend
python -m venv venv
# En Windows:
venv\Scripts\activate
# En Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

## 🚀 Paso 7: Ejecutar la Aplicación

### 7.1 Iniciar Backend

```bash
cd backend
uvicorn server:app --reload --port 8001
```

### 7.2 Iniciar Frontend

```bash
cd frontend
npm start
# o
yarn start
```

La aplicación debería abrir en `http://localhost:3000`

## 🔒 Paso 8: Configurar Usuarios Autorizados

Los usuarios deben estar registrados en la tabla `app_users` de Supabase para poder iniciar sesión.

### 8.1 Crear un usuario admin inicial

Ejecuta este SQL en Supabase SQL Editor:

```sql
-- Primero, obtén tu Firebase UID iniciando sesión una vez
-- Luego ejecuta:
INSERT INTO app_users (uid, email, role, active)
VALUES ('tu_firebase_uid_aqui', 'tu_email@gmail.com', 'admin', true);
```

### 8.2 Invitar nuevos usuarios (desde la app)

Una vez que tengas un usuario admin:

1. Inicia sesión como admin
2. Ve a la página de **Admin**
3. Usa la función de invitaciones para generar enlaces de registro
4. Los nuevos usuarios usarán ese enlace para registrarse con su cuenta de Google

## ✅ Verificar la Instalación

1. Abre `http://localhost:3000/login`
2. Haz clic en "Continuar con Google"
3. Selecciona tu cuenta de Google
4. Si todo está bien, serás redirigido al dashboard

## 🐛 Troubleshooting

### Error: "popup-blocked"

**Solución**: Permite los popups para `localhost:3000` en tu navegador

### Error: "Usuario no autorizado"

**Solución**: Asegúrate de que tu Firebase UID esté en la tabla `app_users` con `active = true`

### Error: "Invalid Firebase token"

**Soluciones**:
- Verifica que el archivo de credenciales de Firebase esté en la ruta correcta
- Verifica que todas las variables de entorno estén configuradas
- Reinicia el servidor backend

### Error: "CORS"

**Solución**: Verifica que `CORS_ORIGINS` en el backend incluya la URL del frontend

### Firebase Admin SDK no inicializa

**Solución**:
- Verifica la ruta en `FIREBASE_CREDENTIALS_PATH`
- Verifica que el archivo JSON de credenciales sea válido
- Verifica los permisos del archivo

## 📚 Referencias

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Google Sign-In](https://developers.google.com/identity/sign-in/web)

## 🔐 Seguridad

⚠️ **IMPORTANTE**:

1. **Nunca** commitees archivos `.env` al repositorio
2. **Nunca** compartas tus credenciales de Firebase o Supabase
3. Usa variables de entorno en producción
4. Mantén actualizadas las dependencias de seguridad
5. El archivo de service account debe tener permisos restrictivos (solo lectura para el usuario que ejecuta el servidor)

## 🎉 ¡Listo!

Ahora tienes Firebase Authentication configurado con Google Sign-In. Los usuarios pueden iniciar sesión de forma segura usando sus cuentas de Google.

Si tienes problemas, revisa los logs del backend y la consola del navegador para más detalles.
