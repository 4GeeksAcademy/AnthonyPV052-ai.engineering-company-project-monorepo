from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from database import init_db
from routes.auth import router as auth_router
from routes.incidents import router as incidents_router
from routes.inventory import router as inventory_router
from routes.profiles import router as profiles_router
from routes.suppliers import router as suppliers_router
from routes.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Inicializa el esquema de base de datos SQLModel al arrancar la aplicación."""
    init_db()  # Crea las tablas Ingredient, IngredientEntry, IngredientExit en Supabase
    yield


app = FastAPI(title="Brasaland Supplier Directory API", version="1.0.0", lifespan=lifespan)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4011",
        "http://127.0.0.1:4011",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(suppliers_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(incidents_router)
app.include_router(inventory_router)


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    location = first_error.get("loc", [])
    field = str(location[-1]) if location else "request"
    error_type = first_error.get("type", "")
    if error_type == "missing":
        message = "Este campo es obligatorio."
    elif "enum" in error_type:
        message = "Selecciona una opción válida."
    else:
        message = "El valor no es válido. Revisa el formato e inténtalo de nuevo."
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "validation_error", "field": field, "message": message}},
    )


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    public_message = None
    public_field = None
    if isinstance(detail, dict):
        candidate_message = detail.get("message")
        candidate_field = detail.get("field")
        if isinstance(candidate_message, str) and len(candidate_message) <= 240:
            public_message = candidate_message
        if isinstance(candidate_field, str) and candidate_field in {"status", "category", "branch", "origin"}:
            public_field = candidate_field
    elif isinstance(detail, str) and len(detail) <= 160 and exc.status_code == 404:
        # Not found details are authored by our routes, never database/exception text.
        public_message = detail

    messages = {
        400: "La solicitud no es válida. Revisa los datos e inténtalo de nuevo.",
        401: "La sesión no es válida. Inicia sesión e inténtalo de nuevo.",
        403: "No tienes permiso para realizar esta acción.",
        404: "El recurso solicitado no está disponible.",
        409: "La operación entra en conflicto con los datos actuales.",
        422: "El valor no es válido. Revisa el formato e inténtalo de nuevo.",
    }
    message = public_message or messages.get(exc.status_code, "No se pudo completar la solicitud.")
    error_payload = {"code": "request_error", "message": message}
    if public_field:
        error_payload["field"] = public_field
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": error_payload},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API error for %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": "Error interno del servidor. Inténtalo de nuevo más tarde."}},
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
