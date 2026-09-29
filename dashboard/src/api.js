export const BACKEND_BASE_URL = "http://localhost:8000";

export async function fetchNodes() {
  const res = await fetch(`${BACKEND_BASE_URL}/api/nodes`);
  if (!res.ok) throw new Error("Failed to fetch nodes");
  return res.json();
}

export async function fetchNodeHistory(nodeId, limit = 50) {
  const res = await fetch(`${BACKEND_BASE_URL}/api/readings/${nodeId}/history?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch history for ${nodeId}`);
  return res.json();
}

export async function fetchNodeStatus(nodeId) {
  const res = await fetch(`${BACKEND_BASE_URL}/api/nodes/${nodeId}/status`);
  if (!res.ok) throw new Error(`Failed to fetch status for ${nodeId}`);
  return res.json();
}