# ✅ Checklist de Configuración - Firebase Authentication

Usa este checklist para verificar que todo esté configurado correctamente.

## 📋 Antes de Empezar

- [ ] Tienes cuenta de Google
- [ ] Tienes acceso a [Firebase Console](https://console.firebase.google.com/)
- [ ] Tienes acceso a [Supabase](https://app.supabase.com/)
- [ ] Node.js instalado (ejecuta `node --version`)
- [ ] Python 3.8+ instalado (ejecuta `python --version`)
- [ ] Git instalado (ejecuta `git --version`)

## 🔥 Configuración de Firebase Console

- [ ] Proyecto de Firebase creado o seleccionado (`churchapp-3fb9a`)
- [ ] Google Sign-In habilitado en Authentication > Sign-in method
- [ ] Aplicación web registrada en configuración del proyecto
- [ ] Configuración de Firebase copiada (apiKey, authDomain, etc.)
- [ ] Dominios autorizados agregados:
  - [ ] `localhost` (para desarrollo)
  - [ ] Tu dominio de producción (si aplica)

## 🔑 Credenciales y Configuración

### Firebase
- [ ] `REACT_APP_FIREBASE_API_KEY` obtenido
- [ ] `REACT_APP_FIREBASE_AUTH_DOMAIN` confirmado
- [ ] `REACT_APP_FIREBASE_PROJECT_ID` confirmado
- [ ] `REACT_APP_FIREBASE_STORAGE_BUCKET` confirmado
- [ ] `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` obtenido
- [ ] `REACT_APP_FIREBASE_APP_ID` obtenido
- [ ] Service Account Key descargado y guardado en `backend/secrets/`

### Google Cloud Console
- [ ] Client ID de OAuth 2.0 obtenido
- [ ] Authorized JavaScript origins configurados
- [ ] Authorized redirect URIs configurados

### Supabase
- [ ] `SUPABASE_URL` obtenido
- [ ] `SUPABASE_SERVICE_ROLE_KEY` obtenido (⚠️ mantener seguro)
- [ ] `SUPABASE_ANON_KEY` obtenido
- [ ] Tabla `app_users` existe y tiene la estructura correcta

## 📁 Archivos de Configuración

### Frontend
- [ ] Archivo `frontend/.env` creado
- [ ] `REACT_APP_BACKEND_URL=http://localhost:8001` configurado
- [ ] Todas las variables de Firebase configuradas en `.env`
- [ ] Archivo `frontend/.env` NO está en git (verificar con `git status --ignored`)

### Backend
- [ ] Archivo `backend/.env` creado
- [ ] `SUPABASE_URL` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] `FIREBASE_PROJECT_ID` configurado
- [ ] `FIREBASE_CREDENTIALS_PATH` apunta al archivo correcto
- [ ] `JWT_SECRET_KEY` generado y configurado (debe ser aleatorio y seguro)
- [ ] `CORS_ORIGINS` incluye `http://localhost:3000`
- [ ] Archivo `backend/.env` NO está en git
- [ ] Service Account Key existe en `backend/secrets/` y NO está en git

## 📦 Instalación

### Frontend
- [ ] Ejecutado `cd frontend && npm install`
- [ ] Carpeta `node_modules/` creada
- [ ] Firebase instalado (verificar con `npm list firebase`)
- [ ] No hay errores de instalación

### Backend
- [ ] Ejecutado `cd backend && python -m venv venv`
- [ ] Entorno virtual activado
- [ ] Ejecutado `pip install -r requirements.txt`
- [ ] `firebase-admin` instalado (verificar con `pip show firebase-admin`)
- [ ] No hay errores de instalación

## 🚀 Ejecución

### Backend
- [ ] Ejecutado `cd backend && uvicorn server:app --reload --port 8001`
- [ ] Backend corriendo en `http://localhost:8001`
- [ ] Endpoint `/api/health` responde con `{"status":"healthy"}`
- [ ] Endpoint `/api/` responde con información del API
- [ ] Firebase Admin SDK inicializado correctamente (ver logs)
- [ ] No hay errores en los logs de startup

### Frontend
- [ ] Ejecutado `cd frontend && npm start`
- [ ] Frontend corriendo en `http://localhost:3000`
- [ ] Página de login carga correctamente
- [ ] Botón "Continuar con Google" visible
- [ ] No hay errores en la consola del navegador (F12)
- [ ] No hay errores de importación de Firebase

## 👤 Primer Usuario Admin

- [ ] Intenté iniciar sesión por primera vez
- [ ] Copié mi Firebase UID de los logs del backend
- [ ] Ejecuté SQL en Supabase para crear usuario admin:
  ```sql
  INSERT INTO app_users (uid, email, role, active)
  VALUES ('mi_firebase_uid', 'mi_email@gmail.com', 'admin', true);
  ```
- [ ] Usuario admin creado correctamente en Supabase
- [ ] Puedo iniciar sesión exitosamente
- [ ] Soy redirigido al dashboard después del login
- [ ] Mi información de usuario aparece en la UI

## 🧪 Verificación Funcional

### Login
- [ ] Click en "Continuar con Google" abre popup de Google
- [ ] Puedo seleccionar mi cuenta de Google
- [ ] Después de autorizar, el popup se cierra
- [ ] Veo un mensaje de "¡Bienvenido!"
- [ ] Soy redirigido automáticamente a `/dashboard`
- [ ] Mi nombre/email aparece en la UI

### Sesión
- [ ] Al recargar la página (`F5`), sigo autenticado
- [ ] Mi información persiste después de recargar
- [ ] Token guardado en localStorage (ver DevTools > Application > Local Storage)

### Logout
- [ ] Puedo cerrar sesión exitosamente
- [ ] Soy redirigido a `/login` después del logout
- [ ] Token eliminado de localStorage
- [ ] No puedo acceder a rutas protegidas sin autenticarme

### Autorización
- [ ] Como admin, puedo acceder a `/admin`
- [ ] Puedo crear invitaciones en `/admin`
- [ ] Las invitaciones generan un token único
- [ ] Puedo copiar el link de invitación

## 🔒 Seguridad

- [ ] Archivo `.env` en `.gitignore`
- [ ] Carpeta `secrets/` en `.gitignore`
- [ ] Service Account Key tiene permisos restrictivos
- [ ] `JWT_SECRET_KEY` es aleatorio y seguro (no usar "super-secret-key")
- [ ] CORS configurado correctamente (no usar `*` en producción)
- [ ] Credenciales NO están en el código fuente
- [ ] Credenciales NO están en commits de git

## 🐛 Troubleshooting

Si algo no funciona, verifica:

### Error: "Usuario no autorizado"
- [ ] Mi Firebase UID está en la tabla `app_users`
- [ ] El campo `active` es `true`
- [ ] El UID coincide exactamente (copiar/pegar, no escribir a mano)

### Error: "Invalid Firebase token"
- [ ] Service Account Key está en la ruta correcta
- [ ] `FIREBASE_CREDENTIALS_PATH` en backend/.env es correcto
- [ ] Archivo JSON es válido (no corrupto)
- [ ] Backend reiniciado después de agregar el archivo

### Error: "Popup bloqueado"
- [ ] Popups permitidos para `localhost:3000` en el navegador
- [ ] No hay extensiones bloqueando popups

### Error: CORS
- [ ] `CORS_ORIGINS` en backend/.env incluye `http://localhost:3000`
- [ ] Backend reiniciado después de cambiar CORS
- [ ] No hay typos en la URL

### Frontend no conecta con Backend
- [ ] Backend está corriendo en puerto 8001
- [ ] `REACT_APP_BACKEND_URL` es `http://localhost:8001` (sin trailing slash)
- [ ] No hay firewall bloqueando el puerto

### Firebase no se importa
- [ ] `npm install firebase` ejecutado exitosamente
- [ ] `package.json` incluye `firebase` en dependencies
- [ ] `node_modules/firebase` existe
- [ ] Frontend reiniciado después de instalar

## 📚 Documentación Leída

- [ ] `README_FIREBASE.md` - Resumen general
- [ ] `QUICKSTART.md` - Comandos básicos
- [ ] `FIREBASE_SETUP.md` - Configuración paso a paso
- [ ] `FIRST_USER_SETUP.md` - Crear primer usuario
- [ ] `COMMANDS.md` - Comandos útiles

## ✅ Todo Listo

Si todos los items están marcados:

🎉 **¡Felicidades! Tu aplicación está completamente configurada y funcionando.**

Puedes empezar a:
- Invitar más usuarios desde `/admin`
- Gestionar miembros de la iglesia
- Crear grupos y asignar miembros
- Explorar todas las funcionalidades

---

## 🆘 ¿Necesitas Ayuda?

1. Revisa la sección de Troubleshooting arriba
2. Consulta `FIREBASE_SETUP.md` para configuración detallada
3. Revisa los logs del backend y frontend
4. Verifica que todos los items marcados arriba estén completos

---

**Última actualización**: Diciembre 2025  
**Versión del checklist**: 1.0
