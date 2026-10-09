from graph.state import AgentState


def route_context(state: AgentState):
	if state["context"]:
		return "generate"

	return "no_context"