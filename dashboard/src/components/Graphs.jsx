import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function Graphs({ nodeId, nodeHistory = [] }) {
  const history = Array.isArray(nodeHistory) ? nodeHistory : [];

  // Determine if this node has displacement data
  const hasDisplacement =
    history.length > 0 &&
    history.some((r) => r.displacement_cm !== null && r.displacement_cm !== undefined);

  // Extract chart data
  const chartData = history.map((reading) => ({
    name: reading.received_at
      ? new Date(reading.received_at).toLocaleTimeString()
      : "--",
    displacement: reading.displacement_cm ?? null,
    tilt_x: reading.tilt_x ?? null,
    status: reading.status || "NORMAL",
  }));

  const metricKey = hasDisplacement ? "displacement" : "tilt_x";
  const metricLabel = hasDisplacement ? "Displacement (cm)" : "Tilt X (°)";
  const strokeColor = hasDisplacement ? "#38bdf8" : "#a78bfa";

  return (
    <div className="graph-card">
      <div className="graph-header">
        <h4>
          📈 {nodeId}: {metricLabel}
        </h4>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {history.length} samples
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="empty-state" style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Awaiting telemetry history...
        </div>
      ) : (
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#f1f5f9",
                }}
              />
              <Line
                type="monotone"
                dataKey={metricKey}
                name={metricLabel}
                stroke={strokeColor}
                strokeWidth={2}
                dot={{ r: 2, fill: strokeColor }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}