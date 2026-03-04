from __future__ import annotations

from threading import Lock
from typing import Any


class SigmaStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._snapshots: dict[str, dict[str, Any]] = {}

    def put(self, job_id: str, snapshot: dict[str, Any]) -> None:
        with self._lock:
            self._snapshots[job_id] = snapshot

    def get(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._snapshots.get(job_id)


sigma_store = SigmaStore()

