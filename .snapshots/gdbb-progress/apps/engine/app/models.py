from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any, Literal


ProblemType = Literal["CVRP", "SCHEDULING", "PORTFOLIO", "ROUTING"]
PhaseName = Literal["GREEDY", "DP", "BB"]


class CustomerNode(BaseModel):
    id: str
    x: float
    y: float
    demand: float = Field(ge=0)


class CvrpRequest(BaseModel):
    problem_type: Literal["CVRP"] = "CVRP"
    nodes: list[CustomerNode]
    vehicles: int = Field(gt=0)
    capacity: float = Field(gt=0)
    epsilon: float = Field(default=0.01, gt=0, le=0.2)
    alpha: float = 1.0
    beta: float = 1.0
    gamma: float = 1.0
    stream: bool = True


class MockSolveRequest(BaseModel):
    problem_type: Literal["SCHEDULING", "PORTFOLIO", "ROUTING"]
    epsilon: float = Field(default=0.01, gt=0, le=0.2)
    stream: bool = True
    payload: dict[str, Any] = Field(default_factory=dict)


class BranchState(BaseModel):
    node_features: list[list[float]] = Field(default_factory=list)
    edge_index: list[list[int]] = Field(default_factory=list)
    edge_attr: list[list[float]] = Field(default_factory=list)


class Bounds(BaseModel):
    ub: float
    lb: float
    gap: float


class SigmaEntry(BaseModel):
    key: str
    lb: float
    ub: float
    confidence: float = 1.0

