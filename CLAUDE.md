# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Development Commands

### Backend (Node 22 / Express 5 / TypeScript, ESM)
```bash
cd backend
pnpm install
pnpm dev            # tsx watch server.ts
pnpm build          # tsc --build -> dist/
pnpm start          # node dist/server.js
pnpm type-check     # tsc --noEmit  <-- this is the backend's "lint"

# Stop server (Windows)
netstat -ano | findstr :4000
taskkill //F //PID <specific_pid>
```

### Frontend (React 19 / Vite 6 / TypeScript)
```bash
cd frontend
pnpm install
pnpm dev
pnpm build          # vite build (does NOT type-check)
pnpm typecheck      # tsc -p tsconfig.app.json --noEmit
pnpm lint           # eslint
```

**Package manager is pnpm.** Do not use npm.

## Current State — read before trusting a green build

- **`pnpm build` on the frontend does not type-check.** Vite transpiles without
  checking types. `pnpm typecheck` currently reports ~245 pre-existing errors.
  Treat that as the baseline: your job is to not increase it, and to reduce it
  where you touch a file. Never claim "it builds" as evidence of type safety.
- **`pnpm lint` currently fails** (~247 problems). The bulk is pre-existing
  `@typescript-eslint/no-explicit-any` and unused vars. Of note, there are
  ~11 `react-hooks/rules-of-hooks` errors, which are genuine correctness bugs.
- **There is no test suite.** `backend/tests/` is empty and neither side has a
  runner configured. Verify changes by type-checking, building, and exercising
  code paths directly.
- The backend type-checks and builds clean. Keep it that way.

## Architecture

### Auth & authorization
- **JWT** issued on login, stored in `localStorage` via `frontend/src/lib/tokenStorage.ts`.
  (Deliberate: tokens are pulled out for CLI/script testing. Not httpOnly.)
- **Password hashing is bcrypt** (cost 10) in `controllers/user.controllers.ts`.
  An Argon2 utility was removed — do not reintroduce a second hasher.
- **Backend guard**: `middlewares/auth.middleware.ts` — `authMiddleware([roles])`.
  Verifies the JWT, re-checks `User.isActive`, and for `employee` re-checks the
  linked `Employee` is still active (so unlink/deactivate take effect without
  re-login). Note this costs one or two DB reads per request.
- **Frontend guard**: `components/auth/RequireRole.tsx` wraps admin/HR-only
  route branches in `main.tsx`. It is intentionally **synchronous** (decodes the
  in-memory JWT) — never make it fetch, or every navigation pays a round trip.
  The backend remains the security boundary; this only prevents rendering a
  shell that would 403.
- Roles: `admin`, `hr`, `employee`.

### Request validation — the rule
**Every route that reads a request body validates it with Zod first.** This is
not optional and there is no exception.

```
routes/x.routes.ts   router.post('/', authMiddleware([...]), validateBody(someSchema), handler)
validators/*.ts      the schema + an exported z.infer type
controllers/x.ts     const { ... } = req.body as SomeInput;   // guaranteed by the middleware
```

- Middleware: `middlewares/zodValidation.middleware.ts` —
  `validateBody`, `validateQuery`, `validateParams`, `validate`.
- **Express 5: `req.query` is getter-only.** Never assign to it. `validateQuery`
  and `validateParams` expose results on `req.validatedQuery` /
  `req.validatedParams`; read them with `getValidatedQuery<T>(req)`.
- Schemas live in `backend/validators/`, grouped by domain: `common`, `auth`,
  `employee`, `request` (leave/WFH/regularization/expense), `salary`,
  `settings`, `content` (chat/policies/office locations/task reports/push),
  `hr` (announcements/holidays/help/password reset/documents), `attendance`.
- Put shared primitives in `common.schemas.ts` and reuse them.
- **Never write `req.body as { inline: string }`.** That is an assertion with no
  runtime check behind it. Add a schema instead.
- Zod is **v4** on both sides. Use `z.email()`, not `z.string().email()`. Errors
  are on `error.issues`, not `error.errors`.

### Express 5 gotchas
- Route params are typed `string | string[]` (path-to-regexp v8 wildcards).
  Use `paramValue(req.params.x)` from `utils/helpers.ts` to narrow — do not cast.
- JSON body limit is 1mb. File uploads bypass it: `/api/documents` is mounted
  *before* `express.json()` and uses multer.

### Data layer
- Mongoose 8 models in `backend/models/`, one file per collection.
- **Use `.lean()` on read-only queries.** If the result is only serialized to a
  response, it should be lean. Do not use it where you then call `.save()` or a
  document method — TypeScript will catch that under strict mode.
- Prefer projections over fetching whole documents for existence checks.

### Frontend data fetching
- **TanStack Query v5** is the only sanctioned way to talk to the API.
  Hooks live in `src/hooks/queries/` (one file per domain).
- `src/lib/queryKeys.ts` is the key factory. `src/lib/apiEndpoints.ts` holds paths.
- `src/lib/axios.ts` is the single axios instance: attaches the bearer token,
  handles token refresh, and maps 401/403 to a redirect.
- **Do not call axios directly from a component.** Add or extend a query hook.
- `useEffect` is not a data-fetching tool. Use a query hook.

### Frontend structure
- `src/components/` feature-first: `dashboard/`, `hr/`, `employee/`, `ui/`, `auth/`.
- `src/services/` for non-API browser services (push notifications, festive
  messages). There is no `src/service/` (singular) — do not recreate it.
- Styling is **Tailwind v4, CSS-first**. Tokens live in the `@theme` block of
  `src/index.css`. **There is no `tailwind.config.js`** and adding one will do
  nothing — the v4 Vite plugin ignores it.
- **React Compiler is enabled** (`vite.config.js`). It auto-memoizes, so do not
  add `useMemo`/`useCallback`/`React.memo` for performance by default.

### shadcn / UI — known gap
Only ~7 of the components in `src/components/ui/` are real shadcn/Radix
primitives. **26 files hand-roll modals** with raw `fixed inset-0` divs — no
focus trap, no ESC handling, no scroll lock, no `aria-modal`. There are also
~8 overlapping date-picker components. When touching this area, prefer adding
the real shadcn primitive (`dialog`, `table`, `dropdown-menu`) and collapsing
duplicates rather than adding another variant. Accessibility coverage is low
(few `aria-*` attributes) — improve it in files you touch.

### Notifications
Email via **Resend** (`services/emailService.ts`) and Web Push
(`services/pushService.ts`). Scheduling is in-process **node-cron**
(`services/schedulerService.ts`) — deliberately not a queue, because the app runs
as a single Railway instance. If it is ever scaled horizontally, these jobs will
double-fire.

### Deployment
Frontend on Vercel, backend on Railway. CORS origins come from
`CORS_ALLOWED_ORIGINS` (comma-separated) with a hardcoded fallback in `server.ts`.

## Business rules

### Attendance status
- Check-in before 9:55 AM = Present
- Check-in after 9:55 AM = Late
- Work hours < 4 = Half-day
- No check-in = Absent (unless on approved leave)
- Working-day calculation excludes weekends and holidays

### Salary
- Supports both old and new Indian tax regimes; TDS computed from the structure
- `SalaryStructure` (recurring definition) and `SalarySlip` (monthly instance)
  are managed independently
- Draft → Finalized publish flow gates employee visibility
- PDFs are generated client-side with jsPDF

### Role permissions
- **Admin**: everything, including user management
- **HR**: employees, attendance, salary structures and slips, publish/unpublish
- **Employee**: own data only (attendance, leave, published slips, expenses)

## Adding a feature

**Backend**: model → **Zod schema in `validators/`** → controller → route wired
with `authMiddleware` + `validateBody` → `pnpm type-check`.

**Frontend**: query hook in `hooks/queries/` (+ key in `queryKeys.ts`, path in
`apiEndpoints.ts`) → component → route in `main.tsx`, wrapped in `RequireRole`
if it is admin/HR-only → `pnpm typecheck` and `pnpm lint`.

## Before claiming done
Run `pnpm type-check` (backend) / `pnpm typecheck` and `pnpm lint` (frontend) and
report the actual numbers against the baselines above. A successful `vite build`
proves nothing about types.
