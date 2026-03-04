from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sse_event(event_type: str, payload: dict[str, Any]) -> bytes:
    wire = f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"
    return wire.encode("utf-8")

