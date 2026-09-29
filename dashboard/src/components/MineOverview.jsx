import React from "react";

export default function MineOverview({ nodes = [] }) {
  // Map nodes to zones:
  // Node 1 (node-baseline) -> Zone A (North Access Shaft / Support Pillar)
  // Node 2 (node-deformation) -> Zone B (Longwall Extraction Face / South Gallery)
  const nodeA = nodes.find((n) => n.node_id === "node-baseline") || nodes[0] || null;
  const nodeB = nodes.find((n) => n.node_id === "node-deformation") || (nodes.length > 1 ? nodes[1] : null);

  const statusA = nodeA?.online ? (nodeA?.status || "NORMAL") : "OFFLINE";
  const statusB = nodeB?.online ? (nodeB?.status || "NORMAL") : "OFFLINE";

  const getStatusColor = (status) => {
    switch (status) {
      case "CRITICAL":
        return "#ef4444";
      case "WARNING":
        return "#f59e0b";
      case "OFFLINE":
        return "#64748b";
      case "NORMAL":
      default:
        return "#10b981";
    }
  };

  const colorA = getStatusColor(statusA);
  const colorB = getStatusColor(statusB);

  return (
    <div className="mine-overview-container">
      <div className="overview-header">
        <div className="overview-title">
          <span>🗺️</span>
          <span>Mine Schematic & Zone Hazard Overview</span>
        </div>
        <div className="overview-legend hide-in-presentation">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: "#10b981" }}></span>
            <span>Normal</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: "#f59e0b" }}></span>
            <span>Warning</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: "#ef4444" }}></span>
            <span>Critical</span>
          </div>
        </div>
      </div>

      <div className="zones-grid">
        {/* Zone A Panel */}
        <div className={`zone-panel status-${statusA}`}>
          <div className="zone-top">
            <div className="zone-title">
              <span>Zone A</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
                (Shaft Pillar / Baseline)
              </span>
            </div>
            <span className={`status-badge ${statusA}`}>{statusA}</span>
          </div>

          {/* Zone A SVG Schematic */}
          <div className="zone-schematic">
            <svg width="100%" height="100%" viewBox="0 0 400 110" preserveAspectRatio="none">
              <defs>
                <linearGradient id="strataA" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#090d16" />
                </linearGradient>
                <linearGradient id="glowA" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colorA} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={colorA} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Strata layers */}
              <rect x="0" y="0" width="400" height="110" fill="url(#strataA)" />
              <line x1="0" y1="35" x2="400" y2="35" stroke="#334155" strokeDasharray="6 4" strokeWidth="1" />
              <line x1="0" y1="70" x2="400" y2="70" stroke="#334155" strokeDasharray="8 6" strokeWidth="1" />

              {/* Surface indicator */}
              <line x1="0" y1="2" x2="400" y2="2" stroke="#475569" strokeWidth="3" />
              <text x="12" y="18" fill="#64748b" fontSize="10" fontFamily="sans-serif">
                Surface Level (0m)
              </text>

              {/* Mine Drift/Tunnel */}
              <rect x="70" y="45" width="260" height="45" rx="6" fill="#080c14" stroke={colorA} strokeWidth="1.5" />
              <rect x="70" y="45" width="260" height="45" fill="url(#glowA)" />

              {/* Support Ribs */}
              <line x1="120" y1="45" x2="120" y2="90" stroke="#334155" strokeWidth="3" />
              <line x1="190" y1="45" x2="190" y2="90" stroke="#334155" strokeWidth="3" />
              <line x1="260" y1="45" x2="260" y2="90" stroke="#334155" strokeWidth="3" />

              {/* Sensor Node Indicator */}
              <circle cx="200" cy="50" r="7" fill={colorA} />
              <circle cx="200" cy="50" r="14" fill="none" stroke={colorA} strokeWidth="1.5" opacity="0.6">
                <animate attributeName="r" values="7;20;7" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <text x="215" y="54" fill="#f1f5f9" fontSize="11" fontWeight="bold" fontFamily="monospace">
                {nodeA?.node_id || "node-baseline"}
              </text>
            </svg>
          </div>

<div className="zone-footer">
            <span>Sensor: MPU6050 tilt + SW-420 vibration</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              Status: {statusA}{statusA === "OFFLINE" && (
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>&nbsp;No signal</span>
              )}
            </span>
          </div>

          {/* Zone B Panel */}
        <div className={`zone-panel status-${statusB}`}>
          <div className="zone-top">
            <div className="zone-title">
              <span>Zone B</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
                (Extraction Face / Deformation Drift)
              </span>
            </div>
            <span className={`status-badge ${statusB}`}>{statusB}</span>
          </div>

          {/* Zone B SVG Schematic */}
          <div className="zone-schematic">
            <svg width="100%" height="100%" viewBox="0 0 400 110" preserveAspectRatio="none">
              <defs>
                <linearGradient id="strataB" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#090d16" />
                </linearGradient>
                <linearGradient id="glowB" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colorB} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={colorB} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Strata layers */}
              <rect x="0" y="0" width="400" height="110" fill="url(#strataB)" />
              <line x1="0" y1="35" x2="400" y2="35" stroke="#334155" strokeDasharray="6 4" strokeWidth="1" />
              <line x1="0" y1="70" x2="400" y2="70" stroke="#334155" strokeDasharray="8 6" strokeWidth="1" />

              {/* Surface indicator */}
              <line x1="0" y1="2" x2="400" y2="2" stroke="#475569" strokeWidth="3" />
              <text x="12" y="18" fill="#64748b" fontSize="10" fontFamily="sans-serif">
                Surface Level (0m) • Illustrative scale
              </text>

              {/* Mine Drift/Tunnel */}
              <rect x="70" y="45" width="260" height="45" rx="6" fill="#080c14" stroke={colorB} strokeWidth="1.5" />
              <rect x="70" y="45" width="260" height="45" fill="url(#glowB)" />

              {/* Visual Crack Fractures if CRITICAL or crack_state */}
              {(statusB === "CRITICAL" || nodeB?.crack_state === true) && (
                <path
                  d="M 180,45 L 188,32 L 184,22 L 195,12 M 220,45 L 214,30 L 222,20"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  fill="none"
                >
                  <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
                </path>
              )}

              {/* Displacement Gauge Indicator */}
              <line x1="140" y1="45" x2="140" y2="90" stroke="#334155" strokeWidth="3" />
              <line x1="280" y1="45" x2="280" y2="90" stroke="#334155" strokeWidth="3" />

              {/* Sensor Node Indicator */}
              <circle cx="210" cy="50" r="7" fill={colorB} />
              <circle cx="210" cy="50" r="14" fill="none" stroke={colorB} strokeWidth="1.5" opacity="0.6">
                <animate attributeName="r" values="7;22;7" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x="225" y="54" fill="#f1f5f9" fontSize="11" fontWeight="bold" fontFamily="monospace">
                {nodeB?.node_id || "node-deformation"}
              </text>
            </svg>
          </div>

<div className="zone-footer">
            <span>Sensor: Potentiometer displacement + HC-SR04 distance + crack strip + MPU6050 + SW-420</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              Crack: {nodeB?.crack_state ? "DETECTED" : "None"} | Disp: {nodeB?.displacement_cm ?? 0}cm{nodeB?.online === false && (
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>&nbsp;No signal</span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
