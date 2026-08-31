"""Paquete de telemetría para el sistema de monitorización de eventos.

Proporciona el modelo ``TelemetryEvent``, el modelo SQLModel
``TelemetryEventRecord`` y el router FastAPI ``POST /telemetry/events``
para recibir, validar, persistir y registrar eventos de telemetría.
"""

from telemetry.models import TelemetryEvent, TelemetryEventRecord
from telemetry.router import router

__all__ = ["TelemetryEvent", "TelemetryEventRecord", "router"]