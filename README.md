<div align="center">

# 🏭 SmartTex DPP

### Enterprise Smart Manufacturing & Digital Product Passport Platform

*Empowering textile and industrial manufacturers with full product traceability, AI-powered compliance analysis, and real-time production lifecycle management.*

---

![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT_+_OAuth2-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![i18n](https://img.shields.io/badge/i18n-10_Languages-blueviolet?style=for-the-badge)
![Groq AI](https://img.shields.io/badge/AI-Groq_LLaMA_3.3-orange?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active_Development-brightgreen?style=for-the-badge)

</div>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Main Features](#-main-features)
- [Technologies Used](#-technologies-used)
- [System Architecture](#-system-architecture)
- [User Roles & Permissions](#-user-roles--permissions)
- [Application Modules](#-application-modules)
- [Database Design](#-database-design)
- [Security](#-security)
- [AI Integration](#-ai-integration)
- [Screenshots](#-screenshots)
- [Installation Guide](#-installation-guide)
- [API Reference](#-api-reference)
- [Future Improvements](#-future-improvements)
- [Conclusion](#-conclusion)

---

## 🌐 Project Overview

### What is SmartTex DPP?

**SmartTex DPP** is a full-stack enterprise SaaS platform built for textile and industrial manufacturers. It centralizes every operational layer — production scheduling, inventory management, employee coordination, and quality tracking — under a single platform, while automatically generating **Digital Product Passports (DPP)** that make each product's full lifecycle verifiable by QR scan.

The platform ships a public-facing landing page, a secure multi-tenant web application, and a REST API backend — all production-ready and containerized with Docker.

### The Problem

Modern manufacturing companies face compounding operational and regulatory challenges:

- **No traceability** — products leave factories with no verifiable record of what went into them or how they were made
- **Fragmented operations** — production, stock, HR, and quality management run on disconnected tools
- **Regulatory pressure** — the EU Ecodesign for Sustainable Products Regulation (ESPR) mandates machine-readable DPPs for textile products
- **Consumer demand** — buyers increasingly require proof of material origin, sustainability, and ethical production

### Why Digital Product Passport?

The **Digital Product Passport (DPP)** is a structured digital record that follows a product from raw material through production and delivery. It is the core output of this platform and serves as the primary compliance artifact for regulatory submissions and client transparency.

| Benefit | Description |
|---|---|
| 🔍 Full Traceability | Every production step, material, and quality check is recorded |
| ✅ EU ESPR Compliance | Meets Digital Product Passport mandates for textile/industrial goods |
| 🌱 Sustainability Proof | Verified material composition, recycled content, and end-of-life instructions |
| 📱 Instant Access | Any stakeholder scans a QR code to view the full DPP — no app required |
| 🤖 AI Scoring | Automated DPP completeness score (0–100) highlights missing data |

---

## ✨ Main Features

### 🪪 Digital Product Passport (DPP)
Each product receives a complete DPP containing company name, product name, SKU, variant, material composition with recycled content percentages, end-of-life instructions, and free-form extra fields. The DPP is publicly accessible at a unique URL and scannable via QR code with no authentication required. An AI completeness score (0–100) rates the quality of each passport.

### 📱 QR Code Traceability
Every product gets a `qrUrl` and a `dppUrl`. Each QR scan is logged as a `ScanEvent` capturing timestamp, IP address, geolocation (latitude/longitude), user agent, referrer, and the scanning user's email if authenticated. Scan analytics are available per product and per organization.

### 🔐 QR Security & Scan Intelligence
All QR codes are cryptographically signed using HMAC-SHA256. The signature includes the product ID, version number, and an expiry timestamp. Scans are verified in real-time:
- **Invalid QR** — signature mismatch is flagged
- **Modified QR** — tampering triggers `INVALID_SIGNATURE`
- **Expired QR** — signatures older than 365 days are marked `EXPIRED_QR`
- **Unknown QR** — product ID not found in database

The scan anomaly engine detects:
- **Repeated scans** — same product + IP within 10 seconds
- **Impossible travel** — scans from distant locations faster than 900 km/h
- **Unusual location** — rapid geographic changes
- **Rate abuse** — >50 scans/hour from a single IP
- **Fake products** — 3+ anomaly flags or risk score ≥70

Each `ScanEvent` stores: risk score (0–100), anomaly flags list, signature validity, and fake product indicator. Suspicious scan alerts are created automatically.

### 🏗️ Production Management
Production orders are created against specific products and organizations with a defined quantity and status lifecycle: `PLANNED → IN_PROGRESS → COMPLETED / CANCELLED`. Each order contains ordered production steps with fields for machine, operator, duration, quality check, start/end dates, and completion state.

### 🔄 Production Step Tracking
Individual steps within a production order can be started and completed independently via dedicated API calls. Each step captures `startDate`, `endDate`, `durationMinutes`, the assigned `operator`, the `machine` used, and a `qualityCheck` note — creating a full, timestamped production audit trail.

### 📦 Smart Stock Management

#### Material Stock
Raw material inventory tracks name, quantity, unit, minimum threshold, and organization. A dedicated low-stock endpoint returns all materials currently below their threshold, enabling automated replenishment alerts.

#### Product Stock
Finished goods inventory is updated manually or automatically from completed production orders via the `from-production` endpoint. Quantity adjustments (positive and negative) are tracked with the user who made the change.

### ✅ Task Management
Tasks support five statuses (`TODO, IN_PROGRESS, REVIEW, DONE, CANCELLED`) and four priority levels (`LOW, MEDIUM, HIGH, URGENT`). Tasks can be assigned to multiple employees, carry a progress percentage, have a due date, and support inline status updates without a full PUT request.

### 👥 Employee Management
A lightweight employee directory within each organization tracks name, email, role, and timestamps. Employees can be assigned to tasks and referenced in production steps. The organization filter allows multi-org deployments to segment their workforce.

### 🏢 Multi-tenant Organization System
The platform supports a two-level organization hierarchy: **Main organizations** (parent companies) and **Sub organizations** (departments, factories, or subsidiaries). Users are assigned to one or more organizations, and all data is scoped strictly by `organizationId`. Admins can assign users to organizations and manage the hierarchy dynamically.

### 🔐 Authentication & Authorization
Authentication combines email/password login with Google OAuth2. JWT access tokens (15-minute expiry) and refresh tokens (7-day expiry) are issued on login. The frontend auto-refreshes tokens 3 minutes before expiry and queues concurrent requests to prevent race conditions. All tokens are stored in MongoDB and revocable on logout.

### 📄 Technical Sheets
Two types of technical sheets — `MATERIAL_SHEET` and `OPERATION_SHEET` — link specification templates to products. Each sheet manages a library of reusable **materials** (with reference codes and units) and **operations** (with default durations and descriptions). Sheet items define the bill of materials and sequenced operation list for a product. Sheets are exportable as PDF via jsPDF/autotable.

### 📊 Dashboard & Analytics
A unified dashboard endpoint aggregates KPIs, activity items, bottlenecks, risk products, priority items, and user counts — all scoped to the requesting user's organization. The frontend's Analytics page adds order/production/task/scan/employee counts with bar chart visualizations and organization filtering.

### 🛡️ Audit Logging
Every create, update, delete, and status change across all entities is logged to an `audit_logs` collection. Each log entry records entity type, entity ID, action, actor email, timestamp, before/after change map, organization, and a human-readable description. Logs are filterable by entity type, action, user email, organization, and date range — with pagination.

### 🤖 AI Assistant
A floating chatbot widget appears on all authenticated pages. It is context-aware: ADMIN/SUBADMIN/EMPLOYEE users get a staff prompt with live database access (list products, count orders, scan counts, etc.); CLIENT users get a product-focused prompt; public landing page visitors get a restricted public prompt. The AI runs on **Groq** with `llama-3.3-70b-versatile`.

### 🌍 Multi-language Support
The platform supports **10 languages**: English, French, Arabic (RTL), Spanish, German, Italian, Portuguese, Dutch, Turkish, and Chinese. Language preference is persisted to localStorage and auto-detected from the browser.

### 🌱 Sustainability & Transparency
Material composition fields track recycled content percentage per material. End-of-life instructions are a required DPP field. The AI scoring engine penalizes incomplete sustainability data, surfacing gaps before regulatory submission.

---

## 🛠️ Technologies Used

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React.js** | 19.x | Component-based UI framework |
| **Tailwind CSS** | 3.4.x | Utility-first responsive styling |
| **React Router** | 7.x | Client-side routing with route guards |
| **i18next** | 26.x | Internationalization (10 languages, RTL support) |
| **jsPDF + autotable** | 4.x / 5.x | Technical sheet PDF export |
| **Fetch API** | native | HTTP client (custom wrapper in authService) |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Spring Boot** | 3.x | Enterprise Java application framework |
| **Spring Security** | 6.x | JWT filter chain + OAuth2 |
| **Spring Data MongoDB** | — | Repository layer, ODM for MongoDB |
| **jjwt** | — | JWT generation and validation (HS256) |
| **MongoDB** | 7.x | Multi-tenant document database |
| **Groq API** | — | LLM inference (llama-3.3-70b-versatile) |
| **Cloudinary** | — | Product image upload and hosting |
| **Spring Mail** | — | Gmail SMTP email notifications |
| **N8n Webhooks** | — | Login and registration event notifications |
| **Spring Cache** | SimpleCache | Product data caching |
| **MapStruct** | — | DTO ↔ Entity mapping |

### DevOps & Tooling

| Tool | Purpose |
|---|---|
| **Git & GitHub** | Version control and collaboration |
| **Docker & Docker Compose** | Containerization and local orchestration |
| **Postman** | API testing and endpoint documentation |
| **Lucidchart** | Architecture and data model diagrams |
| **IntelliJ IDEA** | Backend development IDE |
| **VS Code** | Frontend development IDE |

---

## 🏛️ System Architecture

SmartTex DPP is a **decoupled, layered architecture**: a React 19 SPA communicates with a Spring Boot 3 REST API over HTTPS. The backend applies a strict Controller → Service → Repository separation. All data lives in a MongoDB instance with per-document `organizationId` scoping for multi-tenancy.

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│   Browser (React 19 SPA + Tailwind)                         │
│   21 pages · 16 components · 80+ API functions              │
│   10 languages · JWT auto-refresh · OAuth2 callback         │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS / REST (JSON)
┌───────────────────────────▼──────────────────────────────────┐
│                     SPRING BOOT API                          │
│   Port 8080                                                  │
│   ┌────────────────┐  ┌──────────────────────────────────┐  │
│   │  Security Layer│  │       Controller Layer            │  │
│   │  JwtFilter     │  │  Auth · Product · Production      │  │
│   │  OAuth2Handler │  │  Stock · Tasks · Employees        │  │
│   │  RBAC (@Pre)   │  │  TechnicalSheet · Orders · AI     │  │
│   └────────────────┘  │  Scans · Audit · Dashboard        │  │
│                        └────────────────┬─────────────────┘  │
│   ┌─────────────────────────────────────▼─────────────────┐  │
│   │                   Service Layer                        │  │
│   │  Business logic · Audit logging · AI routing          │  │
│   │  Cloudinary uploads · N8n webhooks · Caching          │  │
│   └─────────────────────────────────────┬─────────────────┘  │
└─────────────────────────────────────────┼────────────────────┘
                                          │
┌─────────────────────────────────────────▼────────────────────┐
│                     DATA LAYER                               │
│   MongoDB — 17 collections — organizationId-scoped          │
│   users · organizations · products · productions · orders   │
│   technical_sheets · material_stock · product_stock         │
│   tasks · employees · scan_events · audit_logs · tokens     │
│   ts_materials · ts_operations · material_sheet_items       │
│   operation_sheet_items · contact_leads                     │
└──────────────────────────────────────────────────────────────┘

External Services
  ├── Groq API        → AI chat (llama-3.3-70b-versatile)
  ├── Google OAuth2   → Social login
  ├── Cloudinary      → Product image hosting
  ├── Gmail SMTP      → Email notifications
  └── N8n Webhooks    → Registration / login event hooks
```

### Authentication Flow

```
Email/Password:
  1. POST /auth/login → Spring Security validates credentials
  2. BCrypt password verification
  3. Access token (15min, HS256 JWT) + Refresh token (7 days) issued
  4. Both tokens stored in MongoDB `tokens` collection
  5. Frontend stores tokens in localStorage, auto-refreshes 3min before expiry

Google OAuth2:
  1. Browser redirects to /oauth2/authorization/google
  2. Google callback hits /login/oauth2/code/google
  3. OAuth2SuccessHandler finds or creates user (default role: CLIENT)
  4. Tokens generated, user redirected to /oauth2/callback?token=...
  5. OAuth2CallbackPage stores session, redirects by role

Every API Request:
  6. Authorization: Bearer <accessToken> header
  7. JwtFilter extracts + validates token
  8. Checks token not revoked in MongoDB
  9. Role loaded into SecurityContext → @PreAuthorize evaluated
```

### QR Code & DPP Workflow

```
1. Product created → backend assigns publicSlug, qrUrl, dppUrl
2. QR code encoded from dppUrl (public endpoint)
3. Consumer scans QR → GET /api/products/{id}/dpp (no auth required)
4. Backend calls ScanService.recordDppOpen() → ScanEvent persisted
5. ScanEvent captures: IP, user-agent, lat/lng, timestamp, email (if auth)
6. DPP response includes: product data + AI completeness score
7. Frontend PassportPage renders DPP with timeline + material composition
```

---

## 👤 User Roles & Permissions

The platform defines four roles. Access is enforced at both frontend (route guards, nav visibility) and backend (`@PreAuthorize` on every controller method).

| Role | Scope | Key Access |
|---|---|---|
| **ADMIN** | Platform-wide | All endpoints · User management · All organizations · Audit logs |
| **SUBADMIN** | Organization-scoped | Products · Production · Stock · Orders · Tasks · Employees · Technical Sheets · Scans · AI (org-level) |
| **EMPLOYEE** | Individual | Dashboard · Products (read) · Tasks (own + status updates) · Scans (create) · AI assistant |
| **CLIENT** | Public + Orders | Products (read) · DPP scan (public) · Orders (create + own) · Support chat |

### Permission Matrix

| Permission | ADMIN | SUBADMIN | EMPLOYEE | CLIENT |
|---|:---:|:---:|:---:|:---:|
| USERS_MANAGE | ✅ | — | — | — |
| ORGANIZATIONS_MANAGE | ✅ | ✅ | — | — |
| PRODUCTS_MANAGE | ✅ | ✅ | — | — |
| PRODUCTS_READ | ✅ | ✅ | ✅ | ✅ |
| STOCK_MANAGE | ✅ | ✅ | — | — |
| ORDERS_MANAGE | ✅ | ✅ | — | — |
| ORDERS_CREATE | ✅ | ✅ | — | ✅ |
| PRODUCTIONS_MANAGE | ✅ | ✅ | — | — |
| EMPLOYEES_MANAGE | ✅ | ✅ | — | — |
| SCANS_CREATE | ✅ | ✅ | ✅ | — |
| AI_INSIGHTS_GLOBAL | ✅ | — | — | — |
| AI_INSIGHTS_ORG | ✅ | ✅ | — | — |
| AI_ASSISTANT_BASIC | ✅ | ✅ | ✅ | ✅ |

### Frontend Navigation by Role

| Nav Item | ADMIN | SUBADMIN | EMPLOYEE | CLIENT |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | — |
| Products | ✅ | ✅ | ✅ | ✅ |
| Orders | ✅ | ✅ | — | — |
| Production | ✅ | ✅ | — | — |
| Stock | ✅ | ✅ | — | — |
| Employees | ✅ | ✅ | — | — |
| Organizations | ✅ | ✅ | — | — |
| Tasks | ✅ | ✅ | ✅ | — |
| Technical Sheets | ✅ | ✅ | — | — |
| Scans | ✅ | ✅ | — | — |
| Admin Users | ✅ | — | — | — |
| Audit Log | ✅ | ✅ | — | — |

---

## 📂 Application Modules

### 🔑 Authentication Module
Handles registration (email/password), login, Google OAuth2, JWT access + refresh token lifecycle, and logout with token revocation. Token auto-refresh is implemented client-side with a queue preventing concurrent refresh races. On OAuth2 success, users are redirected with tokens in URL params which the `OAuth2CallbackPage` stores and processes.

### 🏢 Organization Module
Two-tier hierarchy: Main organizations (parent companies) and Sub organizations (departments/factories). Users are assigned to organizations with `organizationId` (primary) and `assignedOrganizationIds` (multi-org). The `OrgSelector` and `OrgPicker` components let users filter all pages by organization.

### 🏗️ Production Module
Production orders are linked to products and organizations. Each order contains an array of `ProductionStep` objects with step name, machine, operator, duration, quality check, and completion timestamps. Steps are started and completed via dedicated endpoints. Status flows: `PLANNED → IN_PROGRESS → COMPLETED / CANCELLED`.

### 📦 Stock Module
Two independent sub-modules: **Material Stock** (raw materials with minimum threshold and low-stock alerting) and **Product Stock** (finished goods, auto-updated from production via the `from-production` endpoint). Both support quantity adjustment operations and track who made each change.

### ✅ Tasks Module
Full task lifecycle with 5 statuses and 4 priorities. Tasks support multi-employee assignment, progress tracking (0–100%), due dates, and org-scoped filtering. Employees can update their own task status; managers can perform full CRUD.

### 👥 Employees Module
Lightweight workforce directory scoped per organization. Employees are referenced in task assignments and production step operators. The module is distinct from the User authentication system — an employee record and a user account are separate entities.

### 📄 Technical Sheets Module
Two sheet types: **Material Sheet** (bill of materials for a product) and **Operation Sheet** (sequenced manufacturing operations). Each sheet manages a reusable library of `ts_materials` and `ts_operations`. Sheet items link library entries to sheets with quantities and sequence order. PDF export is available from the frontend via jsPDF.

### 🛒 Orders Module
Client-facing order management with `orderReference`, product linkage, quantity, and status. Clients can create orders; ADMIN/SUBADMIN manage the full lifecycle. Orders are organization-scoped and feed into the dashboard KPI aggregation.

### 🪪 DPP & Products Module
Core module. Products store: `companyName`, `productName`, `variantName`, `sku`, `materialsComposition[]` (with `recycledContent` and `recycledPercentage` per material), `endOfLifeInstructions`, `extraFields` (flexible key-value), `qrUrl`, `dppUrl`, and a `publicSlug` for versioning. Image upload is handled via Cloudinary. CSV bulk import is supported. The public `/api/products/{id}/dpp` endpoint serves the DPP and records the scan.

### 📱 Scans Module
Every QR scan generates a `ScanEvent` with full context: product, organization, scanned URL, timestamp, IP, user agent, referrer, latitude, longitude, location text, and authenticated user email. Scan analytics are viewable per product and per organization with newest-first ordering.

### 🛡️ Audit Module
Append-only audit trail covering all entity changes. Filterable by entity type (`Product`, `Order`, `Task`, `Employee`, `Production`, `TechnicalSheet`, `Stock`), action (`CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`), user email, organization, and date range. The frontend `AuditLogPage` shows paginated results; `AuditHistoryModal` shows the change history of any specific entity inline.

### 📊 Dashboard & Analytics Module
The `/api/dashboard/me` endpoint returns a rich aggregation: activity items, operational bottlenecks, risk products, export market items, priority items, user counts, and notifications — all scoped to the authenticated user's organization. The `AnalyticsPage` adds order/production/task/scan/employee aggregate counts with bar charts.

### 🤖 AI Module
Three entry points: `/api/ai/chat` (authenticated, role-aware), `/api/ai/public/chat` (landing page visitors), and `/api/ai/products/{id}/score` (DPP completeness scoring). The chat endpoint dynamically queries the database based on user intent keywords and injects live data into the LLM context. The scoring endpoint evaluates 8 product fields and returns a 0–100 score with a list of missing fields.

### 🌐 Landing Module
Public landing page with contact form submission stored as `ContactLead` records (with IP and user agent). The landing API endpoint returns statistics and top products for the hero section.

---

## 🗄️ Database Design

SmartTex DPP uses **MongoDB 7** with 17 collections. All business data is scoped by `organizationId`. The document model accommodates evolving manufacturing data structures (e.g., `extraFields` on products, nested `steps[]` on productions) without schema migrations.

### Collections Overview

| Collection | Purpose | Key Fields |
|---|---|---|
| `users` | Authentication accounts | id, email, passwordHash, role, organizationId, assignedOrganizationIds, googleId, avatarUrl |
| `tokens` | JWT token store | id, token, userId, revoked, expired |
| `organizations` | Org hierarchy | id, name, organizationType (MAIN/SUB), parentOrganizationId, createdByUserId |
| `products` | DPP product catalog | id, publicSlug, version, companyName, productName, variantName, sku, materialsComposition[], endOfLifeInstructions, extraFields{}, qrUrl, dppUrl, organizationId |
| `technical_sheets` | Spec templates | id, name, type (MATERIAL_SHEET/OPERATION_SHEET), productId, organizationId |
| `ts_materials` | Material library | id, name, referenceCode, unit, organizationId |
| `ts_operations` | Operation library | id, name, description, defaultDuration, organizationId |
| `material_sheet_items` | Material-to-sheet links | id, technicalSheetId, materialId, quantity, sequenceOrder |
| `operation_sheet_items` | Operation-to-sheet links | id, technicalSheetId, operationId, duration, sequenceOrder |
| `productions` | Manufacturing runs | id, productId, organizationId, status, quantity, steps[] |
| `orders` | Customer orders | id, orderReference, productId, organizationId, quantity, status |
| `product_stock` | Finished goods inventory | id, productId, productName, quantity, unit, organizationId, lastUpdatedBy |
| `material_stock` | Raw materials inventory | id, materialName, quantity, minimumThreshold, unit, organizationId |
| `tasks` | Work task management | id, title, assignedEmployeeIds[], status, priority, progress, dueDate, organizationId |
| `employees` | Workforce directory | id, fullName, email, role, organizationId |
| `scan_events` | QR scan log | id, productId, organizationId, scannedAt, ip, userAgent, latitude, longitude, scannedByUserEmail |
| `audit_logs` | Change history | id, entityType, entityId, action, userId, userEmail, timestamp, changes{}, organizationId, description |
| `contact_leads` | Landing page inquiries | id, name, email, company, message, ip, createdAt |

### Multi-tenant Structure

```
Organization (MAIN)
├── Organization (SUB) [parentOrganizationId]
├── Users [organizationId / assignedOrganizationIds[]]
├── Products [organizationId]
│   ├── TechnicalSheets [organizationId, productId]
│   │   ├── MaterialSheetItems [technicalSheetId]
│   │   └── OperationSheetItems [technicalSheetId]
│   └── ScanEvents [organizationId, productId]
├── ProductionOrders [organizationId, productId]
│   └── ProductionSteps[] (embedded array)
├── Orders [organizationId, productId]
├── MaterialStock [organizationId]
├── ProductStock [organizationId, productId]
├── Tasks [organizationId]
│   └── assignedEmployeeIds[]
├── Employees [organizationId]
└── AuditLogs [organizationId]
```

Every service method filters by `organizationId` at the repository layer. A Spring interceptor enforces this — there is no path by which an authenticated user can read another organization's data without ADMIN role.

---

## 🔒 Security

### JWT Authentication

- **Algorithm:** HS256 (HMAC SHA-256)
- **Access token expiry:** 15 minutes
- **Refresh token expiry:** 1 day
- **Token claims:** `sub` (email), `userId`, `role`, `iat`, `exp`
- **Token storage:** MongoDB `tokens` collection — every token is tracked and revocable
- **Logout:** Sets `revoked=true` and `expired=true` on all active tokens for the user
- **Frontend:** Auto-refreshes 3 minutes before expiry; queues concurrent requests during refresh

### Role-Based Access Control

Roles are encoded in JWT claims and enforced at two independent layers:

- **Backend:** `@PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")` on every controller method
- **Frontend:** `PrivateRoute`, `NonClientRoute`, and per-nav-item role checks in `DashboardLayout`

### Public vs. Protected Endpoints

```
Public (no auth required):
  OPTIONS /**                        Pre-flight CORS
  /auth/**                           Login, register, refresh
  /oauth2/** · /login/oauth2/**      Google OAuth2 handshake
  GET  /api/products/{id}/dpp        QR scan / DPP view
  POST /api/scans                    QR scan event recording
  POST /api/ai/public/chat           Landing page AI chat
  GET  /api/public/landing           Landing page data
  POST /api/public/contact           Contact form
  /v3/api-docs · /swagger-ui/**      API documentation

Protected: All other /api/** and /admin/** routes
```

### Password Security

- Passwords hashed with **BCrypt** (work factor 12)
- Plain-text passwords never stored, logged, or returned in any response
- Password reset uses short-lived, single-use tokens

### Audit Trail

Every sensitive write operation (CREATE, UPDATE, DELETE, STATUS_CHANGE) across all entities is logged non-blockingly to `audit_logs` via `AuditService`. Exceptions in audit logging are silently caught to never break the primary operation. ADMIN and SUBADMIN can query the full audit history with date range and multi-field filtering.

### External Notifications

N8n webhooks fire on user registration and login events, delivering user email, IP address, and user agent to configured automation workflows.

---

## 🤖 AI Integration

SmartTex DPP integrates **Groq** (LPU inference engine) running **LLaMA 3.3 70B Versatile** for two distinct AI capabilities.

### Contextual AI Chat

The `/api/ai/chat` endpoint adapts its behavior based on the requesting user's role:

| Role | System Prompt Context | Database Access |
|---|---|---|
| **ADMIN / SUBADMIN / EMPLOYEE** | Full staff prompt — platform features, operational guidance | ✅ Live queries: product list, order count, scan counts, product details |
| **CLIENT** | Client prompt — product info, order tracking | ✅ Product reads only (org-scoped) |
| **Public** | Landing page prompt — platform overview | ❌ No data access |

Built-in intent detection triggers live database queries before the LLM call:

| User says | Backend action |
|---|---|
| "list products" | Queries `products` collection (org-scoped) |
| "how many orders" | Counts `orders` for org |
| "scans today" | Counts `scan_events` in last 24 hours |
| "product {id}" | Fetches full product document (access-controlled) |

**Model configuration:** `llama-3.3-70b-versatile` · Temperature: `0.2` (staff), `0.3` (public)

### DPP Completeness Scoring

`GET /api/ai/products/{id}/score` runs `ProductAiScoringService` which evaluates 8 DPP fields:

| Field | Weight |
|---|---|
| productName | 1/8 |
| companyName | 1/8 |
| sku | 1/8 |
| variantName | 1/8 |
| endOfLifeInstructions | 1/8 |
| organizationId | 1/8 |
| materialsComposition (non-empty) | 1/8 |
| extraFields (non-empty) | 1/8 |

**Score interpretation:**
- **85–100:** "Great DPP completeness. Minor improvements possible."
- **60–84:** "Good start. Fill missing DPP fields to improve quality."
- **< 60:** "Low completeness. Add core product + production data for a better DPP."

The `PassportPage` displays this score as a visual meter alongside a list of missing fields.

### Floating AI Widget

A `ChatbotWidget` component floats on all authenticated pages (bottom-right). It offers role-tailored quick reply suggestions and streams responses from the AI chat API. For unauthenticated landing page visitors it uses the public endpoint with no data exposure.

---

## 📸 Screenshots

> *Screenshots will be added upon public release.*

| Screen | Description |
|---|---|
| `screenshots/login.png` | **Login Page** — Email/password + Google OAuth2, language switcher |
| `screenshots/dashboard.png` | **Dashboard** — Role-specific KPI cards, activity feed, bottlenecks |
| `screenshots/products.png` | **Products** — DPP product list with AI score badges, CSV import |
| `screenshots/passport.png` | **Digital Product Passport** — Public QR scan view with material timeline |
| `screenshots/production.png` | **Production** — Order cards with expandable step-by-step tracker |
| `screenshots/stock.png` | **Stock** — Material and product inventory with threshold alerts |
| `screenshots/technical-sheets.png` | **Technical Sheets** — Material/operation editor with PDF export |
| `screenshots/audit-log.png` | **Audit Log** — Full change history with before/after diff view |
| `screenshots/ai-chat.png` | **AI Assistant** — Context-aware chat with live data queries |

---

## 🚀 Installation Guide

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Frontend runtime |
| npm | 9+ | Package manager |
| Java | 21+ | Backend runtime |
| Maven | 3.9+ | Build tool (or use included `mvnw`) |
| MongoDB | 7.x | Database (local or Atlas) |
| Docker | 24+ | Containerized deployment (optional) |

---

### Option A — Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/chekroun-adnan/DppSmart.git
cd DppSmart

# Copy and fill in environment variables
cp .env.example .env

# Start all services (frontend, backend, mongodb)
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| MongoDB | mongodb://localhost:27017 |
| Swagger UI | http://localhost:8080/swagger-ui.html |

---

### Option B — Manual Setup

#### 1. MongoDB

```bash
# Local
mongod --dbpath /data/db --port 27017

# Or via Docker
docker run -d \
  --name smarttex-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=smarttex \
  mongo:7
```

#### 2. Backend (Spring Boot)

```bash
cd Backend

# Copy and configure properties
cp src/main/resources/application.properties.example \
   src/main/resources/application.properties
# Edit with your credentials (see Environment Variables section)

# Build
./mvnw clean install -DskipTests

# Run
./mvnw spring-boot:run
# API available at http://localhost:8080
# Swagger at http://localhost:8080/swagger-ui.html
```

#### 3. Frontend (React)

```bash
cd FrontEnd

# Install dependencies
npm install

# Configure API URL
echo "REACT_APP_API_URL=http://localhost:8080" > .env.local

# Start dev server
npm start
# App available at http://localhost:3000
```

---

### Environment Variables

#### Backend — `application.properties`

```properties
# Server
server.port=8080

# MongoDB
spring.mongodb.uri=${MONGO_URI}
# e.g. mongodb://localhost:27017/smarttex

# JWT
jwt.secret=${JWT_SECRET}
# Min 256-bit random string
jwt.expiration=900000
# 15 minutes in ms (access token)
# Refresh token: 7 days (hardcoded in JwtService)

# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
spring.security.oauth2.client.registration.google.scope=openid,email,profile
spring.security.oauth2.client.registration.google.redirect-uri={baseUrl}/login/oauth2/code/google

# Frontend (used in OAuth2 redirect)
app.frontend.base-url=${FRONTEND_BASE_URL:http://localhost:3000}

# CORS origins
app.cors.allowed-origin-patterns=http://localhost:*,http://127.0.0.1:*

# Groq AI
groq.api.key=${GROQ_API_KEY}
groq.api.url=https://api.groq.com/openai/v1/chat/completions
groq.model=llama-3.3-70b-versatile

# Cloudinary (product images)
cloudinary.cloud-name=${CLOUDINARY_CLOUD_NAME}
cloudinary.api-key=${CLOUDINARY_API_KEY}
cloudinary.api-secret=${CLOUDINARY_API_SECRET}

# Email (Gmail SMTP)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# N8n Webhooks (optional)
n8n.webhook.user=${N8N_WEBHOOK_USER}
n8n.webhook.login=${N8N_WEBHOOK_LOGIN}
```

#### Frontend — `.env.local`

```env
REACT_APP_API_URL=http://localhost:8080
```

---

## 🔌 API Reference

The backend exposes a full REST API organized by domain. All protected endpoints require `Authorization: Bearer <accessToken>`. Swagger UI is available at `/swagger-ui.html`.

### Architecture Layers

```
HTTP Request
    ↓
Controller (@RestController)     — Input validation (@Valid), response formatting
    ↓
Service (@Service)               — Business logic, audit calls, AI routing, caching
    ↓
Repository (MongoRepository)     — Typed queries, org-scoped filters
    ↓
MongoDB Collection
```

### Endpoint Summary

| Domain | Base Path | Methods | Auth |
|---|---|---|---|
| **Auth** | `/auth` | POST login, register, refresh, logout | Public / JWT |
| **User** | `/user` | GET me, PUT update, DELETE me | JWT |
| **Admin** | `/admin` | CRUD users, password reset | ADMIN |
| **Organizations** | `/organization` | CRUD main/sub, assign users | ADMIN / SUBADMIN |
| **Products** | `/api/products` | CRUD, image upload, CSV import, DPP | Mixed |
| **Technical Sheets** | `/api/technical-sheets` | CRUD sheets + material/op items | ADMIN / SUBADMIN |
| **Materials (TS)** | `/api/ts-materials` | CRUD material library | ADMIN / SUBADMIN |
| **Operations (TS)** | `/api/ts-operations` | CRUD operation library | ADMIN / SUBADMIN |
| **Productions** | `/api/productions` | CRUD + step start/complete + status | ADMIN / SUBADMIN |
| **Orders** | `/api/orders` | CRUD orders | ADMIN / SUBADMIN / CLIENT |
| **Material Stock** | `/api/material-stock` | CRUD + adjust + low-stock alert | ADMIN / SUBADMIN |
| **Product Stock** | `/api/product-stock` | CRUD + adjust + from-production | ADMIN / SUBADMIN |
| **Tasks** | `/api/tasks` | CRUD + status update | ADMIN / SUBADMIN / EMPLOYEE |
| **Employees** | `/api/employees` | CRUD | ADMIN / SUBADMIN |
| **Scans** | `/api/scans` | Record + query by product/org | Mixed |
| **AI** | `/api/ai` | Chat, public chat, product score | Mixed |
| **Dashboard** | `/api/dashboard` | Aggregated KPIs | JWT |
| **Audit** | `/api/audit` | Query logs + entity history | ADMIN / SUBADMIN |
| **Public** | `/api/public` | Landing data, contact form | Public |

### Key Endpoint Details

```
POST   /auth/login
       Body: { email, password }
       Returns: { accessToken, refreshToken, userId, email, role, organizationId, assignedOrganizationIds }

GET    /api/products/{id}/dpp          — Public, records scan event
POST   /api/productions/{id}/step/start/{stepIndex}
PUT    /api/productions/{id}/step/complete/{stepIndex}
PUT    /api/material-stock/adjust      — Body: { id, adjustment: ±delta }
GET    /api/material-stock/low-stock   — ?organizationId=...
GET    /api/ai/products/{id}/score     — Returns: { score, missingFields[], summary }
POST   /api/ai/chat                    — Body: { message, productId?, organizationId? }
GET    /api/dashboard/me               — ?orgId=... (optional org filter)
GET    /api/audit                      — ?entityType=&action=&userEmail=&startDate=&endDate=&page=&size=
GET    /api/audit/entity/{type}/{id}   — Entity-specific change history
```

---

## 🔮 Future Improvements

| Feature | Description | Priority |
|---|---|---|
| 📱 **Mobile Application** | React Native companion app for factory workers — offline-capable step confirmation, QR scanning, and task management | High |
| 🌐 **Supplier Portal** | Dedicated portal where raw material suppliers submit compliance certificates, material safety data sheets, and traceability documents directly into the platform | High |
| 📋 **EU ESPR Export** | Automated generation of regulation-compliant DPP export packages for direct submission to EU regulatory bodies | High |
| ⛓️ **Blockchain Anchoring** | Hash DPP data to a public or consortium blockchain for tamper-proof, externally verifiable product passports | Medium |
| 🏭 **IoT Integration** | Connect factory machines and sensors to auto-complete production steps, log temperature/humidity during manufacturing, and feed OEE metrics into the dashboard | Medium |
| 🧠 **Predictive AI** | ML models trained on historical production and scan data to predict defect rates, stock-outs, and equipment failures before they occur | Medium |
| 🔔 **Advanced Alerting Engine** | Configurable multi-channel alerts (email, SMS, webhook) for threshold breaches, compliance gaps, and overdue tasks | Low |
| 🔄 **ERP Integration** | Bi-directional sync adapters for SAP, Odoo, and other ERP systems to eliminate double data entry | Medium |

---

## 📝 Conclusion

The shift toward **digital, transparent, and sustainable manufacturing** is no longer optional. The EU Ecodesign for Sustainable Products Regulation mandates machine-readable Digital Product Passports for textile goods. Consumers, retailers, and B2B clients demand verified proof of material origin, recycled content, and ethical production. Manufacturers who cannot provide this data at scale will be excluded from regulated markets.

**SmartTex DPP** addresses this transformation with a platform that is both operationally practical and compliance-ready. It connects factory-floor workers confirming production steps to executives reading dashboard KPIs to clients scanning a QR code — giving every stakeholder exactly the data they need, in their language, in real time.

By combining production lifecycle management, AI-powered DPP scoring, QR traceability, multi-tenant multi-organization architecture, and a comprehensive audit trail, SmartTex DPP gives textile and industrial manufacturers the infrastructure to compete in a transparency-first global market — reducing compliance costs, building verifiable trust, and creating the data foundation for continuous operational improvement.

---

<div align="center">

**Built with precision for the future of manufacturing.**

*SmartTex DPP — Trace Everything. Prove Everything.*

---

Made by [Adnan Chekroun](mailto:adnanchekroun00@gmail.com)

</div>
