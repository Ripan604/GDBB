from __future__ import annotations

from pathlib import Path


def ingest_pdf_placeholder(path: str) -> dict[str, str]:
    pdf_path = Path(path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"Paper PDF not found: {pdf_path}")

    return {
        "status": "pending_manual_parser",
        "path": str(pdf_path),
        "note": "Replace this placeholder with real PDF chunking + embeddings pipeline.",
    }

