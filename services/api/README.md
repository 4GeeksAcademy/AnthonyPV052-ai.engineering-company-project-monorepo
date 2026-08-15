# Services API

Estructura backend solicitada para directorio de proveedores.

## Variables de entorno

Crear archivo `.env` dentro de `services/api` usando `.env.example`:

- `JWT_SECRET_KEY`: clave para firma JWT.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: expiración del access token en minutos.
- `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES`: expiración del enlace de restablecimiento (por defecto, 15 minutos).
- `RESEND_API_KEY`: API key de Resend para enviar los correos de restablecimiento.
- `RESEND_FROM_EMAIL`: remitente con dominio verificado en Resend.
- `APP_BASE_URL`: URL pública de website para construir el enlace de restablecimiento.

## Ejecutar

```bash
cd services/api
~/.local/bin/uv sync
~/.local/bin/uv run seed
~/.local/bin/uv run uvicorn main:app --reload --port 8020
```

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
