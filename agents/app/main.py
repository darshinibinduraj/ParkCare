import asyncio
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import StreamingResponse

from app.runner import AGENTS, run_local, slim_enabled

SLIM_URL = os.environ.get("SLIM_URL", "http://127.0.0.1:46357")


@asynccontextmanager
async def lifespan(app: FastAPI):
    processes = []
    if slim_enabled():
        for name in AGENTS:
            processes.append(
                await asyncio.create_subprocess_exec(
                    sys.executable,
                    "-m",
                    "app.a2a_server",
                    "--name",
                    name,
                    "--slim-url",
                    SLIM_URL,
                    cwd=os.path.dirname(os.path.dirname(__file__)),
                )
            )
        await asyncio.sleep(1.5)
    yield
    for process in processes:
        process.terminate()


app = FastAPI(title="ParkCare agents", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "slim": slim_enabled(), "slimUrl": SLIM_URL}


@app.post("/run")
async def run(body: dict) -> dict:
    if slim_enabled():
        try:
            from app.a2a_client import run_slim

            return await run_slim(body)
        except Exception as exc:
            result = await asyncio.to_thread(run_local, body)
            result["slimError"] = exc.__class__.__name__
            return result
    return await asyncio.to_thread(run_local, body)


@app.post("/run/stream")
async def run_stream(body: dict) -> StreamingResponse:
    async def events():
        yield _event("progress", "Medical helper is reading the story.")
        yield _event("progress", "Equipment helper is reading the story.")
        yield _event("progress", "Caregiver helper is reading the story.")
        yield _event("progress", "The helpers are exchanging notes.")
        result = await run(body)
        transport = result.get("transport")
        if transport == "slim":
            yield _event("progress", "Notes were sent with A2A over SLIM.")
        else:
            yield _event("progress", "SLIM was not used. The helpers exchanged the same notes in the orchestrator.")
        yield _event("result", result)

    return StreamingResponse(events(), media_type="text/event-stream")


def _event(name: str, data) -> str:
    import json

    payload = data if isinstance(data, str) else json.dumps(data)
    return f"event: {name}\ndata: {payload}\n\n"
