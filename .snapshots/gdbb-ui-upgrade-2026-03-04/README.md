# GDBB Research Platform Monorepo

This repository contains the phased MVP scaffolding for the GDBB interactive platform.

## Workspace Structure

- `apps/web` - Next.js 14 frontend (3D, demos, charts, chatbot UI/API routes)
- `apps/engine` - FastAPI solver service (streaming CVRP + mock domain streams)
- `apps/worker` - BullMQ worker for async heavy jobs
- `packages/contracts` - shared TypeScript contracts and schemas
- `packages/ui` - reusable UI primitives

## Quick Start

### Requirements

- Node.js 20+
- pnpm 10+
- Python 3.11+

### Install

```bash
pnpm install
```

### Run

```bash
pnpm dev
```

Frontend: `http://localhost:3000`
Engine: `http://localhost:8000`

### Engine only

```bash
cd apps/engine
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -e .[dev]
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

See `.env.example` files in each app.

## Chat Model Provider

The chat API can use any of these providers:

- `OPENAI_API_KEY` (+ optional `OPENAI_MODEL`, default `gpt-4o-mini`)
- `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`)
- Local Ollama via `OLLAMA_BASE_URL` and `OLLAMA_MODEL`
