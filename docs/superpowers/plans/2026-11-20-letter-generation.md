# Letter Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline in one session (the user does not use subagents). Steps use checkbox (`- [ ]`) syntax for tracking. **Do not commit or branch** — the user leaves changes uncommitted.

**Goal:** HR writes letter templates with field chips in an in-app editor, issues letters (employee-bound or manual/offer) as PDFs on the company letterhead, and sends them from the HRMS.

**Architecture:** Templates are Tiptap JSON. Issuing replaces field nodes with text, validates the body against an allow-list, renders HTML with `@tiptap/static-renderer`, and converts it to PDF in a separate Gotenberg (Chromium) service that also places the company's letterhead PDF behind every page. Issued letters (body, values, PDF bytes) are frozen in MongoDB.

**Tech Stack:** Express 5 / Mongoose 8 / Zod v4 (backend), React 19 / TanStack Query v5 / Tiptap v3 (frontend), Gotenberg 8 (≥ 8.28, `-chromium` image) on Railway, Resend, mammoth (already a backend dependency), Carlito 1.103.

**Spec:** `docs/superpowers/specs/2026-11-20-letter-generation-design.md`

## Global Constraints

- pnpm only. Backend: `pnpm type-check` must stay clean and `pnpm build` must pass.
- Frontend: report `pnpm typecheck` and `pnpm lint` against baselines **typecheck 64**, **lint 112 (100 errors, 12 warnings)**; do not increase.
- Every route reading a body uses `validateBody(schema)`; schemas live in `backend/validators/letter.schemas.ts` with exported `z.infer` types. Zod v4 (`z.email()`, `error.issues`).
- Roles in routes via `authMiddleware([...])`. Handlers wrapped in `asyncHandler`, throw `utils/errors.ts` errors. Route params via `paramValue()`.
- Link employees by `employee` ObjectId. `Letter` stores no `employeeId` string, so `COPIES` in `services/employeeIdRename.ts` is unchanged.
- File uploads go through a multer router mounted **before** `express.json()` in `server.ts`, like `/api/documents`.
- `.lean()` on read-only queries; `pdf` buffers excluded from list projections.
- Frontend: TanStack Query hooks only (no axios in components, no `useEffect` fetching); endpoints in `lib/apiEndpoints.ts`, keys in `lib/queryKeys.ts`; `ui/dialog` for modals; `ui/input|textarea|select|label` with layout-only classes; `@theme` tokens; no `useMemo`/`useCallback`/`React.memo` (React Compiler).
- Comments: almost none (CLAUDE.md rules).
- Reference number format `<prefix>/<year>/<NNNN>` (4-digit zero-padded), per company, resetting each calendar year (IST).
- Fonts: Carlito **1.103** (not 1.104), regular/bold/italic/bold-italic.
- No images inside template bodies. Letterhead: 1-page A4 PDF. Draft previews stamped "DRAFT".
- No test suite exists. Pure logic is verified by `backend/scripts/verify-letters.ts` (node:assert, run with `pnpm exec tsx scripts/verify-letters.ts` from `backend/`); API behaviour by curl against the local backend with an HR token and an employee token.

## Review Focus

1. **Gotenberg asleep or unreachable** (Railway Serverless sleep, first request after idle): over the private network a sleeping service refuses connections until it has woken, so the backend retries with backoff for up to ~20 s, then returns a 503 "PDF service is waking up, try again" — never a raw 500 or a hung request. Test in Task 1.
2. **Values with markup characters** (`<b>Ravi</b> & Sons`, `"quotes"`) in names, addresses, ask fields and email body: print literally in the PDF and the email; never become markup. Test in Tasks 3/4 and Task 9.
3. **Multi-line address / long text** (address up to 500 chars with line breaks): line breaks preserved in the PDF, text wraps inside the letterhead margins. Test in Task 4. `Employee.address` is entered in a single-line input, so stored addresses rarely contain line breaks; HR gets multi-line layout by editing the address in the issue form's textarea.
4. **Double issue / concurrent issue**: clicking Issue twice, or two letters for one company issued at the same moment, yields exactly one number per letter, numbers unique and sequential; a second issue of the same letter returns 409. Test in Tasks 5 and 8.
5. **Missing data on the employee** (empty `address`, unknown field key in an old template): issue is refused with a list of the missing/unknown fields; nothing prints blank. Test in Tasks 3 and 8.

---

### Task 1: Gotenberg service and client

**Files:**
- Create: `backend/services/letters/gotenberg.ts`
- Create: `backend/scripts/verify-letters.ts`
- Modify: `backend/.env` (local, not committed) and Railway backend variables

**Interfaces:**
- Produces: `htmlToPdf(input: { html: string; underlay?: Buffer; stamp?: string }, opts?: { retryBudgetMs?: number }): Promise<Buffer>` — retries connection refused/reset and 502/503/504 with backoff (1 s, 2 s, 4 s, 8 s…) until `retryBudgetMs` (default 20 000) is spent, then throws `ServiceUnavailableError('PDF service is waking up, try again in a few seconds')`. A 4xx from Gotenberg is not retried; it throws `InternalServerError` with Gotenberg's message logged.

- [ ] **Step 1 (user action, in Railway):** Create a service from image `gotenberg/gotenberg:<newest 8.x ≥ 8.28>-chromium` (confirm the tag exists on Docker Hub). Variables: `API_ENABLE_BASIC_AUTH=true`, `GOTENBERG_API_BASIC_AUTH_USERNAME`, `GOTENBERG_API_BASIC_AUTH_PASSWORD`, `CHROMIUM_MAX_CONCURRENCY=2`, `CHROMIUM_RESTART_AFTER=100`, `API_TIMEOUT=60s`. Enable Settings → Deploy → Serverless. Generate a public domain (used for local dev only). Backend variables: `GOTENBERG_URL=http://${{Gotenberg.RAILWAY_PRIVATE_DOMAIN}}:3000`, `GOTENBERG_USER`, `GOTENBERG_PASSWORD`. Local `.env`: `GOTENBERG_URL=https://<public domain>` plus the same credentials.
- [ ] **Step 2: Write the verification script skeleton** with a `section(name, fn)` helper and the first check:

```ts
await section('gotenberg renders html', async () => {
  const pdf = await htmlToPdf({ html: '<!doctype html><html><body><p>Hello ₹</p></body></html>' });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
});
await section('gotenberg unreachable → ServiceUnavailableError', async () => {
  const saved = process.env.GOTENBERG_URL;
  process.env.GOTENBERG_URL = 'http://127.0.0.1:9';
  try {
    await assert.rejects(htmlToPdf({ html: '<p>x</p>' }, { retryBudgetMs: 1500 }), (e: Error) => e instanceof ServiceUnavailableError);
  } finally {
    process.env.GOTENBERG_URL = saved;
  }
});
```

- [ ] **Step 3: Run** `pnpm exec tsx scripts/verify-letters.ts` → fails (module missing).
- [ ] **Step 4: Implement `htmlToPdf`.** Native `fetch` + `FormData`/`Blob`; POST `${GOTENBERG_URL}/forms/chromium/convert/html`, file field `files` named `index.html`; fields `preferCssPageSize=true`, `printBackground=true`, **`omitBackground=true`** (Chromium otherwise paints a white page that hides the letterhead underneath; requires `printBackground=true`, and the HTML must set no `html`/`body` background). When `underlay` is given: file `letterhead.pdf`, `watermarkSource=pdf`, `watermarkExpression=letterhead.pdf`, file field `watermark`, `watermarkOptions` set so the page is drawn at 100% page size, opacity 1, no rotation (confirm option keys against gotenberg.dev "Watermark PDFs" for the pinned version). When `stamp` is given: `stampSource=text`, `stampExpression=<stamp>`, diagonal, light grey, ~30% opacity. Basic auth header from env. Read env at call time (the script mutates it). `AbortSignal.timeout(60_000)` per attempt.
- [ ] **Step 5: Run the script** → both sections PASS.
- [ ] **Step 6: Verify sleep and wake on Railway** (after the backend is deployed with this code, or with a temporary `/health/pdf` call from the deployed backend): leave Gotenberg idle until Railway shows it asleep (~10 min), then trigger one render from the deployed backend over the private network → succeeds within the retry budget. If it never wakes over the private network, turn Serverless off for the Gotenberg service (always-on costs about $1–2/month) and note that in `CLAUDE.md` in Task 15.

### Task 2: Formatters and field catalogue

**Files:**
- Create: `backend/services/letters/format.ts`
- Create: `backend/services/letters/fields.ts`
- Modify: `backend/scripts/verify-letters.ts`

**Interfaces:**
- Produces (`format.ts`):
  - `type FieldFormat = 'long' | 'ordinal' | 'dotted' | 'inr' | 'words' | 'upper'`
  - `type FormattedValue = { parts: Array<{ text: string; sup?: true }> }` — "1st July 2025" is `[{text:'1'},{text:'st',sup:true},{text:' July 2025'}]`; every other format is a single part.
  - `formatValue(raw: string, type: FieldType, format?: FieldFormat): FormattedValue` — when `format` is omitted: `date` → `long`, `money` → `inr`, everything else as typed. A `date` that is not `YYYY-MM-DD` or a `money`/`number` that is not `/^\d+(\.\d{1,2})?$/` throws `ValidationError` (the caller names the field).
  - `amountInWords(n: number): string` (port of `frontend/src/utils/indianNumber.ts` `convertToWords`)
  - `salutationFor(gender: 'male' | 'female' | 'other'): string`
- Produces (`fields.ts`):
  - `type FieldType = 'text' | 'longText' | 'date' | 'money' | 'number'`
  - `interface FieldDef { key: string; label: string; type: FieldType; group: 'employee' | 'company' | 'letter' | 'signatory' | 'recipient' }`
  - `AUTO_FIELDS: FieldDef[]` (exact keys from spec §9), `RECIPIENT_FIELDS: FieldDef[]` (`recipient.name`, `recipient.email`, `recipient.address`)
  - `resolveAutoValues(ctx: { employee?: EmployeeLean; company: { name: string; address?: string }; letterhead: { signatory: { name: string; designation: string } }; letterDate: Date; referenceNo?: string }): Record<string, string>` — raw values (ISO dates, plain numbers), formatting happens per chip.

- [ ] **Step 1: Add assertions**

```ts
const t = (v: FormattedValue) => v.parts.map((p) => p.text).join('');
assert.equal(t(formatValue('2025-07-01', 'date', 'long')), '1 July 2025');
assert.deepEqual(formatValue('2025-07-01', 'date', 'ordinal').parts, [{ text: '1' }, { text: 'st', sup: true }, { text: ' July 2025' }]);
assert.equal(t(formatValue('2025-07-22', 'date', 'ordinal')), '22nd July 2025');
assert.equal(t(formatValue('2025-07-13', 'date', 'ordinal')), '13th July 2025');
assert.equal(t(formatValue('2025-07-30', 'date', 'dotted')), '30.07.2025');
assert.equal(t(formatValue('450000', 'money', 'inr')), '₹4,50,000');
assert.equal(t(formatValue('450000', 'money', 'words')), 'Four Lakh Fifty Thousand Rupees Only');
assert.equal(t(formatValue('beryl 13', 'text', 'upper')), 'BERYL 13');
assert.equal(t(formatValue('2025-07-01', 'date')), '1 July 2025');
assert.equal(t(formatValue('450000', 'money')), '₹4,50,000');
assert.throws(() => formatValue('1st July', 'date'));
assert.throws(() => formatValue('4,50,000', 'money'));
assert.equal(salutationFor('male'), 'Mr.');
assert.equal(salutationFor('female'), 'Ms.');
assert.equal(salutationFor('other'), '');
assert.ok(AUTO_FIELDS.some((f) => f.key === 'employee.code'));
```

Dates are interpreted in IST (`utils/timezone.ts`). Match the exact words output of the existing frontend `convertToWords` for the same number; adjust the assertion to its casing if it differs, and use the same function on both sides.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.

### Task 3: Body schema (allow-list) and field resolution

**Files:**
- Create: `backend/validators/letter.schemas.ts`
- Create: `backend/services/letters/resolve.ts`
- Modify: `backend/scripts/verify-letters.ts`

**Interfaces:**
- Produces (`letter.schemas.ts`): `letterDocSchema` (recursive Zod v4, getter-based) accepting only:
  - nodes `doc, paragraph, heading(level 1–3), text, hardBreak, bulletList, orderedList(start), listItem, table, tableRow, tableHeader, tableCell(colspan,rowspan,colwidth), pageBreak, field(key: /^[a-z]+\.[A-Za-z0-9_]+$/, format?: FieldFormat)`
  - marks `bold, italic, underline, strike, superscript, subscript, link(href: http(s)/mailto only), textStyle(color: /^#[0-9a-f]{6}$/i or /^rgb\(\d{1,3}, ?\d{1,3}, ?\d{1,3}\)$/)` — pasted Word colours arrive as `rgb(…)`
  - attrs `textAlign ∈ left|center|right|justify` on paragraph/heading
  - **Shape real Tiptap output:** every attr is `.nullable().optional()` (Tiptap writes `textAlign: null`, `colwidth: null`, `color: null`, `start: 1, type: null`), and unknown attr keys are **stripped, not rejected** (`z.object` default) — `link` carries `target/rel/class`, `textStyle` may carry other style keys. Only unknown node and mark **types** are rejected.
  - Exports `type LetterDoc = z.infer<typeof letterDocSchema>`.
  - Also `askFieldSchema = { key: /^[a-z][A-Za-z0-9_]*$/, label: 1–80, type: FieldType, required: boolean, default?: string ≤ 500 }`.
- Produces (`resolve.ts`):
  - `collectFieldKeys(doc: LetterDoc): string[]`
  - `resolveFields(doc: LetterDoc, values: Record<string, string>, types: Record<string, FieldType>, opts?: { keep?: (key: string) => boolean }): { doc: LetterDoc; missing: string[]; unknown: string[] }` — field nodes whose key matches `keep` are left in place untouched (used so "Edit wording" keeps `letter.referenceNo` and `letter.date` as chips until issue); every other `field` node becomes text node(s) from `formatValue(...).parts`, carrying the field node's marks; `sup` parts add a `superscript` mark. A value containing `\n` becomes text nodes separated by `hardBreak`. Keys absent from `types` → `unknown`; present but empty value → `missing`. Pure; never mutates input.
  - `assertResolvable(result)` → throws `ValidationError` with message `Missing values: a, b` / `Unknown fields: x`.

- [ ] **Step 1: Add assertions**

```ts
const doc = { type: 'doc', content: [{ type: 'paragraph', content: [
  { type: 'text', text: 'Dear ' },
  { type: 'field', attrs: { key: 'employee.firstName' }, marks: [{ type: 'bold' }] },
  { type: 'text', text: ', from ' },
  { type: 'field', attrs: { key: 'employee.joiningDate', format: 'ordinal' } },
] }] };
const types = { 'employee.firstName': 'text', 'employee.joiningDate': 'date', 'employee.address': 'longText' } as const;
const r = resolveFields(letterDocSchema.parse(doc), { 'employee.firstName': '<b>Ravi</b> & Co', 'employee.joiningDate': '2025-07-01' }, types);
assert.deepEqual(r.missing, []);
assert.deepEqual(r.unknown, []);
const p = r.doc.content![0].content!;
assert.deepEqual(p[1], { type: 'text', text: '<b>Ravi</b> & Co', marks: [{ type: 'bold' }] });
assert.deepEqual(p.slice(3).map((n) => n.marks?.[0]?.type ?? null), [null, 'superscript', null]);

const addr = resolveFields(letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'employee.address' } }] }] }), { 'employee.address': 'P-50\nSector 75' }, types);
assert.deepEqual(addr.doc.content![0].content!.map((n) => n.type), ['text', 'hardBreak', 'text']);

const miss = resolveFields(letterDocSchema.parse(doc), { 'employee.firstName': '', 'employee.joiningDate': '2025-07-01' }, types);
assert.deepEqual(miss.missing, ['employee.firstName']);
const unk = resolveFields(letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'employee.grade' } }] }] }), {}, types);
assert.deepEqual(unk.unknown, ['employee.grade']);

const kept = resolveFields(letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'letter.referenceNo' } }, { type: 'field', attrs: { key: 'employee.firstName' } }] }] }), { 'employee.firstName': 'Ravi' }, { ...types, 'letter.referenceNo': 'text' }, { keep: (k) => k.startsWith('letter.') });
assert.deepEqual(kept.doc.content![0].content!.map((n) => n.type), ['field', 'text']);
assert.deepEqual(kept.missing, []);

const tiptapShaped = letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: null }, content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { color: 'rgb(68, 114, 196)', fontFamily: null } }, { type: 'link', attrs: { href: 'https://a.in', target: '_blank', rel: 'noopener', class: null } }] }] }] });
assert.equal(tiptapShaped.content![0].content![0].marks![0].attrs!.color, 'rgb(68, 114, 196)');
assert.throws(() => letterDocSchema.parse({ type: 'doc', content: [{ type: 'image', attrs: { src: 'x' } }] }));
assert.throws(() => letterDocSchema.parse({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }] }));
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.

### Task 4: HTML rendering and PDF pipeline

**Files:**
- Create: `backend/services/letters/render.ts`
- Create: `backend/assets/fonts/Carlito-{Regular,Bold,Italic,BoldItalic}.ttf` and `backend/assets/fonts/OFL.txt`
- Modify: `backend/package.json` (add `@tiptap/static-renderer`, `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style`, `@tiptap/extension-superscript`, `@tiptap/extension-subscript`, `@tiptap/extension-table` — all the same v3 version)
- Modify: `backend/scripts/verify-letters.ts`

**Interfaces:**
- Consumes: `LetterDoc` (Task 3), `htmlToPdf` (Task 1).
- Produces:
  - `interface PageLayout { marginsMm: { top: number; right: number; bottom: number; left: number } }`
  - `renderLetterHtml(doc: LetterDoc, layout: PageLayout): string` — full HTML document. Throws if `doc` still contains `field` nodes.
  - `renderLetterPdf(doc: LetterDoc, letterhead: { pdf?: Buffer; marginsMm: PageLayout['marginsMm'] }, opts?: { draft?: boolean }): Promise<Buffer>` — `stamp: 'DRAFT'` when `draft`.

Rendering details: server-side `PageBreak` node (`Node.create({ name: 'pageBreak', group: 'block', atom: true, renderHTML: () => ['div', { class: 'page-break' }] })`). CSS: **no background on `html`/`body`** (the letterhead shows through), `@page { size: A4; margin: <mm> }`, body Carlito 11pt / line-height 1.35, `p { margin: 0 0 0.6em }`, `.page-break { break-before: page }`, `tr { break-inside: avoid }`, `thead { display: table-header-group }`, tables full width with 1px borders, `text-align: justify` honoured. Fonts embedded as base64 `@font-face` (read once, cached in module scope). Get Carlito 1.103 from the crosextra release (Debian `fonts-crosextra-carlito` 20130920); confirm the `name` table version reads 1.103.

- [ ] **Step 1: Add assertions**

```ts
const resolved = resolveFields(letterDocSchema.parse(doc), { 'employee.firstName': '<script>x</script>', 'employee.joiningDate': '2025-07-01' }, types).doc;
const html = renderLetterHtml(resolved, { marginsMm: { top: 45, right: 20, bottom: 30, left: 20 } });
assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));
assert.ok(!html.includes('<script>'));
assert.ok(html.includes('<sup>st</sup>'));
assert.ok(html.includes('size: A4'));
assert.throws(() => renderLetterHtml(letterDocSchema.parse(doc), { marginsMm: { top: 45, right: 20, bottom: 30, left: 20 } }));
const pdf = await renderLetterPdf(resolved, { marginsMm: { top: 45, right: 20, bottom: 30, left: 20 } }, { draft: true });
writeFileSync('scratch-letter.pdf', pdf);
```

If the static renderer does not escape text, map `text` explicitly through `utils/escapeHtml.ts`.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Visual check with the real letterhead.** Export the Cosmos letterhead as a 1-page A4 PDF (from the Word file, or crop page 4 of `Veshant Appopintment Letter.pdf` — it is the letterhead with only a short paragraph). Render a 3-page lorem body with a multi-line address and a page break using `{ pdf: letterhead }`. Open `scratch-letter.pdf`: letterhead on every page at full size, behind the text, text inside the margins, "DRAFT" stamped, ₹ renders. Delete `scratch-letter.pdf` afterwards. If the watermark cannot be drawn at 100% page size, underlay with `pdf-lib` in Node instead (new page per content page: draw letterhead, then the embedded content page) and keep the same `renderLetterPdf` signature.

### Task 5: Models and reference numbers

**Files:**
- Create: `backend/models/LetterTemplate.model.ts`, `backend/models/Letterhead.model.ts`, `backend/models/Letter.model.ts`, `backend/models/LetterCounter.model.ts`
- Create: `backend/services/letters/referenceNo.ts`

**Interfaces:**
- Models exactly as spec §8 (`LetterTemplate`, `Letterhead`, `Letter`), types `ILetterTemplate`, `ILetterhead`, `ILetter`, `LetterStatus = 'draft' | 'issued' | 'sent' | 'void'`, `LetterKind = 'employee' | 'manual'`. `Letter.pdf` and `Letterhead.pdf`/`signature.signatureImage` use `select: false`.
- `LetterCounter`: `{ _id: string, seq: number }`.
- `nextReferenceNo(companyId: Types.ObjectId, prefix: string, at: Date): Promise<string>` — `_id = "<companyId>:<IST year>"`, `findOneAndUpdate({ _id }, { $inc: { seq: 1 } }, { upsert: true, new: true })`, returns `${prefix}/${year}/${String(seq).padStart(4, '0')}`.

- [ ] **Step 1:** Implement models and `nextReferenceNo`.
- [ ] **Step 2: Verify concurrency** with a throwaway section in the script guarded by `process.env.VERIFY_DB` (connects with the dev `MONGODB_URI`, uses a fresh random ObjectId as company): `Promise.all` of 20 calls → 20 distinct values, sorted they are `…/0001` … `…/0020`. Delete the counter doc at the end. Run `VERIFY_DB=1 pnpm exec tsx scripts/verify-letters.ts` → PASS.
- [ ] **Step 3:** `pnpm type-check` → clean.

### Task 6: Letterhead API

**Files:**
- Create: `backend/routes/letterUpload.routes.ts` (multer; mounted at `/api/letters` before `express.json()`; holds only the multipart routes and the letterhead GET/preview; auth **per route**, never `router.use(authMiddleware…)`, because unmatched `/api/letters/*` requests must fall through to the JSON router mounted later)
- Create: `backend/controllers/letterhead.controllers.ts`
- Modify: `backend/validators/letter.schemas.ts`, `backend/server.ts`

**Interfaces:**
- `GET /api/letters/letterheads/:companyId` (admin, hr) → `{ company, marginsMm, signatory: { name, designation, hasSignature }, referencePrefix, hasPdf, updatedAt }` (no buffers).
- `PUT /api/letters/letterheads/:companyId` (admin, hr), multipart (own `multer.memoryStorage()` instance): optional files `pdf` (application/pdf, ≤ 2 MB — the letterhead may be embedded once per page, and the issued PDF must stay far below MongoDB's 16 MB document limit — must be exactly 1 page, A4 ±2 pt — check with `pdf-lib` `getPageCount()`/`getSize()`; add `pdf-lib` to backend), `signature` (png/jpeg ≤ 1 MB); text field `data` = JSON validated by `letterheadDataSchema` `{ marginsMm: {top,right,bottom,left: 0–80}, signatory: { name 1–100, designation 1–100 }, referencePrefix: /^[A-Z0-9/-]{1,20}$/ }`. Parse `data` then validate with the schema in the controller via `letterheadDataSchema.parse` (multipart cannot use `validateBody` before multer; document this with one comment).
- `POST /api/letters/letterheads/:companyId/preview` (admin, hr) → PDF of a fixed sample body (salutation, 4 justified paragraphs, page break, signature block) via `renderLetterPdf(..., { draft: true })`.
- Mount: `app.use('/api/letters', letterUploadRoutes)` next to `/api/documents`, before `express.json()`; router paths are `/letterheads/:companyId`, `/letterheads/:companyId/preview` (and `/import-docx` in Task 7). Validate `companyId` is an ObjectId → 404 otherwise.

- [ ] **Step 1:** Implement. **Step 2:** `pnpm type-check` clean.
- [ ] **Step 3: Exercise** with curl (HR token): PUT with the Cosmos letterhead PDF + data → 200; GET shows `hasPdf: true`; preview returns `%PDF-` and the file looks right; PUT with a 2-page PDF → 400 "Letterhead must be a single A4 page"; employee token → 403.

### Task 7: Template API, field catalogue endpoint, .docx import

**Files:**
- Create: `backend/controllers/letterTemplate.controllers.ts`, `backend/routes/letter.routes.ts`
- Modify: `backend/validators/letter.schemas.ts`, `backend/server.ts`, `backend/routes/letterUpload.routes.ts`

**Interfaces:**
- Schemas: `createTemplateSchema = { name 1–100, kind, company: objectId, body: letterDocSchema, askFields: askFieldSchema[] ≤ 30 (unique keys), email: { subject 1–200, body 1–5000 } }`; `updateTemplateSchema = createTemplateSchema.partial()`. Exported types `CreateTemplateInput`, `UpdateTemplateInput`.
- Save-time check: every `field` key in the body is in `AUTO_FIELDS` (employee kind) or `RECIPIENT_FIELDS` + `company.*`/`letter.*`/`signatory.*` (manual kind), or `ask.<key>` of a declared ask field → else 400 `Unknown fields: …`.
- Routes (`/api/letters`, admin/hr): `GET /fields` → `{ auto: FieldDef[], recipient: FieldDef[] }`; `GET /templates` (active only unless `?all=1`, no body in list projection); `GET /templates/:id`; `POST /templates`; `PUT /templates/:id`; `DELETE /templates/:id` (sets `active=false`); `POST /templates/preview` with `validateBody(previewTemplateSchema)` (`{ kind, company, body, askFields }`, so unsaved edits preview) → DRAFT PDF with sample values (auto fields from a fixed sample person "Asha Verma", ask fields from their defaults or the label in brackets).
- `POST /api/letters/import-docx` (upload router from Task 6, admin/hr): file `docx` ≤ 10 MB, extension `.docx` → `mammoth.convertToHtml({ buffer })` → `{ html, messages }`. Images dropped (`convertImage` returns `{}` attrs with no `src`, frontend schema drops them).
- Mount `app.use('/api/letters', letterRoutes)` after `express.json()`.

- [ ] **Step 1:** Implement. **Step 2:** `pnpm type-check` clean.
- [ ] **Step 3: Exercise:** create an employee template containing `employee.firstName` and `ask.grade` → 201; create one with `employee.salary` → 400 listing it; preview → PDF; import the Cosmos appointment letter's .docx (or any .docx) → HTML with headings/lists/bold.

### Task 8: Letter lifecycle API

**Files:**
- Create: `backend/controllers/letter.controllers.ts`, `backend/services/letters/issue.ts`
- Modify: `backend/routes/letter.routes.ts`, `backend/validators/letter.schemas.ts`

**Interfaces:**
- Schemas: `createLetterSchema = { template: objectId, employee?: objectId, recipient?: { name 1–150, email: z.email(), address? ≤ 500 }, values: Record<string, string ≤ 2000> }` (employee required iff template kind is employee; recipient required iff manual — refine); `updateLetterSchema = { values?, recipient?, body?: letterDocSchema }`; `sendLetterSchema = { to?: z.email() }`; `voidLetterSchema = { reason 3–300 }`.
- `issue.ts`:
  - `buildDraftValues(template, employee?, company, letterhead, overrides): Record<string,string>` — `resolveAutoValues` + `ask.*` defaults + `recipient.*`, then overrides.
  - `finalBody(letter, template, letterValues): LetterDoc` — start from `letter.body` if wording was edited (it still holds `letter.*` chips), else `template.body`; `resolveFields` with all values; `assertResolvable` before PDF.
  - `PREVIEW_REFERENCE = '<prefix>/<year>/____'` — drafts and template previews fill `letter.referenceNo` with this and `letter.date` with today, so previews never fail on the number that only issue assigns.
  - Wording edit: the frontend asks for the "letter mode" body via `GET /:id/wording` → `resolveFields(template.body, values, types, { keep: (k) => k.startsWith('letter.') })`.
  - PDF reads: `.select('+pdf').lean()` returns BSON `Binary`; convert with the same `Buffer.isBuffer(raw) ? raw : Buffer.from(raw.buffer)` pattern as `services/assistant/files/store.ts`.
- Routes (`/api/letters`) — declare `/fields`, `/templates…`, `/mine` **before** `/:id…`; every `:id` is checked with `isValidObjectId` → 404 (no CastError 500):
  - `GET /` (admin, hr) — filters `status, kind, employee, template, q` (q matches `recipient.name`/`referenceNo` with `escapeRegExp`), sorted `createdAt -1`, paginated; projection without `pdf`, `body`.
  - `GET /mine` (employee, hr, admin) — own `issued|sent` letters by `req.user.employee`.
  - `GET /:id` (admin, hr) — letter without `pdf`.
  - `POST /` → draft (snapshots `templateName`, `company`, `kind`, `values`). Response includes `employeeCompanyMismatch: boolean`.
  - `PUT /:id` → draft only (409 otherwise). Sending `body` stores the edited wording; sending `values` after wording edits clears `body` (frontend asks first).
  - `GET /:id/wording` (admin, hr) → draft only; the body for "Edit wording" (see `issue.ts` above).
  - `POST /:id/preview` → DRAFT PDF of the current draft.
  - `POST /:id/issue` → lock with `findOneAndUpdate({ _id, $or: [{ status: 'draft' }, { status: 'issuing', updatedAt: { $lt: now − 2 min } }] }, { status: 'issuing' })` (add `'issuing'` as an internal status; a crashed issue unlocks itself after 2 minutes). If the letter has no `referenceNo` yet, take `nextReferenceNo` and **save it on the letter immediately** — a retry after a failed render reuses it, so failures never leave gaps. Resolve `letter.referenceNo` and `letter.date` into the body, render, check the PDF is < 15 MB (else `ValidationError('Letter PDF is too large — use a smaller letterhead file')`), store `pdf`, `pdfSha256`, `issuedAt/By`, status `issued`. On any render error set status back to `draft` (number kept) and rethrow. No match for the lock → 409 "Letter is already issued".
  - `POST /:id/void` → issued|sent → void with reason.
  - `DELETE /:id` → drafts by admin/hr; void manual letters by admin only (DPDP deletion).
  - `GET /:id/pdf` → `ownsEmployeeRecord(req.user, letter.employee)` and, for employees, status ∈ issued|sent; else 404. `Content-Type: application/pdf`, `Content-Disposition: inline; filename="<referenceNo or 'draft'> <recipient>.pdf"` (sanitize filename).

- [ ] **Step 1:** Implement. **Step 2:** `pnpm type-check` clean.
- [ ] **Step 3: Exercise:** employee letter draft → preview → issue → `referenceNo` like `CFG/HR/2026/0001`; issue again → 409; two drafts issued in parallel (`curl … & curl … & wait`) → distinct numbers; an employee whose `address` is empty with a template using `employee.address` → issue 400 `Missing values: employee.address`; employee token GET own pdf → 200, someone else's → 404; draft pdf with employee token → 404.

### Task 9: Sending, email attachments, notification

**Files:**
- Modify: `backend/services/emailService.ts` (`send` options gain `attachments?: Array<{ filename: string; content: Buffer }>`, converted to base64)
- Modify: `backend/services/notifications/catalog.ts` (add `letter_issued`)
- Modify: `backend/controllers/letter.controllers.ts`, `backend/routes/letter.routes.ts`

**Interfaces:**
- `POST /api/letters/:id/send` (admin, hr), `validateBody(sendLetterSchema)`: status issued|sent; `to` defaults to `recipient.email` (manual) or the employee's email. Subject/body = template email with `{{key}}` tokens replaced by **escaped** formatted values (`utils/escapeHtml.ts`), newlines → `<br>`, wrapped in `emailService.getBaseEmailTemplate`. Attachment `<referenceNo> - <recipient name>.pdf`. Reply-To = `req.user.email`. Push `{ to, at, by, resendId }` to `sends`; status `sent`. Employee letters also `NotificationService.notifyEmployee(letter.employee, 'letter_issued', { title: templateName }, { email: false })`.
- Catalog entry: `letter_issued: { category: 'people', build: (d) => ({ title: 'New letter', body: \`Your ${text(d.title,'letter')} is ready\`, url: '/letters/my' }), ttl: 7 * DAY, urgency: 'normal' }` (no `emailTemplate` — the letter email already went out).

- [ ] **Step 1: Add an assertion** for the token replacement helper `renderEmailText(template: string, values: Record<string,string>): string` (exported from `issue.ts`): `renderEmailText('Hi {{recipient.name}}', { 'recipient.name': '<i>A</i>' }) === 'Hi &lt;i&gt;A&lt;/i&gt;'`; unknown tokens render as empty string.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement everything above. **Step 4:** Run → PASS; `pnpm type-check` clean.
- [ ] **Step 5: Check `EMAIL_FROM`** in Railway and local env is an address on a domain verified in Resend. The `onboarding@resend.dev` fallback only delivers to the Resend account owner, so candidate emails would be rejected. If unset, the send endpoint throws `ServiceUnavailableError('Email sender is not configured')` before calling Resend.
- [ ] **Step 6: Exercise:** send a manual letter to your own inbox → email arrives with PDF attached, reply goes to the HR user; send an employee letter → in-app notification appears for that employee.

### Task 10: Frontend data layer

**Files:**
- Create: `frontend/src/hooks/queries/useLetters.ts`, `frontend/src/types/letters.ts`
- Modify: `frontend/src/lib/apiEndpoints.ts` (`LETTERS` group), `frontend/src/lib/queryKeys.ts` (`letters` group), `frontend/src/hooks/queries/index.ts`, `frontend/src/types/index.ts` (re-export)
- Modify: `frontend/package.json` — install the Tiptap packages here (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style`, `@tiptap/extension-superscript`, `@tiptap/extension-subscript`, `@tiptap/extension-table`, `@tiptap/suggestion`, same v3 version as backend), because `LetterDoc` uses `JSONContent` from `@tiptap/react`
- Companies come from the existing `useCompanies()` in `hooks/queries/useSettings.ts`; do not add another.

**Interfaces:**
- Types mirror backend responses: `LetterTemplate`, `LetterTemplateSummary`, `AskField`, `FieldDef`, `Letterhead`, `Letter`, `LetterSummary`, `LetterStatus`, `LetterKind`, `LetterDoc` (`JSONContent` from `@tiptap/react`).
- Keys: `letters.fields()`, `letters.templates(all?)`, `letters.template(id)`, `letters.letterhead(companyId)`, `letters.list(params)`, `letters.detail(id)`, `letters.wording(id)`, `letters.mine()`.
- Hooks: `useLetterFields`, `useLetterTemplates`, `useLetterTemplate`, `useSaveLetterTemplate` (create/update), `useDeleteLetterTemplate`, `useLetterhead`, `useSaveLetterhead` (FormData), `useImportDocx`, `useLetters`, `useLetter`, `useLetterWording`, `useMyLetters`, `useCreateLetter`, `useUpdateLetter`, `useIssueLetter`, `useSendLetter`, `useVoidLetter`, `useDeleteLetter`, and PDF fetchers `useLetterPdf` (mutation returning `Blob`, `responseType: 'blob'`) for: template preview, letterhead preview, draft preview, issued pdf. Mutations invalidate the matching keys.

- [ ] **Step 1:** Implement. **Step 2:** `pnpm typecheck` → no new errors vs baseline 64.

### Task 11: Letter editor component

**Files:**
- Create: `frontend/src/components/hr/letters/editor/LetterEditor.tsx`, `FieldNode.tsx`, `PageBreakNode.ts`, `EditorToolbar.tsx`, `FieldPicker.tsx`, `cleanWordPaste.ts`
- Create: `frontend/public/fonts/Carlito-{Regular,Bold,Italic,BoldItalic}.ttf` (same files as backend) and `@font-face` rules in `src/index.css`

**Interfaces:**
- `LetterEditor({ value: LetterDoc; onChange(doc: LetterDoc): void; fields: Array<FieldDef & { source: 'auto' | 'recipient' | 'ask' }>; marginsMm?: { left: number; right: number }; mode: 'template' | 'letter' })`. In `letter` mode no field insertion; the only chips present are `letter.referenceNo` / `letter.date`, which render as "(assigned on issue)" / "(issue date)" and can be moved or deleted but not inserted.
- `FieldNode`: inline, atom, attrs `key`, `format`; `ReactNodeViewRenderer` chip showing the field's label (from `fields`), destructive styling + tooltip "Unknown field" when not found; format chooser in a popover for date/money/text fields. `parseHTML`/`renderHTML` use `span[data-field]`.
- `PageBreakNode`: block atom, renders a dashed rule labelled "Page break".
- Toolbar (via `useEditorState`): bold, italic, underline, superscript, colour (6 swatches incl. the Cosmos blue `#4472C4`), align left/center/right/justify, bullet/ordered list, table insert (3×3) with add/delete row/column, page break, undo/redo. Buttons are `ui/button` ghost icons with `aria-label`s.
- `FieldPicker`: grouped list (Employee, Company, Letter, Signatory, Recipient, Ask); click inserts at cursor. Typing `{{` opens the same list as a popover filtered by subsequent text (input rule / simple suggestion via `@tiptap/suggestion` included in pm deps — add `@tiptap/suggestion` if not transitively available).
- `cleanWordPaste(html: string): string` via `editorProps.transformPastedHTML`: drop `<o:p>`, conditional comments, `mso-*` styles and classes; map inline `font-weight:bold|700` → `<strong>`, `font-style:italic` → `<em>`, `text-decoration:underline` → `<u>`; rebuild `mso-list` paragraphs into `<ol>/<ul>`.
- Canvas: `w-[794px]` paper on `bg-muted`, padding from `marginsMm` (mm × 3.7795 px), Carlito 11pt, `text-justify` honoured; scrolls horizontally on narrow screens.
- No image extension; StarterKit configured with `link: { protocols: ['http','https','mailto'], openOnClick: false }`.

- [ ] **Step 1:** Implement (deps were installed in Task 10). **Step 2:** `pnpm typecheck` / `pnpm lint` — no increase vs baselines.
- [ ] **Step 3: Exercise in the browser:** paste a section of the Cosmos appointment letter from Word → numbered clauses, bold-underlined headings, justification survive; insert chips, `{{`, page break; unknown chip shows red.

### Task 12: Template and letterhead pages

**Files:**
- Create: `frontend/src/components/hr/letters/LetterTemplatesPage.tsx` (list), `LetterTemplateEditorPage.tsx` (create/edit), `AskFieldsPanel.tsx`, `LetterheadSettings.tsx`, `PdfPreviewDialog.tsx`
- Modify: `frontend/src/main.tsx` (routes), `frontend/src/components/Sidebar.tsx` (HR link "Letters" → `/letters`, a lucide file icon that exists in the installed `lucide-react` 0.488 — check the import compiles, e.g. `FilePen`)

**Interfaces:**
- Routes (all `RequireRole roles={HR_ONLY}`): `/letters` (issued letters list, Task 13), `/letters/templates`, `/letters/templates/new`, `/letters/templates/:id`, `/letters/letterheads`, `/letters/new`, `/letters/:id`; `/letters/my` for every role (Task 14). Pages lazy-loaded like the others.
- Template editor page: name, kind (radio; disabled after creation), company (`ui/select` from companies query), `LetterEditor`, `AskFieldsPanel` (add/edit/remove: key auto-derived from label, type, required, default), email subject/body (`ui/input`, `ui/textarea`, with an "Insert field" menu inserting `{{key}}`), "Import .docx" (calls `useImportDocx`, loads returned HTML via `editor.commands.setContent(html)` after confirm if the body isn't empty), "Preview PDF" (opens `PdfPreviewDialog` with an object URL in an `<iframe>`; revoke on close), Save.
- Letterhead settings: per company: upload PDF, margins (4 number inputs, mm), signatory name/designation, signature image, reference prefix, preview.
- `PdfPreviewDialog({ blob: Blob | null; title: string; onOpenChange })` using `ui/dialog`, full-height iframe, Download button (anchor with object URL).

- [ ] **Step 1:** Implement. **Step 2:** typecheck/lint — no increase.
- [ ] **Step 3: Exercise:** set up the Cosmos letterhead; build the appointment letter template by importing its .docx and replacing the personal details with chips (salutation, full name, code, address, first name, position (bold), joining date ordinal, company name, letter date dotted, signatory) and ask fields Grade (required, no default), Posting city (required), Probation (default "3 months"), Notice period (default "30 days"); preview looks like the reference.

### Task 13: Issue flow and letters list

**Files:**
- Create: `frontend/src/components/hr/letters/LettersPage.tsx` (list), `IssueLetterPage.tsx` (new + draft detail), `LetterValuesForm.tsx`, `LetterDetailPanel.tsx`

**Interfaces:**
- `/letters`: table of letters (reference no, recipient, template, status badge, issued date), filters (status, template, search), actions per row: open, download (issued/sent), resend, void. Buttons to "New letter", "Templates", "Letterheads".
- `/letters/new`: step 1 pick template; employee kind → `SearchableEmployeeSelect`; manual kind → recipient name/email/address. Creates the draft (`useCreateLetter`) and navigates to `/letters/:id`.
- `/letters/:id` (draft): `LetterValuesForm` lists every field used by the template: auto values prefilled (editable), ask fields with defaults, required markers, date fields with `enhanced-datepicker`, money as number input; company-mismatch warning banner; "Edit wording" switches to `LetterEditor mode="letter"` on the body from `GET /:id/wording` (`useLetterWording`) (`confirm-dialog` before discarding wording edits when values change later); "Preview" → `PdfPreviewDialog`; "Issue" → `confirm-dialog` ("Issuing assigns a reference number and locks this letter") → `useIssueLetter`; then "Send" with recipient email prefilled (editable) → `useSendLetter`.
- `/letters/:id` (issued/sent/void): read-only detail — PDF preview, send history, Resend, Void (reason dialog). Server errors (missing/unknown fields, 503 waking up) show as toasts with the server message.

- [ ] **Step 1:** Implement. **Step 2:** typecheck/lint — no increase.
- [ ] **Step 3: Exercise:** issue the appointment letter for a real employee end to end; issue and send a manual offer letter to your own email; void one; try issuing with a required ask field empty → blocked with the field named.

### Task 14: Employee "My letters"

**Files:**
- Create: `frontend/src/components/employee/MyLetters.tsx`
- Modify: `frontend/src/main.tsx` (`/letters/my`), `frontend/src/components/Sidebar.tsx` (employee link "My Letters", or a tab inside the existing documents page if the sidebar's employee section groups documents — follow whichever pattern `MyDocuments` uses)

**Interfaces:**
- Lists `useMyLetters()` (title, reference no, issued date) with View (PDF dialog) and Download. Empty state text: "No letters yet."

- [ ] **Step 1:** Implement. **Step 2:** typecheck/lint — no increase.
- [ ] **Step 3: Exercise:** as the employee who received the appointment letter: it appears, opens, downloads; notification deep link `/letters/my` lands here.

### Task 15: Final verification

- [ ] **Step 1:** `backend`: `pnpm type-check` clean, `pnpm build` passes, `pnpm exec tsx scripts/verify-letters.ts` all PASS.
- [ ] **Step 2:** `frontend`: `pnpm typecheck` and `pnpm lint` — report actual numbers against 64 / 112 (100 errors, 12 warnings); `pnpm build` passes.
- [ ] **Step 3: Done criterion from the spec:** the reference appointment letter reproduced end to end (template from the imported .docx, issued for an employee, PDF on the Cosmos letterhead, emailed with attachment). Compare side by side with `Veshant Appopintment Letter.pdf`: letterhead identical; fields correct ("Mr.", code with slashes, address (split onto lines in the issue form), "1st" superscript, dotted date, reference number printed even after "Edit wording"); body visually equivalent.
- [ ] **Step 4:** Update `CLAUDE.md` with one-line rules only (per the "keep CLAUDE.md lean" preference): letters PDFs via Gotenberg (`GOTENBERG_URL`), letter PDFs live in MongoDB not S3, template bodies validated by `letterDocSchema` allow-list.
