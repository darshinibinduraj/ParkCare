"""Orchestrator client. Sends each round to the three helpers over A2A/SLIM."""

import json
import os

import httpx
from a2a.client import minimal_agent_card
from a2a.helpers import new_text_message
from a2a.types.a2a_pb2 import Role, SendMessageRequest

from slima2a import setup_slim_client
from slima2a.client_transport import ClientConfig, MultiAgentClientFactory, slimrpc_channel_factory

from app.a2a_server import SECRET
from app.runner import AGENTS, AGENT_KEYS, _messages, agent_payload, invoke

SLIM_URL = os.environ.get("SLIM_URL", "http://127.0.0.1:46357")


async def _read_text(client, request) -> str:
    output = ""
    async for stream_response in client.send_message(request=request):
        which = stream_response.WhichOneof("payload")
        parts = []
        if which == "message":
            parts = stream_response.message.parts
        elif which == "task" and stream_response.task.artifacts:
            for artifact in stream_response.task.artifacts:
                parts.extend(artifact.parts)
        elif which == "artifact_update":
            parts = stream_response.artifact_update.artifact.parts
        for part in parts:
            if part.WhichOneof("content") == "text":
                output += part.text
    if not output:
        raise RuntimeError("empty A2A reply")
    return output


async def run_slim(body: dict) -> dict:
    _service, local_app, _local_name, conn_id = await setup_slim_client(
        namespace="agntcy",
        group="parkcare",
        name="orchestrator",
        slim_url=SLIM_URL,
        secret=SECRET,
        log_level="error",
    )
    httpx_client = httpx.AsyncClient()
    factory = MultiAgentClientFactory(
        ClientConfig(
            supported_protocol_bindings=["slimrpc"],
            streaming=True,
            httpx_client=httpx_client,
            slimrpc_channel_factory=slimrpc_channel_factory(local_app, conn_id),
        )
    )

    async def ask(agent: str, payload: dict) -> dict:
        card = minimal_agent_card(f"agntcy/parkcare/{agent}", ["slimrpc"])
        client = factory.create(card=[card])
        request = SendMessageRequest(message=new_text_message(json.dumps(payload), role=Role.ROLE_USER))
        return json.loads(await _read_text(client, request))

    round1 = {}
    for agent in AGENTS:
        round1[AGENT_KEYS[agent]] = await ask(agent, agent_payload(body, agent, 1, []))

    round2 = {}
    for agent in AGENTS:
        key = AGENT_KEYS[agent]
        others = [findings for name, findings in round1.items() if name != key]
        round2[key] = await ask(agent, agent_payload(body, agent, 2, others))

    plan = invoke(
        {
            "mode": "synthesize",
            "profile": body["profile"],
            "dataset": body["dataset"],
            "previous": body.get("previous"),
            "findings": round2,
        }
    )
    messages = []
    for key in ("medical", "equipment", "caregiver"):
        messages.extend(_messages(round1[key], 1))
        messages.extend(_messages(round2[key], 2))
    messages.append(
        {
            "sender": "synthesizer",
            "recipients": ["medical", "equipment", "caregiver"],
            "round": 3,
            "content": "I combined the notes the helpers exchanged over A2A into one ordered plan.",
        }
    )
    await httpx_client.aclose()
    return {"transport": "slim", "plan": plan, "messages": messages}
