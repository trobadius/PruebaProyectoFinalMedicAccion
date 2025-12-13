# Dockerfile Multi-stage optimizado para Railway

# Etapa 1: Build
FROM python:3.13-slim as builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip

# Copiar requisitos
COPY requeriments.txt .

# Crear directorio para pip packages
RUN pip install --no-cache-dir -r requeriments.txt

# Etapa 2: Runtime
FROM python:3.13-slim

# Variables de entorno para Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH=/root/.local/bin:$PATH \
    PORT=8000

WORKDIR /app

# Instalar solo dependencias de runtime
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar Python packages del builder
COPY --from=builder /root/.local /root/.local

# Copiar el proyecto
COPY . .

# Cambiar al directorio de Django
WORKDIR /app/mediaccion

# Crear directorios necesarios
RUN mkdir -p /app/mediaccion/staticfiles

# Recopilar archivos estáticos
RUN python manage.py collectstatic --noinput --clear

# Exponer puerto
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/', timeout=5)" || exit 1

# Comando de inicio
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--threads", "2", "--worker-class", "gthread", "--worker-tmp-dir", "/dev/shm", "--access-logfile", "-", "--error-logfile", "-", "mediaccion.wsgi:application"]