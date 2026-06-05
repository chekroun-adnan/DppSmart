const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

async function checkAndRefreshToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken || !refreshToken) return;

  const parts = accessToken.split(".");
  if (parts.length !== 3) return;
  let expiry;
  try { const p = JSON.parse(atob(parts[1])); expiry = p.exp ? p.exp * 1000 : null; } catch { return; }
  if (!expiry) return;

  const timeUntilExpiry = expiry - Date.now();
  const TOKEN_REFRESH_MARGIN_MS = 1000 * 60 * 3;
  if (timeUntilExpiry > TOKEN_REFRESH_MARGIN_MS) return;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) throw new Error("Session expired. Please login again.");
  const data = await response.json();
  localStorage.setItem("accessToken", data.accessToken || "");
  localStorage.setItem("refreshToken", data.refreshToken || refreshToken);
}

async function request(path, options, fallbackMessage) {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) throw new Error("Missing access token. Please login first.");

  const headers = { Authorization: `Bearer ${accessToken}`, ...options.headers };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  let response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    try {
      await checkAndRefreshToken();
      const newToken = localStorage.getItem("accessToken");
      headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    } catch {
      localStorage.clear();
      window.location.href = "/login";
      throw new Error("Session expired.");
    }
  }

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (!response.ok) throw new Error(data?.message || data?.error || fallbackMessage);
  return data;
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function unwrapItem(data) {
  if (data && data.data !== undefined && typeof data.data === "object") return data.data;
  return data;
}

const BASE = "/api/operations";

export async function getOperations() {
  const data = await request(BASE, { method: "GET" }, "Failed to load operations.");
  return unwrapList(data);
}

export async function getOperationById(id) {
  return unwrapItem(await request(`${BASE}/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to load operation."));
}

export async function getOperationsByOrg(orgId) {
  const data = await request(`${BASE}/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load operations.");
  return unwrapList(data);
}

export async function getActiveOperationsByOrg(orgId) {
  const data = await request(`${BASE}/organization/${encodeURIComponent(orgId)}/active`, { method: "GET" }, "Failed to load active operations.");
  return unwrapList(data);
}

export async function createOperation(payload) {
  return request(BASE, { method: "POST", body: JSON.stringify(payload) }, "Failed to create operation.");
}

export async function updateOperation(id, payload) {
  return request(`${BASE}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }, "Failed to update operation.");
}

export async function deactivateOperation(id) {
  return request(`${BASE}/${encodeURIComponent(id)}/deactivate`, { method: "POST" }, "Failed to deactivate operation.");
}

export async function activateOperation(id) {
  return request(`${BASE}/${encodeURIComponent(id)}/activate`, { method: "POST" }, "Failed to activate operation.");
}

export async function deleteOperation(id) {
  return request(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete operation.");
}
