"""Paquete de telemetría para el sistema de monitorización de eventos.

Proporciona el modelo ``TelemetryEvent`` y el router FastAPI
``POST /telemetry/events`` para recibir, validar y registrar
eventos de telemetría.
"""

from telemetry.models import TelemetryEvent
from telemetry.router import router

__all__ = ["TelemetryEvent", "router"]