import requests
import time

BASE = 'http://127.0.0.1:8000'

# Send 5 readings for node-baseline (node 1)
for i in range(5):
    resp = requests.post(f'{BASE}/api/readings', json={
        'node_id': 'node-baseline',
        'tilt_x': -12.5,
        'tilt_y': 3.2,
        'vibration': False,
    })
    print(f'Node1 send {i+1}: {resp.json()["status"]}')
    time.sleep(2)

# Send 5 readings for node-deformation (node 2) - normal
for i in range(5):
    resp = requests.post(f'{BASE}/api/readings', json={
        'node_id': 'node-deformation',
        'tilt_x': -15.3,
        'tilt_y': 5.7,
        'vibration': False,
        'distance_cm': 12.5,
        'displacement_cm': 0.0,
        'crack_state': False,
    })
    print(f'Node2 send {i+1}: {resp.json()["status"]}')
    time.sleep(2)

# Check statuses
resp = requests.get(f'{BASE}/api/nodes')
print('Node statuses after sending readings:')
for n in resp.json():
    print(f'  {n["node_id"]}: online={n["online"]}, last_seen_seconds={n["last_seen_seconds"]}, status={n["status"]}')

# Test baseline
resp = requests.post(f'{BASE}/api/baseline')
print(f'\\nBaseline set: {resp.json()}')

# Check statuses after baseline
resp = requests.get(f'{BASE}/api/nodes')
print('Node statuses after baseline:')
for n in resp.json():
    print(f'  {n["node_id"]}: online={n["online"]}, last_seen_seconds={n["last_seen_seconds"]}, status={n["status"]}')