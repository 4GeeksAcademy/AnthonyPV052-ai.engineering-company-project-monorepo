"""Endpoint de resumen de guardrails para el agente de Brasaland.

Expone un endpoint protegido que permite consultar cuántas veces se ha
activado cada guardrail durante la sesión de pruebas actual.

Uso:
    GET /guardrails/summary  (requiere autenticación JWT del backoffice)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from security import get_current_user

from guardrails import guardrails_summary

logger = logging.getLogger("api.routes.guardrails")
router = APIRouter(prefix="/guardrails", tags=["guardrails"])


@router.get("/summary")
def get_guardrails_summary(current_user: dict = Depends(get_current_user)) -> dict:
    """Devuelve un resumen de cuántas veces se activó cada guardrail.

    Las estadísticas incluyen:
    - ``total_events``: número total de eventos registrados
    - ``by_type``: desglose por tipo de guardrail (input, output, content_isolation, instruction_rejection)
    - ``by_category``: desglose por categoría (structural, content, security)
    - ``detail``: contadores detallados por combinación tipo:categoría
    - ``from_log_file``: contadores leídos del archivo de log persistente
    """
    try:
        return guardrails_summary()
    except Exception as exc:
        logger.exception("Error al obtener resumen de guardrails")
        return {
            "error": str(exc),
            "total_events": -1,
            "by_type": {},
            "by_category": {},
            "detail": {},
            "from_log_file": {},
            "timestamp": None,
        }
