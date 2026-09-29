import React, { useMemo } from "react";

export default function AlertLog({ nodeHistories = {}, resetTimestamp = 0 }) {
  // Compute status changes from all node histories
  const alerts = useMemo(() => {
    const list = [];

    Object.entries(nodeHistories).forEach(([nodeId, history]) => {
      if (!Array.isArray(history) || history.length < 2) return;

      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];

        const prevStatus = prev.status || "NORMAL";
        const currStatus = curr.status || "NORMAL";

        if (prevStatus !== currStatus) {
          const alertTime = new Date(curr.received_at).getTime();

          // Reset Demo filter: skip alerts that occurred before resetTimestamp
          if (alertTime <= resetTimestamp) continue;

          list.push({
            id: `${nodeId}-${curr.id || curr.received_at}-${i}`,
            nodeId,
            prevStatus,
            currStatus,
            timestamp: curr.received_at,
            formattedTime: new Date(curr.received_at).toLocaleTimeString(),
          });
        }
      }
    });

    // Sort newest first
    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return list;
  }, [nodeHistories, resetTimestamp]);

  return (
    <div className="alerts-section">
      <div className="alerts-header">
        <h4>⚡ Geotechnical Safety Event Log</h4>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {alerts.length} event{alerts.length === 1 ? "" : "s"} logged
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          No hazard status transitions recorded in active monitoring session.
        </div>
      ) : (
        <ul className="alerts-list">
          {alerts.map((item) => (
            <li key={item.id} className={`alert-item alert-${item.currStatus}`}>
              <div>
                <strong style={{ color: "#fff", marginRight: "0.5rem" }}>
                  [{item.nodeId}]
                </strong>
                <span>
                  {item.prevStatus} → <span style={{ fontWeight: "bold" }}>{item.currStatus}</span>
                </span>
              </div>
              <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
                {item.formattedTime}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}