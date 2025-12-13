# MediAccion Backend - Railway Deployment

Este proyecto está configurado para desplegarse en Railway usando Docker.

## Configuración de Railway

### 1. Variables de Entorno

En Railway, configura las siguientes variables de entorno:

#### Django Configuration
- `DEBUG`: `False` (para producción)
- `SECRET_KEY`: Genera una nueva clave secreta segura
- `ALLOWED_HOSTS`: Tu dominio de Railway (ej: `mediaccion-production.up.railway.app`)

#### Database Configuration (PostgreSQL)
Railway proporciona automáticamente estas variables:
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`

#### CORS Configuration
- `CORS_ALLOW_ALL_ORIGINS`: `False`
- `CORS_ALLOWED_ORIGINS`: URLs permitidas separadas por comas (ej: `https://tu-frontend.com`)
- `CORS_ALLOW_CREDENTIALS`: `True`

#### Twilio Configuration
- `TWILIO_ACCOUNT_SID`: Tu SID de Twilio
- `TWILIO_AUTH_TOKEN`: Tu token de Twilio
- `TWILIO_WHATSAPP_NUMBER`: Tu número de WhatsApp de Twilio

### 2. Despliegue

1. Conecta tu repositorio de GitHub a Railway
2. Railway detectará automáticamente el `Dockerfile` y `railway.json`
3. El despliegue se ejecutará automáticamente

### 3. Migraciones de Base de Datos

Las migraciones se ejecutan automáticamente durante el despliegue gracias al `entrypoint.sh`.

### 4. Archivos Estáticos

Los archivos estáticos se sirven usando WhiteNoise middleware.

## Comandos Locales

Para probar localmente con Docker:

```bash
# Construir imagen
docker build -t mediaccion-backend .

# Ejecutar contenedor
docker run -p 8000:8000 mediaccion-backend
```

## Estructura del Proyecto

```
backend/
├── Dockerfile              # Configuración Docker multi-stage
├── railway.json           # Configuración específica de Railway
├── entrypoint.sh          # Script de inicialización
├── .dockerignore          # Archivos a excluir del build
├── requeriments.txt       # Dependencias Python con versiones fijas
├── .env                   # Variables de entorno (desarrollo)
└── mediaccion/           # Proyecto Django
    ├── manage.py
    └── mediaccion/       # Configuración Django
        ├── settings.py   # Configurado para producción
        ├── urls.py
        └── wsgi.py
```

## Notas de Seguridad

- Cambia la `SECRET_KEY` en producción
- Configura `ALLOWED_HOSTS` correctamente
- Usa HTTPS en producción (Railway lo proporciona automáticamente)
- Configura CORS apropiadamente para tu frontend