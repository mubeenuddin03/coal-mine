import React from "react";

export default function SystemBanner({ nodes = [], connectionStatus, lastUpdated }) {
  const onlineNodes = nodes.filter((n) => n.online);
  const offlineNodeCount = nodes.length - onlineNodes.length;

  // Aggregate status computation: only consider online nodes
  // If any online node is CRITICAL -> CRITICAL
  // Else if any online node is WARNING -> WARNING
  // Else if there are offline nodes -> NORMAL with offline indicator
  // Else -> NORMAL
  let overallStatus = "NORMAL";
  if (onlineNodes.some((n) => n.status === "CRITICAL")) {
    overallStatus = "CRITICAL";
  } else if (onlineNodes.some((n) => n.status === "WARNING")) {
    overallStatus = "WARNING";
  }

  return (
    <div className={`system-banner status-${overallStatus}`}>
      <div className="banner-top-row">
        <div className="banner-left">
          <span style={{ fontSize: "1.5rem" }}>
            {overallStatus === "CRITICAL"
              ? "🚨"
              : overallStatus === "WARNING"
              ? "⚠️"
              : "🛡️"}
          </span>
          <div>
            <div className="banner-title">
              Overall Mine Risk: {overallStatus}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Real-time multi-node geotechnical safety aggregation
            </div>
          </div>
        </div>

        {offlineNodeCount > 0 && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "1rem" }}>
            {offlineNodeCount} node{offlineNodeCount !== 1 ? "s" : ""} offline
          </div>
        )}
      </div>

      <div>
        <span className={`status-badge ${overallStatus}`}>
          {overallStatus}
        </span>
      </div>
    </div>
  );
}