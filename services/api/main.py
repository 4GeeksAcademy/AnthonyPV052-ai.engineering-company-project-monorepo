from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes.auth import router as auth_router
from routes.incidents import router as incidents_router
from routes.profiles import router as profiles_router
from routes.suppliers import router as suppliers_router
from routes.users import router as users_router

app = FastAPI(title="Brasaland Supplier Directory API", version="1.0.0")

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


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    error = exc.errors()[0]
    location = error.get("loc", [])
    field = str(location[-1]) if location else "request"
    error_type = error.get("type", "")
    if error_type == "missing":
        message = "Este campo es obligatorio."
    elif "enum" in error_type:
        message = "Contiene un valor no permitido."
    else:
        message = str(error.get("msg", "El valor no es válido.")).replace("Value error, ", "")
    return JSONResponse(status_code=400, content={"error": {"field": field, "message": message}})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"error": {"message": "Error interno del servidor."}})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
