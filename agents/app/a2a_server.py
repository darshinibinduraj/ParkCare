"""A2A server for one ParkCare helper, addressed on SLIM as agntcy/parkcare/<name>."""

import argparse
import asyncio
import contextlib
import json
import logging

import slim_bindings
from a2a.helpers import new_task_from_user_message
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.server.tasks.task_updater import TaskUpdater
from a2a.types import Message, Part, Role
from a2a.types.a2a_pb2 import AgentCapabilities, AgentCard, AgentInterface, AgentSkill

from slima2a import setup_slim_client
from slima2a.handler import SRPCHandler
from slima2a.types.v1.a2a_pb2_slimrpc import add_A2AServiceServicer_to_server

from app.runner import invoke

SECRET = "secretsecretsecretsecretsecretsecret"


class ParkCareExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        if not context.message or not context.message.parts:
            raise RuntimeError("invalid message")
        task = context.current_task or new_task_from_user_message(context.message)
        if context.current_task is None:
            await event_queue.enqueue_event(task)
        updater = TaskUpdater(event_queue=event_queue, task_id=task.id, context_id=task.context_id)
        if context.message.parts[0].WhichOneof("content") != "text":
            raise RuntimeError("only text parts are supported")
        payload = json.loads(context.message.parts[0].text)
        result = await asyncio.to_thread(invoke, payload)
        response = Message(
            role=Role.ROLE_AGENT,
            message_id=context.message.message_id,
            parts=[Part(text=json.dumps(result))],
        )
        await updater.add_artifact(parts=list(response.parts), name="findings")
        await updater.complete(message=response)

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise NotImplementedError("cancel not supported")


def card_for(name: str) -> AgentCard:
    skill = AgentSkill(
        id="care_findings",
        name="Care findings",
        description="Returns ParkCare findings JSON for one helper.",
        tags=["parkcare", name],
        examples=["Share findings for this profile"],
    )
    return AgentCard(
        name=name,
        description=f"ParkCare {name} speaking A2A over SLIM.",
        supported_interfaces=[
            AgentInterface(url=f"slim://localhost:46357/agntcy/parkcare/{name}", protocol_binding="slimrpc")
        ],
        version="1.0.0",
        default_input_modes=["text"],
        default_output_modes=["text"],
        capabilities=AgentCapabilities(streaming=True),
        skills=[skill],
    )


async def serve(name: str, slim_url: str) -> None:
    handler = DefaultRequestHandler(
        agent_executor=ParkCareExecutor(),
        task_store=InMemoryTaskStore(),
        agent_card=card_for(name),
    )
    _service, local_app, local_name, conn_id = await setup_slim_client(
        namespace="agntcy",
        group="parkcare",
        name=name,
        slim_url=slim_url,
        secret=SECRET,
        log_level="error",
    )
    server = slim_bindings.Server.new_with_connection(local_app, local_name, conn_id)
    add_A2AServiceServicer_to_server(SRPCHandler(card_for(name), handler), server)
    await server.serve_async()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True, choices=["medical_agent", "equipment_agent", "caregiver_agent"])
    parser.add_argument("--slim-url", default="http://127.0.0.1:46357")
    args = parser.parse_args()
    logging.basicConfig(level=logging.ERROR)
    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(serve(args.name, args.slim_url))


if __name__ == "__main__":
    main()
