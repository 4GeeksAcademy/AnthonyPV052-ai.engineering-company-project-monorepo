from typing import TypedDict


class AgentState(TypedDict):
	question: str
	context: list[dict[str, object]]
	answer: str
	trace_id: str