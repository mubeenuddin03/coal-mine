import requests
import time

BASE = 'http://127.0.0.1:8000'

# Clear old data first
resp = requests.post(f'{BASE}/api/admin/clear')
print(f'Cleared: {resp.json()}')
time.sleep(1)

# Send 5 readings for node-baseline
for i in range(5):
    resp = requests.post(f'{BASE}/api/readings', json={
        'node_id': 'node-baseline',
        'tilt_x': -12.5 + i * 0.1,
        'tilt_y': 3.2,
        'vibration': False,
    })
    time.sleep(1)

# Send 5 readings for node-deformation  
for i in range(5):
    resp = requests.post(f'{BASE}/api/readings', json={
        'node_id': 'node-deformation',
        'tilt_x': -15.3,
        'tilt_y': 5.7,
        'vibration': False,
        'distance_cm': 12.5,
        'displacement_cm': round(i * 0.1, 1),
        'crack_state': False,
    })
    time.sleep(1)

# Check statuses
resp = requests.get(f'{BASE}/api/nodes')
print('Node statuses:')
for n in resp.json():
    print(f'  {n["node_id"]}: online={n["online"]}, last_seen={n["last_seen_seconds"]}, status={n["status"]}')

# Set baseline
resp = requests.post(f'{BASE}/api/baseline')
print(f'\\nBaseline: {resp.json()}')

# Check statuses after baseline
resp = requests.get(f'{BASE}/api/nodes')
print('Node statuses after baseline:')
for n in resp.json():
    print(f'  {n["node_id"]}: online={n["online"]}, last_seen={n["last_seen_seconds"]}, status={n["status"]}')