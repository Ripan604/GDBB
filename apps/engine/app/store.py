from __future__ import annotations

from copy import deepcopy
from typing import Any


class SigmaStore:
    def __init__(self) -> None:
        self._snapshots: dict[str, dict[str, Any]] = {}

    def put(self, job_id: str, snapshot: dict[str, Any]) -> None:
        # The store is single-process in this MVP. We keep writes as atomic dict
        # assignments so concurrent readers do not queue behind a global mutex.
        self._snapshots[job_id] = deepcopy(snapshot)

    def get(self, job_id: str) -> dict[str, Any] | None:
        snapshot = self._snapshots.get(job_id)
        return deepcopy(snapshot) if snapshot is not None else None


sigma_store = SigmaStore()

