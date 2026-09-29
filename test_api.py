import requests
import time

BASE = 'http://127.0.0.1:8000'

# Check current node statuses
resp = requests.get(f'{BASE}/api/nodes')
print('Current node statuses:')
for n in resp.json():
    print(f'  {n["node_id"]}: online={n["online"]}, last_seen_seconds={n["last_seen_seconds"]}, status={n["status"]}')

# Test Clear All Data
print()
print('After Clear All Data:')
resp = requests.post(f'{BASE}/api/admin/clear')
resp = requests.get(f'{BASE}/api/nodes')
for n in resp.json():
    print(f'  {n["node_id"]}: online={n["online"]}, status={n["status"]}')

# Test Set Baseline (needs readings first)
print()
print('After Set Baseline (no readings):')
resp = requests.post(f'{BASE}/api/baseline')
print(resp.json())

# Now add some readings and test baseline
print()
print('After adding readings and setting baseline:')
# Send a reading for node-baseline
resp = requests.post(f'{BASE}/api/readings', json={
    'node_id': 'node-baseline',
    'tilt_x': -12.5,
    'tilt_y': 3.2,
    'vibration': False,
})
print(f'Sent reading for node-baseline: {resp.json()["status"]}')

# Send a reading for node-deformation
resp = requests.post(f'{BASE}/api/readings', json={
    'node_id': 'node-deformation',
    'tilt_x': -15.3,
    'tilt_y': 5.7,
    'vibration': False,
    'distance_cm': 12.5,
    'displacement_cm': 0.0,
    'crack_state': False,
})
print(f'Sent reading for node-deformation: {resp.json()["status"]}')

# Now set baseline
time.sleep(1)
resp = requests.post(f'{BASE}/api/baseline')
print(f'Set baseline: {resp.json()}')

# Check statuses after baseline
resp = requests.get(f'{BASE}/api/nodes')
print('Node statuses after baseline:')
for n in resp.json():
    print(f'  {n["node_id"]}: online={n["online"]}, last_seen_seconds={n["last_seen_seconds"]}, status={n["status"]}')