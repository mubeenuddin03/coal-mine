import requests

BASE = 'http://127.0.0.1:8000'

# Check current status
resp = requests.get(f'{BASE}/api/nodes')
print('Current nodes:')
for n in resp.json():
    print(f'  {n["node_id"]}: online={n["online"]}, last_seen_seconds={n["last_seen_seconds"]}, status={n["status"]}')

resp = requests.get(f'{BASE}/api/nodes/node-baseline/status')
json_data = resp.json()
print(f'Node baseline status: online={json_data["online"]}, last_seen_seconds={json_data["last_seen_seconds"]}, status={json_data["status"]}')