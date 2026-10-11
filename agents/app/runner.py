import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AGENTS = [
    "medical_agent",
    "equipment_agent",
    "caregiver_agent",
]
AGENT_KEYS = {
    "medical_agent": "medical",
    "equipment_agent": "equipment",
    "caregiver_agent": "caregiver",
}


def invoke(payload: dict) -> dict:
    completed = subprocess.run(
        ["pnpm", "exec", "tsx", "src/lib/agents/invoke.ts"],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=False,
    )
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "invoke failed").strip()
        raise RuntimeError(detail[-2000:])
    return json.loads(completed.stdout)


def run_local(body: dict) -> dict:
    result = invoke(
        {
            "mode": "plan",
            "profile": body["profile"],
            "dataset": body["dataset"],
            "previous": body.get("previous"),
        }
    )
    return {
        "transport": "local-fallback",
        "plan": result["plan"],
        "messages": result["messages"],
    }


def _messages(findings: dict, round_number: int) -> list[dict]:
    others = [name for name in ("medical", "equipment", "caregiver") if name != findings["agent"]]
    if round_number == 1:
        return [
            {
                "sender": findings["agent"],
                "recipients": others,
                "round": 1,
                "content": " ".join(findings["keyFindings"]),
            }
        ]
    messages = []
    for flag in findings["flagsForOtherAgents"]:
        messages.append(
            {
                "sender": findings["agent"],
                "recipients": others if flag["to"] == "all" else [flag["to"]],
                "round": 2,
                "content": flag["message"],
            }
        )
    return messages


def agent_payload(body: dict, agent: str, round_number: int, others: list[dict]) -> dict:
    return {
        "mode": "agent",
        "agent": AGENT_KEYS[agent],
        "round": round_number,
        "profile": body["profile"],
        "dataset": body["dataset"],
        "others": others,
    }


def slim_enabled() -> bool:
    return os.environ.get("PARKCARE_SLIM", "").lower() in {"1", "true", "yes"}
