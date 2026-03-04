from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    res = client.get('/health')
    assert res.status_code == 200
    assert res.json()['status'] == 'ok'
    assert 'x-request-id' in res.headers


def test_benchmarks():
    res = client.get('/benchmarks/all')
    assert res.status_code == 200
    payload = res.json()
    assert 'stats' in payload
    assert 'records' in payload


def test_ml_predict():
    res = client.post(
        '/ml/predict-branch-variable',
        json={
            'node_features': [[0.9, 1.0], [0.3, 2.0], [0.5, 1.2]],
            'edge_index': [[0, 1], [1, 2]],
            'edge_attr': [[1.0], [0.8]],
        },
    )
    assert res.status_code == 200
    assert res.json()['variable_rankings'][0] == 0


