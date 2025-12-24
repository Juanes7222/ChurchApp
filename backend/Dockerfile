# Stage 1: Builder - Instala dependencias y compila
FROM python:3.11-slim as builder

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Instalar dependencias de compilación
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar solo requirements para aprovechar caché de Docker
COPY backend/requirements.txt .

# Instalar dependencias en un directorio temporal
RUN pip install --upgrade pip setuptools wheel && \
    pip install --prefix=/install --no-warn-script-location -r requirements.txt

# Stage 2: Runtime - Imagen final ligera
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/install/bin:${PATH}" \
    PYTHONPATH="/install/lib/python3.11/site-packages:${PYTHONPATH}"

WORKDIR /app

# Instalar solo dependencias de runtime necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 appuser

# Copiar dependencias instaladas desde el builder
COPY --from=builder /install /install

# Copiar código de la aplicación (solo el contenido de backend/)
COPY --chown=appuser:appuser backend/ /app

# Cambiar a usuario no-root por seguridad
USER appuser

EXPOSE 8000

# Usar múltiples workers para mejor performance
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
