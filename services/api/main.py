from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
