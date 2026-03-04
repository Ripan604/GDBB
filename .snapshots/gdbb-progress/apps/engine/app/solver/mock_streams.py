from __future__ import annotations

import asyncio
import uuid

from app.sse import now_iso, sse_event


async def mock_domain_stream(domain: str, epsilon: float):
    job_id = str(uuid.uuid4())
    ub = 300.0
    lb = 210.0

    def base():
        return {"job_id": job_id, "ts": now_iso(), "domain": domain}

    for phase in ("GREEDY", "DP", "BB"):
        yield sse_event(
            "phase_start",
            {
                **base(),
                "type": "phase_start",
                "phase": phase,
                "message": f"{domain} {phase} phase",
            },
        )
        await asyncio.sleep(0.05)

        for p in (0.2, 0.5, 0.8, 1.0):
            ub *= 0.985
            lb = min(ub * (1 - epsilon * 0.7), lb + (ub - lb) * 0.18)
            yield sse_event(
                "phase_progress",
                {
                    **base(),
                    "type": "phase_progress",
                    "phase": phase,
                    "progress": p,
                    "bounds": {"ub": ub, "lb": lb, "gap": max(0.0, (ub - lb) / ub)},
                },
            )
            await asyncio.sleep(0.04)

        yield sse_event(
            "phase_complete",
            {
                **base(),
                "type": "phase_complete",
                "phase": phase,
                "bounds": {"ub": ub, "lb": lb, "gap": max(0.0, (ub - lb) / ub)},
                "metrics": {"mock": 1.0},
            },
        )

    yield sse_event(
        "complete",
        {
            **base(),
            "type": "complete",
            "bounds": {"ub": ub, "lb": lb, "gap": max(0.0, (ub - lb) / ub)},
            "solution": {"status": "mock-solution", "domain": domain},
            "runtime_ms": 19400,
        },
    )

