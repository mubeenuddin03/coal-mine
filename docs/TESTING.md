# Testing & Validation Guide

This document explains the test suites, verification scripts, and procedures used to validate the backend API endpoints, risk engine logic, and end-to-end data pipelines.

---

## 1. Overview of Test Scripts

| Test File | Target Scope | Description |
| :--- | :--- | :--- |
| `test_api.py` | Core API & Baselines | Verifies node listing, database cleanup (`/api/admin/clear`), and baseline calculation on sample telemetry. |
| `test_scenario.py` | Multi-Node Ingestion | Simulates sequential telemetry streams from Node 1 and Node 2, checks status transitions, and sets baselines. |
| `test_scenario2.py` | Dynamic Displacement | Tests incrementally increasing ground displacement on Node 2 and validates threshold calculations. |
| `test_status.py` | Heartbeat & Status | Verifies the node status polling endpoint (`/api/nodes/{id}/status`), online/offline watchdog flags, and age tracking. |
| `scripts/mock_sender.py`| Escalation Simulator | Asynchronously streams data for both nodes with an optional `--simulate-escalation` flag to verify `NORMAL` -> `WARNING` -> `CRITICAL` risk escalation. |

---

## 2. Test Execution Instructions

### Prerequisites
Make sure the FastAPI backend is running locally before executing the HTTP test scripts:

```bash
# In Terminal 1 (Software root):
uvicorn app.main:app --reload
```

---

### 2.1 Basic API and Baseline Test (`test_api.py`)
```bash
python test_api.py
```
**Expected Behavior:**
1. Connects to `http://127.0.0.1:8000/api/nodes` and prints initial node states.
2. Clears previous runtime records via `POST /api/admin/clear`.
3. Ingests sample readings for `node-baseline` and `node-deformation`.
4. Computes baseline averages via `POST /api/baseline`.
5. Confirms nodes report `NORMAL` status with calculated baselines.

---

### 2.2 Telemetry Streaming Test (`test_scenario.py`)
```bash
python test_scenario.py
```
**Expected Behavior:**
1. Streams 5 consecutive readings for `node-baseline` (Node 1) with 2-second delays.
2. Streams 5 consecutive readings for `node-deformation` (Node 2) with 2-second delays.
3. Retrieves node status list to ensure both nodes are reported `online: True`.
4. Sets the baseline and confirms updated baseline status responses.

---

### 2.3 Incremental Displacement Test (`test_scenario2.py`)
```bash
python test_scenario2.py
```
**Expected Behavior:**
1. Clears existing test database records.
2. Streams stepped tilt values for `node-baseline`.
3. Streams increasing displacement values (`0.0 cm` -> `0.4 cm`) for `node-deformation`.
4. Tests baseline calculation and verifies risk engine evaluations against previous intervals.

---

### 2.4 Heartbeat Watchdog Test (`test_status.py`)
```bash
python test_status.py
```
**Expected Behavior:**
1. Queries the `/api/nodes` summary and `/api/nodes/node-baseline/status` endpoint.
2. Returns node health metrics including `online: True/False` and `last_seen_seconds`.
3. If no reading was sent in the last 6 seconds, the node status correctly flips to `OFFLINE`.

---

### 2.5 Risk Engine Escalation Verification (`scripts/mock_sender.py`)
```bash
python scripts/mock_sender.py --simulate-escalation
```
**Expected Behavior:**
1. Ingests steady baseline telemetry for Node 1.
2. Ingests escalating displacement readings for Node 2.
3. After 5 intervals, flags `crack_state = True`.
4. Verifies that backend status escalates from `NORMAL` -> `WARNING` -> `CRITICAL`.
