from sqlalchemy.orm import Session


# --- Configurable thresholds (tune during calibration, not buried in logic) ---
DISPLACEMENT_RATE_CRITICAL = 0.5       # cm per reading interval → CRITICAL
DISPLACEMENT_WARNING_FROM_BASELINE = 0.2  # cm from first-ever baseline → WARNING
TILT_WARNING_THRESHOLD = 1.0           # degrees from first-ever baseline → WARNING (Node 1 only)
VIBRATION_WARNING_COUNT = 2            # 2+ of last 5 readings → WARNING


def evaluate_status(node_id: str) -> str:
    """Evaluate risk status (NORMAL / WARNING / CRITICAL) for a given node.

    Pulls the last 5 readings for node_id and applies rules in priority order:
    a. crack_state True on latest → CRITICAL (Node 2 only; Node 1 has null crack_state)
    b. displacement rate of change > DISPLACEMENT_RATE_CRITICAL → CRITICAL
    c. displacement beyond DISPLACEMENT_WARNING_FROM_BASELINE from first-ever baseline
       OR tilt beyond TILT_WARNING_THRESHOLD from baseline (Node 1)
       OR vibration True on 2+ of last 5 → WARNING
    d. otherwise → NORMAL

    Handles Node 1's missing fields (distance_cm, displacement_cm, crack_state) gracefully
    by skipping checks that depend on those fields.
    """
    from .database import SessionLocal, Reading, Baseline

    db: Session = SessionLocal()
    try:
        # Pull last 5 readings, newest first (ordered by received_at desc and id desc for deterministic ordering)
        readings = (
            db.query(Reading)
            .filter(Reading.node_id == node_id)
            .order_by(Reading.received_at.desc(), Reading.id.desc())
            .limit(5)
            .all()
        )

        if not readings:
            print(f"[risk_engine] evaluate_status({node_id}): no readings found -> NORMAL")
            return "NORMAL"

        # The newest reading is readings[0]
        latest = readings[0]

        # Rule (a): crack_state True on latest → CRITICAL
        # Must be checked FIRST before any other condition and short-circuit immediately!
        if latest.crack_state is True:
            print(f"[risk_engine] evaluate_status({node_id}): crack_state=True detected on latest reading (id={latest.id}) -> CRITICAL")
            return "CRITICAL"

        # Sort chronological (oldest to newest) for rate of change and historical window analysis
        readings_chronological = list(reversed(readings))

        # Helper: collect non-null displacement_cm values in order
        disp_values = [r.displacement_cm for r in readings_chronological if r.displacement_cm is not None]
        has_displacement = len(disp_values) >= 2

        # Rule (b): displacement rate of change exceeds critical threshold
        if has_displacement:
            first_disp = disp_values[0]
            last_disp = disp_values[-1]
            first_idx = next(i for i, r in enumerate(readings_chronological) if r.displacement_cm is not None)
            last_idx = len(readings_chronological) - 1 - next(
                i for i, r in enumerate(reversed(readings_chronological)) if r.displacement_cm is not None
            )
            intervals = last_idx - first_idx
            if intervals > 0:
                rate = (last_disp - first_disp) / intervals
                if abs(rate) > DISPLACEMENT_RATE_CRITICAL:
                    print(f"[risk_engine] evaluate_status({node_id}): displacement rate {rate:.3f} > {DISPLACEMENT_RATE_CRITICAL} -> CRITICAL")
                    return "CRITICAL"

        # Rule (c): check displacement from baseline (Node 2) or tilt from baseline (Node 1),
        # OR vibration True on 2+ of last 5 → WARNING
        warning_triggered = False

        # Check if an explicit baseline exists in the baselines table
        baseline = (
            db.query(Baseline)
            .filter(Baseline.node_id == node_id)
            .order_by(Baseline.set_at.desc())
            .first()
        )

        # Fallback to the first-ever reading for this node when no baseline exists
        if baseline is None:
            baseline = (
                db.query(Reading)
                .filter(Reading.node_id == node_id)
                .order_by(Reading.received_at.asc(), Reading.id.asc())
                .first()
            )

        if baseline is not None:
            if has_displacement:
                # Node 2: check displacement_cm from first-ever baseline
                first_ever_disp = baseline.displacement_cm
                if first_ever_disp is not None and latest.displacement_cm is not None:
                    delta = abs(latest.displacement_cm - first_ever_disp)
                    if delta > DISPLACEMENT_WARNING_FROM_BASELINE:
                        print(f"[risk_engine] evaluate_status({node_id}): displacement delta {delta:.3f} > {DISPLACEMENT_WARNING_FROM_BASELINE} -> WARNING")
                        warning_triggered = True

            # Node 1: check tilt_x or tilt_y from first-ever baseline
            # Node 1 has no displacement_cm, so first_ever_disp is None
            if not has_displacement:
                first_ever_tilt_x = baseline.tilt_x
                if first_ever_tilt_x is not None and latest.tilt_x is not None:
                    delta = abs(latest.tilt_x - first_ever_tilt_x)
                    if delta > TILT_WARNING_THRESHOLD:
                        print(f"[risk_engine] evaluate_status({node_id}): tilt_x delta {delta:.3f} > {TILT_WARNING_THRESHOLD} -> WARNING")
                        warning_triggered = True

        # Also check vibration on 2+ of last 5 (applies to both node types)
        vibration_count = sum(1 for r in readings if r.vibration is True)
        if vibration_count >= VIBRATION_WARNING_COUNT:
            print(f"[risk_engine] evaluate_status({node_id}): vibration count {vibration_count} >= {VIBRATION_WARNING_COUNT} -> WARNING")
            warning_triggered = True

        if warning_triggered:
            return "WARNING"

        # Rule (d): otherwise → NORMAL
        print(f"[risk_engine] evaluate_status({node_id}): all nominal -> NORMAL")
        return "NORMAL"

    finally:
        db.close()