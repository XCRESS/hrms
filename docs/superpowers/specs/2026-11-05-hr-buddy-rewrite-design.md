# HR Buddy rewrite — design

**Date:** 2026-11-05 · **Status:** awaiting approval · **Replaces:** the current HR Buddy completely (backend and frontend)

## 1. Intent

HR Buddy has gone unused for months. People used it for everyday HRMS work: attendance, task reports, and pay worked out from days worked. They dropped it because it **wasn't intuitive the way ChatGPT is**, and the dashboard was more obvious. The rebuild has to make asking HR Buddy *faster and nicer than clicking through the dashboard* for both everyday lookups and everyday actions.

The reference is how ChatGPT feels in late 2026 (Intelligent UI, launched 7 Oct 2026). Canvas was removed on 28 May 2026; side panels are out. **Everything happens inline in one scrolling conversation:**

- Answers stream in as interactive pieces: tables, number tiles, charts, checklists and forms. You can sort, filter and hover them without asking again.
- Drafts (emails, announcements, task reports) are **editable blocks inside the thread**. You type into them directly. You can select text and ask for a change, or use quick buttons like "Shorter". The *same* block updates in place, with undo and redo. Long drafts expand to a focused full-screen editor.
- Actions finish inside the block that proposed them. You press the button, and the block turns into a receipt.

The approved interactive mockup is `.superpowers/brainstorm/2087-1793820222/content/inline-flow.html`. Treat it as the **interaction** reference, not the visual one. The user called the earlier mockup's visuals "very bad". The real UI must be properly polished and native to the HRMS theme.

### Example requests from the user

These set the bar. They are examples, not a fixed list. HR Buddy must handle any reasonable HRMS request.

- "list everyone's yesterday attendance in a table with name, check-in, check-out"
- "show everyone's expenses last month, name and total, in two columns"
- "check when's Diwali and add a holiday for it"
- "approve all regularization requests from last month"
- "create an announcement about …" (any topic)
- "fill my task report (worked on this, this, this) and check me out"
- "send mail to Ankit sir with today's attendance as you showed above"
- Pay for days actually worked, and similar routine HRMS questions

## 2. Goals

1. **Correct numbers, always.** HR Buddy uses the app's own logic: working days come from `services/workCalendar.ts`, plus the existing attendance, salary, leave and approval rules. Nothing is reimplemented. If HR Buddy and the dashboard ever disagree, that is a bug.
2. **Same permissions as the app.** Every role uses HR Buddy. Each person can see and do exactly what the app already lets them, and nothing more. Employees only ever see their own data.
3. **Anything a person can do in the app, HR Buddy can do for them, after they confirm.** The AI prepares; the person commits.
4. **ChatGPT-2026 quality of interaction**: streaming, inline interactive results, inline editable drafts, follow-up suggestions, conversation history, and stop, regenerate and edit-and-resend.
5. **Native look** on the app's `@theme` tokens, in light and dark mode, festive themes included, and usable on mobile.

## 3. Non-goals

- A side panel or canvas of any kind.
- Free-form AI-generated HTML or code running in the browser. A fixed set of our own components covers HRMS answers, and it is safer.
- Being available inside Claude, ChatGPT or Copilot through MCP. This is possible later and kept in mind, but not in this build.
- Voice and multi-language support.
- Keeping or migrating anything from the old HR Buddy, including its in-memory conversations.

## 4. Anti-goals: failure even if it "works"

- **The AI changes data by itself.** No write ever runs without the person pressing a button in a block that shows exactly what will happen.
- **Numbers typed by the model.** Tables, tiles and charts render straight from tool data. The model writes only the sentence around them, and that sentence must match the data.
- **A privacy wall enforced by the prompt.** Access is enforced in code, per caller. The prompt carries no security weight. The old prompt told the model "never decline citing privacy"; nothing like that may exist.
- **Drafts that name or target a person** in announcements unless the user writes the name themselves.
- **A second copy of business rules** inside the assistant code, which is the root cause of the old bot's wrong salary month and absence counts.
- **Looking like a bolted-on widget**: raw greys, hard-coded hex colours, or ChatGPT clone colours.

## 5. Decisions

### 5.1 Decided by the user

- Complete rewrite. The current HR Buddy UI and backend are discarded.
- Inline, ChatGPT-2026 flow. No side panel.
- Inline drafts are fully editable, like ChatGPT, for email, announcements and everything else.
- Reuse the app's logic; recreate nothing.
- Any type of announcement or request, not only the examples.
- HR Buddy may do anything the person can do in the app, behind a confirm button.
- Email may go to **anyone in the company directory and to any address the user types in themselves**.
- **Only HR and admin can send email**, and only through the HRMS's existing Resend service. Employees get no email capability.
- A "draft" means any inline editable block, such as a form, a text or a table of values, that is pre-filled by HR Buddy and saves nothing until the person confirms. Example: "change X's salary structure to basic ₹A plus ₹B" shows an editable earnings table in the chat. This covers salary structures and salary slips too.
- **Pay for days worked is worked out by the AI.** The tool supplies the inputs: working days in the month, days present, half-days, leave and absences, and monthly gross. The AI does the arithmetic and shows its working. This is a deliberate exception to "numbers typed by the model". No new pay calculation is added to the app.
- **HR Buddy can search the web** for public facts, such as festival dates, using OpenAI's built-in web search.
- **HR Buddy can change a user's role and activate or deactivate an employee.** These are one-press **confirm cards** ("Change Aman's role from Employee to HR?" plus a button), not editable drafts.
  - Role change is admin only, matching the app's rule that user management is admin's.
  - Activate/deactivate is open to admin and HR, as on the existing route.
  - Nobody can change their own role or deactivate themselves.
  - The app has no role-change endpoint today: the frontend's `useUpdateUserRole` calls `/users/:id/role`, which doesn't exist. So one is added.
- **Files (added after the first build, option A):** HR Buddy reads attached PDF, Excel/CSV, Word, text and image files, and creates Excel, CSV, Word and PDF files. It edits spreadsheets cell by cell, keeping their formatting; Word documents are rewritten as new files without their original formatting. Files are stored on the HRMS server (owner-only, 30-day expiry), not in an external sandbox.
- **Employees are paused out of HR Buddy for now:** the page and API are admin/HR only. The employee-scoped tools stay in the code for later.
- Technical choices are delegated to the builder (see 5.2).

### 5.2 Technical calls (Claude's, approved as part of this document)

**Stack**

| Concern | Choice | Why |
|---|---|---|
| Agent loop + streaming (backend) | **Vercel AI SDK v7** (`ai` 7.0.163, `@ai-sdk/openai` 4.0.109) | Multi-step tool loop with stop conditions, typed tools, a streaming UI-message protocol, and provider-agnostic models. |
| Model | OpenAI through the Responses API (the provider's default), using the existing account. Set by `ASSISTANT_MODEL`, default **`gpt-6-luna`** | Luna is OpenAI's "efficient, high-volume" GPT-6 model: $0.10 in / $0.50 out per 1M tokens, about 7× cheaper than the old bot's `gpt-5.4-mini`, with function calling and structured outputs. If evals fall short, switch the env var to `gpt-6.1-terra` ($1 / $5). No code change needed. |
| Chat shell (frontend) | **assistant-ui**: `@assistant-ui/react` 0.15.32, **`@assistant-ui/ai-sdk`** 0.0.16, `@assistant-ui/react-markdown` 0.14.24, restyled on `@theme` tokens | Provides auto-scroll, stop, regenerate, edit-and-resend, branch switching, composer and accessibility. `@assistant-ui/react-ai-sdk` is now only a shim over `@assistant-ui/ai-sdk`, so install the latter directly. |
| Interactive results | Our own **tool UI components**: one React component per result kind, built from `ui/*` primitives; charts with the existing `recharts` 2.15 (no upgrade to 3.x in this work) | A fixed catalog means a consistent look, no executed model code, and data rendered straight from tool output. |
| Retired | `openai` direct dependency, `controllers/chat.controllers.ts`, `routes/chat.routes.ts`, `utils/hrChatbotFunctions.ts`, the chat Zod schemas, `components/chatbot/`, `hooks/queries/useChat.ts`, `API_ENDPOINTS.CHAT` | Full replacement. |

Pin these exact versions. `@assistant-ui/ai-sdk` is still 0.0.x.

**API names, checked against the docs on 5 Nov 2026.** Many examples online are from v5/v6 and use the old names.

- **AI SDK v7:**
  - the prompt goes in `instructions` (not `system`);
  - the step cap is `stopWhen: isStepCount(8)`, not `stepCountIs` (assistant-ui's own v7 page still shows the old name);
  - use `onEnd` (not `onFinish`) and `onStepEnd`;
  - stream helpers are top-level functions taking `{ stream: result.stream }`: `toUIMessageStream(...)` and `pipeUIMessageStreamToResponse({ stream, response: res })` for Express;
  - `convertToModelMessages` is now async and must receive the same `tools`, because each tool's `toModelOutput` runs inside it;
  - `experimental_context` is now `toolsContext` (per tool, typed with `contextSchema`) and `runtimeContext`;
  - `result.usage` now totals all steps;
  - `needsApproval` is deprecated in favour of `toolApproval`, which still cannot edit input. Neither is used here (see 5.2.1).
- **assistant-ui 0.15:**
  - `makeAssistantToolUI` / `useAssistantToolUI` are deprecated. Register renderers with `defineToolkit({ name: { type: 'backend', render } })` and `AuiConfig({ tools: Tools({ toolkit }) })` on `AssistantRuntimeProvider`.
  - Don't use the `"use generative"` directive. It needs the `@assistant-ui/vite` build plugin to split one file between client and server, and our backend is a separate Express app.
  - The legacy hooks (`useThread`, `useMessage`, …) were removed. Use `useAui` / `useAuiState`.

**5.2.1 Three kinds of tool**

1. **Read tools** fetch data through the *same service functions the controllers use*. Where logic currently lives only inside a controller, the builder extracts it into a service, and the controller and the tool both call that service. There is one code path and no duplicates. Each read tool returns:
   - **for the UI:** the full typed rows, which the tool UI component renders;
   - **for the model:** a compact summary through AI SDK's `toModelOutput` (counts, totals, the first N rows, and IDs), so token use stays bounded.
2. **Draft tools** have **no side effects**. They build a proposed action, such as an announcement, email, holiday, task report, leave request, check-out, or a set of approvals. They validate it against the **same Zod schema the real endpoint uses** (`validators/*`) and return it as a draft that renders as an editable or tickable block.
3. **There are no write tools on the server.** Committing always happens in the browser: the block's button calls the **existing REST endpoint** through the **existing TanStack mutation hooks**, using the user's own token, exactly as the dashboard does. Validation, permissions, notifications, emails and side effects are therefore identical to the app's. AI SDK's built-in approval cannot accept an edited input, which would make editable drafts impossible, so it is not used.

**5.2.2 Authorization per caller**

- `POST /api/assistant/…` is open to `admin`, `hr` and `employee` through `authMiddleware`. Tools are **built per request from `req.user`**, read from the database as today.
- Each tool declares the roles that may use it. Tools the caller can't use are **not offered to the model at all**.
- Employee-scoped tools are hard-wired to the caller's own `employee` ObjectId. They take no employee parameter, so prompt injection cannot widen their reach.
- Commits go through the existing endpoints, so the app's own permission checks are the final gate.
- By default, assistant-ui's transport forwards `system` text and frontend `tools` from the browser. The chat route **ignores both**, and its Zod body schema accepts only the thread id and the newest message. Instructions and tools are only ever built on the server.
- The server is the source of truth for history. It loads earlier messages from `AssistantMessage` and runs `validateUIMessages` against the current tools, so the browser can't rewrite past turns or tool results.

**5.2.3 Drafts: editing and revising**

- A draft block has a stable `draftId`. User edits are local state in the block.
- Quick buttons ("Shorter", "More formal", "Softer"), and the toolbar that appears when text is selected ("Ask HR Buddy to change this…"), send a normal chat turn that references the `draftId`, the user's current edited text, and any selection. The model calls the same draft tool again in revise mode. The **block updates in place** to the newest version instead of a new block appearing below. Undo and redo walk the block's version stack, which includes both the user's edits and the AI's revisions.
- A ⤢ button opens a focused full-screen editor using `ui/dialog`, for long drafts.
- After commit, the block becomes a **receipt** (what happened, when, and a link to the relevant page). The receipt is saved into the thread, so the model knows the action happened in later turns.
- assistant-ui's `unstable_useInteractable` (shipped June 2026) covers similar ground, but it is experimental. The `draftId` pattern is small enough to own. Revisit if it stabilises.
- For quoting a selection from the assistant's *prose* (not drafts), use assistant-ui's `SelectionToolbarPrimitive` with `injectQuoteContext` on the server. Draft blocks keep their own selection toolbar.

**5.2.4 Safety rails on actions**

- **Bulk or irreversible actions** need a second "Yes, do it" press, and the block states plainly what cannot be undone. This applies to anything affecting more than 20 records, and always to publishing (finalizing) salary slips.
- Approval lists open with every eligible row ticked. The model may **untick rows it thinks need a look and must say why** (for example, the employee was also on leave that day).
- Announcements and emails are drafted without naming individuals unless the user supplied the name.
- **Email (HR and admin only):**
  - Recipients must be an exact match in the employee/user directory, or an address the user typed into the To field themselves. The model cannot invent or guess addresses; ambiguous names produce a picker.
  - It is sent through the existing Resend `emailService`, from the HRMS sender, with Reply-To set to the user.
  - This needs a **new endpoint**, since the app has no "send email" feature today. It follows the usual pattern: `authMiddleware(['admin','hr'])`, a Zod schema, and user text escaped in the HTML body.
  - The email draft tool is never offered to employees.
- **Salary visibility** follows the existing Draft → Finalized rule: employees only see finalized slips, because the tools reuse the salary services.
- **Audit:** mutating requests made from an HR Buddy block carry an `X-Assistant-Thread` header. A small middleware records them in a new `AssistantAuditLog` collection (user ObjectId, thread, endpoint, method, target IDs, time).

**5.2.5 Conversations**

- New models: `AssistantThread` (owner `user` ObjectId, title, timestamps) and `AssistantMessage` (thread, `parentId`, role, AI SDK UI-message `parts` as stored JSON, timestamps).
- `parentId` keeps edit-and-resend and regenerate branches as a tree, so the branch picker still works after a reload.
- Messages are saved in `onEnd`, with `originalMessages` set and server-generated message ids. The route calls `result.consumeStream()` without awaiting it, so a closed tab still saves the answer.
- Frontend wiring:
  - `useRemoteThreadListRuntime` with a `RemoteThreadListAdapter` (`list`, `initialize`, `rename`, `archive`, `delete`, `fetch`, `generateTitle`) over our thread endpoints;
  - a history adapter implementing `withFormat` (which the AI SDK runtime requires) to load a thread's messages.
  
  `generateTitle` fires after the first exchange.
- Only the owner can list, read, rename or delete a thread. No `employeeId` labels are stored, so nothing needs adding to `COPIES` in `employeeIdRename.ts`.
- **Thread list:** "New chat" plus history grouped Today / Previous 7 days / Older. It sits in the HR Buddy page's own left column on desktop and in a sheet on mobile. This is navigation, not a content panel.

**5.2.6 Streaming and the frontend data rule**

- The chat stream uses AI SDK's UI-message stream over HTTP to an Express route on Railway. This is the **one sanctioned exception** to "TanStack Query is the only way to talk to the API", because a token stream doesn't fit a query or mutation. It must reproduce the axios instance's behaviour:
  - bearer token from `lib/tokenStorage.ts`;
  - adopting `X-Refreshed-Token`;
  - the same 401 and `SESSION_REVOKED` 403 handling.

  `AssistantChatTransport` extends AI SDK's `DefaultChatTransport`, so this is done with its `fetch`, `headers` and `prepareSendMessagesRequest` options; the last one sends only the newest message and the thread id. On the Express side, the stream route must not be buffered or compressed, so tokens actually stream through Railway's proxy.
- Everything else uses TanStack Query hooks in `hooks/queries/useAssistant.ts`, with keys in `lib/queryKeys.ts` and paths in `lib/apiEndpoints.ts`: thread list, thread load, rename, delete. All commits from blocks use the **existing** domain mutation hooks.
- Add a one-line note about the exception to CLAUDE.md.

**5.2.7 Privacy and cost**

- OpenAI requests are sent with storage disabled: `providerOptions.openai.store: false`. With storage off, reasoning can't be referenced by id between tool steps, so also request `include: ['reasoning.encrypted_content']`. Verify that a multi-step turn works with both settings before building further.
- Reasoning effort is `low` by default, to keep latency down. Since v7 turns on detailed reasoning summaries whenever reasoning is configured, set `reasoningSummary: null`: the UI doesn't show reasoning.
- Set `promptCacheKey` per role, so the long, stable instructions and tool list are cached.
- Tools return only the fields the answer needs. Salary figures only reach the model for callers who may already see them.
- Per-user rate limit with the existing `express-rate-limit`, a cap on steps per turn (about 8), and a cap on output tokens.
- Pino logs one line per tool call (tool, duration, row count, user), never the data itself.

**5.2.8 System prompt**

- **Short and operational:**
  - who the user is (name, role) and today's date and time in IST, injected rather than fetched by a tool;
  - how to choose between plain text, a table, tiles or a chart;
  - always use tools for facts, and never restate numbers that a component already shows;
  - drafts never name individuals unless the user did;
  - end with 2 or 3 useful follow-up suggestions where natural.
- **No security instructions.** Those live in code.

### 5.3 Result catalog: tool UI components

| Component | Used for | Interactions |
|---|---|---|
| **Stat tiles** | Headcounts, present/absent/late, totals | Clicking a tile filters the table or chart beside it |
| **Data table** | Any list of records | Sort, filter by status, "+N more" expand, CSV export, status chips |
| **Chart** (bar, line, donut; recharts) | Comparisons, trends, breakdowns | Hover tooltips, chart/table toggle (the table also serves as the accessible view) |
| **Approval list** | Leave, regularization, WFH, expense approvals | Tick rows, select all, reason per row, Approve or Reject the selected rows; second confirm above the threshold |
| **Writing block** | Email, announcement, any free text | Edit in place, undo/redo, quick-change buttons, ask about a selection, expand to full screen; To/Subject or Title/Audience fields where relevant |
| **Form block** | Holiday, leave request, task report + check-out, WFH request, and similar structured actions | Prefilled, editable fields using the app's `ui/*` controls (`enhanced-datepicker` for dates), with a primary action and alternatives (for example "Use Mon 9 Nov instead") |
| **Receipt** | After any commit | What happened, counts, a link to the matching page |
| **Progress chips** | While working | Live steps from real tool calls ("Found Ankit Kumar (Director)"), never canned text |
| **Suggestion chips** | End of an answer | Clicking one sends it as the next message |

Prose answers render as Markdown, which also covers simple tables when no component fits.

### 5.4 Domains covered at launch

The builder should create tools for each domain the app has, using that domain's existing services and endpoints:

- **Attendance:** day, range and per-person views, with absences per the work calendar; my attendance; check-out (the commit uses the existing `/attendance/checkout`, including any location or geofence input it needs).
- **Task reports:** list and summarise; fill mine.
- **Leave / WFH / regularization:** pending items; approve or reject; apply.
- **Expenses:** totals and breakdowns.
- **Salary:** view slips and structures. Editable blocks to change a structure, create or update a slip, bulk-generate a month's slips, and publish them, each committed through the existing salary endpoints. Pay for days worked is computed by the AI from tool-supplied inputs (see 5.1).
- **Web search:** OpenAI's provider-executed web search tool, for public facts only, never company data. Results show their sources.
- **Holidays:** list and add.
- **Announcements:** list, draft and publish.
- **Employees:** directory lookup, used for name resolution too; role change (admin) and activate/deactivate (admin, HR) as confirm cards.
- **Policies:** answering from stored policy text.
- **Help requests** and **email**.

## 6. Constraints

- All rules in `CLAUDE.md` apply, in particular:
  - Zod v4 `validateBody` on every route with a body;
  - `asyncHandler` and typed errors;
  - `paramValue` for params; `.lean()` on reads;
  - link employees by ObjectId;
  - feature-first `src/components/assistant/`;
  - `@theme` tokens with layout-only classes on `ui/input` and `ui/textarea`;
  - React Compiler (no manual memoisation);
  - no `react-hooks/set-state-in-effect` violations;
  - near-zero comments;
  - pnpm; no Co-Authored-By trailers.
- Backend type-check stays clean. Frontend typecheck and lint must not exceed the baselines (66 / 114), and must drop where files are touched.
- Single Railway instance: no queues; streaming responses must work through Railway's proxy.
- The route stays at `/chatbot`, renamed in the UI as HR Buddy. It is visible in the sidebar for all roles. No `RequireRole` wrapper, because every role uses it.
- There is no test suite. Quality is shown through the evals below plus type-check, lint and build.

## 7. Quality bar

- **Evals:** add `backend/scripts/assistant-evals.ts`, a set of about 30 real questions (taken from section 1, plus employee self-service ones). Each one has:
  - the expected tool(s);
  - the expected figures, computed by calling the same services directly, so this is a check against the app's own answer, not a hand-written one.
  
  Run it manually against a seeded database before release, and after any prompt, model or tool change. Report the pass rate.
- **Manual checks:**
  - every example in section 1 works end to end;
  - an employee cannot reach anyone else's data, even when asking adversarially;
  - every commit matches what the dashboard would produce;
  - light, dark, festive and mobile layouts all look right;
  - keyboard-only use works.

## 8. Left to the builder

- Re-confirm the API names in 5.2 against the pinned versions when installing; they were checked against the docs on 5 Nov 2026.
- Whether to build tools per request in a closure over `req.user`, or once with `toolsContext`. Either way, a tool must never accept a caller identity from the model.
- Internal component structure and the order domains are built in. A sensible path: foundation and read tools for attendance and expenses first, then drafts and commits, then the remaining domains.
- Which controller logic to extract into services, and how.
- The bulk threshold and rate-limit numbers, within the spirit of section 5.2.4.
- Visual details beyond "polished, native to the theme, interaction as in the mockup".
