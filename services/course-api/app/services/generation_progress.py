from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any


class GenerationProgressStore:
    def __init__(self) -> None:
        self._records: dict[str, dict[str, Any]] = {}

    def start(self, generation_id: str) -> None:
        self._prune_finished_records()
        self._records[generation_id] = {
            "status": "running",
            "startedAt": datetime.now(timezone.utc).isoformat(),
            "finishedAt": None,
            "revision": 0,
            "events": [],
        }

    def record_activity(self, generation_id: str, activity: dict[str, Any]) -> None:
        record = self._records.get(generation_id)
        if record is None:
            return
        record["revision"] += 1
        record["events"].append(
            {
                "revision": record["revision"],
                "activity": deepcopy(activity),
            }
        )

    def finish(self, generation_id: str, status: str) -> None:
        record = self._records.get(generation_id)
        if record is None:
            return
        record["status"] = status
        record["finishedAt"] = datetime.now(timezone.utc).isoformat()

    def get(self, generation_id: str, after: int = 0) -> dict[str, Any] | None:
        record = self._records.get(generation_id)
        if record is None:
            return None
        return {
            "status": record["status"],
            "startedAt": record["startedAt"],
            "finishedAt": record["finishedAt"],
            "revision": record["revision"],
            "events": [
                deepcopy(event)
                for event in record["events"]
                if event["revision"] > after
            ],
        }

    def _prune_finished_records(self) -> None:
        expiration = datetime.now(timezone.utc) - timedelta(hours=1)
        expired = [
            generation_id
            for generation_id, record in self._records.items()
            if record["finishedAt"] is not None
            and datetime.fromisoformat(record["finishedAt"]) < expiration
        ]
        for generation_id in expired:
            del self._records[generation_id]
