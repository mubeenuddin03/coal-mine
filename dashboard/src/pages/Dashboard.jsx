import React, { useEffect, useState } from "react";
import SystemBanner from "../components/SystemBanner";
import NodeCard from "../components/NodeCard";
import Graphs from "../components/Graphs";
import AlertLog from "../components/AlertLog";
import MineOverview from "../components/MineOverview";
import { fetchNodes, fetchNodeHistory } from "../api";

const POLL_INTERVAL_MS = 2000;

export default function Dashboard() {
  const [nodes, setNodes] = useState([]);
  const [nodeHistories, setNodeHistories] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [lastUpdated, setLastUpdated] = useState("never");
  const [presentationMode, setPresentationMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [resetTimestamp, setResetTimestamp] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [firstPoll, setFirstPoll] = useState(true);
  const [prevNodeStatuses, setPrevNodeStatuses] = useState({});

  // Sync presentation mode with body class for global scaling
  useEffect(() => {
    if (presentationMode) {
      document.body.classList.add("presentation-mode");
    } else {
      document.body.classList.remove("presentation-mode");
    }
  }, [presentationMode]);

  // Single poll cycle: fetch latest nodes and history
  useEffect(() => {
    let isMounted = true;

    const playBeep = (frequency, duration, type) => {
      if (!soundEnabled) return;
      try {
        const AudioContext = window.AudioContext || window["webkitAudioContext"];
        if (!AudioContext) return;
        const context = window._mineAudioContext || new AudioContext();
        window._mineAudioContext = context;
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.frequency.value = frequency;
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        gainNode.gain.value = 0.5;
        oscillator.start();
        if (type === "CRITICAL") {
          // Repeated toggle: on for 100ms, off for 100ms, repeating
          let on = true;
          context._mineBeepEndTime = context.currentTime + duration;
          const intervalId = setInterval(() => {
            if (context.currentTime >= context._mineBeepEndTime) {
              oscillator.stop();
              clearInterval(intervalId);
              return;
            }
            gainNode.gain.value = on ? 0.5 : 0.01;
            on = !on;
          }, 100);
          // Auto-stop after duration
          setTimeout(() => clearInterval(intervalId), duration * 1000 + 200);
        } else {
          oscillator.stop(context.currentTime + duration);
          gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
        }
      } catch (e) {
        // Audio context may fail if not unlocked
      }
    };

    const showToast = (message, type, durationOverride) => {
      const toastContainer = document.getElementById("toast-container");
      if (!toastContainer) return;

      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      toastContainer.appendChild(toast);

      const duration = durationOverride || (type === "CRITICAL" ? Infinity : 8000);
      const showDuration = 100;

      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.opacity = "0";
          toast.style.transition = "opacity 0.5s ease";
          setTimeout(() => toast.remove(), 500);
        }
      }, duration);
    };

    const poll = async () => {
      try {
        const nodesData = await fetchNodes();
        if (!isMounted) return;

        // Skip toast/sound processing on first poll, but still show status
        const isFirstPoll = firstPoll;
        setFirstPoll(false);
        setNodes(nodesData);

        // Fetch history in parallel for each node
        const historyPromises = nodesData.map((n) =>
          fetchNodeHistory(n.node_id, 50).catch(() => [])
        );
        const historyResults = await Promise.all(historyPromises);

        if (!isMounted) return;

        const histories = {};
        nodesData.forEach((n, idx) => {
          histories[n.node_id] = historyResults[idx] || [];
        });
        setNodeHistories(histories);

        // --- Live alert detection: compare new status with previous status ---
        if (!isFirstPoll) {
          nodesData.forEach((node) => {
            const newStatus = node.status || "NORMAL";
            const prevStatus = prevNodeStatuses[node.node_id] || "NORMAL";
            if (prevStatus !== newStatus) {
              // Transition detected
              if (newStatus === "WARNING") {
                showToast(`Node ${node.node_id}: WARNING`, "WARNING");
                playBeep(1000, 0.2, "WARNING");
                playBeep(2000, 0.2, "WARNING");
              }
              if (newStatus === "CRITICAL") {
                showToast(`Node ${node.node_id}: CRITICAL`, "CRITICAL");
                playBeep(500, 1, "CRITICAL"); // longer repeated tone
              }
            }

            // Check for crack_state change from false to true
            const prevHistory = nodeHistories[node.node_id] || [];
            const currHistory = histories[node.node_id] || [];
            const prevReading = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1] : null;
            const currReading = currHistory.length > 0 ? currHistory[currHistory.length - 1] : null;
            if (prevReading && currReading && prevReading.crack_state !== currReading.crack_state && currReading.crack_state === true) {
              showToast(`Node ${node.node_id}: CRACK DETECTED`, "CRITICAL");
            }
          });
        }

        setPrevNodeStatuses(nodesData.reduce((acc, node) => {
          acc[node.node_id] = node.status || "NORMAL";
          return acc;
        }, {}));

        setConnectionStatus("live");
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        if (!isMounted) return;
        setConnectionStatus("disconnected");
        console.error("Poll failed:", err);
      }
    };

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [firstPoll, soundEnabled]);

  // Demo Reset handler: clears frontend's local view state (e.g. dismissed alerts) without touching the database
  const handleResetDemo = () => {
    setResetTimestamp(Date.now());
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-branding">
          <div className="mine-icon">⛏️</div>
          <div className="header-title-group">
            <h1>Mine Subsidence Early Warning System</h1>
            <p>SIH26025 • Autonomous Geotechnical Risk & Subsidence Monitoring</p>
          </div>
        </div>

        <div className="header-controls">
          {/* Presentation Mode Toggle */}
          <button
            type="button"
            className={`btn-toggle ${presentationMode ? "active" : ""}`}
            onClick={() => setPresentationMode((prev) => !prev)}
            title="Enlarge badges and metrics for distance viewing"
          >
            <span>📺</span>
            <span>{presentationMode ? "Exit Presentation" : "Presentation Mode"}</span>
          </button>

          {/* Demo Mode Toggle */}
          <button
            type="button"
            className={`btn-toggle hide-in-presentation ${demoMode ? "active" : ""}`}
            onClick={() => setDemoMode((prev) => !prev)}
          >
            <span>⚙️</span>
            <span>Demo Controls</span>
          </button>

          {/* Enable Sound Toggle */}
          <button
            type="button"
            className={`btn-toggle ${soundEnabled ? "active" : ""}`}
            onClick={() => setSoundEnabled((prev) => !prev)}
            title="Enable or disable audio alerts"
          >
            <span>🔊</span>
            <span>{soundEnabled ? "Disable sound" : "Enable sound"}</span>
          </button>

          {/* Reset Demo Button (Visible only when demoMode is active, does not touch DB) */}
          {demoMode && (
            <button
              type="button"
              className="btn-danger-outline hide-in-presentation"
              onClick={handleResetDemo}
              title="Clears local alert view for rehearsal start (no DB change)"
            >
              <span>🔄</span>
              <span>Reset Demo State</span>
            </button>
          )}

          {/* Demo Controls panel (visible only when demoMode is active) */}
          {demoMode && (
            <div className="demo-controls-panel">
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Mount nodes at rest → Clear All Data → wait until both nodes are online → Set Baseline</span>
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => {
                    if (window.confirm("Clear all readings and baselines?")) {
                      window.fetch("/api/admin/clear", { method: "POST" })
                        .then(() => setResetTimestamp(Date.now()))
                        .catch(() => alert("Failed to clear data"));
                    }
                  }}
                >
                  Clear All Data
                </button>
                <button
                  type="button"
                  className="btn-toggle btn-toggle--primary"
                  onClick={() => {
                    window.fetch("/api/baseline", { method: "POST" })
                      .then(() => setResetTimestamp(Date.now()))
                      .catch(() => alert("Failed to set baseline"));
                  }}
                >
                  Set Baseline (all nodes)
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Toast container */}
      <div id="toast-container" style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 1000 }}></div>

      {/* Connection & Telemetry Status Bar */}
      <div className="connection-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className={`connection-pill ${connectionStatus}`}>
            <span className="pulse-dot"></span>
            {connectionStatus === "live" ? "Telemetry Stream: Live" : "Telemetry Stream: Disconnected"}
          </span>
          <span>Last synchronized: {lastUpdated}</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          Active Nodes: {nodes.length}
        </div>
      </div>

      {/* Phase 5 Scope 1: Mine Overview Schematic Panel (Zone A & Zone B side-by-side) */}
      <MineOverview nodes={nodes} />

      {/* Aggregate System Banner */}
      <SystemBanner
        nodes={nodes}
        connectionStatus={connectionStatus}
        lastUpdated={lastUpdated}
      />

      {/* Node Cards Grid - unified single source of truth from nodes array */}
      <div className="cards-grid">
        {nodes.map((node) => (
          <NodeCard
            key={node.node_id}
            node={node}
            nodeHistory={nodeHistories[node.node_id] || []}
          />
        ))}
      </div>

      {/* Real-time Metric Graphs */}
      <div className="graphs-section">
        {nodes.map((node) => (
          <Graphs
            key={node.node_id}
            nodeId={node.node_id}
            nodeHistory={nodeHistories[node.node_id] || []}
          />
        ))}
      </div>

      {/* Geotechnical Hazard Event Log */}
      <AlertLog
        nodeHistories={nodeHistories}
        resetTimestamp={resetTimestamp}
      />
    </div>
  );
}