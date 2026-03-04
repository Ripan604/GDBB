from __future__ import annotations

GDBB_STATS = {
    "avg_optimality_gap": "0.24%",
    "nodes_pruned": "91.7%",
    "speedup_vs_cplex": "47-83%",
    "speedup_vs_metaheuristics": "12-31%",
    "benchmark_instances": 5400,
    "benchmark_classes": 12,
    "n_range": "50 to 10,000",
}

BENCHMARK_ROWS = [
    {"algorithm": "GDBB", "domain": "CVRP", "gap": 0.24, "time_s": 22.3, "nodes_pruned_pct": 91.7},
    {"algorithm": "CPLEX", "domain": "CVRP", "gap": 2.32, "time_s": 598.2, "nodes_pruned_pct": 37.2},
    {"algorithm": "Gurobi", "domain": "CVRP", "gap": 1.91, "time_s": 471.0, "nodes_pruned_pct": 44.3},
]

LEADERBOARD = [
    {"nickname": "cosmic-greedy", "gap": 0.0032, "runtime_ms": 25210},
    {"nickname": "dp-sigma", "gap": 0.0041, "runtime_ms": 28340},
    {"nickname": "bound-hunter", "gap": 0.0054, "runtime_ms": 30124},
]

