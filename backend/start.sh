#!/bin/bash
set -e

# Cambiar al directorio de Django
cd /app/mediaccion

# Ejecutar migraciones
echo "Ejecutando migraciones..."
python manage.py migrate --noinput

# Recopilar archivos estáticos (por si acaso)
echo "Recopilando archivos estáticos..."
python manage.py collectstatic --noinput --clear

# Iniciar Gunicorn
echo "Iniciando Gunicorn..."
exec gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 4 --threads 2 --worker-class gthread --worker-tmp-dir /dev/shm --access-logfile - --error-logfile - mediaccion.wsgi:application