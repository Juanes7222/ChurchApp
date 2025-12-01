# Script de instalación para ChurchApp con Firebase
# Ejecuta este script después de clonar el repositorio

Write-Host "🚀 Instalando ChurchApp con Firebase Authentication..." -ForegroundColor Green
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "frontend") -or -not (Test-Path "backend")) {
    Write-Host "❌ Error: Ejecuta este script desde el directorio raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Backend
Write-Host "📦 Instalando dependencias del backend..." -ForegroundColor Cyan
cd backend

# Verificar Python
try {
    $pythonVersion = python --version
    Write-Host "✅ Python encontrado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python no encontrado. Por favor instala Python 3.8+" -ForegroundColor Red
    exit 1
}

# Crear entorno virtual si no existe
if (-not (Test-Path "venv")) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
    python -m venv venv
}

# Activar entorno virtual
Write-Host "Activando entorno virtual..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Instalar dependencias
Write-Host "Instalando paquetes Python..." -ForegroundColor Yellow
pip install -r requirements.txt

# Verificar archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Archivo .env no encontrado. Copiando desde .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "📝 Por favor edita backend/.env con tus credenciales" -ForegroundColor Yellow
}

# Verificar archivo de credenciales de Firebase
if (-not (Test-Path "secrets/churchapp-3fb9a-firebase-adminsdk-fbsvc-98a491b42c.json")) {
    Write-Host "⚠️  Archivo de credenciales de Firebase no encontrado en secrets/" -ForegroundColor Yellow
    Write-Host "📝 Asegúrate de colocar tu service account key en backend/secrets/" -ForegroundColor Yellow
}

cd ..

# Frontend
Write-Host ""
Write-Host "📦 Instalando dependencias del frontend..." -ForegroundColor Cyan
cd frontend

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no encontrado. Por favor instala Node.js" -ForegroundColor Red
    exit 1
}

# Instalar dependencias
Write-Host "Instalando paquetes npm..." -ForegroundColor Yellow
npm install

# Verificar archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Archivo .env no encontrado. Copiando desde .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "📝 Por favor edita frontend/.env con tu configuración de Firebase" -ForegroundColor Yellow
}

cd ..

# Resumen
Write-Host ""
Write-Host "✅ ¡Instalación completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Edita backend/.env con tus credenciales de Supabase y Firebase" -ForegroundColor White
Write-Host "2. Edita frontend/.env con tu configuración de Firebase" -ForegroundColor White
Write-Host "3. Asegúrate de tener el archivo de service account en backend/secrets/" -ForegroundColor White
Write-Host "4. Lee FIREBASE_SETUP.md para configurar Firebase Console" -ForegroundColor White
Write-Host "5. Ejecuta el backend: cd backend && uvicorn server:app --reload --port 8001" -ForegroundColor White
Write-Host "6. Ejecuta el frontend: cd frontend && npm start" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentación:" -ForegroundColor Cyan
Write-Host "   - QUICKSTART.md      → Inicio rápido" -ForegroundColor White
Write-Host "   - FIREBASE_SETUP.md  → Configuración detallada" -ForegroundColor White
Write-Host "   - FIREBASE_INTEGRATION.md → Resumen técnico" -ForegroundColor White
Write-Host ""
