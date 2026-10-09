from __future__ import annotations

import logging
import sys
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# El pipeline está fuera de services/api en el monorepo y se copia bajo
# /app/data/pipelines en la imagen de producción.
_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from graph.workflow import graph  # noqa: E402
from graph.tracing import finish_trace, read_trace, start_trace  # noqa: E402

logger = logging.getLogger("api.knowledge")
router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class KnowledgeQueryRequest(BaseModel):
    question: str = Field(min_length=1)


class KnowledgeQueryResponse(BaseModel):
    answer: str
    trace_id: str


@router.post("/query", response_model=KnowledgeQueryResponse)
def knowledge_query(payload: KnowledgeQueryRequest) -> KnowledgeQueryResponse:
    """Devuelve exclusivamente la respuesta generada para la pregunta."""
    try:
        # Cada petición tiene su propio hilo para que el checkpointer de
        # LangGraph no mezcle el estado de consultas distintas.
        trace_id = str(uuid.uuid4())
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
        finish_trace(trace_id, result["answer"])
        return KnowledgeQueryResponse(answer=result["answer"], trace_id=trace_id)
    except Exception as exc:
        logger.exception("Error al consultar la base de conocimiento")
        raise HTTPException(status_code=502, detail="No se pudo consultar la base de conocimiento.") from exc


@router.get("/traces/{trace_id}")
def knowledge_trace(trace_id: str) -> dict[str, object]:
    try:
        return {"trace_id": trace_id, "events": read_trace(trace_id)}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Trace no encontrado.") from exc
