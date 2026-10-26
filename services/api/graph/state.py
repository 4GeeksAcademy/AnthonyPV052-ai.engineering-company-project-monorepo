from typing import NotRequired, TypedDict


class AgentState(TypedDict):
	question: str
	context: list[dict[str, object]]
	answer: str
	trace_id: str
	sources: NotRequired[list[str]]
	route: NotRequired[str]
	incident_id: NotRequired[str | None]
	incident: NotRequired[dict[str, object] | None]
	incident_error: NotRequired[str | None]
	incidents: NotRequired[list[dict[str, object]]]
	incidents_truncated: NotRequired[bool]
	retrieval_error: NotRequired[str | None]