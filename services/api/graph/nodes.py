from graph.state import AgentState
from graph.tracing import record_node

from data.pipelines.rag import (
retrieve,
generate_answer,
DEFAULT_MIN_SCORE,
)


def retrieve_node(state: AgentState) -> dict[str, object]:
    context = retrieve(
        state["question"],
        min_score=DEFAULT_MIN_SCORE,
    )

    output = {"context": context}
    record_node(state, "retrieve", output)
    return output


def generate_node(state: AgentState) -> dict[str, object]:
    answer = generate_answer(
        state["question"],
        state["context"],
    )

    output = {
        "answer": answer,
    }
    record_node(state, "generate", output)
    return output


def no_context_node(state: AgentState) -> dict[str, object]:
    output = {
        "answer": (
            "No encontré información suficiente "
            "en la base de conocimiento de Brasaland."
        ),
    }
    record_node(state, "no_context", output)
    return output