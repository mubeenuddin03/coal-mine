from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .database import init_db, get_db, Reading, Baseline
from .schemas import ReadingCreate, ReadingResponse
from .risk_engine import evaluate_status

NODE_TIMEOUT_SECONDS = 6

app = FastAPI(title="Mine SIH26025 Backend - Phase 6")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


@app.post("/api/readings", response_model=ReadingResponse)
def create_reading(reading: ReadingCreate, db: Session = Depends(get_db)):
    db_reading = Reading(
        node_id=reading.node_id,
        timestamp=reading.timestamp if hasattr(reading, "timestamp") and reading.timestamp else datetime.utcnow(),
        tilt_x=reading.tilt_x,
        tilt_y=reading.tilt_y,
        vibration=reading.vibration,
        distance_cm=reading.distance_cm,
        displacement_cm=reading.displacement_cm,
        crack_state=reading.crack_state,
        received_at=datetime.utcnow(),
    )
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)

    # Compute and store risk status immediately after inserting reading
    status = evaluate_status(reading.node_id)
    print(f"[API POST /api/readings] node={reading.node_id} crack_state={reading.crack_state} -> evaluated status={status}")
    db_reading.status = status
    db.commit()
    db.refresh(db_reading)

    return db_reading


@app.get("/api/readings/{node_id}/latest", response_model=ReadingResponse)
def get_latest_reading(node_id: str, db: Session = Depends(get_db)):
    reading = (
        db.query(Reading)
        .filter(Reading.node_id == node_id)
        .order_by(Reading.received_at.desc(), Reading.id.desc())
        .first()
    )
    if not reading:
        raise HTTPException(status_code=404, detail="No readings found for this node")
    return reading


@app.get("/api/readings/{node_id}/history", response_model=List[ReadingResponse])
def get_reading_history(
    node_id: str, limit: int = 50, db: Session = Depends(get_db)
):
    # Fetch latest N readings ordered by received_at desc, id desc, then return them in chronological order
    readings = (
        db.query(Reading)
        .filter(Reading.node_id == node_id)
        .order_by(Reading.received_at.desc(), Reading.id.desc())
        .limit(limit)
        .all()
    )
    readings.reverse()
    return readings


@app.get("/api/nodes/{node_id}/status")
def get_node_status(node_id: str, db: Session = Depends(get_db)):
    reading = (
        db.query(Reading)
        .filter(Reading.node_id == node_id)
        .order_by(Reading.received_at.desc(), Reading.id.desc())
        .first()
    )
    if not reading:
        raise HTTPException(status_code=404, detail="No readings found for this node")

    now = datetime.utcnow()
    age_seconds = round(max(0.0, (now - reading.received_at).total_seconds()), 1)
    online = age_seconds <= NODE_TIMEOUT_SECONDS
    effective_status = (reading.status or "NORMAL") if online else "OFFLINE"

    return {
        "node_id": reading.node_id,
        "status": effective_status,
        "last_updated": reading.received_at,
        "last_seen_seconds": age_seconds,
        "online": online,
    }


@app.get("/api/nodes", response_model=List[ReadingResponse])
def list_nodes(db: Session = Depends(get_db)):
    # Find distinct node_ids
    distinct_node_rows = db.query(Reading.node_id).distinct().all()
    node_ids = sorted([row[0] for row in distinct_node_rows if row[0]])

    now = datetime.utcnow()
    result = []
    for nid in node_ids:
        latest = (
            db.query(Reading)
            .filter(Reading.node_id == nid)
            .order_by(Reading.received_at.desc(), Reading.id.desc())
            .first()
        )
        if latest:
            age_seconds = round(max(0.0, (now - latest.received_at).total_seconds()), 1)
            online = age_seconds <= NODE_TIMEOUT_SECONDS
            effective_status = (latest.status or "NORMAL") if online else "OFFLINE"

            item = ReadingResponse(
                id=latest.id,
                node_id=latest.node_id,
                timestamp=latest.timestamp,
                tilt_x=latest.tilt_x,
                tilt_y=latest.tilt_y,
                vibration=latest.vibration,
                distance_cm=latest.distance_cm,
                displacement_cm=latest.displacement_cm,
                crack_state=latest.crack_state,
                status=effective_status,
                received_at=latest.received_at,
                last_seen_seconds=age_seconds,
                online=online,
            )
            result.append(item)
    return result


@app.post("/api/baseline")
def set_baseline(db: Session = Depends(get_db)):
    """Sets baseline for ALL known nodes from the average of each node's last 5 readings,

    and recomputes each node's status right after.
    """
    distinct_node_rows = db.query(Reading.node_id).distinct().all()
    node_ids = sorted([row[0] for row in distinct_node_rows if row[0]])

    results = []
    now = datetime.utcnow()

    for nid in node_ids:
        readings = (
            db.query(Reading)
            .filter(Reading.node_id == nid)
            .order_by(Reading.received_at.desc(), Reading.id.desc())
            .limit(5)
            .all()
        )
        if not readings:
            continue

        avg_tilt_x = sum(r.tilt_x for r in readings) / len(readings)
        avg_tilt_y = sum(r.tilt_y for r in readings) / len(readings)

        non_null_dist = [r.distance_cm for r in readings if r.distance_cm is not None]
        avg_dist = sum(non_null_dist) / len(non_null_dist) if non_null_dist else None

        non_null_disp = [r.displacement_cm for r in readings if r.displacement_cm is not None]
        avg_disp = sum(non_null_disp) / len(non_null_disp) if non_null_disp else None

        existing_b = db.query(Baseline).filter(Baseline.node_id == nid).first()
        if existing_b:
            existing_b.tilt_x = avg_tilt_x
            existing_b.tilt_y = avg_tilt_y
            existing_b.distance_cm = avg_dist
            existing_b.displacement_cm = avg_disp
            existing_b.set_at = now
        else:
            b = Baseline(
                node_id=nid,
                tilt_x=avg_tilt_x,
                tilt_y=avg_tilt_y,
                distance_cm=avg_dist,
                displacement_cm=avg_disp,
                set_at=now,
            )
            db.add(b)
        db.commit()

        # Recompute node's status right after baseline update
        new_status = evaluate_status(nid)
        latest_reading = (
            db.query(Reading)
            .filter(Reading.node_id == nid)
            .order_by(Reading.received_at.desc(), Reading.id.desc())
            .first()
        )
        if latest_reading:
            latest_reading.status = new_status
            db.commit()

        results.append({
            "node_id": nid,
            "tilt_x": round(avg_tilt_x, 2),
            "tilt_y": round(avg_tilt_y, 2),
            "distance_cm": round(avg_dist, 2) if avg_dist is not None else None,
            "displacement_cm": round(avg_disp, 2) if avg_disp is not None else None,
            "status": new_status,
        })

    return {"message": "Baselines set successfully", "baselines": results}


@app.post("/api/admin/clear")
def clear_all_data(db: Session = Depends(get_db)):
    """Deletes all readings and baselines for demo clean start."""
    deleted_readings = db.query(Reading).delete()
    deleted_baselines = db.query(Baseline).delete()
    db.commit()
    return {
        "message": "All readings and baselines cleared successfully",
        "deleted_readings": deleted_readings,
        "deleted_baselines": deleted_baselines,
    }