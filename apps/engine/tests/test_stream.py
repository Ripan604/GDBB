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
        chunks = []
        for idx, chunk in enumerate(response.iter_text()):
            chunks.append(chunk)
            joined = ''.join(chunks)
            if 'event: complete' in joined or idx >= 24:
                break

        joined = ''.join(chunks)
        assert 'event:' in joined
        assert 'phase_start' in joined
        assert 'sigma_snapshot' in joined
        assert '"impact"' in joined
        assert '"adaptive_epsilon"' in joined

