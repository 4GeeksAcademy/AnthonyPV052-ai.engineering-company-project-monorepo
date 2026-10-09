from __future__ import annotations

import logging
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# El pipeline está fuera de services/api en el monorepo y se copia bajo
# /app/data/pipelines en la imagen de producción.
_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from data.pipelines.rag import query  # noqa: E402

logger = logging.getLogger("api.knowledge")
router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class KnowledgeQueryRequest(BaseModel):
    question: str = Field(min_length=1)


class KnowledgeQueryResponse(BaseModel):
    answer: str


@router.post("/query", response_model=KnowledgeQueryResponse)
def knowledge_query(payload: KnowledgeQueryRequest) -> KnowledgeQueryResponse:
    """Devuelve exclusivamente la respuesta generada para la pregunta."""
    try:
        return KnowledgeQueryResponse(answer=query(payload.question))
    except Exception as exc:
        logger.exception("Error al consultar la base de conocimiento")
        raise HTTPException(status_code=502, detail="No se pudo consultar la base de conocimiento.") from exc
