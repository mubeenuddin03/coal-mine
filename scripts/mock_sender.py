import asyncio
import json
import random
import sys
import argparse
from datetime import datetime, timedelta

import httpx


BASE_URL = "http://127.0.0.1:8000"

node1_readings = [
    {"tilt_x": -12.5, "tilt_y": 3.2, "vibration": False},
    {"tilt_x": -11.8, "tilt_y": 2.9, "vibration": False},
    {"tilt_x": -13.1, "tilt_y": 4.1, "vibration": False},
    {"tilt_x": -12.2, "tilt_y": 3.5, "vibration": True},
    {"tilt_x": -11.5, "tilt_y": 3.0, "vibration": False},
]

node2_base_readings = [
    {"tilt_x": -15.3, "tilt_y": 5.7, "vibration": False, "distance_cm": 12.5, "displacement_cm": 0.0, "crack_state": False},
    {"tilt_x": -14.8, "tilt_y": 5.2, "vibration": False, "distance_cm": 11.8, "displacement_cm": 0.0, "crack_state": False},
    {"tilt_x": -16.1, "tilt_y": 6.2, "vibration": True, "distance_cm": 9.2, "displacement_cm": 0.0, "crack_state": False},
    {"tilt_x": -15.0, "tilt_y": 5.5, "vibration": False, "distance_cm": 13.1, "displacement_cm": 0.0, "crack_state": False},
    {"tilt_x": -14.2, "tilt_y": 4.9, "vibration": False, "distance_cm": 10.8, "displacement_cm": 0.0, "crack_state": False},
]


def parse_args():
    parser = argparse.ArgumentParser(description="Mock sender for SIH26025 backend")
    parser.add_argument(
        "--simulate-escalation",
        action="store_true",
        help="Gradually increase Node 2 displacement_cm and set crack_state=True over ~20 sends to demonstrate NORMAL→WARNING→CRITICAL",
    )
    return parser.parse_args()


async def send_node1_readings(async_client, send_count):
    for i in range(send_count):
        now = datetime.utcnow()
        tilt = random.choice(node1_readings)
        payload = {
            "node_id": "node-baseline",
            "timestamp": now.isoformat(),
            "tilt_x": tilt["tilt_x"],
            "tilt_y": tilt["tilt_y"],
            "vibration": tilt["vibration"],
        }
        try:
            resp = await async_client.post(f"{BASE_URL}/api/readings", json=payload)
            print(f"Node1 send {i+1}/{send_count}: {payload} -> {resp.status_code}")
        except Exception as e:
            print(f"Node1 error: {e}")
        await asyncio.sleep(2)


async def send_node2_escalation(async_client, send_count, escalation_steps=20):
    """Send Node 2 readings with gradually increasing displacement_cm and eventual crack_state=True.

    Over ~20 sends:
    - displacement_cm starts at 0.0 and increases by 0.1 per send
    - After ESCALATION_STEP_THRESHOLD sends, crack_state flips to True
    - This triggers NORMAL → WARNING → CRITICAL via the risk engine
    """
    ESCALATION_STEP_THRESHOLD = 5  # set crack_state after 5 sends

    for i in range(send_count):
        now = datetime.utcnow()
        # Gradually increase displacement_cm: 0.0, 0.1, 0.2, ...
        disp = round(i * 0.1, 1)
        # After threshold sends, set crack_state to True
        crack = i >= ESCALATION_STEP_THRESHOLD

        tilt = random.choice(node2_base_readings)
        payload = {
            "node_id": "node-deformation",
            "timestamp": now.isoformat(),
            "tilt_x": tilt["tilt_x"],
            "tilt_y": tilt["tilt_y"],
            "vibration": tilt["vibration"],
            "distance_cm": tilt["distance_cm"],
            "displacement_cm": disp,
            "crack_state": crack,
        }
        try:
            resp = await async_client.post(f"{BASE_URL}/api/readings", json=payload)
            print(
                f"Node2 escalation send {i+1}/{send_count}: "
                f"displacement_cm={disp}, crack_state={crack} -> {resp.status_code}"
            )
        except Exception as e:
            print(f"Node2 error: {e}")
        await asyncio.sleep(2)


async def send_node2_normal(async_client, send_count):
    """Send normal Node 2 readings (no escalation)."""
    for i in range(send_count):
        now = datetime.utcnow()
        tilt = random.choice(node2_base_readings)
        payload = {
            "node_id": "node-deformation",
            "timestamp": now.isoformat(),
            "tilt_x": tilt["tilt_x"],
            "tilt_y": tilt["tilt_y"],
            "vibration": tilt["vibration"],
            "distance_cm": tilt["distance_cm"],
            "displacement_cm": tilt["displacement_cm"],
            "crack_state": tilt["crack_state"],
        }
        try:
            resp = await async_client.post(f"{BASE_URL}/api/readings", json=payload)
            print(f"Node2 normal send {i+1}/{send_count}: {payload} -> {resp.status_code}")
        except Exception as e:
            print(f"Node2 error: {e}")
        await asyncio.sleep(2)


async def main():
    args = parse_args()
    send_count = 20  # ~20 sends as specified

    async with httpx.AsyncClient() as client:
        if args.simulate_escalation:
            await send_node1_readings(client, send_count)
            await send_node2_escalation(client, send_count)
        else:
            await send_node1_readings(client, send_count)
            await send_node2_normal(client, send_count)


if __name__ == "__main__":
    asyncio.run(main())