---
title: PROJECT_CONTEXT
description: Top-level context for SmartTex DPP — read this first on every session
type: reference
---

# SmartTex DPP — Project Context

## What Is This?

**SmartTex DPP** is an enterprise SaaS platform for textile and industrial manufacturers. It manages the complete product lifecycle: DPP (Digital Product Passport) generation, production coordination, inventory management, client order processing, and AI-assisted operations.

**Stack:** React 19 + Spring Boot 3 + MongoDB + Tailwind CSS  
**Auth:** JWT (15 min) + Refresh Token (7 days) + Google OAuth2  
**AI:** Groq API (llama-3.3-70b-versatile) for chat, scoring, bulk summaries  
**External:** Cloudinary (images), Google Maps, Gmail SMTP, N8n webhooks  

---

## Monorepo Layout

```
DppSmarts/
├── FrontEnd/          # React 19 app (this repo)
│   ├── src/
│   │   ├── pages/     # 28 page components
│   │   ├── components/# 20+ shared UI components
│   │   ├── services/  # API client (authService.js is the main one)
│   │   ├── i18n/      # 10 languages (EN/FR/AR/ES/DE/IT/PT/NL/TR/ZH)
│   │   └── context/   # ThemeContext, NotificationContext
│   └── docs/          # ← You are here
└── Backend/           # Spring Boot 3
    └── src/main/java/com/dppsmart/dppsmart/
        ├── User/      # Auth, JWT, OAuth2
        ├── Security/  # Filters, Permission checks
        ├── Product/   # DPP catalog, QR, scoring
        ├── Production/# Manufacturing orders & steps
        ├── Orders/    # Client order lifecycle
        ├── TechnicalSheet/ # BOM & operations templates
        ├── MaterialStock/  # Raw materials inventory
        ├── ProductStock/   # Finished goods inventory
        ├── StockMovement/  # Inventory transaction log
        ├── SupplyChain/    # Procurement & suppliers
        ├── Task/           # Work task management
        ├── Employees/      # Workforce directory
        ├── Audit/          # Compliance audit trail
        ├── Scan/           # QR scan events
        ├── Dashboard/      # KPI aggregation
        ├── AI/             # Groq integration
        ├── Organization/   # Multi-tenancy hierarchy
        ├── Notification/   # In-app notifications
        ├── Email/          # Async email dispatch
        └── Allocation/     # Stock reservation
```

---

## Core Business Domains

| Domain | Backend Package | Frontend Page | Doc File |
|--------|----------------|---------------|----------|
| Orders | Orders/ | OrdersPage, ClientOrdersPage | ORDER_MANAGEMENT.md |
| Production | Production/ | ProductionPage | PRODUCTION_WORKFLOW.md |
| Material Stock | MaterialStock/ | StockPage, RawMaterialsPage | STOCK_MANAGEMENT.md |
| Product Stock | ProductStock/ | StockPage | STOCK_MANAGEMENT.md |
| DPP / Products | Product/ | ProductsPage, PassportPage | DPP_SYSTEM.md |
| Technical Sheets | TechnicalSheet/ | TechnicalSheetsPage | PRODUCTION_WORKFLOW.md |
| Supply Chain | SupplyChain/ | SupplyChainPage | STOCK_MANAGEMENT.md |
| Auth & Users | User/, Security/ | LoginPage, AdminUsersPage | AUTH_SECURITY.md |
| Audit | Audit/ | AuditLogPage | AUTH_SECURITY.md |

---

## Key Architectural Rules

- **Every DB record has `organizationId`** — all queries must filter by it (multi-tenancy).
- **ProductStockRepository.findByProductId() returns List** — always use `.stream().findFirst()`.
- **Groq calls bypass Spring Security** — use `RestTemplate` directly, not the security-wrapped HTTP client.
- **JWT is stored in localStorage** on the frontend; auto-refresh runs 3 min before expiry.
- **All role checks use `@PreAuthorize("hasAnyRole('ADMIN','SUBADMIN')")`** — EMPLOYEE and CLIENT have read-only or limited access.
- **Orders status flow:** PENDING_REVIEW → READY_FOR_CONFIRMATION → CONFIRMED → IN_PRODUCTION → READY → DELIVERED (plus DATE_CHANGE_REQUESTED, REJECTED, CANCELLED, BLOCKED_* branches).

---

## Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| MONGO_URI | Backend | MongoDB connection |
| JWT_SECRET | Backend | Token signing |
| JWT_EXPIRATION | Backend | 900000 = 15 min |
| GROQ_API_KEY | Backend | AI inference |
| CLOUDINARY_* | Backend | Image uploads |
| GOOGLE_CLIENT_ID/SECRET | Backend | OAuth2 |
| MAIL_USERNAME/PASSWORD | Backend | Gmail SMTP |
| N8N_WEBHOOK_* | Backend | Automation triggers |
| REACT_APP_API_URL | Frontend | API base (defaults to localhost:8080) |

---

## How to Use These Files with Claude Code

### Session Start Protocol

At the start of any session, tell Claude:
```
Read docs/PROJECT_CONTEXT.md first, then docs/[RELEVANT_MODULE].md before looking at any code.
```

### Recommended Per-Task Prompts

**For order workflow changes:**
```
Read docs/PROJECT_CONTEXT.md and docs/ORDER_MANAGEMENT.md.
Then read src/pages/OrdersPage.js and src/services/authService.js.
Task: [your task here]
```

**For backend API changes:**
```
Read docs/ARCHITECTURE.md and docs/API_REFERENCE.md.
Then read the specific controller and service file.
Task: [your task here]
```

**For stock/inventory work:**
```
Read docs/STOCK_MANAGEMENT.md.
Then read the relevant service and repository files.
Task: [your task here]
```

**For auth/security:**
```
Read docs/AUTH_SECURITY.md before touching any security config.
Task: [your task here]
```

**For production/BOM:**
```
Read docs/PRODUCTION_WORKFLOW.md and docs/DPP_SYSTEM.md.
Task: [your task here]
```

### Anti-Patterns to Avoid

- Do NOT scan the full codebase unless explicitly asked — use docs to orient first.
- Do NOT assume `findByProductId()` returns Optional — it returns List.
- Do NOT add `@Async` to Groq service methods — they already handle threading internally.
- Do NOT bypass `organizationId` filtering in any new endpoint.
- Do NOT hard-code role checks — use existing `@PreAuthorize` patterns.

---

## Common Issues & Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| Groq calls fail | Spring Security context lost in async thread | Use `RestTemplate` directly in GroqService |
| ProductStock not found | findByProductId() returns List not Optional | Use `.stream().findFirst()` |
| Frontend loses auth state | localStorage cleared, tokens expired | Check `refreshAccessToken()` in authService.js |
| org-scoped data leaks | Missing organizationId filter in new query | Always add `.findByOrganizationId(orgId)` |
| Over-allocation in bulk orders | Frontend-only guard | Backend validation in BulkOrderMaterialRequirementService |
| CORS error in dev | Missing `localhost` in SecurityConfig allowed origins | Add to pattern list in SecurityConfig |

---

## Links to Sub-Documentation

- [Architecture](ARCHITECTURE.md) — System design, patterns, data flow
- [Auth & Security](AUTH_SECURITY.md) — JWT, OAuth2, roles, public routes
- [Order Management](ORDER_MANAGEMENT.md) — Full order lifecycle, bulk allocation
- [Stock Management](STOCK_MANAGEMENT.md) — Material + product inventory, supply chain
- [Production Workflow](PRODUCTION_WORKFLOW.md) — Manufacturing, BOM, steps
- [DPP System](DPP_SYSTEM.md) — Digital Product Passport, QR, AI scoring
- [API Reference](API_REFERENCE.md) — All endpoints, methods, auth requirements
- [Frontend Structure](FRONTEND_STRUCTURE.md) — Pages, components, routing, i18n
- [Database Schema](DATABASE_SCHEMA.md) — Collections, fields, indexes, multi-tenancy
- [WebSocket Events](WEBSOCKET_EVENTS.md) — Real-time messaging
- [Business Workflow](BUSINESS_WORKFLOW.md) — End-to-end user journeys
- [AI Rules](AI_RULES.md) — Claude-specific coding guidelines for this project
