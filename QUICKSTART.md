# 🚀 Inicio Rápido - Firebase Authentication

## Instalación de Dependencias

### Frontend
```bash
cd frontend
npm install
# o
yarn install
```

### Backend
```bash
cd backend
pip install -r requirements.txt
```

## Configuración Rápida

### 1. Crear archivos .env

**Frontend** (`frontend/.env`):
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_FIREBASE_API_KEY=tu_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=churchapp-3fb9a.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=churchapp-3fb9a
REACT_APP_FIREBASE_STORAGE_BUCKET=churchapp-3fb9a.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
REACT_APP_FIREBASE_APP_ID=tu_app_id
```

**Backend** (`backend/.env`):
```bash
FIREBASE_PROJECT_ID=churchapp-3fb9a
FIREBASE_CREDENTIALS_PATH=./secrets/churchapp-3fb9a-firebase-adminsdk-fbsvc-98a491b42c.json
JWT_SECRET_KEY=tu_clave_secreta_segura
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_service_key
CORS_ORIGINS=http://localhost:3000
```

### 2. Ejecutar la aplicación

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn server:app --reload --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 3. Crear usuario admin inicial

En Supabase SQL Editor:
```sql
INSERT INTO app_users (uid, email, role, active)
VALUES ('tu_firebase_uid', 'tu_email@gmail.com', 'admin', true);
```

Para obtener tu Firebase UID: inicia sesión una vez y revisa los logs del backend.

## 📝 Documentación Completa

Ver [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) para instrucciones detalladas.

## ✅ Verificación

1. Abre http://localhost:3000/login
2. Haz clic en "Continuar con Google"
3. Inicia sesión con tu cuenta
4. Deberías ser redirigido al dashboard

## ⚠️ Problemas Comunes

- **"Usuario no autorizado"**: Agrega tu UID a la tabla app_users
- **"Popup bloqueado"**: Permite popups para localhost:3000
- **"Invalid Firebase token"**: Verifica las credenciales del backend
- **CORS error**: Verifica CORS_ORIGINS en el backend

## 📚 Archivos Modificados

- ✅ `frontend/src/lib/firebase.js` - Configuración de Firebase
- ✅ `frontend/src/context/AuthContext.js` - Autenticación integrada
- ✅ `frontend/src/pages/Login.js` - UI de login actualizada
- ✅ `backend/server.py` - Verificación con Firebase Admin SDK
- ✅ `backend/requirements.txt` - Agregado firebase-admin
- ✅ `frontend/package.json` - Agregado firebase SDK
