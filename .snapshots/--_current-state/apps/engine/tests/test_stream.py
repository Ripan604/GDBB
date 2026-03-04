from fastapi.testclient import TestClient

from app.main import app


def test_cvrp_stream_starts():
    client = TestClient(app)
    payload = {
        'problem_type': 'CVRP',
        'nodes': [
            {'id': 'n1', 'x': 10, 'y': 10, 'demand': 2},
            {'id': 'n2', 'x': 20, 'y': 20, 'demand': 3},
        ],
        'vehicles': 2,
        'capacity': 10,
        'epsilon': 0.01,
        'stream': True,
    }

    with client.stream('POST', '/solve/cvrp', json=payload) as response:
        assert response.status_code == 200
        chunk = next(response.iter_text())
        assert 'event:' in chunk
        assert 'phase_start' in chunk

