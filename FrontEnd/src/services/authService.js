const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";
const TOKEN_REFRESH_MARGIN_MS = 1000 * 60 * 3;
let refreshPromise = null;

async function parseJsonResponse(response, fallbackMessage) {
  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = raw || {};
  }

  if (!response.ok) {
    const message = data?.message || data?.error || fallbackMessage;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

async function parseResponseAllowing401(response) {
  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = raw || {};
  }
  return { ok: response.ok, status: response.status, data };
}

async function request(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response, "Authentication request failed.");
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("Session expired. Please login again.");

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const { ok, data } = await parseResponseAllowing401(response);
      if (!ok) throw new Error(data?.message || data?.error || "Unable to refresh session.");

      localStorage.setItem("accessToken", data.accessToken || "");
      localStorage.setItem("refreshToken", data.refreshToken || refreshToken);
      if (data.userId) localStorage.setItem("userId", data.userId);
      if (data.email) localStorage.setItem("userEmail", data.email);
      if (data.role) localStorage.setItem("userRole", data.role);

      return data.accessToken || "";
    })().finally(() => { refreshPromise = null; });
  }

  return refreshPromise;
}

let tokenExpiryTime = null;

function getTokenExpiryFromJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function checkAndRefreshToken() {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");
  if (!accessToken || !refreshToken) return Promise.resolve();

  const expiry = getTokenExpiryFromJwt(accessToken);
  if (!expiry) return Promise.resolve();
  const timeUntilExpiry = expiry - Date.now();

  if (timeUntilExpiry <= TOKEN_REFRESH_MARGIN_MS) {
    return refreshAccessToken();
  }
  return Promise.resolve();
}

async function authorizedRequest(path, options = {}, fallbackMessage = "Request failed.") {
  await checkAndRefreshToken();

  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) throw new Error("Missing access token. Please login first.");

  const firstHeaders = { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` };
  if (!(options.body instanceof FormData)) firstHeaders["Content-Type"] = "application/json";

  const firstResponse = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: firstHeaders });

  if (firstResponse.status !== 401) return parseJsonResponse(firstResponse, fallbackMessage);

  try {
    const newToken = await refreshAccessToken();
    const retryHeaders = { ...(options.headers || {}), Authorization: `Bearer ${newToken}` };
    if (!(options.body instanceof FormData)) retryHeaders["Content-Type"] = "application/json";
    const retryResponse = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: retryHeaders });
    return parseJsonResponse(retryResponse, fallbackMessage);
  } catch (refreshError) {
    clearAuthSession();
    throw refreshError;
  }
}

async function publicRequest(path, fallbackMessage = "Request failed.", options = { method: "GET" }) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  return parseJsonResponse(response, fallbackMessage);
}

async function authJsonRequest(path, method, payload, fallbackMessage) {
  return authorizedRequest(path, { method, body: payload ? JSON.stringify(payload) : undefined }, fallbackMessage);
}

async function authFormRequest(path, method, formData, fallbackMessage) {
  return authorizedRequest(path, { method, body: formData }, fallbackMessage);
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

// =================== AUTH ===================

export async function loginUser(payload) {
  return request("/auth/login", payload);
}

export async function registerUser(payload) {
  return request("/auth/register", payload);
}

export async function logoutUser() {
  const token = localStorage.getItem("accessToken");
  if (!token) return;
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = raw || {}; }
    throw new Error(data?.message || data?.error || "Logout failed.");
  }
}

export function storeAuthSession(authResponse) {
  localStorage.setItem("accessToken", authResponse.accessToken || "");
  localStorage.setItem("refreshToken", authResponse.refreshToken || "");
  localStorage.setItem("userId", authResponse.userId || "");
  localStorage.setItem("userEmail", authResponse.email || "");
  localStorage.setItem("userRole", authResponse.role || "");
}

export function clearAuthSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
}

export function isAuthenticated() {
  const token = localStorage.getItem("accessToken");
  return Boolean(token && token.trim());
}

// =================== USER ===================

export async function getCurrentUserProfile() {
  return authorizedRequest("/user/me", { method: "GET" }, "Failed to load user profile.");
}

export async function updateUserProfile(payload) {
  return authJsonRequest("/user/update", "PUT", payload, "Failed to update profile.");
}

// =================== DASHBOARD ===================

export async function getDashboardData(orgId) {
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
  return authorizedRequest(`/api/dashboard/me${query}`, { method: "GET" }, "Failed to load dashboard data.");
}

// =================== PRODUCTS ===================

export async function getAvailableProducts() {
  const data = await authorizedRequest("/api/products/get/all", { method: "GET" }, "Failed to load products.");
  return unwrapList(data);
}

export async function getProductById(id) {
  const data = await authorizedRequest(`/api/products/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to load product.");
  return unwrapItem(data);
}

export async function getProductDpp(id) {
  const data = await publicRequest(`/api/products/${encodeURIComponent(id)}/dpp`, "Failed to load product passport.");
  return unwrapItem(data);
}

export async function createProduct(payload) {
  return authJsonRequest("/api/products/create", "POST", payload, "Failed to create product.");
}

export async function updateProduct(payload) {
  return authJsonRequest("/api/products/update", "PUT", payload, "Failed to update product.");
}

export async function deleteProduct(productId) {
  return authJsonRequest(`/api/products/${encodeURIComponent(productId)}`, "DELETE", undefined, "Failed to delete product.");
}

export async function uploadProductImage(productId, file) {
  const formData = new FormData();
  formData.append("file", file);
  return authFormRequest(`/api/products/${encodeURIComponent(productId)}/image`, "POST", formData, "Failed to upload product image.");
}

export async function importProductsFromCsv(file, organizationId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("organizationId", organizationId);
  return authFormRequest("/api/products/import/csv", "POST", formData, "Failed to import products from CSV.");
}

// =================== ORGANIZATIONS ===================

export async function getMyOrganizations() {
  const data = await authorizedRequest("/organization/my", { method: "GET" }, "Failed to load organizations.");
  return unwrapList(data);
}

export async function getMainOrganizations() {
  const data = await authorizedRequest("/organization/main/all", { method: "GET" }, "Failed to load organizations.");
  return unwrapList(data);
}

export async function getSubOrganizations() {
  const data = await authorizedRequest("/organization/sub/all", { method: "GET" }, "Failed to load sub-organizations.");
  return unwrapList(data);
}

export async function getOrganizationById(id) {
  const data = await authorizedRequest(`/organization/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to load organization.");
  return unwrapItem(data);
}

export async function getSubsByMain(mainId) {
  const data = await authorizedRequest(`/organization/subs/${encodeURIComponent(mainId)}`, { method: "GET" }, "Failed to load sub-organizations.");
  return unwrapList(data);
}

export async function createMainOrganization(payload) {
  return authJsonRequest("/organization/main/create", "POST", payload, "Failed to create organization.");
}

export async function createSubOrganization(payload) {
  return authJsonRequest("/organization/sub/create", "POST", payload, "Failed to create sub-organization.");
}

export async function updateMainOrganization(payload) {
  return authJsonRequest("/organization/update/main", "PUT", payload, "Failed to update organization.");
}

export async function updateSubOrganization(payload) {
  return authJsonRequest("/organization/update/sub", "PUT", payload, "Failed to update sub-organization.");
}

export async function deleteOrganization(id) {
  return authJsonRequest(`/organization/${encodeURIComponent(id)}`, "DELETE", undefined, "Failed to delete organization.");
}

export async function assignSubToMain(payload) {
  return authJsonRequest("/organization/assign-sub", "POST", payload, "Failed to assign sub-organization.");
}

export async function assignUserToOrganization(payload) {
  return authJsonRequest("/organization/assign-user", "POST", payload, "Failed to assign user.");
}

// =================== ORDERS ===================

export async function getOrders() {
  const data = await authorizedRequest("/api/orders", { method: "GET" }, "Failed to load orders.");
  return unwrapList(data);
}

export async function getOrderById(id) {
  const data = await authorizedRequest(`/api/orders/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to load order.");
  return unwrapItem(data);
}

export async function getOrdersByOrg(orgId) {
  const data = await authorizedRequest(`/api/orders/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load orders.");
  return unwrapList(data);
}

export async function createOrder(payload) {
  return authJsonRequest("/api/orders", "POST", payload, "Failed to create order.");
}

export async function updateOrder(payload) {
  return authJsonRequest("/api/orders", "PUT", payload, "Failed to update order.");
}

export async function deleteOrder(id) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(id)}`, "DELETE", undefined, "Failed to delete order.");
}

// =================== EMPLOYEES ===================

export async function getEmployees() {
  const data = await authorizedRequest("/api/employees", { method: "GET" }, "Failed to load employees.");
  return unwrapList(data);
}

export async function getEmployeesByOrg(orgId) {
  const data = await authorizedRequest(`/api/employees/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load employees.");
  return unwrapList(data);
}

export async function createEmployee(payload) {
  return authJsonRequest("/api/employees", "POST", payload, "Failed to create employee.");
}

export async function updateEmployee(payload) {
  return authJsonRequest("/api/employees", "PUT", payload, "Failed to update employee.");
}

export async function deleteEmployee(id) {
  return authJsonRequest(`/api/employees/${encodeURIComponent(id)}`, "DELETE", undefined, "Failed to delete employee.");
}

// =================== PRODUCTION ===================

export async function getProductions() {
  const data = await authorizedRequest("/api/productions", { method: "GET" }, "Failed to load productions.");
  return unwrapList(data);
}

export async function createProduction(payload) {
  return authJsonRequest("/api/productions", "POST", payload, "Failed to create production.");
}

export async function updateProductionStatus(id, payload) {
  return authJsonRequest(`/api/productions/${encodeURIComponent(id)}/status`, "PUT", payload, "Failed to update production status.");
}

export async function startProductionStep(productionId, stepIndex) {
  return authorizedRequest(
    `/api/productions/${encodeURIComponent(productionId)}/step/start/${stepIndex}`,
    { method: "PUT" },
    "Failed to start step."
  );
}

export async function completeProductionStep(productionId, stepIndex) {
  return authorizedRequest(
    `/api/productions/${encodeURIComponent(productionId)}/step/complete/${stepIndex}`,
    { method: "PUT" },
    "Failed to complete step."
  );
}

export async function deleteProduction(id) {
  return authJsonRequest(`/api/productions/${encodeURIComponent(id)}`, "DELETE", undefined, "Failed to delete production.");
}

// =================== TASKS ===================

export async function getTasks() {
  const data = await authorizedRequest("/api/tasks", { method: "GET" }, "Failed to load tasks.");
  return unwrapList(data);
}

export async function getTasksByOrg(orgId) {
  const data = await authorizedRequest(`/api/tasks/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load tasks.");
  return unwrapList(data);
}

export async function getTasksByEmployee(employeeId) {
  const data = await authorizedRequest(`/api/tasks/employee/${encodeURIComponent(employeeId)}`, { method: "GET" }, "Failed to load tasks.");
  return unwrapList(data);
}

export async function createTask(payload) {
  return authJsonRequest("/api/tasks", "POST", payload, "Failed to create task.");
}

export async function updateTask(payload) {
  return authJsonRequest("/api/tasks", "PUT", payload, "Failed to update task.");
}

export async function updateTaskStatus(id, payload) {
  return authJsonRequest(`/api/tasks/${encodeURIComponent(id)}/status`, "PUT", payload, "Failed to update task status.");
}

export async function deleteTask(id) {
  return authJsonRequest(`/api/tasks/${encodeURIComponent(id)}`, "DELETE", undefined, "Failed to delete task.");
}

// =================== STOCK ===================

export async function getStocks() {
  const data = await authorizedRequest("/stock/all", { method: "GET" }, "Failed to load stock.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function createStock(payload) {
  return authJsonRequest("/stock/create", "POST", payload, "Failed to create stock item.");
}

export async function updateStock(payload) {
  return authJsonRequest("/stock/update", "PUT", payload, "Failed to update stock item.");
}

export async function deleteStock(id) {
  return authorizedRequest(`/stock/delete?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete stock item.");
}

// =================== SCANS ===================

export async function getScansByProduct(productId) {
  const data = await authorizedRequest(`/api/scans/product/${encodeURIComponent(productId)}`, { method: "GET" }, "Failed to load scans.");
  return unwrapList(data);
}

export async function getScansByOrg(orgId) {
  const data = await authorizedRequest(`/api/scans/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load scans.");
  return unwrapList(data);
}

// =================== ADMIN USER MANAGEMENT ===================

export async function adminGetAllUsers() {
  const data = await authorizedRequest("/admin/get/all", { method: "GET" }, "Failed to load users.");
  return unwrapList(data);
}

export async function adminGetUser(id) {
  const data = await authorizedRequest(`/admin/users/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to load user.");
  return unwrapItem(data);
}

export async function adminCreateUser(payload) {
  return authJsonRequest("/admin/create", "POST", payload, "Failed to create user.");
}

export async function adminUpdateUser(id, payload) {
  return authJsonRequest(`/admin/users/${encodeURIComponent(id)}`, "PUT", payload, "Failed to update user.");
}

export async function adminDeleteUser(id) {
  return authorizedRequest(`/admin/delete/account?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete user.");
}

export async function adminUpdatePassword(id, payload) {
  return authJsonRequest(`/admin/update/password?id=${encodeURIComponent(id)}`, "PUT", payload, "Failed to update password.");
}

// =================== AI ===================

export async function sendAiChat(message, productId, organizationId) {
  const payload = { message };
  if (productId) payload.productId = productId;
  if (organizationId) payload.organizationId = organizationId;
  const res = await authJsonRequest("/api/ai/chat", "POST", payload, "Failed to send AI message.");
  return res?.data?.reply ?? res?.reply ?? res;
}

export async function sendPublicAiChat(message) {
  const res = await publicRequest(`/api/ai/public/chat`, "Failed to send AI message.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return res?.data?.reply ?? res?.reply ?? res;
}

export async function getProductAiScore(productId) {
  return authorizedRequest(`/api/ai/products/${encodeURIComponent(productId)}/score`, { method: "GET" }, "Failed to get AI score.");
}

export async function sendAiAsk(payload) {
  return authJsonRequest("/api/ai/ask", "POST", payload, "Failed to ask AI.");
}

// =================== TECHNICAL SHEETS ===================

export async function getTechnicalSheets() {
  const data = await authorizedRequest("/api/technical-sheets", { method: "GET" }, "Failed to load technical sheets.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getTechnicalSheetsByProduct(productId) {
  const data = await authorizedRequest(`/api/technical-sheets/product/${encodeURIComponent(productId)}`, { method: "GET" }, "Failed to load technical sheets.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getTechnicalSheetsByOrg(orgId) {
  const data = await authorizedRequest(`/api/technical-sheets/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load technical sheets.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getTechnicalSheet(id) {
  return authorizedRequest(`/api/technical-sheets/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to load technical sheet.");
}

export async function createTechnicalSheet(payload) {
  return authJsonRequest("/api/technical-sheets", "POST", payload, "Failed to create technical sheet.");
}

export async function updateTechnicalSheet(id, payload) {
  return authJsonRequest(`/api/technical-sheets/${encodeURIComponent(id)}`, "PUT", payload, "Failed to update technical sheet.");
}

export async function deleteTechnicalSheet(id) {
  return authorizedRequest(`/api/technical-sheets/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete technical sheet.");
}

export async function getMaterialItems(sheetId) {
  const data = await authorizedRequest(`/api/technical-sheets/${encodeURIComponent(sheetId)}/material-items`, { method: "GET" }, "Failed to load material items.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function saveMaterialItems(sheetId, items) {
  return authJsonRequest(`/api/technical-sheets/${encodeURIComponent(sheetId)}/material-items`, "PUT", items, "Failed to save material items.");
}

export async function getOperationItems(sheetId) {
  const data = await authorizedRequest(`/api/technical-sheets/${encodeURIComponent(sheetId)}/operation-items`, { method: "GET" }, "Failed to load operation items.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function saveOperationItems(sheetId, items) {
  return authJsonRequest(`/api/technical-sheets/${encodeURIComponent(sheetId)}/operation-items`, "PUT", items, "Failed to save operation items.");
}

// ─── Materials library ───────────────────────────────────────────────────────

export async function getTsMaterials() {
  const data = await authorizedRequest("/api/ts-materials", { method: "GET" }, "Failed to load materials.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getTsMaterialsByOrg(orgId) {
  const data = await authorizedRequest(`/api/ts-materials/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load materials.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function createTsMaterial(payload) {
  return authJsonRequest("/api/ts-materials", "POST", payload, "Failed to create material.");
}

export async function updateTsMaterial(id, payload) {
  return authJsonRequest(`/api/ts-materials/${encodeURIComponent(id)}`, "PUT", payload, "Failed to update material.");
}

export async function deleteTsMaterial(id) {
  return authorizedRequest(`/api/ts-materials/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete material.");
}

// ─── Operations library ──────────────────────────────────────────────────────

export async function getTsOperations() {
  const data = await authorizedRequest("/api/ts-operations", { method: "GET" }, "Failed to load operations.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getTsOperationsByOrg(orgId) {
  const data = await authorizedRequest(`/api/ts-operations/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load operations.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function createTsOperation(payload) {
  return authJsonRequest("/api/ts-operations", "POST", payload, "Failed to create operation.");
}

export async function updateTsOperation(id, payload) {
  return authJsonRequest(`/api/ts-operations/${encodeURIComponent(id)}`, "PUT", payload, "Failed to update operation.");
}

export async function deleteTsOperation(id) {
  return authorizedRequest(`/api/ts-operations/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete operation.");
}

// =================== PUBLIC / CONTACT ===================

export async function submitContact(payload) {
  const response = await fetch(`${API_BASE_URL}/api/public/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response, "Failed to submit contact form.");
}
