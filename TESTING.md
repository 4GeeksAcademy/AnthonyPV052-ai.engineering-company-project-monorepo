# Plan de pruebas — AUTH-088

## Ejecución

Backend (ejecutar dentro de `services/api`):

```bash
uv run pytest
uv run pytest --cov=routes.auth --cov=security --cov-report=term-missing
```

Desde la raíz también se puede usar `uv run --project services/api pytest` y añadir los mismos argumentos de cobertura.

Frontend TypeScript (desde `uis/website`):

```bash
cd uis/website
npm test -- --coverage
```

Cobertura validada para este cambio: `routes/auth.py` 100%, `security.py` 93% (37 pruebas pytest); `auth.ts` 98.48% (20 pruebas Jest).

Las pruebas invocan las funciones de negocio de las rutas directamente con dependencias controladas/mocks: no arrancan FastAPI ni validan JSON, códigos HTTP en la capa de transporte o serialización de respuestas. Las excepciones `HTTPException` se inspeccionan como resultado de la regla de negocio.

## Casos planeados

### FastAPI: registro `POST /users`

- **Camino feliz:** datos válidos; se crea el usuario y perfil, se hashea la contraseña y no se devuelve el hash.
- **Límite:** nombre, teléfono y dirección opcionales omitidos; los opcionales deben persistirse como `None`.
- **Fallo:** email ya registrado; debe responder con conflicto sin crear otro usuario. La contraseña vacía/corta se rechaza en el modelo `UserCreate`.

### FastAPI: inicio de sesión `POST /auth/login`

- **Camino feliz:** usuario y contraseña correctos producen un bearer token con duración configurada.
- **Límite:** una contraseña vacía se evalúa como credencial y se rechaza con 401 (el modelo acepta string vacío, por eso se prueba la regla de login directamente).
- **Fallo:** email inexistente y contraseña incorrecta son rechazados de forma equivalente; cubrimos ambos caminos para evitar diferencias de enumeración.

### FastAPI: solicitar recuperación `POST /auth/forgot-password`

- **Camino feliz:** email registrado crea registro de token y solicita envío de correo.
- **Límite:** espacios en el email se recortan; un email desconocido recibe la misma respuesta genérica sin enviar correo.
- **Fallo:** falla la creación del token/registro o falla el envío; no se revela la existencia de la cuenta y la ruta conserva su respuesta genérica.

### FastAPI: restablecer contraseña `POST /auth/reset-password`

- **Camino feliz:** token válido y no usado consume el token y guarda un hash nuevo.
- **Límite:** la contraseña nueva en el mínimo permitido (8 caracteres) es válida; menos de 8 y token vacío se rechazan por el modelo.
- **Fallo:** token malformado/expirado, token ya consumido o usuario inexistente; se rechaza el cambio y no se informa éxito.

### FastAPI: cambiar contraseña `POST /auth/change-password`

- **Camino feliz:** contraseña actual válida actualiza el hash.
- **Límite:** contraseña nueva de longitud mínima aceptada; campo vacío/corto es rechazado por el modelo.
- **Fallo:** contraseña actual incorrecta; no debe actualizarse el usuario.

### FastAPI: usuario actual `GET /auth/me`

- **Camino feliz:** usuario autenticado devuelve identidad, rol y perfil existente.
- **Límite:** perfil inexistente produce `profile=None`.
- **Fallo:** rol almacenado que no pertenece al enum se rechaza; los tokens ausentes/malformados/expirados y usuarios desactivados se prueban en la dependencia `get_current_user`.

### TypeScript: `uis/website/src/lib/auth.ts`

- **`apiFetch`:** respuesta correcta; respuestas de error (incluidos 401/5xx) y fallo de red.
- **`authenticatedApiFetch`:** añade bearer; sesión sin token falla sin petición; 401 limpia token y notifica el evento.
- **Almacenamiento de sesión:** lectura en servidor sin `window`, guardar y borrar token en navegador.
- **`login` y `registerAndLogin`:** guardar token y secuencia registro→login; propagar error sin guardar token.
- **Helpers de auth:** `getCurrentUser`, actualización de perfil, recuperación/reset y cambio de contraseña construyen llamadas correctas y propagan fallos.

## Registro de cambios de esta tarea (AUTH-088)

Esta lista separa los cambios del ticket de cualquier modificación preexistente en el workspace:

- [x] `TESTING.md` — plan de casos y comandos de ejecución (este archivo).
- [x] `services/api/pyproject.toml` y `services/api/uv.lock` — dependencias de pytest/cobertura.
- [x] `services/api/tests/` — pruebas unitarias de registro, autenticación, recuperación/restablecimiento/cambio de contraseña y usuario actual.
- [x] `uis/website/package.json` y `uis/website/package-lock.json` — Jest y comando de pruebas.
- [x] `uis/website/jest.config.cjs` y `uis/website/src/lib/__tests__/auth.test.ts` — configuración y pruebas de helpers TypeScript de autenticación.
