# Letter generation — design

**Date:** 2026-11-20 · **Status:** awaiting approval

## 1. Intent

HR produces offer letters, appointment letters and other HR letters by opening a Word file, overwriting the
previous person's details, saving a copy, and emailing it themselves. That is slow, it invites mistakes (a stale
name or salary left behind, the company name spelled two ways in one letter), and the HRMS keeps no record that
a letter was ever issued or what it said.

The feature moves this into the HRMS:

- HR writes each letter **template** once, in a Word-like editor inside the app, with **field chips** where the
  person-specific details go.
- To issue a letter, HR picks a template (and, for employee letters, an employee). Fields fill themselves from the
  system; HR types the rest, previews the exact PDF, can still adjust the wording of this one letter, then issues
  and sends it from the HRMS.
- Every issued letter is kept, frozen exactly as sent.

The reference letter is `Veshant Appopintment Letter.pdf` (repo root, not committed): a 4-page Cosmos Financial
Group appointment letter with a full-bleed letterhead (slate corner shape, CFG logo, bottom bar and legal footer on
every page), Calibri body, justified numbered clauses with bold-underlined headings, a superscript ordinal date, one
coloured word, a signatory block and an "Agreed and Accepted" page. The feature must reproduce that letter.

## 2. Goals

1. HR can reproduce the reference letter: letterhead identical, fields auto-filled, body visually equivalent.
2. Two template kinds:
   - **Employee** — HR picks an employee; auto fields fill from the system.
   - **Manual** (offer letters) — no employee; HR enters every value plus the recipient's name and email.
3. Any template can also declare **ask fields** that HR fills at issue time (grade, posting city, revised CTC,
   last working day), each with an optional default.
4. HR can edit the wording of an individual letter before issuing it.
5. Issue produces a PDF, assigns a reference number, and freezes the letter. Send emails it with the PDF attached.
6. Issued letters are private: HR/admin can see all; an employee can see their own.
7. Existing Word letters can be brought in without retyping.

## 3. Non-goals (v1)

- Bulk issuing (e.g. increment letters for everyone at once).
- Auto-built salary annexure from `SalaryStructure` (HR builds the annexure as a table with fields).
- Candidate accept/decline links, offer expiry tracking.
- Aadhaar eSign / DSC signing. A signature image on the letterhead is supported.
- Conditional sections or loops in templates.
- Live page-by-page pagination inside the editor. The PDF preview is the source of truth.
- Approval workflow before sending (today's process has none).

## 4. Anti-goals

- A template must never be able to run code or inject markup into the PDF or email.
- An issued letter must never change after it is issued — not when the employee record, the company, the
  template or the letterhead changes later.
- A letter showing a salary must never be reachable by a public URL.

## 5. Constraints

- Project rules in `CLAUDE.md`: Zod on every body, `authMiddleware` roles in routes, TanStack Query only,
  React Compiler (no manual memoisation), `@theme` tokens, `ui/dialog` for modals, typecheck/lint baselines.
- Link employees by `employee` ObjectId. Issued letters store **no** `employeeId` copy (the reference number and
  the frozen document carry the label as issued), so `services/employeeIdRename.ts` `COPIES` is untouched.
- JSON body limit is 1 MB. File uploads (letterhead PDF, logo-free signature image, .docx import) go through a
  multer router mounted before `express.json()`, like `/api/documents`.
- `EmployeeDocument.s3Url` objects are public URLs (open item in `CLAUDE.md`). Letters do not use that path.
- Backend is one Railway instance running node-cron. Nothing heavy runs in that process.
- Calibri cannot be bundled (Microsoft licence).

## 6. Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| A | **In-app editor (Tiptap v3) → HTML → Gotenberg (Chromium) → letterhead PDF placed behind every page** | One-time rebuild of each template (helped by .docx import). Body is ~95% identical to the Word original. | **Chosen** |
| B | HR keeps editing in Word, uploads .docx with `{placeholders}`; docxtemplater fills; Gotenberg/LibreOffice converts | Closest to the Word original, but no in-app editor, placeholders typed by hand break when Word splits them internally, and editing one letter means download/edit/re-upload. | Rejected — the user asked for an in-app editor and per-letter edits. |
| C | DOCX-native browser editor (SuperDoc, Nutrient Document Authoring, Syncfusion) | True Word pages in the browser, but AGPL or expensive commercial licences; Syncfusion's mail merge needs a .NET server. | Rejected — licence/cost. |
| D | Typst templates (Oicana / typst.ts) | Very fast, no Chrome, but templates are code; HR cannot edit them. | Rejected. |
| E | Browser print like salary slips | No server PDF, so no automatic email or stored record. | Rejected. |

For PDF rendering within A: Gotenberg as a **separate Railway service** (chosen) over Puppeteer inside the backend
(Chromium memory spikes and crashes would hit the single instance that runs node-cron; pnpm 10 blocks Puppeteer's
browser download; Railpack needs custom apt config).

Editor within A: Tiptap v3 (MIT core) over CKEditor 5 / TinyMCE (merge fields are paid premium plugins on GPL
cores) and Lexical (smaller extension ecosystem, no server-side static renderer).

## 7. Concepts

- **Template** — name, kind (`employee` | `manual`), company, body (Tiptap JSON), ask-field definitions, default
  email subject/body. Editable at any time; editing never affects issued letters.
- **Field** — a chip in the body storing a **key** (e.g. `employee.firstName`, `ask.grade`). Three sources:
  - *auto* — resolved from the system (catalogue in §9).
  - *ask* — declared on the template: `{ key, label, type, required, default }`, `type` ∈ `text | longText | date |
    money | number`.
  - *recipient* — on manual templates, `recipient.name`, `recipient.email`, `recipient.address`, entered by HR.
- **Format** — each chip carries an optional format: dates `long` ("18 November 2026"), `ordinal` ("1st July 2025",
  suffix superscript), `dotted` ("30.07.2025"); money `inr` ("₹4,50,000"), `words` ("Four Lakh Fifty Thousand
  Rupees Only"); text `upper`.
- **Letterhead** — per company: a 1-page A4 or US Letter PDF (its size sets the letter’s page size) (the user exports theirs from Word), content margins (top/bottom/
  left/right in mm, the safe area the body flows inside), signatory name, designation, optional signature image,
  reference-number prefix.
- **Letter** — one issued (or draft) document: frozen body, frozen values, PDF, reference number, recipient, status.

## 8. Data model

`LetterTemplate`

```
name, kind: 'employee'|'manual', company: ObjectId<Company>,
body: TiptapJSON, askFields: [{ key, label, type, required, default? }],
email: { subject: string, body: string },        // may contain {{field}} tokens, plain text
active: boolean, createdBy, updatedBy, timestamps
```

`Letterhead` (one per company; separate model rather than widening `Company`, so `Company` reads stay small)

```
company: ObjectId<Company> unique,
pdf: Buffer (1-page A4), marginsMm: { top, right, bottom, left },
signatory: { name, designation, signatureImage?: Buffer, signatureMime? },
referencePrefix: string,                        // e.g. "CFG/HR"
updatedBy, timestamps
```

`Letter`

```
template: ObjectId, templateName: string, company: ObjectId,
kind, employee?: ObjectId<Employee>,
recipient: { name, email, address? },
values: Record<string, string>,                 // resolved + formatted, as printed
body: TiptapJSON,                               // final document with chips replaced by text
status: 'draft'|'issued'|'sent'|'void',
referenceNo?: string, issuedAt?, issuedBy?,
pdf?: Buffer, pdfSha256?: string,
sends: [{ to, at, by, resendId }],
voidReason?, voidedAt?, voidedBy?,
createdBy, timestamps
```

- PDFs are stored **in MongoDB** on the `Letter` document (like `AssistantFile`), so they are private by
  construction. A letter with letterhead is roughly 0.3–1 MB, far below the 16 MB document limit. `pdf` is
  excluded from list projections.
- `Counter` collection `{ _id: "<companyId>:<year>", seq }`, incremented with `findOneAndUpdate({$inc}, {upsert})`
  at issue time. Reference number `"<prefix>/<year>/<seq padded to 4>"`. Drafts never consume numbers.
- Indexes: `Letter { employee: 1, createdAt: -1 }`, `{ status: 1, createdAt: -1 }`, `{ referenceNo: 1 }` unique
  sparse.

## 9. Auto field catalogue (v1)

| Key | Source |
|---|---|
| `employee.salutation` | gender → Mr. / Ms.; `other` → empty. Overridable on the issue form. |
| `employee.fullName`, `firstName`, `lastName` | `Employee` |
| `employee.code` | `Employee.employeeId` |
| `employee.position`, `department`, `employmentType`, `reportingSupervisor` | `Employee` |
| `employee.address` | `Employee.address`, line breaks preserved |
| `employee.email`, `phone` | `Employee` |
| `employee.joiningDate` | `Employee.joiningDate` |
| `company.name`, `company.address` | the template's company (also selects the letterhead); the issue form warns if `Employee.companyName` differs |
| `letter.date` | issue date |
| `letter.referenceNo` | assigned at issue |
| `signatory.name`, `signatory.designation` | `Letterhead` |

The catalogue lives in one backend module and is served to the frontend (`GET /api/letters/fields`), so the
editor's field picker and the resolver never drift. Every auto value is shown on the issue form and can be
overridden for that letter.

Reference letter mapping: salutation, full name, code, address, first name, position, joining date (ordinal),
company name, `letter.date` (dotted), signatory → auto. Grade ("BERYL 13"), posting city ("Faridabad"), probation
("3 months"), notice ("30 days") → ask fields with defaults.

## 10. Flows

**Templates (HR/admin).** List → create/edit in the editor. Field picker panel lists auto fields (employee kind),
recipient fields (manual kind) and the template's ask fields (add/edit/remove inline). Import: upload a .docx →
converted with mammoth.js on the server (already a backend dependency) → loaded into the editor (unknown markup is dropped by the editor
schema). Pasting from Word goes through a cleanup transform. "Preview" renders a PDF with sample values.

**Letterhead (HR/admin, per company).** Upload the 1-page PDF, set margins, signatory, signature image,
reference prefix. Preview shows a lorem body inside the letterhead so margins can be tuned.

**Issue (HR/admin).**
1. Pick a template. Employee kind: pick an employee. Manual kind: enter recipient name, email, address.
2. Form shows every field: auto values pre-filled (editable), ask fields with defaults. Required fields gate step 4.
3. "Edit wording" opens the editor on a copy of the template body with chips already replaced by text, for this
   letter only — except `letter.referenceNo` and `letter.date`, which stay as chips because only issuing knows them.
   Previews fill them with `<prefix>/<year>/____` and today's date. Saved as a draft `Letter`. Wording is edited last: changing a field value afterwards asks for
   confirmation and discards the wording edits.
4. Preview → the real PDF (same pipeline as issue, watermark "DRAFT" via Gotenberg stamp).
5. Issue → reference number assigned, PDF rendered without watermark, letter frozen (`issued`).
6. Send → email to the recipient (employee letters default to the employee's email; editable), subject/body from
   the template, PDF attached, Reply-To the issuing HR user. Status `sent`; resend allowed and logged.
7. Void → letter keeps its number and PDF, marked void with a reason. A correction is a new letter.

**Employee.** "My letters" lists their own issued/sent letters with download. An in-app notification
(`letter_issued`, new catalogue entry) fires when HR sends an employee letter.

## 11. Rendering pipeline (backend)

1. **Resolve**: walk the body JSON; each `field` node becomes a `text` node with the formatted value, keeping the
   chip's marks (bold etc.). Unknown keys or missing required values → `ValidationError` listing them. No template
   engine (Handlebars/Jinja) is involved; values are only ever text nodes.
2. **Validate**: the body is checked against an allow-list of node and mark types and attributes (Zod, recursive).
   Link hrefs must be `http(s)`/`mailto`. Anything else is rejected, both when saving templates and when issuing.
3. **HTML**: `@tiptap/static-renderer` `renderToHTMLString` with the same extension set as the editor; then wrapped
   in a print document: `@page { size: A4; margin: <letterhead margins> }`, Carlito font embedded as base64
   `@font-face`, print CSS for page-break nodes (`break-before: page`), tables (`break-inside: avoid` on rows,
   `thead` repeat), justified paragraphs, superscript. A test must confirm text is HTML-escaped by the renderer;
   if not, use explicit node mappings that escape.
4. **PDF**: POST to Gotenberg `/forms/chromium/convert/html` with `index.html`, `preferCssPageSize=true`,
   `printBackground=true`, `omitBackground=true` (otherwise Chromium's white page hides the letterhead), plus the letterhead PDF as a full-page **watermark** (Gotenberg ≥ 8.28 places it behind
   content on every page). Draft previews add a "DRAFT" text stamp.
5. Store the PDF and its SHA-256 on the `Letter`.

Fonts: **Carlito 1.103** (metric-compatible with Calibri; 1.104 changed metrics), regular/bold/italic/bold-italic,
shipped in the backend as files and embedded; the editor loads the same font so line breaks match. Covers ₹.

## 12. Editor (frontend)

- Tiptap v3: StarterKit (includes bold, italic, underline, lists, headings), TextAlign (incl. justify), TextStyle +
  Color, Superscript, Subscript, Table set, Link, plus two custom nodes: `field` (inline atom; attrs `key`,
  `format`; renders as a chip with its label, red if unknown) and `pageBreak` (block atom; dashed line on screen).
- A4-width canvas (794 px) with the letterhead's margins as padding, so line lengths match the PDF.
- Toolbar state via `useEditorState` (v3 default `shouldRerenderOnTransaction: false`); no manual memoisation.
- Field insertion: picker panel click, and typing `{{` opens a filtered list.
- Images are not allowed in the body (keeps JSON under 1 MB; logos/signatures live on the letterhead).
- Paste-from-Word cleanup in `transformPastedHTML` (strip `mso-*`, `<o:p>`, conditional comments; map inline
  bold/italic/underline styles to marks; rebuild `mso-list` lists).

## 13. API

All under `/api/letters`, `authMiddleware(['admin','hr'])` unless noted. Bodies validated by schemas in a new
`validators/letter.schemas.ts`.

```
GET    /fields                                    field catalogue
GET    /templates            POST /templates
GET    /templates/:id        PUT  /templates/:id   DELETE (soft: active=false)
POST   /templates/preview                         sample-value PDF
GET    /letterheads/:companyId
PUT    /letterheads/:companyId                    multipart (pre-json router)
GET    /                                          list (filters: status, kind, employee, template, q)
POST   /                                          create draft
PUT    /:id                                       update draft
POST   /:id/preview                               DRAFT-stamped PDF
POST   /:id/issue
POST   /:id/send                                  { to? }
POST   /:id/void                                  { reason }
GET    /:id/pdf                                   admin/hr; employee only if letter.employee is theirs and status ∈ issued|sent
GET    /mine                                      employee: own issued/sent letters
```

## 14. Email

`emailService.send` gains an `attachments` option (`{ filename, content: base64 }`). Letter emails use the
template's subject/body with `{{field}}` tokens replaced by **escaped** values, wrapped in the existing branded
email layout. Resend's 40 MB cap is far above a letter.

## 15. Deployment & cost

- New Railway service from the official `gotenberg/gotenberg:8-chromium` image (no LibreOffice; smaller), pinned
  to a version ≥ 8.28. Reached over Railway's private network; `GOTENBERG_URL` env on the backend; basic auth on.
- Flags: `--chromium-max-concurrency=2`, `--chromium-restart-after=100`, `--chromium-deny-private-ips` off only if
  needed (all assets are inline, so it can stay on), `--api-timeout=60s`.
- Cost: Railway bills ~$10/GB-month RAM and ~$20/vCPU-month. Gotenberg idles at ~50–150 MB with near-zero CPU →
  about $1–2/month always-on. The project is on the Hobby plan ($5/month including $5 of usage), so this is
  absorbed if total usage stays under $5, otherwise it adds that amount. **Serverless sleep is enabled** on the
  Gotenberg service so it costs ~nothing between letters. Over the private network a sleeping service refuses
  connections until awake, so the backend retries with backoff for up to ~20 s. If waking over the private network
  proves unreliable, Serverless is turned off (~$1–2/month).
- Letterhead PDFs are capped at 2 MB so issued letters stay far below MongoDB's 16 MB document limit.
- Backend calls Gotenberg with a 60 s timeout and surfaces a clear error if it is unreachable; nothing else in the
  HRMS depends on it.

## 16. Security & privacy

- PDFs live in MongoDB, streamed only through authenticated routes. No public URLs.
- Body allow-list + text-only value substitution (§11) — no markup or script can reach the PDF or email.
- Gotenberg is not exposed publicly; the HTML it receives contains only inline assets.
- Manual (offer) letters hold candidate personal data. Admin can delete a voided letter outright (DPDP core
  obligations apply from ~May 2027; a retention policy is a later item).

## 17. Phasing

1. **Foundation**: Gotenberg service, Letterhead, rendering pipeline, Carlito, field catalogue, `Letter` + counter.
2. **Templates**: editor, field chips, page break, ask fields, preview, .docx import, Word paste cleanup.
3. **Issue & send**: issue form, per-letter wording edit, issue/void, email attachments, HR letters list.
4. **Employee side**: My letters, `letter_issued` notification.

Done = the reference appointment letter reproduced end to end: template built from the imported .docx,
issued for an employee, PDF matching the original letterhead, emailed with attachment.

## 18. Calls made by the designer (check these)

- PDFs in MongoDB rather than S3 (because the S3 bucket serves public URLs).
- Separate `Letterhead` model, one per company.
- Reference number format `<prefix>/<year>/<NNNN>`, per company, resetting yearly.
- Employees can see and download their own issued letters.
- No images inside template bodies.
- Draft previews are watermarked "DRAFT".

## 19. Left to the builder

- Exact Zod shape for the recursive Tiptap JSON allow-list.
- Paste-cleanup implementation (own transform vs the `wordpaste` package).
- UI layout of the template editor, issue form and lists, within `@theme` tokens and existing patterns.
- Whether `/fields` returns labels grouped for the picker.
