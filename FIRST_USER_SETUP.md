# 👤 Configuración del Primer Usuario Admin

## Problema
Cuando instalas la aplicación por primera vez, no hay usuarios en la base de datos. Necesitas crear un usuario admin inicial para poder acceder a la aplicación.

## Solución Paso a Paso

### Método 1: Obtener Firebase UID después del primer login (Recomendado)

#### Paso 1: Intenta iniciar sesión
1. Inicia el backend y frontend
2. Ve a `http://localhost:3000/login`
3. Haz clic en "Continuar con Google"
4. Inicia sesión con tu cuenta de Google

#### Paso 2: Revisa los logs del backend
El backend mostrará un error pero también registrará tu Firebase UID:

```
INFO:     127.0.0.1:xxxxx - "POST /api/auth/google HTTP/1.1" 403 Forbidden
ERROR:    Usuario no autorizado: uid=Abc123XYZ456def789...
```

Copia el UID (la parte después de `uid=`)

#### Paso 3: Inserta el usuario en Supabase
1. Ve a tu proyecto en [Supabase](https://app.supabase.com)
2. Ve a **SQL Editor**
3. Ejecuta este SQL (reemplaza los valores):

```sql
INSERT INTO app_users (uid, email, role, active)
VALUES (
  'Abc123XYZ456def789...',  -- Tu Firebase UID del paso 2
  'tu_email@gmail.com',      -- Tu email de Google
  'admin',                    -- Rol de administrador
  true                        -- Cuenta activa
);
```

#### Paso 4: Inicia sesión nuevamente
1. Vuelve a `http://localhost:3000/login`
2. Haz clic en "Continuar con Google"
3. ¡Deberías poder acceder al dashboard!

---

### Método 2: Obtener UID desde Firebase Console

#### Paso 1: Inicia sesión con Firebase
1. Inicia el frontend
2. Ve a `http://localhost:3000/login`
3. Haz clic en "Continuar con Google"
4. Inicia sesión con tu cuenta

#### Paso 2: Ve a Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `churchapp-3fb9a`
3. Ve a **Authentication** en el menú lateral
4. Ve a la pestaña **Users**
5. Busca tu email y copia el **User UID**

#### Paso 3: Inserta en Supabase
Usa el mismo SQL del Método 1, Paso 3

---

### Método 3: Script de Python (Para desarrolladores)

Crea un archivo `backend/create_admin.py`:

```python
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

# Configuración
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Datos del admin
FIREBASE_UID = input("Ingresa tu Firebase UID: ")
EMAIL = input("Ingresa tu email: ")

# Crear cliente de Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Insertar usuario admin
try:
    result = supabase.table('app_users').insert({
        'uid': FIREBASE_UID,
        'email': EMAIL,
        'role': 'admin',
        'active': True
    }).execute()
    
    print(f"✅ Usuario admin creado exitosamente!")
    print(f"   UID: {FIREBASE_UID}")
    print(f"   Email: {EMAIL}")
    print(f"   Role: admin")
except Exception as e:
    print(f"❌ Error: {e}")
```

Ejecuta:
```bash
cd backend
python create_admin.py
```

---

## Estructura de la Tabla app_users

```sql
CREATE TABLE app_users (
  id SERIAL PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL,           -- Firebase UID
  email TEXT NOT NULL,                -- Email del usuario
  role TEXT NOT NULL,                 -- Roles: 'admin', 'pastor', 'secretaria', 'ti'
  active BOOLEAN DEFAULT true,        -- Si la cuenta está activa
  miembro_uuid UUID,                  -- Opcional: vincula con tabla miembros
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Roles Disponibles

- **`admin`**: Acceso completo, puede gestionar usuarios e invitaciones
- **`ti`**: Similar a admin, para equipo de TI
- **`pastor`**: Puede ver y editar miembros
- **`secretaria`**: Puede ver y editar miembros

## Verificación

Después de crear el usuario admin:

1. Ve a `http://localhost:3000/login`
2. Haz clic en "Continuar con Google"
3. Inicia sesión con la cuenta que configuraste
4. Deberías ver el dashboard
5. Ve a `/admin` para gestionar invitaciones

## ¿Qué hacer después?

### Invitar más usuarios

1. Como admin, ve a `/admin` en la aplicación
2. Usa el formulario de invitaciones
3. Selecciona el rol
4. Genera un link de invitación
5. Comparte el link con el nuevo usuario
6. El usuario hace clic en el link, inicia sesión con Google, y automáticamente se registra

### Vincular con miembro

Si quieres vincular tu usuario admin con un registro en la tabla `miembros`:

```sql
-- Primero crea el miembro
INSERT INTO miembros (documento, nombres, apellidos, email)
VALUES ('123456789', 'Juan', 'Pérez', 'tu_email@gmail.com')
RETURNING uuid;

-- Luego vincula el usuario con el miembro (usa el uuid del resultado anterior)
UPDATE app_users 
SET miembro_uuid = 'uuid-del-miembro'
WHERE email = 'tu_email@gmail.com';
```

## Troubleshooting

### "Usuario no autorizado"
- Verifica que el UID en `app_users` coincida exactamente con el Firebase UID
- Verifica que `active = true`
- Revisa los logs del backend para el UID correcto

### "Invalid Firebase token"
- Verifica que Firebase Admin SDK esté inicializado
- Verifica el archivo de credenciales en `backend/secrets/`
- Reinicia el servidor backend

### No puedo ver la página de Admin
- Verifica que tu rol sea `admin` o `ti`
- Otros roles no tienen acceso a `/admin`

---

¡Listo! Ahora tienes un usuario admin y puedes gestionar la aplicación completa.
