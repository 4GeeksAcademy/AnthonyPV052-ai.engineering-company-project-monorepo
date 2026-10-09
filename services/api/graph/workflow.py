from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver

from graph.state import AgentState
from graph.nodes import (
    retrieve_node,
    generate_node,
    no_context_node,
)
from graph.routing import route_context

builder = StateGraph(AgentState)

builder.add_node("retrieve", retrieve_node)
builder.add_node("generate", generate_node)
builder.add_node("no_context", no_context_node)

builder.add_edge(START, "retrieve")

builder.add_conditional_edges(
"retrieve",
route_context,
{
"generate": "generate",
"no_context": "no_context"
}
)

builder.add_edge("generate", END)
builder.add_edge("no_context", END)

try:
    # La compilación ocurre al importar el servicio y valida la estructura
    # antes de permitir cualquier ejecución.
    graph = builder.compile(checkpointer=MemorySaver())
except Exception as exc:
    raise RuntimeError(f"Error estructural al compilar el grafo del agente: {exc}") from exc