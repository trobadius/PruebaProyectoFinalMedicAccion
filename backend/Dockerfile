# --------------------------
# Stage 1: Build dependencies
# --------------------------
FROM python:3.13-slim AS builder

WORKDIR /app

# Optimizar Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instalar herramientas de compilación y PostgreSQL client
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Actualizar pip
RUN pip install --upgrade pip

# Copiar requisitos y construir dependencias
COPY requeriments.txt .
RUN pip install --no-cache-dir -r requeriments.txt

# Copiar código de la aplicación
COPY . .

# Crear directorio static para evitar la advertencia de STATICFILES_DIRS
RUN mkdir -p /app/mediaccion/static

# --------------------------
# Stage 2: Runtime
# --------------------------
FROM python:3.13-slim

# Crear usuario no root con shell asignado
RUN useradd -m -r -s /bin/bash appuser && mkdir /app && chown -R appuser /app

# Variables de entorno para Python y Railway
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PATH=/root/.local/bin:$PATH

WORKDIR /app

# Instalar solo dependencias necesarias en runtime
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Copiar dependencias y código desde builder
COPY --from=builder /usr/local/lib/python3.13/site-packages/ /usr/local/lib/python3.13/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Copiar código de la app como appuser
COPY --from=builder --chown=appuser:appuser /app /app

# Copiar y configurar entrypoint.sh ANTES de cambiar a USER appuser
COPY --chown=appuser:appuser entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Cambiar a usuario no root
USER appuser

# Cambiar al directorio de Django
WORKDIR /app/mediaccion

# Crear directorio de archivos estáticos
RUN mkdir -p staticfiles

# Exponer puerto de Railway
EXPOSE $PORT

# CMD final solo Gunicorn
CMD gunicorn --bind 0.0.0.0:8000 \
    --workers 4 \
    --threads 2 \
    --worker-class gthread \
    --worker-tmp-dir /dev/shm \
    --access-logfile - \
    --error-logfile - \
    mediaccion.wsgi:application

