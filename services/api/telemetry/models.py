from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TelemetryEvent(BaseModel):
    """Modelo Pydantic para un evento individual de telemetría.

    Cada evento sigue el envelope estándar definido para el sistema
    de telemetría. Este modelo se reutilizará sin cambios en fases
    posteriores (Fase 3+).
    """

    eventId: str = Field(..., description="Identificador único del evento")
    timestamp: datetime = Field(..., description="Momento en que ocurrió el evento")
    sessionId: str = Field(..., description="Identificador de la sesión de usuario")
    userId: str = Field(..., description="Identificador del usuario")
    eventType: str = Field(..., description="Tipo de evento (ej: inbound_order_created)")
    schemaVersion: str = Field(..., description="Versión del esquema del envelope (ej: 1.0)")
    requestId: str = Field(..., description="Identificador de la petición HTTP original")
    properties: dict = Field(
        default_factory=dict,
        description="Propiedades adicionales del evento (contenido variable)",
    )