# Services API

Backend FastAPI para el directorio de proveedores, autenticación y gestor
centralizado de incidencias.

## Variables de entorno

Crear archivo `.env` dentro de `services/api` usando `.env.example`:

- `JWT_SECRET_KEY`: clave para firma JWT.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: expiración del access token en minutos.
- `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES`: expiración del enlace de restablecimiento (por defecto, 15 minutos).
- `RESEND_API_KEY`: API key de Resend para enviar los correos de restablecimiento.
- `RESEND_FROM_EMAIL`: remitente con dominio verificado en Resend.
- `APP_BASE_URL`: URL pública de website para construir el enlace de restablecimiento.

## Ejecutar con Docker

```bash
# Desde la raíz del monorepo
docker compose up --build backend
```

La API quedará accesible en `http://localhost:8020`.

El worker corre separado: `docker compose up worker` para iniciarlo y
`docker compose stop worker` para detenerlo. Flower está disponible en
`http://localhost:5555`. Sin Docker, desde este directorio, usa
`REDIS_URL=redis://localhost:6379/0 celery -A celery_app worker --loglevel=INFO`.

`POST /reporting/pipeline-runs` devuelve `202 {"task_id": "..."}` y
`GET /tasks/{task_id}` consulta `pending`, `started`, `success` o `failure`.

### Stack local sin Docker

Instala Redis con el gestor del sistema y sincroniza dependencias con `uv sync`.
Después, desde `services/api`, ejecuta en terminales separadas:

```bash
sudo service redis-server start
REDIS_URL=redis://127.0.0.1:6379/0 uv run celery -A celery_app worker --loglevel=INFO -E
REDIS_URL=redis://127.0.0.1:6379/0 uv run python -m flower --broker=redis://127.0.0.1:6379/0 flower --port=5555 --address=0.0.0.0
```

Flower queda accesible en `http://localhost:5555`. La opción `-E` habilita los
eventos necesarios para que Flower muestre tareas en ejecución y completadas.

## Ejecutar sin Docker

### Opción A — Con `uv` (recomendado)

Asegúrate de tener Python >= 3.11 y `uv` instalado:

```bash
pip install uv
```

Luego:

```bash
cd services/api
uv sync          # Instala dependencias (incluyendo prefect para el pipeline)
uv run seed      # Carga datos de ejemplo
uv run uvicorn main:app --reload --port 8020
```

El comando `seed` carga tanto los proveedores de ejemplo como el histórico de
`incidents-brasaland.csv` en `data/incidents.json`; puede ejecutarse varias veces
sin duplicar incidencias.

### Opción B — Con Python del sistema

Si `prefect` ya está instalado globalmente (suele estar preinstalado en entornos
de desarrollo del monorepo), puedes usar `python3 -m uvicorn` directamente:

```bash
cd services/api
python3 -m uvicorn main:app --reload --port 8020
```

Esto evita recrear el `.venv` local y usa las dependencias globales, incluyendo
`prefect` y `pandas`.

## Endpoints

### Públicos

- `GET /health`
- `POST /users` (registro de usuario)
- `POST /auth/login`
- `POST /auth/forgot-password` (siempre devuelve respuesta genérica para evitar enumeración de usuarios)
- `POST /auth/reset-password`

### Protegidos (Bearer JWT)

#### Auth

- `GET /auth/me`
- `POST /auth/change-password`

#### Users

- `GET /users` (solo admin)
- `GET /users/{user_id}` (usuario dueño o admin)
- `PUT /users/{user_id}` (usuario dueño o admin; role e is_active solo admin)
- `DELETE /users/{user_id}` (usuario dueño o admin)
- `GET /users/{user_id}/profile` (usuario dueño o admin)

#### Profiles

- `GET /profiles/me`
- `PUT /profiles/me`

#### Suppliers

- `POST /supplier`
- `GET /suppliers`
- `GET /suppliers/{id}`
- `PATCH /suppliers/{id}/rate`
- `PATCH /sppliers/{id}/rate`
- `PATCH /suppliers/{id}/status`
- `DELETE /suppliers`
- `DELETE /suppliers/{id}`

### Incidents

Estos endpoints son públicos mientras no se defina un requisito de autorización
para la operación de incidencias.

- `POST /api/incidents`
- `GET /api/incidents?status=&origin=&branch=&category=`
- `GET /api/incidents/{id}`
- `PATCH /api/incidents/{id}/status`
- `GET /api/incidents/summary`

Las transiciones de estado permitidas son `open → in_progress|discarded` e
`in_progress → resolved|discarded`; `resolved` y `discarded` son finales.
