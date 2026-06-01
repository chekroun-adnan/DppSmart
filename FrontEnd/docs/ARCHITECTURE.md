---
title: ARCHITECTURE
description: System design, layered architecture, patterns, and data flow for SmartTex DPP
type: reference
---

# Architecture

## System Overview

```
Client Browser
     │
     ▼
React 19 SPA (port 3000)
     │  HTTP/REST (JSON) + WebSocket (STOMP/SockJS)
     ▼
Spring Boot 3 API (port 8080)
     │
     ├──▶ MongoDB (port 27017)
     ├──▶ Groq API (llama-3.3-70b)
     ├──▶ Cloudinary (image CDN)
     ├──▶ Gmail SMTP (email)
     ├──▶ Google OAuth2 (auth)
     └──▶ N8n Webhooks (automation)
```

---

## Backend Layered Architecture

```
HTTP Request
    │
    ▼
JwtFilter (OncePerRequestFilter)
    │  Validates token, sets SecurityContext
    ▼
@RestController (Controller Layer)
    │  Maps routes, validates roles (@PreAuthorize), parses DTOs
    ▼
@Service (Service Layer)
    │  Business logic, organization scoping, orchestration
    ▼
@Repository (Data Layer)
    │  MongoDB CRUD via MongoRepository
    ▼
MongoDB Document
```

### Naming Convention
- Controllers: `FooController.java` → `@RequestMapping("/api/foo")`
- Services: `FooService.java` or `FooModuleService.java`
- Repositories: `FooRepository.java extends MongoRepository<Foo, String>`
- Entities: `Foo.java` annotated with `@Document(collection = "foo")`
- DTOs: split into `CreateFooDto`, `UpdateFooDto`, `FooResponseDto` (sometimes one class for all)

---

## Multi-Tenancy Pattern

Every MongoDB document carries `organizationId` (String). Every query must include this filter.

```java
// Repository pattern — always scoped
List<Orders> findByOrganizationId(String orgId);
Optional<ProductStock> findByProductIdAndOrganizationId(String productId, String orgId);
```

Frontend: `OrgSelector` component stores selected org in component state; all API calls pass the org ID as a query param or extract it from the JWT claims.

Two-tier hierarchy:
- **MAIN** organization — parent, holds global config
- **SUB** organization — child, maps to factory/site/department
- Users have `organizationId` (primary) + `assignedOrganizationIds[]` (multi-org access)

---

## Security Architecture

See [AUTH_SECURITY.md](AUTH_SECURITY.md) for full detail.

```
Public routes:     /auth/**, /api/products/{id}/dpp, /api/scans, /api/ai/public/**, /api/public/**, /swagger-ui/**
Authenticated:     All other routes require valid JWT
Role-protected:    @PreAuthorize on every method; Roles = ADMIN > SUBADMIN > EMPLOYEE > CLIENT
```

---

## Data Flow Patterns

### Order Lifecycle Data Flow
```
Client creates order (POST /api/orders)
    → OrdersService.create()
    → Persists to MongoDB [status: PENDING_REVIEW]
    → Email notification → admin
    
Admin reviews order (GET /api/orders/{id}/review OR /availability-check)
    → Checks ProductStock, MaterialStock, TechnicalSheet
    → Returns availability analysis
    
Admin confirms + sends to production (POST /api/orders/{id}/start-production-v2)
    → Deducts ProductStock for fromStock portion
    → Deducts MaterialStock + creates Production for toProduce portion
    → Status → IN_PRODUCTION
    
Production completed
    → ProductionService.updateStatus(COMPLETED)
    → Increments ProductStock automatically
    → Order status → READY (if all items fulfilled)
    
Admin confirms delivery (POST /api/orders/{id}/confirm-delivery)
    → Status → READY → DELIVERED
    → Generates delivery token
    → Email to client
```

### Bulk Multi-Order Allocation Data Flow
```
Admin selects N orders
    → POST /api/orders/bulk/requirements [List<String> orderIds]
    → BulkOrderMaterialRequirementService.calculate()
        → Groups OrderItems by productId across all orders
        → Greedy allocation: first-come-first-served from ProductStock
        → For items needing production: reads TechnicalSheet BOM
        → Aggregates raw material requirements across all products
        → Calls GroqBulkSummaryService for AI summary
    → Returns BulkOrderRequirementResponseDTO
    
Admin adjusts allocation (drag inputs)
    → POST /api/orders/bulk/requirements/recalculate [BulkOrderRequirementRequestDTO]
    → Same computation with admin-provided allocations overriding greedy defaults
```

### DPP Scan Data Flow
```
QR Code scanned → GET /api/products/{id}/dpp (public)
    → ProductService.getDpp()
    → Records ScanEvent (ip, ua, lat, lon, email if auth)
    → Returns DPP data: name, SKU, materials, end-of-life, qrUrl
    
Frontend PassportPage:
    → Displays DPP
    → POST /api/scans (records secondary event)
    → POST /api/ai/public/chat for product questions
```

---

## Caching Strategy

Spring Cache (SimpleCache, in-memory) applied to:
- `ProductService.getProductById()` — evicted on update/delete
- `OrganizationService.getById()` — rarely changes

**No distributed cache** — suitable for single-instance deployment. If scaling horizontally, replace SimpleCache with Redis.

---

## Async Operations

| Operation | Mechanism | Reason |
|-----------|-----------|--------|
| Email sending | `@Async` on EmailService | SMTP latency non-blocking |
| Audit logging | `@Async` on AuditService | Never block on compliance writes |
| N8n webhooks | `@Async` | External call, optional |
| Groq API | Synchronous (blocking) | Response needed inline in request |

---

## Error Handling Pattern

Controllers return `ResponseEntity<T>`. Services throw domain exceptions:
- `ResourceNotFoundException` → 404
- `UnauthorizedException` → 403
- `ValidationException` → 400

Global exception handler maps these. No `try/catch` inside controllers.

---

## Key Design Decisions

| Decision | What | Why |
|----------|------|-----|
| MongoDB vs SQL | Document store | Flexible DPP schema, embedded arrays (OrderItem, ProductionStep), no JOIN complexity |
| JWT stateless | Short-lived access + refresh | Scalable, no server-side session |
| Token DB storage | `tokens` collection | Supports revocation without Redis |
| Groq via RestTemplate | Direct HTTP, not Spring-auth-wrapped | Groq calls happen in contexts without SecurityContext |
| Embedded sub-entities | OrderItem[], ProductionStep[] in parent | Avoids extra collection queries; items never exist without parent |
| organizationId everywhere | Denormalized | Enables single-query multi-tenant filtering without JOIN |
| GroqBulkSummaryService separate from GroqOrderAnalysisService | Two classes | Different context/prompt/domain; easier to evolve independently |

---

## Module Dependency Map

```
Orders
  ├── depends on → ProductStock (stock check)
  ├── depends on → MaterialStock (BOM check)
  ├── depends on → TechnicalSheet (BOM lookup)
  ├── depends on → Production (launch production)
  └── depends on → GroqBulkSummaryService (AI summary)

Production
  ├── depends on → ProductStock (update on complete)
  ├── depends on → MaterialStock (deduct on start)
  └── depends on → TechnicalSheet (step template)

TechnicalSheet
  ├── depends on → MaterialStock (material lookup)
  └── depends on → Product (linked by productId)

DPP (Product)
  └── depends on → Scan (record on DPP view)

SupplyChain
  └── depends on → MaterialStock (update on receipt)
```

---

## Scalability Considerations

- **Horizontal scaling:** Replace SimpleCache with Redis; add sticky sessions or stateless JWT (already is).
- **MongoDB sharding:** Shard by `organizationId` once data grows.
- **Groq rate limits:** Add request queue/throttle in GroqService.
- **WebSocket scaling:** Replace in-memory broker with RabbitMQ or Redis pub-sub.
- **File uploads:** Already on Cloudinary CDN — no local disk dependency.
- **Email volume:** Replace Gmail SMTP with SendGrid/SES for production scale.

---

## Future Improvements

- Add Redis for distributed caching and WebSocket broker
- Implement OpenTelemetry tracing (trace IDs from frontend to Groq)
- Add Kafka for event sourcing (order events, production events)
- Replace password login with passkeys (WebAuthn)
- Add database migration tooling (Mongock) for schema evolution
- Add OpenAPI codegen to auto-sync frontend API types from backend specs
