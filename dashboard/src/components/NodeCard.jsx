import React from "react";

export default function NodeCard({ node = {}, nodeHistory = [] }) {
  // CRITICAL BUG FIX: Directly read status and readings from the single source of truth (the node prop from /api/nodes)
  // This guarantees NodeCard and SystemBanner NEVER disagree.
  const status = node.status || "NORMAL";
  const nodeId = node.node_id || "Unknown";

  const isZoneA = nodeId === "node-baseline";
  const zoneLabel = isZoneA ? "Zone A (Shaft / Baseline)" : "Zone B (Extraction / Deformation)";

  // Check if displacement fields are present on this node
  const hasDisplacement =
    node.displacement_cm !== undefined &&
    node.displacement_cm !== null;

  const hasDistance =
    node.distance_cm !== undefined &&
    node.distance_cm !== null;

  return (
    <div className={`node-card border-${status}`}>
      <div className="card-header">
        <div className="card-title-group">
          <h3>Node: {nodeId}</h3>
          <span>{zoneLabel}</span>
        </div>
        <span className={`status-badge ${status}`}>
          {status}
        </span>
      </div>

      {status === "OFFLINE" && (
        <div className="offline-badge">
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>&nbsp;No signal</span>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-item">
          <div className="metric-label">Tilt X</div>
          <div className="metric-val">
            {node.tilt_x !== undefined ? `${node.tilt_x}°` : "--"}
          </div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Tilt Y</div>
          <div className="metric-val">
            {node.tilt_y !== undefined ? `${node.tilt_y}°` : "--"}
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-label">Vibration</div>
          <div className="metric-val" style={{ color: node.vibration ? "#fbbf24" : "#34d399" }}>
            {node.vibration !== undefined ? (node.vibration ? "⚠️ Active" : "Nominal") : "--"}
          </div>
        </div>

        {hasDisplacement ? (
          <div className="metric-item">
            <div className="metric-label">Displacement</div>
            <div className="metric-val" style={{ color: (node.displacement_cm || 0) > 0.4 ? "#f87171" : "#fff" }}>
              {node.displacement_cm !== undefined ? `${node.displacement_cm} cm` : "--"}
            </div>
          </div>
        ) : (
          <div className="metric-item">
            <div className="metric-label">Sensor Type</div>
            <div className="metric-val" style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              Biaxial Inclinometer
            </div>
          </div>
        )}

        {hasDistance && (
          <div className="metric-item">
            <div className="metric-label">Distance</div>
            <div className="metric-val">
              {node.distance_cm !== undefined ? `${node.distance_cm} cm` : "--"}
            </div>
          </div>
        )}
      </div>

      {/* Crack State Indicator - Always shown prominently */}
      <div className={`crack-box ${node.crack_state === true ? "detected" : "normal"}`}>
        <div className="crack-label">
          Crack Sensor:
        </div>
        <div className="crack-status-text">
          {node.crack_state === true ? (
            <>
              <span>🚨</span>
              <span>CRACK DETECTED</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>No Crack Detected</span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-dim)", paddingTop: "0.25rem" }}>
        <span>Telemetry Mode: Live</span>
        <span>
          {node.received_at ? new Date(node.received_at).toLocaleTimeString() : "No timestamp"}
        </span>
      </div>
    </div>
  );
}