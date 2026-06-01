---
title: AUTH_SECURITY
description: JWT, OAuth2, role-based access, token lifecycle, public routes
type: reference
---

# Auth & Security

## Role Hierarchy

```
ADMIN       → Full access: all orgs, all operations, user management
SUBADMIN    → Same as ADMIN within their org; cannot manage other org users
EMPLOYEE    → Read-only most areas; can update task/production step status
CLIENT      → Can create orders, view own orders, view DPPs
```

`@PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")` guards most write endpoints.

---

## Authentication Flows

### Email/Password Login
```
POST /auth/login  { email, password }
    → AuthService.login()
    → BCrypt verify (work factor 12)
    → Generate accessToken (HS256, 15 min) + refreshToken (7 days)
    → Save Token entity to MongoDB (for revocation tracking)
    → Return AuthResponse { accessToken, refreshToken, userId, email, role, organizationId, assignedOrganizationIds }
```

### Google OAuth2
```
User clicks "Login with Google"
    → Spring Security redirects to /oauth2/authorization/google
    → Google redirects back to /login/oauth2/code/google
    → OAuth2SuccessHandler:
        - Find or create User from Google profile
        - Generate JWT tokens
        - Redirect to frontend: /oauth2/callback?token=...&refresh=...
    → Frontend OAuth2CallbackPage stores tokens in localStorage
```

### Token Refresh
```
POST /auth/refresh  { refreshToken }
    → JwtService.validateRefreshToken()
    → Revoke old tokens in DB
    → Issue new accessToken + refreshToken
    → Return new AuthResponse
```

### Logout
```
POST /auth/logout  (requires auth)
    → Mark all user tokens as revoked in MongoDB
    → Frontend clears localStorage
```

---

## JWT Implementation

**Algorithm:** HS256  
**Secret:** `${JWT_SECRET}` (env var, minimum 256-bit)  
**Access Token TTL:** 15 minutes  
**Refresh Token TTL:** 7 days  
**Claims:** userId, email, role, organizationId, issuedAt, expiration

**Validation:** `JwtFilter extends OncePerRequestFilter`
1. Extract `Authorization: Bearer <token>` header
2. Parse and validate signature + expiry
3. Check token is not revoked in MongoDB `tokens` collection
4. Set `UsernamePasswordAuthenticationToken` in `SecurityContextHolder`

---

## Frontend Auth State

**Storage:** `localStorage`
- `accessToken` — JWT string
- `refreshToken` — JWT string
- `user` — JSON object `{ id, email, role, organizationId, assignedOrganizationIds }`

**Auto-refresh:** `authService.js`
- `authorizedRequest()` checks token expiry before every request
- Refreshes token if within 3 minutes of expiry
- Concurrent request queue: if refresh in progress, subsequent requests wait rather than firing parallel refreshes

**Key functions in authService.js:**
```js
isAuthenticated()          // checks localStorage for valid token
refreshAccessToken()       // POST /auth/refresh, updates localStorage
authorizedRequest(path, options)  // main fetch wrapper with auto-refresh
authJsonRequest(path, method, body)  // convenience for JSON payloads
```

---

## Public Endpoints (No Auth Required)

```
POST /auth/login
POST /auth/register
POST /auth/refresh
POST /auth/logout

GET  /api/products/{id}/dpp      → DPP view (records scan)
POST /api/scans                  → QR scan event recording
POST /api/ai/public/chat         → Landing page chatbot
GET  /api/public/landing         → Public stats
POST /api/public/contact         → Contact form lead

GET  /v3/api-docs/**             → OpenAPI spec
GET  /swagger-ui/**              → Swagger UI
GET  /oauth2/**
GET  /login/oauth2/**
```

---

## CORS Configuration

Configured in `SecurityConfig.java`:
- Allowed origins: pattern-based (`http://localhost:*`, `http://127.0.0.1:*`, production domain)
- Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Allowed headers: Authorization, Content-Type, X-Requested-With
- Credentials: true (for cookie/auth headers)
- CSRF: **disabled** (stateless JWT, no cookies)

---

## Multi-Org Permission Check

`PermissionService` validates org membership:
```java
// User must belong to the org they're querying
permissionService.validateOrgAccess(user, organizationId);
```

Users can belong to multiple orgs via `assignedOrganizationIds[]`. ADMIN users have access across all orgs.

---

## Audit Trail for Security Events

Every write operation calls `AuditService.logAction()`:
- Entity type + ID
- Action: CREATE | UPDATE | DELETE | STATUS_CHANGE
- User ID + email + timestamp
- Before/after state as `Map<String, Object>`
- Organization ID

Audit logs are **never deleted** — they form the compliance trail.

**Endpoints:**
```
GET /api/audit                              → All logs (filterable)
GET /api/audit/entity/{type}/{id}           → Per-entity history
```

Filters: `entityType`, `action`, `userEmail`, `startDate`, `endDate`, `page`, `size`

---

## Password Policy

- BCrypt with work factor 12
- No plain-text storage anywhere
- Password change requires current password verification (`PUT /api/users/password`)
- Admin can reset user passwords via `AdminController`

---

## Token Storage (MongoDB `tokens` collection)

```json
{
  "id": "...",
  "token": "<jwt-string>",
  "userId": "...",
  "tokenType": "BEARER",
  "revoked": false,
  "expired": false,
  "createdAt": "..."
}
```

Tokens are marked `revoked=true` on logout and when a new refresh is issued (rolling refresh).

---

## WebSocket Auth

`WebSocketAuthInterceptor` validates JWT before STOMP handshake:
- Extracts token from CONNECT frame header
- Validates same as JwtFilter
- Rejects if invalid → WebSocket connection dropped

---

## Common Security Mistakes to Avoid

1. **Don't skip `@PreAuthorize`** on any new endpoint that touches org data.
2. **Don't return full entity lists** without organizationId filter.
3. **Don't log JWT tokens** — log only userId/email.
4. **Don't add CLIENT role** to write endpoints for orders (admin confirms, not clients).
5. **Don't expose internal IDs** in error messages — use generic messages in production.
6. **Don't allow CORS `*`** — always use specific origin patterns.
