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
    error.code = data?.code || null;
    error.fieldErrors = data?.fieldErrors || null;
    
    if (response.status === 429) {
      error.retryAfter = parseInt(response.headers.get("Retry-After") || data?.retryAfter || "60", 10);
    }
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
  localStorage.setItem("organizationId", authResponse.organizationId || "");
  localStorage.setItem("assignedOrganizationIds", JSON.stringify(authResponse.assignedOrganizationIds || []));
  localStorage.setItem("userDisplayName", authResponse.fullName || authResponse.email?.split("@")[0] || "");
  if (authResponse.organizationId) {
    localStorage.setItem("orgId", authResponse.organizationId);
  } else if (authResponse.assignedOrganizationIds?.length > 0) {
    localStorage.setItem("orgId", authResponse.assignedOrganizationIds[0]);
  }
  // Employee-specific session data
  if (authResponse.role === "EMPLOYEE") {
    localStorage.setItem("employeeId", authResponse.employeeId || authResponse.userId || "");
    localStorage.setItem("employeeCode", authResponse.employeeCode || "");
    localStorage.setItem("departmentId", authResponse.departmentId || "");
    localStorage.setItem("departmentName", authResponse.departmentName || "");
  }
}

export function clearAuthSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  localStorage.removeItem("organizationId");
  localStorage.removeItem("assignedOrganizationIds");
  localStorage.removeItem("orgId");
  localStorage.removeItem("userDisplayName");
  localStorage.removeItem("employeeId");
  localStorage.removeItem("employeeCode");
  localStorage.removeItem("departmentId");
  localStorage.removeItem("departmentName");
}

export function isAuthenticated() {
  const token = localStorage.getItem("accessToken");
  return Boolean(token && token.trim());
}



export async function getCurrentUserProfile() {
  return authorizedRequest("/user/me", { method: "GET" }, "Failed to load user profile.");
}

export async function updateUserProfile(payload) {
  return authJsonRequest("/user/update", "PUT", payload, "Failed to update profile.");
}



export async function getDashboardData(orgId) {
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
  return authorizedRequest(`/api/dashboard/me${query}`, { method: "GET" }, "Failed to load dashboard data.");
}



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



export async function getOrders() {
  const data = await authorizedRequest("/api/orders", { method: "GET" }, "Failed to load orders.");
  return unwrapList(data);
}

export async function getMyOrders() {
  const data = await authorizedRequest("/api/orders/my", { method: "GET" }, "Failed to load your orders.");
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

export async function adminConfirmOrder(payload) {
  return authJsonRequest("/api/orders/admin/confirm", "POST", payload, "Failed to confirm order.");
}

export async function adminProposeDate(payload) {
  return authJsonRequest("/api/orders/admin/propose-date", "POST", payload, "Failed to propose new date.");
}

export async function clientAcceptOrder(payload) {
  return authJsonRequest("/api/orders/client/accept", "POST", payload, "Failed to accept order.");
}

export async function clientRejectOrder(payload) {
  return authJsonRequest("/api/orders/client/reject", "POST", payload, "Failed to reject order.");
}

export async function cancelOrder(id, reason) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(id)}/cancel`, "POST", reason ? { reason } : {}, "Failed to cancel order.");
}

export async function deleteOrder(id) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(id)}`, "DELETE", undefined, "Failed to delete order.");
}

export async function reviewOrder(id) {
  return authorizedRequest(`/api/orders/${encodeURIComponent(id)}/review`, { method: "GET" }, "Failed to load order review.");
}

export async function launchProductionForShortfall(id) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(id)}/launch-production-shortfall`, "POST", undefined, "Failed to launch production.");
}

export async function startOrderProduction(id) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(id)}/start-production`, "POST", undefined, "Failed to start production.");
}

export async function getOrderAvailabilityCheck(id) {
  return authorizedRequest(`/api/orders/${encodeURIComponent(id)}/availability-check`, { method: "GET" }, "Failed to load availability check.");
}

export async function confirmOrderDelivery(id) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(id)}/confirm-delivery`, "POST", undefined, "Failed to confirm delivery.");
}

export async function startProductionV2(id) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(id)}/start-production-v2`, "POST", undefined, "Failed to start production.");
}

export async function bulkStartProduction(orderIds) {
  return authJsonRequest("/api/orders/bulk/start-production", "POST", orderIds, "Failed to start production for some orders.");
}

export async function markOrderReady(id) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(id)}/ready`, "POST", undefined, "Failed to mark order as ready.");
}

export async function markOrderDelivered(id) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(id)}/delivered`, "POST", undefined, "Failed to mark order as delivered.");
}

export async function processOrder(id, confirmedDeliveryDate) {
  return authJsonRequest(
    `/api/orders/${encodeURIComponent(id)}/process`,
    "POST",
    { orderId: id, confirmedDeliveryDate },
    "Failed to process order."
  );
}








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

export async function updateProduction(id, payload) {
  return authJsonRequest(`/api/productions/${encodeURIComponent(id)}`, "PUT", payload, "Failed to update production.");
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

export async function completeProductionBatch(id) {
  return authJsonRequest(`/api/productions/${encodeURIComponent(id)}/complete`, "POST", undefined, "Failed to complete production.");
}

export async function getProductionMaterialConsumption(id) {
  const data = await authorizedRequest(`/api/productions/${encodeURIComponent(id)}/material-consumption`, { method: "GET" }, "Failed to load material consumption.");
  return data?.data ?? data;
}

export async function getProductionOrders() {
  const data = await authorizedRequest("/api/production/orders", { method: "GET" }, "Failed to load production orders.");
  return unwrapList(data);
}

export async function getProductionOrder(orderId) {
  const data = await authorizedRequest(`/api/production/orders/${encodeURIComponent(orderId)}`, { method: "GET" }, "Failed to load production order.");
  return data?.data ?? data;
}

export async function getProductionOrderSteps(orderId) {
  const data = await authorizedRequest(`/api/production/orders/${encodeURIComponent(orderId)}/steps`, { method: "GET" }, "Failed to load order steps.");
  return unwrapList(data);
}

export async function generateProductionSteps(orderId) {
  return authJsonRequest(`/api/production/orders/${encodeURIComponent(orderId)}/generate-steps`, "POST", undefined, "Failed to generate steps.");
}

export async function startProductionOrderStep(stepId) {
  return authJsonRequest(`/api/production/orders/steps/${encodeURIComponent(stepId)}/start`, "POST", undefined, "Failed to start step.");
}

export async function completeProductionOrderStep(stepId) {
  return authJsonRequest(`/api/production/orders/steps/${encodeURIComponent(stepId)}/complete`, "POST", undefined, "Failed to complete step.");
}

export async function blockProductionOrderStep(stepId, reason) {
  return authJsonRequest(`/api/production/orders/steps/${encodeURIComponent(stepId)}/block`, "POST", { reason }, "Failed to block step.");
}

export async function skipProductionOrderStep(stepId) {
  return authJsonRequest(`/api/production/orders/steps/${encodeURIComponent(stepId)}/skip`, "POST", undefined, "Failed to skip step.");
}



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



export async function getMaterialStocks() {
  const data = await authorizedRequest("/api/material-stock", { method: "GET" }, "Failed to load material stock.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getMaterialStockById(id) {
  return authorizedRequest(`/api/material-stock/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to load material stock.");
}

export async function createMaterialStock(payload) {
  return authJsonRequest("/api/material-stock", "POST", payload, "Failed to create material stock item.");
}

export async function updateMaterialStock(payload) {
  return authJsonRequest("/api/material-stock", "PUT", payload, "Failed to update material stock item.");
}

export async function deleteMaterialStock(id) {
  return authorizedRequest(`/api/material-stock/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete material stock item.");
}

export async function adjustMaterialQuantity(id, adjustment) {
  return authJsonRequest("/api/material-stock/adjust", "PUT", { id, adjustment }, "Failed to adjust material quantity.");
}

export async function getLowStockMaterials(organizationId) {
  const url = organizationId ? `/api/material-stock/low-stock?organizationId=${encodeURIComponent(organizationId)}` : "/api/material-stock/low-stock";
  const data = await authorizedRequest(url, { method: "GET" }, "Failed to load low stock materials.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function repairMaterialLinks() {
  return authorizedRequest("/admin/stock/repair-material-links", { method: "POST" }, "Failed to repair material links.");
}



export async function getProductStocks() {
  const data = await authorizedRequest("/api/product-stock", { method: "GET" }, "Failed to load product stock.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getProductStockById(id) {
  return authorizedRequest(`/api/product-stock/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to load product stock.");
}

export async function createProductStock(payload) {
  return authJsonRequest("/api/product-stock", "POST", payload, "Failed to create product stock item.");
}

export async function updateProductStock(payload) {
  return authJsonRequest("/api/product-stock", "PUT", payload, "Failed to update product stock item.");
}

export async function deleteProductStock(id) {
  return authorizedRequest(`/api/product-stock/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete product stock item.");
}

export async function adjustProductQuantity(id, adjustment) {
  return authJsonRequest("/api/product-stock/adjust", "PUT", { id, adjustment }, "Failed to adjust product quantity.");
}

export async function addProductFromProduction(productName, productId, quantity, unit, organizationId) {
  const url = `/api/product-stock/from-production?productName=${encodeURIComponent(productName)}&productId=${encodeURIComponent(productId)}&quantity=${quantity}&unit=${encodeURIComponent(unit)}&organizationId=${encodeURIComponent(organizationId)}`;
  return authJsonRequest(url, "POST", null, "Failed to add product from production.");
}



export async function getScansByProduct(productId) {
  const data = await authorizedRequest(`/api/scans/product/${encodeURIComponent(productId)}`, { method: "GET" }, "Failed to load scans.");
  return unwrapList(data);
}

export async function getScansByOrg(orgId) {
  if (!orgId) return [];
  const data = await authorizedRequest(`/api/scans/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load scans.");
  return unwrapList(data);
}



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

export async function getActiveTechnicalSheet(productId) {
  return authorizedRequest(`/api/technical-sheets/product/${encodeURIComponent(productId)}/active`, { method: "GET" }, "Failed to load active technical sheet.");
}

export async function activateTechnicalSheet(id) {
  return authJsonRequest(`/api/technical-sheets/${encodeURIComponent(id)}/activate`, "POST", undefined, "Failed to activate technical sheet.");
}

export async function archiveTechnicalSheet(id) {
  return authJsonRequest(`/api/technical-sheets/${encodeURIComponent(id)}/archive`, "POST", undefined, "Failed to archive technical sheet.");
}

export async function createNewTechnicalSheetVersion(id) {
  return authJsonRequest(`/api/technical-sheets/${encodeURIComponent(id)}/new-version`, "POST", undefined, "Failed to create new version.");
}

export async function calculateBom(productId, quantity) {
  return authorizedRequest(`/api/technical-sheets/bom/${encodeURIComponent(productId)}/calculate?quantity=${quantity}`, { method: "GET" }, "Failed to calculate BOM.");
}

export async function getTechnicalSheetsByProductVersioned(productId) {
  const data = await authorizedRequest(`/api/technical-sheets/product/${encodeURIComponent(productId)}/versions`, { method: "GET" }, "Failed to load sheet versions.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getOperationItems(sheetId) {
  const data = await authorizedRequest(`/api/technical-sheets/${encodeURIComponent(sheetId)}/operation-items`, { method: "GET" }, "Failed to load operation items.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function saveOperationItems(sheetId, items) {
  return authJsonRequest(`/api/technical-sheets/${encodeURIComponent(sheetId)}/operation-items`, "PUT", items, "Failed to save operation items.");
}



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



export async function getAuditLogs(params = {}) {
  const qs = new URLSearchParams();
  if (params.entityType) qs.set("entityType", params.entityType);
  if (params.organizationId) qs.set("organizationId", params.organizationId);
  if (params.userEmail) qs.set("userEmail", params.userEmail);
  if (params.action) qs.set("action", params.action);
  if (params.startDate) qs.set("startDate", params.startDate);
  if (params.endDate) qs.set("endDate", params.endDate);
  if (params.page !== undefined) qs.set("page", params.page);
  if (params.size !== undefined) qs.set("size", params.size);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const data = await authorizedRequest(`/api/audit${query}`, { method: "GET" }, "Failed to load audit logs.");
  return data;
}

export async function getEntityAuditLogs(entityType, entityId, page = 0, size = 20) {
  const data = await authorizedRequest(
    `/api/audit/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}?page=${page}&size=${size}`,
    { method: "GET" },
    "Failed to load entity audit logs."
  );
  return data;
}



export async function getSuppliers() {
  const data = await authorizedRequest("/api/suppliers", { method: "GET" }, "Failed to load suppliers.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getSuppliersByOrg(orgId) {
  const data = await authorizedRequest(`/api/suppliers/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load suppliers.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getSupplierById(id) {
  return authorizedRequest(`/api/suppliers/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to load supplier.");
}

export async function createSupplier(payload) {
  return authJsonRequest("/api/suppliers", "POST", payload, "Failed to create supplier.");
}

export async function updateSupplier(payload) {
  return authJsonRequest("/api/suppliers", "PUT", payload, "Failed to update supplier.");
}

export async function deleteSupplier(id) {
  return authorizedRequest(`/api/suppliers/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete supplier.");
}

export async function getMaterialOrders() {
  const data = await authorizedRequest("/api/material-orders", { method: "GET" }, "Failed to load material orders.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getMaterialOrdersByOrg(orgId) {
  const data = await authorizedRequest(`/api/material-orders/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load material orders.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getMaterialOrdersByStatus(orgId, status) {
  const data = await authorizedRequest(`/api/material-orders/organization/${encodeURIComponent(orgId)}/status/${encodeURIComponent(status)}`, { method: "GET" }, "Failed to load material orders.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getMaterialOrderById(id) {
  return authorizedRequest(`/api/material-orders/${encodeURIComponent(id)}`, { method: "GET" }, "Failed to load material order.");
}

export async function createMaterialOrder(payload) {
  return authJsonRequest("/api/material-orders", "POST", payload, "Failed to create material order.");
}

export async function updateMaterialOrder(id, payload) {
  return authJsonRequest(`/api/material-orders/${encodeURIComponent(id)}`, "PUT", payload, "Failed to update material order.");
}

export async function deleteMaterialOrder(id) {
  return authorizedRequest(`/api/material-orders/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete material order.");
}

export async function updateTracking(orderId, payload) {
  return authJsonRequest(`/api/material-orders/${encodeURIComponent(orderId)}/tracking`, "POST", payload, "Failed to update tracking.");
}

export async function getTrackingHistory(orderId) {
  const data = await authorizedRequest(`/api/material-orders/${encodeURIComponent(orderId)}/tracking`, { method: "GET" }, "Failed to load tracking.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function validateReception(orderId, payload) {
  return authJsonRequest(`/api/material-orders/${encodeURIComponent(orderId)}/reception`, "POST", payload, "Failed to validate reception.");
}

export async function getReceptions(orderId) {
  const data = await authorizedRequest(`/api/material-orders/${encodeURIComponent(orderId)}/receptions`, { method: "GET" }, "Failed to load receptions.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}



export async function createDelivery(orderId, payload) {
  return authJsonRequest(`/api/material-orders/${encodeURIComponent(orderId)}/deliveries`, "POST", payload, "Failed to create delivery.");
}

export async function getDeliveriesByOrder(orderId) {
  const data = await authorizedRequest(`/api/material-orders/${encodeURIComponent(orderId)}/deliveries`, { method: "GET" }, "Failed to load deliveries.");
  return unwrapList(data);
}

export async function getDelivery(deliveryId) {
  return authorizedRequest(`/api/material-orders/deliveries/${encodeURIComponent(deliveryId)}`, { method: "GET" }, "Failed to load delivery.");
}

export async function receiveDelivery(deliveryId, payload) {
  return authJsonRequest(`/api/material-orders/deliveries/${encodeURIComponent(deliveryId)}/receive`, "POST", payload, "Failed to receive delivery.");
}



export async function createReturnRequest(orderId, payload) {
  return authJsonRequest(`/api/material-orders/${encodeURIComponent(orderId)}/returns`, "POST", payload, "Failed to create return request.");
}

export async function getReturnsByOrder(orderId) {
  const data = await authorizedRequest(`/api/material-orders/${encodeURIComponent(orderId)}/returns`, { method: "GET" }, "Failed to load returns.");
  return unwrapList(data);
}

export async function getReturn(returnId) {
  return authorizedRequest(`/api/material-orders/returns/${encodeURIComponent(returnId)}`, { method: "GET" }, "Failed to load return.");
}

export async function updateReturn(returnId, payload) {
  return authJsonRequest(`/api/material-orders/returns/${encodeURIComponent(returnId)}`, "PUT", payload, "Failed to update return.");
}

export async function getReturnsByOrg(orgId) {
  const data = await authorizedRequest(`/api/material-orders/returns/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load returns.");
  return unwrapList(data);
}



export async function createDispute(orderId, payload) {
  return authJsonRequest(`/api/material-orders/${encodeURIComponent(orderId)}/disputes`, "POST", payload, "Failed to create dispute.");
}

export async function getDisputesByOrder(orderId) {
  const data = await authorizedRequest(`/api/material-orders/${encodeURIComponent(orderId)}/disputes`, { method: "GET" }, "Failed to load disputes.");
  return unwrapList(data);
}

export async function getDispute(disputeId) {
  return authorizedRequest(`/api/material-orders/disputes/${encodeURIComponent(disputeId)}`, { method: "GET" }, "Failed to load dispute.");
}

export async function updateDispute(disputeId, payload) {
  return authJsonRequest(`/api/material-orders/disputes/${encodeURIComponent(disputeId)}`, "PUT", payload, "Failed to update dispute.");
}

export async function getDisputesByOrg(orgId) {
  const data = await authorizedRequest(`/api/material-orders/disputes/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load disputes.");
  return unwrapList(data);
}



export async function getProcurementAnalytics(orgId) {
  return authorizedRequest(`/api/material-orders/analytics/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load analytics.");
}

export async function getSupplierPerformance(supplierId, orgId) {
  return authorizedRequest(`/api/material-orders/analytics/supplier/${encodeURIComponent(supplierId)}?orgId=${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load supplier performance.");
}

export async function processReturn(orderId, itemId, returnQuantity, rejectionReason, notes) {
  const params = new URLSearchParams({ itemId, returnQuantity: String(returnQuantity), rejectionReason });
  if (notes) params.append("notes", notes);
  return authorizedRequest(`/api/material-orders/${encodeURIComponent(orderId)}/return?${params}`, { method: "POST" }, "Failed to process return.");
}



export async function getStockMovementsByOrg(orgId) {
  const data = await authorizedRequest(`/api/stock-movements/organization/${encodeURIComponent(orgId)}`, { method: "GET" }, "Failed to load stock movements.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getStockMovementsByOrder(orderId) {
  const data = await authorizedRequest(`/api/stock-movements/order/${encodeURIComponent(orderId)}`, { method: "GET" }, "Failed to load stock movements.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getStockMovementsByProduction(productionId) {
  const data = await authorizedRequest(`/api/stock-movements/production/${encodeURIComponent(productionId)}`, { method: "GET" }, "Failed to load stock movements.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}



export async function getMyNotifications(userId) {
  const userIdToUse = userId || localStorage.getItem("userId");
  if (!userIdToUse) return [];
  const data = await authorizedRequest(`/api/notifications?userId=${encodeURIComponent(userIdToUse)}`, { method: "GET" }, "Failed to load notifications.");
  return unwrapList(data);
}

export async function getUnreadNotifications(userId) {
  const userIdToUse = userId || localStorage.getItem("userId");
  if (!userIdToUse) return [];
  const data = await authorizedRequest(`/api/notifications/unread?userId=${encodeURIComponent(userIdToUse)}`, { method: "GET" }, "Failed to load unread notifications.");
  return unwrapList(data);
}

export async function getUnreadNotificationCount(userId) {
  const userIdToUse = userId || localStorage.getItem("userId");
  if (!userIdToUse) return { count: 0 };
  const data = await authorizedRequest(`/api/notifications/unread/count?userId=${encodeURIComponent(userIdToUse)}`, { method: "GET" }, "Failed to load unread count.");
  return data;
}

export async function markNotificationRead(id) {
  return authJsonRequest(`/api/notifications/${encodeURIComponent(id)}/read`, "PUT", {}, "Failed to mark notification as read.");
}

export async function markAllNotificationsRead() {
  return authJsonRequest("/api/notifications/read-all", "PUT", {}, "Failed to mark all as read.");
}

export async function deleteNotification(id) {
  return authorizedRequest(`/api/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete notification.");
}



export async function getOrderItemRequirements(orderId, itemIndex) {
  return authorizedRequest(`/api/orders/${encodeURIComponent(orderId)}/items/${itemIndex}/requirements`, { method: "GET" }, "Failed to load material requirements.");
}

export async function getBulkOrderRequirements(orderIds) {
  return authorizedRequest("/api/orders/bulk-requirements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderIds),
  }, "Failed to load bulk requirements.");
}

export async function calculateBulkRequirements(orderIds) {
  return authorizedRequest("/api/orders/bulk/requirements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderIds),
  }, "Failed to calculate bulk requirements.");
}

export async function calculateSequentialRequirements(orderIds) {
  return authorizedRequest("/api/orders/bulk/requirements/sequential", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderIds),
  }, "Failed to calculate sequential requirements.");
}

export async function recalculateBulkRequirements(payload) {
  return authorizedRequest("/api/orders/bulk/requirements/recalculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, "Failed to recalculate bulk requirements.");
}



export async function submitContact(payload) {
  const response = await fetch(`${API_BASE_URL}/api/public/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response, "Failed to submit contact form.");
}



export async function assignProductionStep(productionId, stepIndex, employeeName) {
  return authorizedRequest(
    `/api/productions/${encodeURIComponent(productionId)}/step/${stepIndex}/assign?employeeName=${encodeURIComponent(employeeName)}`,
    { method: 'PUT' },
    'Failed to assign step.'
  );
}



export async function getProductionByOrderId(orderId) {
  return authJsonRequest(`/api/productions/by-order/${encodeURIComponent(orderId)}`, 'GET', undefined, 'Failed to load productions by order.');
}



export async function getAllocationReview(orderIds) {
  return authJsonRequest("/api/orders/allocation-review", "POST", orderIds, "Failed to load allocation review.");
}

export async function recalculateAllocation(payload) {
  return authJsonRequest("/api/orders/recalculate-allocation", "POST", payload, "Failed to recalculate allocation.");
}

export async function previewAllocationImpact(sessionId) {
  return authJsonRequest("/api/orders/preview-impact", "POST", { sessionId }, "Failed to preview impact.");
}

export async function confirmAllocation(sessionId) {
  return authJsonRequest("/api/orders/allocation/confirm", "POST", { sessionId }, "Failed to confirm allocation.");
}

export async function reserveStockForOrder(orderId) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(orderId)}/reserve-stock`, "POST", {}, "Failed to reserve stock.");
}

export async function releaseReservations(orderId) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(orderId)}/release-reservations`, "POST", {}, "Failed to release reservations.");
}

export async function sendToDelivery(orderId, partialItems) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(orderId)}/send-to-delivery`, "POST", partialItems || null, "Failed to send to delivery.");
}

export async function cancelAllocation(orderId) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(orderId)}/cancel-allocation`, "POST", {}, "Failed to cancel allocation.");
}

export async function getProductionAllocation(orderIds) {
  return authJsonRequest("/api/orders/production-allocation", "POST", orderIds, "Failed to load production allocation.");
}

export async function startProductionForItem(orderId, productId, quantityToProduce) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(productId)}/start-production`, "POST", { quantityToProduce }, "Failed to start production.");
}

export async function calculateRequirements() {
  return authJsonRequest("/api/orders/calculate-requirements", "POST", {}, "Failed to calculate requirements.");
}

export async function confirmDeliveryDate(orderId, confirmedDeliveryDate) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(orderId)}/confirm-delivery-date`, "POST", { confirmedDeliveryDate }, "Failed to confirm delivery date.");
}

export async function checkProductionCapacity(requiredUnits, organizationId) {
  return authorizedRequest(`/api/orders/production/capacity-check?requiredUnits=${requiredUnits}&organizationId=${encodeURIComponent(organizationId)}`, { method: "GET" }, "Failed to check capacity.");
}

export async function getDeliveryLogs(orderId) {
  const data = await authorizedRequest(`/api/orders/${encodeURIComponent(orderId)}/delivery-logs`, { method: "GET" }, "Failed to load delivery logs.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function acquireOrderLock(orderId) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(orderId)}/lock`, "POST", {}, "Failed to acquire lock.");
}

export async function releaseOrderLock(orderId) {
  return authJsonRequest(`/api/orders/${encodeURIComponent(orderId)}/unlock`, "POST", {}, "Failed to release lock.");
}

export async function getOrderLockStatus(orderId) {
  return authorizedRequest(`/api/orders/${encodeURIComponent(orderId)}/lock-status`, { method: "GET" }, "Failed to get lock status.");
}

export async function getPredictiveAnalysis(organizationId, scope = "ORG") {
  const token = localStorage.getItem("accessToken");
  const params = new URLSearchParams();
  if (organizationId) params.append("organizationId", organizationId);
  params.append("scope", scope);
  const response = await fetch(`${API_BASE_URL}/api/ai/predictive?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonResponse(response, "Failed to fetch predictive analysis.");
}



export async function getActiveSessions() {
  const data = await authorizedRequest("/api/sessions", { method: "GET" }, "Failed to load sessions.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function revokeSession(sessionId) {
  return authorizedRequest(
    `/api/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
    "Failed to revoke session."
  );
}

export async function revokeAllOtherSessions() {
  return authorizedRequest("/api/sessions", { method: "DELETE" }, "Failed to revoke all sessions.");
}

export async function logoutAllDevices() {
  return authorizedRequest("/auth/logout-all", { method: "POST" }, "Failed to logout all devices.");
}

export async function getSuspiciousSessions() {
  const data = await authorizedRequest("/api/sessions/suspicious", { method: "GET" }, "Failed to load suspicious sessions.");
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export async function getRecentFailedAttempts() {
  const data = await authorizedRequest("/auth/security/failed-attempts", { method: "GET" }, "Failed to load security info.");
  return data?.data ?? data;
}




export function apiErrorMessage(error, fallback = "An error occurred. Please try again.") {
  if (!error) return fallback;

  if (error.status === 429) {
    const wait = error.retryAfter || 60;
    return `Too many requests. Please wait ${wait} seconds before trying again.`;
  }

  if (error.status === 401 || error.code === "AUTHENTICATION_FAILED" || error.code === "INVALID_CREDENTIALS") {
    return "Your session has expired. Please log in again.";
  }

  if (error.status === 403 || error.code === "ACCESS_DENIED") {
    return "You do not have permission to perform this action.";
  }

  if (error.fieldErrors && typeof error.fieldErrors === "object") {
    return Object.values(error.fieldErrors).filter(Boolean).join(" ") || error.message || fallback;
  }

  if (error.code === "VALIDATION_ERROR") {
    return error.message || "Some fields are invalid. Please check your input.";
  }

  return error.message || fallback;
}



// ─── DEPARTMENTS ────────────────────────────────────────────────────────────

export async function getDepartments() {
  const data = await authorizedRequest("/api/departments", { method: "GET" }, "Failed to load departments.");
  return unwrapList(data);
}

export async function getDepartmentsByOrg(organizationId) {
  const data = await authorizedRequest(`/api/departments/organization/${encodeURIComponent(organizationId)}`, { method: "GET" }, "Failed to load departments.");
  return unwrapList(data);
}

export async function createDepartment(payload) {
  return authJsonRequest("/api/departments", "POST", payload, "Failed to create department.");
}

export async function updateDepartment(id, payload) {
  return authJsonRequest(`/api/departments/${encodeURIComponent(id)}`, "PUT", payload, "Failed to update department.");
}

export async function deleteDepartment(id) {
  return authorizedRequest(`/api/departments/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete department.");
}



// ─── SKILLS ─────────────────────────────────────────────────────────────────

export async function getSkills() {
  const data = await authorizedRequest("/api/skills", { method: "GET" }, "Failed to load skills.");
  return unwrapList(data);
}

export async function getActiveSkills() {
  const data = await authorizedRequest("/api/skills/active", { method: "GET" }, "Failed to load skills.");
  return unwrapList(data);
}

export async function createSkill(payload) {
  return authJsonRequest("/api/skills", "POST", payload, "Failed to create skill.");
}

export async function updateSkill(id, payload) {
  return authJsonRequest(`/api/skills/${encodeURIComponent(id)}`, "PUT", payload, "Failed to update skill.");
}

export async function deleteSkill(id) {
  return authorizedRequest(`/api/skills/${encodeURIComponent(id)}`, { method: "DELETE" }, "Failed to delete skill.");
}



// ─── ATTENDANCE ──────────────────────────────────────────────────────────────

export async function checkIn(payload) {
  return authJsonRequest("/api/attendance/check-in", "POST", payload, "Failed to check in.");
}

export async function checkOut(employeeId) {
  return authJsonRequest(`/api/attendance/check-out/${encodeURIComponent(employeeId)}`, "POST", undefined, "Failed to check out.");
}

export async function getAttendance() {
  const data = await authorizedRequest("/api/attendance", { method: "GET" }, "Failed to load attendance.");
  return unwrapList(data);
}

export async function getAttendanceByEmployee(employeeId) {
  const data = await authorizedRequest(`/api/attendance/employee/${encodeURIComponent(employeeId)}`, { method: "GET" }, "Failed to load attendance.");
  return unwrapList(data);
}

export async function getAttendanceByOrg(organizationId) {
  const data = await authorizedRequest(`/api/attendance/organization/${encodeURIComponent(organizationId)}`, { method: "GET" }, "Failed to load attendance.");
  return unwrapList(data);
}



// ─── LEAVES ──────────────────────────────────────────────────────────────────

export async function getLeaves() {
  const data = await authorizedRequest("/api/leaves", { method: "GET" }, "Failed to load leave requests.");
  return unwrapList(data);
}

export async function getLeavesByEmployee(employeeId) {
  const data = await authorizedRequest(`/api/leaves/employee/${encodeURIComponent(employeeId)}`, { method: "GET" }, "Failed to load leave requests.");
  return unwrapList(data);
}

export async function getLeavesByOrg(organizationId) {
  const data = await authorizedRequest(`/api/leaves/organization/${encodeURIComponent(organizationId)}`, { method: "GET" }, "Failed to load leave requests.");
  return unwrapList(data);
}

export async function createLeaveRequest(payload) {
  return authJsonRequest("/api/leaves", "POST", payload, "Failed to submit leave request.");
}

export async function approveLeave(id, reason) {
  return authJsonRequest(`/api/leaves/${encodeURIComponent(id)}/approve`, "PATCH", reason ? { reason } : {}, "Failed to approve leave.");
}

export async function rejectLeave(id, reason) {
  return authJsonRequest(`/api/leaves/${encodeURIComponent(id)}/reject`, "PATCH", reason ? { reason } : {}, "Failed to reject leave.");
}



// ─── TECHNICAL SHEET VALIDATION ─────────────────────────────────────────────

export async function validateProductTechnicalSheet(productId) {
  const data = await authorizedRequest(`/api/technical-sheets/validate/product/${encodeURIComponent(productId)}`, { method: "GET" }, "Failed to validate technical sheet.");
  return data?.data ?? data;
}

export async function validateOrderTechnicalSheets(orderId) {
  const data = await authorizedRequest(`/api/technical-sheets/validate/order/${encodeURIComponent(orderId)}`, { method: "GET" }, "Failed to validate order technical sheets.");
  return data?.data ?? data;
}

export async function validateOrdersTechnicalSheets(orderIds) {
  const data = await authorizedRequest("/api/technical-sheets/validate/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderIds),
  }, "Failed to validate orders technical sheets.");
  return data?.data ?? data;
}

// ─── WORKFORCE PLANNING & PERFORMANCE ───────────────────────────────────────

export async function getEmployeeWorkload(employeeId) {
  const data = await authorizedRequest(`/api/workforce/employees/${encodeURIComponent(employeeId)}/workload`, { method: "GET" }, "Failed to load workload.");
  return data?.data ?? data;
}

export async function getEmployeePerformance(employeeId) {
  const data = await authorizedRequest(`/api/workforce/employees/${encodeURIComponent(employeeId)}/performance`, { method: "GET" }, "Failed to load performance.");
  return data?.data ?? data;
}

export async function getWorkforcePlan(organizationId) {
  const data = await authorizedRequest(`/api/workforce/planning?organizationId=${encodeURIComponent(organizationId)}`, { method: "GET" }, "Failed to load workforce plan.");
  return data?.data ?? data;
}



// ─── EMPLOYEE SELF-SERVICE ───────────────────────────────────────────────────

export async function getMyProfile() {
  return authorizedRequest("/api/employees/me", { method: "GET" }, "Failed to load profile.");
}

export async function getMyAttendance() {
  const data = await authorizedRequest("/api/attendance/me", { method: "GET" }, "Failed to load attendance.");
  return unwrapList(data);
}

export async function checkInSelf(notes) {
  const employeeId = localStorage.getItem("employeeId") || localStorage.getItem("userId");
  const organizationId = localStorage.getItem("orgId") || localStorage.getItem("organizationId");
  return authJsonRequest("/api/attendance/check-in", "POST", { employeeId, organizationId, notes }, "Failed to check in.");
}

export async function checkOutSelf() {
  return authJsonRequest("/api/attendance/check-out/me", "POST", undefined, "Failed to check out.");
}

export async function getMyLeaves() {
  const data = await authorizedRequest("/api/leaves/me", { method: "GET" }, "Failed to load leaves.");
  return unwrapList(data);
}

export async function submitMyLeave(payload) {
  const employeeId = localStorage.getItem("employeeId") || localStorage.getItem("userId");
  const organizationId = localStorage.getItem("orgId") || localStorage.getItem("organizationId");
  return authJsonRequest("/api/leaves", "POST", { ...payload, employeeId, organizationId }, "Failed to submit leave.");
}

export async function getMyAssignments() {
  const data = await authorizedRequest("/api/productions/my-assignments", { method: "GET" }, "Failed to load assignments.");
  return unwrapList(data);
}

export async function startMyStep(productionId, stepIndex) {
  return authorizedRequest(`/api/productions/${encodeURIComponent(productionId)}/step/start/${stepIndex}`, { method: "PUT" }, "Failed to start step.");
}

export async function completeMyStep(productionId, stepIndex) {
  return authorizedRequest(`/api/productions/${encodeURIComponent(productionId)}/step/complete/${stepIndex}`, { method: "PUT" }, "Failed to complete step.");
}
