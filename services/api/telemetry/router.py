from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ValidationError

from telemetry.models import TelemetryEvent

logger = logging.getLogger("telemetry.router")

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# Leer variable de entorno para establecer el patrón desde el inicio.
# Aún no se usa para redirigir tráfico, pero estará disponible
# cuando se implemente el envío a un endpoint externo en Fase 3.
TELEMETRY_ENDPOINT: str | None = os.getenv("TELEMETRY_ENDPOINT")


class EventsPayload(BaseModel):
    """Payload esperado para el endpoint POST /telemetry/events."""

    events: list[dict[str, Any]]


@router.post("/events")
async def receive_events(payload: EventsPayload) -> dict[str, int]:
    """Recibe un lote de eventos de telemetría, los valida y los registra en log.

    Por cada evento se valida que cumpla con el esquema ``TelemetryEvent``.
    Se registra en log la cantidad total de eventos recibidos y el ``event_type``
    de cada uno.

    Responde con ``{"received": N}`` donde N es la cantidad de eventos que
    llegaron en la petición (independientemente de si fueron válidos o no,
    para reflejar el recuento bruto).
    """
    events_data = payload.events
    total = len(events_data)
    logger.info("Eventos recibidos: %d", total)

    valid_events: list[TelemetryEvent] = []

    for idx, raw in enumerate(events_data):
        try:
            event = TelemetryEvent.model_validate(raw)
            valid_events.append(event)
            logger.info(
                "  [%d/%d] eventId=%s event_type=%s sessionId=%s",
                idx + 1,
                total,
                event.eventId,
                event.eventType,
                event.sessionId,
            )
        except ValidationError as exc:
            logger.warning(
                "  [%d/%d] Evento inválido (eventId=%s): %s",
                idx + 1,
                total,
                raw.get("eventId", "?"),
                exc.errors(),
            )

    return {"received": total}