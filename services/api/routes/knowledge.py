from __future__ import annotations

import logging
import time
import sys
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# La API y el grafo se ejecutan juntos en services/api (localmente) y se
# copian juntos a /app en la imagen de Docker.
_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from graph.workflow import graph  # noqa: E402
from graph.tracing import actual_sources, finish_trace, read_trace, start_trace  # noqa: E402

logger = logging.getLogger("api.knowledge")
router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class KnowledgeQueryRequest(BaseModel):
    question: str = Field(min_length=1)


class KnowledgeQueryResponse(BaseModel):
    answer: str
    trace_id: str
    sources: list[str]
    execution_order: list[str]


@router.post("/query", response_model=KnowledgeQueryResponse)
def knowledge_query(payload: KnowledgeQueryRequest) -> KnowledgeQueryResponse:
    """Devuelve respuesta, fuentes utilizadas y el orden de ejecución del agente."""
    started_at = time.perf_counter()
    trace_id = str(uuid.uuid4())
    try:
        # Cada petición tiene su propio hilo para que el checkpointer de
        # LangGraph no mezcle el estado de consultas distintas.
        start_trace(trace_id, payload.question)
        result = graph.invoke(
            {
                "question": payload.question,
                "context": [],
                "answer": "",
                "trace_id": trace_id,
            },
            config={"configurable": {"thread_id": trace_id}},
        )
        events = read_trace(trace_id)
        execution_order = [
            event.get("node")
            for event in events
            if event.get("event") == "node_completed"
        ]
        sources = actual_sources(events)
        finish_trace(
            trace_id,
            result["answer"],
            sources=sources,
            execution_order=execution_order,
        )
        return KnowledgeQueryResponse(
            answer=result["answer"],
            trace_id=trace_id,
            sources=sources,
            execution_order=execution_order,
        )
    except Exception as exc:
        logger.exception(
            "Error ejecutando agente de soporte trace_id=%s elapsed_ms=%.1f",
            trace_id,
            (time.perf_counter() - started_at) * 1000,
        )
        raise HTTPException(status_code=502, detail="No se pudo consultar la base de conocimiento.") from exc


@router.get("/traces/{trace_id}")
def knowledge_trace(trace_id: str) -> dict[str, object]:
    try:
        return {"trace_id": trace_id, "events": read_trace(trace_id)}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Trace no encontrado.") from exc
