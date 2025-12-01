# 🛠️ Comandos Útiles - ChurchApp con Firebase

## 🚀 Inicio Rápido

### Instalación Completa (Primera vez)
```powershell
# Ejecutar desde el directorio raíz del proyecto
.\install.ps1
```

### Iniciar Aplicación (Desarrollo)

**Opción 1: Dos terminales**
```powershell
# Terminal 1 - Backend
cd backend
.\venv\Scripts\Activate.ps1  # Activar entorno virtual
uvicorn server:app --reload --port 8001

# Terminal 2 - Frontend
cd frontend
npm start
```

**Opción 2: Una terminal con comandos paralelos** (requiere instalar concurrently)
```powershell
# Desde el directorio raíz
npm install -g concurrently
concurrently "cd backend && uvicorn server:app --reload --port 8001" "cd frontend && npm start"
```

## 📦 Instalación de Dependencias

### Frontend
```bash
cd frontend

# Con npm
npm install

# Con yarn
yarn install

# Instalar solo firebase
npm install firebase
```

### Backend
```bash
cd backend

# Crear entorno virtual (primera vez)
python -m venv venv

# Activar entorno virtual
# En Windows PowerShell:
.\venv\Scripts\Activate.ps1
# En Windows CMD:
venv\Scripts\activate.bat

# Instalar dependencias
pip install -r requirements.txt

# Instalar solo firebase-admin
pip install firebase-admin
```

## 🔧 Configuración

### Copiar archivos de ejemplo
```powershell
# Frontend
cd frontend
Copy-Item .env.example .env

# Backend
cd backend
Copy-Item .env.example .env
```

### Editar archivos .env
```powershell
# Frontend
notepad frontend\.env

# Backend
notepad backend\.env
```

## 🧪 Testing y Verificación

### Verificar instalación de Firebase
```bash
# Frontend
cd frontend
npm list firebase

# Backend
cd backend
pip show firebase-admin
```

### Test de conectividad

**Backend:**
```bash
cd backend
curl http://localhost:8001/api/health
# Debería retornar: {"status":"healthy"}
```

**Frontend:**
```bash
# Abrir en navegador
start http://localhost:3000/login
```

### Ver logs en tiempo real
```bash
# Backend - agregar nivel de log
cd backend
$env:LOG_LEVEL="DEBUG"
uvicorn server:app --reload --port 8001 --log-level debug

# Ver logs del navegador
# Abrir DevTools (F12) > Console
```

## 👤 Gestión de Usuarios

### Crear primer usuario admin
```sql
-- Ejecutar en Supabase SQL Editor
INSERT INTO app_users (uid, email, role, active)
VALUES (
  'tu_firebase_uid',
  'tu_email@gmail.com',
  'admin',
  true
);
```

### Ver usuarios existentes
```sql
-- En Supabase SQL Editor
SELECT uid, email, role, active, created_at 
FROM app_users 
ORDER BY created_at DESC;
```

### Desactivar usuario
```sql
-- En Supabase SQL Editor
UPDATE app_users 
SET active = false 
WHERE email = 'email@ejemplo.com';
```

### Cambiar rol de usuario
```sql
-- En Supabase SQL Editor
UPDATE app_users 
SET role = 'pastor'  -- o 'admin', 'secretaria', 'ti'
WHERE email = 'email@ejemplo.com';
```

## 🔍 Debugging

### Ver errores del backend
```bash
cd backend
# Los errores aparecen en la terminal donde ejecutaste uvicorn
# Para más detalle, agregar:
$env:LOG_LEVEL="DEBUG"
uvicorn server:app --reload --port 8001 --log-level debug
```

### Ver errores del frontend
```javascript
// En el navegador, abrir DevTools (F12) > Console
// O para ver errores de red:
// DevTools (F12) > Network > filtrar por "api"
```

### Test manual de autenticación
```powershell
# Test del endpoint de auth (necesitas un token válido)
$token = "tu_firebase_id_token_aqui"
$body = @{token = $token} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8001/api/auth/google" -Method Post -Body $body -ContentType "application/json"
```

## 🧹 Limpieza y Reset

### Limpiar dependencias
```bash
# Frontend
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Backend
cd backend
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Limpiar caché
```bash
# Frontend
cd frontend
npm cache clean --force
Remove-Item -Recurse -Force .cache

# Backend
cd backend
Remove-Item -Recurse -Force __pycache__
Remove-Item -Recurse -Force .pytest_cache
```

## 📊 Monitoring

### Ver estado de la aplicación
```bash
# Backend health check
curl http://localhost:8001/api/health

# Backend info
curl http://localhost:8001/api/

# Ver usuarios activos en Supabase
# Dashboard > Authentication > Users
```

### Ver logs de Firebase
```bash
# En Firebase Console:
# Console > Authentication > Settings > Usage logs
```

## 🔄 Actualizar Dependencias

### Frontend
```bash
cd frontend

# Ver paquetes desactualizados
npm outdated

# Actualizar todos
npm update

# Actualizar uno específico
npm update firebase

# Actualizar a última versión
npm install firebase@latest
```

### Backend
```bash
cd backend
.\venv\Scripts\Activate.ps1

# Ver paquetes desactualizados
pip list --outdated

# Actualizar uno específico
pip install --upgrade firebase-admin

# Actualizar todos (con precaución)
pip install --upgrade -r requirements.txt
```

## 🚀 Deployment (Producción)

### Build del frontend
```bash
cd frontend
npm run build
# Los archivos optimizados estarán en frontend/build/
```

### Configurar variables de entorno en producción
```bash
# No usar archivos .env en producción
# Usar variables de entorno del servidor/plataforma

# Ejemplo en Heroku:
heroku config:set FIREBASE_API_KEY=tu_key
heroku config:set REACT_APP_FIREBASE_API_KEY=tu_key

# Ejemplo en Vercel:
vercel env add REACT_APP_FIREBASE_API_KEY
```

## 🆘 Comandos de Emergencia

### Reiniciar todo
```powershell
# Matar todos los procesos de Node y Python
taskkill /F /IM node.exe
taskkill /F /IM python.exe

# Reiniciar servicios
cd backend
uvicorn server:app --reload --port 8001

cd frontend
npm start
```

### Verificar puertos ocupados
```powershell
# Ver qué está usando el puerto 8001 (backend)
netstat -ano | findstr :8001

# Ver qué está usando el puerto 3000 (frontend)
netstat -ano | findstr :3000

# Matar proceso por PID
taskkill /F /PID <numero_pid>
```

### Reset completo de la base de datos
```sql
-- ⚠️ CUIDADO: Esto borrará todos los usuarios
-- Ejecutar en Supabase SQL Editor
DELETE FROM app_users;
```

## 📝 Logs Útiles

### Guardar logs del backend
```powershell
cd backend
uvicorn server:app --reload --port 8001 2>&1 | Tee-Object -FilePath "logs.txt"
```

### Ver logs en tiempo real con filtros
```powershell
# Backend - solo errores
cd backend
uvicorn server:app --reload --port 8001 2>&1 | Select-String "ERROR"

# Backend - relacionados con auth
cd backend
uvicorn server:app --reload --port 8001 2>&1 | Select-String "auth"
```

## 🔐 Seguridad

### Generar nueva SECRET_KEY para JWT
```powershell
# En PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Verificar archivos sensibles no están en git
```bash
git status --ignored
# No deberías ver archivos .env ni secrets/
```

### Verificar permisos del archivo de credenciales
```powershell
# El archivo debe tener permisos restrictivos
icacls backend\secrets\churchapp-3fb9a-firebase-adminsdk-fbsvc-98a491b42c.json
```

## 📚 Recursos Adicionales

### Documentación oficial
- [Firebase Docs](https://firebase.google.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Supabase Docs](https://supabase.com/docs)

### Comandos Git útiles
```bash
# Ver estado
git status

# Ver cambios
git diff

# Commit de cambios
git add .
git commit -m "Descripción de cambios"

# Push a GitHub
git push origin main
```

---

**Tip**: Guarda este archivo en marcadores para acceso rápido a comandos comunes.
