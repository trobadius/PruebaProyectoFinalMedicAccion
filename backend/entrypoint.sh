#!/usr/bin/env bash
set -e

# Cambiar al directorio de Django para asegurar que manage.py esté accesible
cd /app/mediaccion

echo "Ejecutando migraciones de base de datos..."
python manage.py migrate --noinput

echo "Recopilando archivos estáticos..."
python manage.py collectstatic --noinput --clear

echo "Iniciando aplicación..."
exec gunicorn --bind 0.0.0.0:${PORT:-8000} \
    --workers 4 \
    --threads 2 \
    --worker-class gthread \
    --worker-tmp-dir /dev/shm \
    --access-logfile - \
    --error-logfile - \
    mediaccion.wsgi:application