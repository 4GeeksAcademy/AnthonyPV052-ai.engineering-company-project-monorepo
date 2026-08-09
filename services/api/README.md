# Services API

Estructura backend solicitada para directorio de proveedores.

## Ejecutar

```bash
cd services/api
~/.local/bin/uv sync
~/.local/bin/uv run seed
~/.local/bin/uv run uvicorn main:app --reload --port 8020
```

## Endpoints

- POST /supplier
- GET /suppliers
- GET /suppliers/{id}
- PATCH /suppliers/{id}/rate
- PATCH /sppliers/{id}/rate
- PATCH /suppliers/{id}/status
- DELETE /suppliers/{id}
