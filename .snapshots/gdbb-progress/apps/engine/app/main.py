from __future__ import annotations

import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.benchmarks import BENCHMARK_ROWS, GDBB_STATS, LEADERBOARD
from app.models import BranchState, CvrpRequest, MockSolveRequest
from app.solver.cvrp_solver import CvrpSolver
from app.solver.mock_streams import mock_domain_stream
from app.store import sigma_store

app = FastAPI(title="GDBB Engine API", version="0.1.0")


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response


app.add_middleware(RequestIdMiddleware)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gdbb-engine"}


@app.post("/solve/cvrp")
async def solve_cvrp(request: CvrpRequest):
    solver = CvrpSolver(request)
    return StreamingResponse(solver.solve_stream(), media_type="text/event-stream")


@app.post("/solve/scheduling")
async def solve_scheduling(request: MockSolveRequest):
    return StreamingResponse(mock_domain_stream("SCHEDULING", request.epsilon), media_type="text/event-stream")


@app.post("/solve/portfolio")
async def solve_portfolio(request: MockSolveRequest):
    return StreamingResponse(mock_domain_stream("PORTFOLIO", request.epsilon), media_type="text/event-stream")


@app.post("/solve/routing")
async def solve_routing(request: MockSolveRequest):
    return StreamingResponse(mock_domain_stream("ROUTING", request.epsilon), media_type="text/event-stream")


@app.get("/sigma/snapshot/{job_id}")
async def get_sigma_snapshot(job_id: str):
    snapshot = sigma_store.get(job_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="snapshot not found")
    return snapshot


@app.get("/benchmarks/all")
async def get_benchmark_results():
    return {
        "stats": GDBB_STATS,
        "records": BENCHMARK_ROWS,
        "leaderboard": LEADERBOARD,
    }


@app.post("/ml/predict-branch-variable")
async def predict_branch_variable(state: BranchState):
    # MVP fallback heuristic: rank by first feature descending.
    if not state.node_features:
        return {"variable_rankings": [], "confidence": 0.0, "source": "heuristic-fallback"}

    scored = sorted(
        enumerate(state.node_features),
        key=lambda item: item[1][0] if item[1] else 0,
        reverse=True,
    )
    rankings = [idx for idx, _ in scored]
    return {"variable_rankings": rankings, "confidence": 0.61, "source": "heuristic-fallback"}


