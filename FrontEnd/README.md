# SmartTex DPP — Frontend

React 19 SPA for the SmartTex Digital Product Passport platform. Manages product lifecycle, manufacturing operations, client orders, inventory, and AI-assisted production planning for textile and industrial manufacturers.

## Tech Stack

- **React 19** — UI framework
- **React Router DOM 7** — client-side routing
- **Tailwind CSS 3** — utility-first styling with dark mode
- **Recharts 3** — data visualization
- **i18next** — 10-language internationalization (EN, FR, AR, ES, DE, IT, PT, NL, TR, ZH)
- **jsPDF** — PDF export for technical sheets
- **Lucide React** — icon library
- **MapLibre GL** + **Google Maps API** — mapping features

## Getting Started

```bash
npm install
npm start       # dev server on http://localhost:3000
npm run build   # production build
```

The dev proxy in `package.json` routes `/api` requests to `http://localhost:8080` (backend).

## Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/dashboard` | KPI dashboard |
| `/orders` | Order lifecycle management |
| `/production` | Manufacturing orders |
| `/stock` | Inventory management |
| `/technical-sheets` | BOM editor |
| `/supply-chain` | Procurement |
| `/products` | DPP product catalog |
| `/audit-log` | Compliance audit trail |
| `/passport/:id` | Public DPP (no auth) |

## Environment

No `.env` file required for development — the proxy handles API routing. For production, configure Nginx to reverse-proxy `/api` to the backend.

---

## AI-Assisted Development Workflow

This project uses a structured AI documentation system to enable fast, context-aware development with Claude Code.

### Quick Start for AI Sessions

At the start of any Claude Code session, provide this prompt:

```
Read docs/PROJECT_CONTEXT.md and docs/AI_RULES.md before starting.
Then read docs/[RELEVANT_MODULE].md for the area you'll be working in.
Do not scan the full codebase — use the docs to orient first.
```

### Documentation Structure

```
docs/
├── PROJECT_CONTEXT.md     ← Start here every session (tracked in git)
├── ARCHITECTURE.md        ← System design + patterns (tracked in git)
├── AI_RULES.md            ← Coding standards + anti-patterns (tracked in git)
├── ORDER_MANAGEMENT.md    ← Orders lifecycle + bulk allocation
├── STOCK_MANAGEMENT.md    ← Material + product inventory + supply chain
├── PRODUCTION_WORKFLOW.md ← Manufacturing + BOM + steps
├── DPP_SYSTEM.md          ← Digital Product Passport + AI scoring
├── AUTH_SECURITY.md       ← JWT + OAuth2 + roles + audit
├── API_REFERENCE.md       ← All endpoints with auth requirements
├── FRONTEND_STRUCTURE.md  ← Pages, components, routing, i18n
├── DATABASE_SCHEMA.md     ← MongoDB collections + relationships
├── WEBSOCKET_EVENTS.md    ← Real-time event types
├── BUSINESS_WORKFLOW.md   ← End-to-end user journeys
└── orders/README_AI.md    ← Module quick reference
    stock/README_AI.md
    production/README_AI.md
    auth/README_AI.md
```

**Files tracked in git:** `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `AI_RULES.md`  
**Files gitignored (local context):** all others — regenerate as needed with Claude.

### Recommended Per-Task Prompts

**Order workflow changes:**
```
Read docs/PROJECT_CONTEXT.md, docs/ORDER_MANAGEMENT.md, and docs/orders/README_AI.md.
Then inspect src/pages/OrdersPage.js and src/services/authService.js.
Task: [describe what you need]
```

**Adding a new API endpoint:**
```
Read docs/ARCHITECTURE.md and docs/API_REFERENCE.md.
Then read the specific controller + service file.
Task: [describe what you need]
```

**Stock or supply chain work:**
```
Read docs/STOCK_MANAGEMENT.md and docs/stock/README_AI.md.
Task: [describe what you need]
```

**Security or auth changes:**
```
Read docs/AUTH_SECURITY.md and docs/auth/README_AI.md before touching any security config.
Task: [describe what you need]
```

**Frontend new page:**
```
Read docs/FRONTEND_STRUCTURE.md and docs/AI_RULES.md.
Task: [describe what you need]
```

### Key Invariants for AI Assistants

- `ProductStockRepository.findByProductId()` returns `List` — always `.stream().findFirst()`
- Groq service classes use `RestTemplate` directly — never Spring Security-wrapped HTTP
- Every new endpoint needs `@PreAuthorize` and `organizationId` scoping
- All frontend API calls go through `src/services/authService.js` — never raw `fetch()`
- No Redux/Zustand — state is local `useState` + derived computation

---

## Backend

See `/Backend/` directory. Spring Boot 3 + MongoDB.  
Backend documentation: `docs/ARCHITECTURE.md` and `docs/API_REFERENCE.md`.
