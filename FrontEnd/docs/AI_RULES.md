---
title: AI_RULES
description: Mandatory guidelines for Claude Code when working on SmartTex DPP — coding standards, patterns, anti-patterns
type: reference
---

# AI Coding Rules for SmartTex DPP

These rules are mandatory. Read this file at the start of every session.

---

## Session Start Protocol

1. Read `docs/PROJECT_CONTEXT.md`
2. Read the relevant module doc (ORDER_MANAGEMENT.md, STOCK_MANAGEMENT.md, etc.)
3. Only then inspect specific source files
4. **Do NOT scan the full codebase** — use docs to orient first

---

## Critical API Patterns

### Always Use `authorizedRequest` in Frontend
```js
// CORRECT
export async function doSomething(id) {
  return authorizedRequest(`/api/endpoint/${encodeURIComponent(id)}`, { method: "GET" }, "Error msg");
}

// WRONG — never use raw fetch() in pages or services
const res = await fetch('/api/endpoint');
```

### ProductStockRepository Returns List — Not Optional
```java
// CORRECT
productStockRepository.findByProductId(productId).stream().findFirst()

// WRONG — findByProductId does NOT return Optional
productStockRepository.findByProductId(productId).orElseThrow()
```

### Groq Services Use RestTemplate Directly
```java
// CORRECT — GroqService bypasses Spring Security wrapper
ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);

// WRONG — security context may be null in async/Groq contexts
// Do not inject WebClient with Spring Security filters
```

### Every Repository Query Filters by organizationId
```java
// CORRECT
List<Orders> findByOrganizationIdAndStatus(String orgId, ClientOrderStatus status);

// WRONG — missing org scoping = cross-tenant data leak
List<Orders> findByStatus(ClientOrderStatus status);
```

---

## Backend Rules

1. **Every new endpoint needs `@PreAuthorize`** — never leave an endpoint unprotected without explicit intent.
2. **Use `@Async` only on EmailService and AuditService** — never on Groq services.
3. **DTO ↔ Entity mapping:** Use MapStruct or manual mapping in Service layer — never map in Controller.
4. **No business logic in Controllers** — Controllers only: parse input, call service, return ResponseEntity.
5. **Audit every write:** Call `auditService.logAction()` for all CREATE, UPDATE, DELETE, STATUS_CHANGE in service methods.
6. **Return 200 with body, not 204** for updates — frontend expects response body for state updates.
7. **Error messages:** Throw domain exceptions (`ResourceNotFoundException`, `ValidationException`) — never return error strings in 200 responses.
8. **TechnicalSheet activation:** When activating a sheet, archive the previous ACTIVE sheet first.
9. **MaterialSheetItem unit enforcement:** Validate that item unit matches MaterialStock.unit before saving.

---

## Frontend Rules

1. **No `fetch()` in pages** — all API calls go through `authService.js`.
2. **Add every new endpoint as an exported function in `authService.js`** — do not inline API calls in components.
3. **No comments explaining WHAT code does** — code is self-explanatory; only comment WHY (hidden constraint, workaround).
4. **No useEffect with side effects in derived computations** — derive from state in render, not in effects.
5. **Icons from Lucide React only** — never import from other icon libraries.
6. **Styling via Tailwind classes only** — no inline `style={{}}` except for dynamic values (widths from percentages, etc.).
7. **Translation keys:** All user-visible text must go through `t('key')` — no hardcoded English strings in JSX.
8. **Dark mode:** Every component must use `dark:` Tailwind variants — test in both light and dark modes.
9. **Status badges:** Use the existing color pattern (statusColors map) — do not invent new color schemes.

---

## What Not To Do

### Do NOT:
- Add Redux, Zustand, or any state management library — use useState + derived state
- Add new npm packages without checking if existing ones cover the need
- Create utility files for one-off logic — inline it
- Add `try/catch` in Controllers — let the global exception handler catch
- Skip organizationId scoping in any new query
- Hard-code organization IDs or user IDs
- Return `null` from services — throw exceptions instead
- Add `// TODO:` or `// FIXME:` comments — either fix now or track in the conversation
- Create backward-compatibility shims or re-export removed code
- Add features beyond what was explicitly requested

### Do NOT Add Comments That:
- Explain what the code does (if code is clear)
- Reference the task, ticket, or fix ("added for issue #123")
- Say "called by X" or "used in Y flow"
- Are docstrings on every method

---

## Naming Conventions

### Backend
- Controller: `FooController.java` → route: `/api/foo`
- Service: `FooService.java` or `FooModuleService.java`
- Repository: `FooRepository.java extends MongoRepository<Foo, String>`
- Entity: `Foo.java` with `@Document(collection = "foo")`
- Request DTO: `CreateFooDto`, `UpdateFooDto`, `AdminFooActionDto`
- Response DTO: `FooResponseDto`
- Enum: `FooStatus`, `FooType` (inside entity or separate file)

### Frontend
- Page files: `FooPage.js`
- Component files: `FooComponent.js` or `FooModal.js`
- Service functions: `getFoo`, `createFoo`, `updateFoo`, `deleteFoo`
- State vars: `foo` (data), `loading` (boolean), `error` (string|null)
- Handler functions: `handleFooAction`, `handleSubmit`, `handleClose`

---

## Adding a New API Endpoint — Checklist

Backend:
- [ ] Create/update Controller with `@PreAuthorize`
- [ ] Implement Service method
- [ ] Add `auditService.logAction()` if it's a write
- [ ] Add request/response DTOs if new shape needed
- [ ] Add Repository method if new query needed
- [ ] Ensure `organizationId` filtering

Frontend:
- [ ] Add exported function in `authService.js`
- [ ] Call it from the page/component
- [ ] Update loading/error state
- [ ] Update `docs/API_REFERENCE.md` with new endpoint

---

## Adding a New Page — Checklist

- [ ] Create `src/pages/NewPage.js`
- [ ] Add route in `App.js` with appropriate guard (PublicRoute/PrivateRoute/NonClientRoute)
- [ ] Add nav link in `DashboardLayout.js` (with role check if needed)
- [ ] Add translation keys to `src/i18n/locales/en.json` (and other locales)
- [ ] Update `docs/FRONTEND_STRUCTURE.md` Pages Reference table

---

## Performance Guidelines

1. **N+1 prevention:** If a page needs data from multiple collections, create an aggregation endpoint — don't fetch N items then N more detail calls.
2. **Pagination:** All list endpoints should support `?page=0&size=20` — don't return unbounded lists.
3. **Caching:** `@Cacheable` is applied to `ProductService.getProductById()` — evict with `@CacheEvict` on update/delete.
4. **No full collection scans:** Every query has an index. If adding a new query pattern, document the index needed.
5. **Frontend re-renders:** Avoid creating new objects/arrays in render — extract to `useMemo` if causing performance issues.

---

## Security Checklist for Every Change

- [ ] No new endpoint is publicly accessible without explicit intent
- [ ] All new data contains organizationId and is filtered by it
- [ ] No user input is concatenated into MongoDB queries (use Spring Data method names or `@Query` with parameters)
- [ ] File uploads go through Cloudinary SDK — no direct file system writes
- [ ] No secrets in code — only `${ENV_VAR}` references

---

## When In Doubt

1. Check how the nearest similar feature is implemented (grep for it)
2. Check these docs for the established pattern
3. Ask rather than invent a new pattern
4. If you must deviate from a pattern, document WHY in a comment
