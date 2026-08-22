# Employee Directory Redesign

Date: 2026-08-22
Status: Approved for implementation

## Problem

`frontend/src/components/hr/employeeDirectory/EmployeeDirectory.tsx` is a
733-line component that owns the employee list, search, the profile detail
pane, an inline edit mode built from a hand-rolled `renderField` factory, and
the active/inactive tab switch. It has three classes of problem.

**Mobile is unusable.** The page is the desktop layout stacked vertically. The
list is capped at `max-h-96` and the profile renders *below* it, so on a phone
an HR user scrolls a short list, taps a row, then scrolls past the entire list
again to reach the profile. There is no list-to-detail navigation and no way
back. Per-row action buttons are ~24px tap targets. The leave table is six
columns wide and simply overflows.

**It does not follow the app's conventions.** Raw `<input>` and `<select>`
elements instead of the `ui/` primitives; `<p><strong>Label:</strong> value</p>`
for read mode, which renders labels and values with identical weight;
hardcoded `bg-white dark:bg-slate-800` and `cyan-600`/`green-600` pairs instead
of `@theme` tokens.

**It carries real bugs**, enumerated in "Bugs Fixed" below — including a query
that downloads every leave record in the system on each profile view, and
approve/reject buttons that have never done anything but `console.log`.

## Goals

Rebuild the directory as a set of focused components that an HR user can
comfortably operate on a phone (PWA) and on desktop. User experience is the
governing priority: maximum convenience without clutter, easy to navigate,
easy to use. Correct the accumulated bugs rather than porting them. Use the
app's theme system and shadcn primitives throughout.

Non-goal: rewriting the attendance table internals. See "Next Session".

## Scope

**In scope.** Page shell, header, tabs, search and filters, list rows, mobile
list-to-detail navigation, profile detail (header, field groups, edit mode),
`InactiveEmployees`, `LeaveSection`, `DocumentManager`. One backend change:
removing the Aadhaar mask.

**Out of scope.** `attendance/AttendanceTable.tsx` (1,052 lines),
`AttendanceAnalytics` (204), `EditAttendanceModal` (251), `TimeInput` (114).
These total 1,621 lines with their own date-range state machine, edit flow and
analytics. They are rendered inside the new tab structure and given a
mobile-appropriate container, but their internals are untouched this pass.
Rebuilding them alongside everything else would produce a diff too large to
review honestly.

## Component Structure

```
hr/employeeDirectory/
  EmployeeDirectory.tsx        orchestrator: routing, responsive branch  (~120 ln)
  components/
    DirectoryHeader.tsx        title, Active/Inactive tabs, Add/Link      (~90)
    DirectoryToolbar.tsx       search + filter controls + result count    (~110)
    FilterSheet.tsx            mobile filter dialog, active-chip row      (~120)
    EmployeeList.tsx           scroll container, loading/empty/error      (~90)
    EmployeeListItem.tsx       one row: avatar, name, meta, link state    (~80)
    EmployeeProfile.tsx        detail pane: header + tab switch           (~130)
    ProfileHeader.tsx          avatar, name, role, action menu           (~110)
    ProfileFields.tsx          the three field groups, read + edit       (~150)
    ProfileField.tsx           ONE field: label/value or ui/input        (~90)
    useEmployeeFilters.ts      search/filter/sort state + derivation      (~70)
```

`ProfileField` replaces `renderField`. One component typed on `Employee`,
rendering `ui/label` plus value in read mode and `ui/input` / `ui/select` /
`enhanced-date-field` in edit mode, with `aria-invalid` and
`aria-describedby` wired consistently. Roughly 100 lines of duplicated raw-input
markup collapse into configuration.

Each unit has one purpose and a defined interface: `EmployeeListItem` renders a
row and reports taps; it knows nothing about filtering. `useEmployeeFilters`
derives the visible list and knows nothing about rendering.

## Responsive Strategy

One route, two presentations, driven by the existing `useMediaQuery` hook —
which reports correctly on first render via `useSyncExternalStore`, so there is
no desktop-branch flash.

- **Desktop (`lg+`)**: two-pane master/detail. List rail ~360px, `lg:sticky`
  within the parent scroll container; profile scrolls beside it.
- **Mobile (`<lg`)**: `/employees` renders the list only. `/employees/:id`
  renders the profile only, full-screen, with a back button to `/employees`.
  Browser and PWA back gestures work because it is a real route change.

Both branches live in one component; the page is not duplicated.

**Constraint.** The parent container at `components/Sidebar.tsx:288` is the
scroll context (`h-dvh`, `overflow-y-auto`) and already renders a fixed mobile
bottom bar plus a spacer at `Sidebar.tsx:293-302`. The page must therefore not
introduce its own `position: fixed` bottom elements or `h-screen`; use `sticky`
within the existing scroll context.

## Mobile Interaction Detail

- Tap targets at least 44px. Rows become ~64px: avatar, name, and a secondary
  line (position · department).
- The per-row unlink button — currently a ~24px icon — moves off the row into
  the profile's action menu, where a destructive action belongs. The row keeps
  a small non-interactive Linked/Unlinked badge.
- Search sticks to the top of the list while scrolling, with a clear button and
  a live "12 of 47" count.
- Filters (department, employment type, linked state) collapse into a sheet on
  mobile using `ui/dialog`, with a badge showing the active count; active
  filters appear as removable chips above the list. Desktop shows them inline
  as `ui/select`.
- Header actions: "Add Employee" is the single primary button, "Link User"
  secondary — not two equal-weight blocks competing on a 375px screen.
- Profile sections become tabs on mobile (Profile · Documents · Attendance ·
  Leave) instead of one multi-thousand-pixel scroll. Desktop keeps them as
  sections with the same control for jumping. This is a new four-way tab set:
  today `currentView` only toggles profile/documents while attendance and leave
  are always-on stacked sections. `AttendanceSection` keeps its existing props
  (`dateRange`, `onDateRangeChange`, `onEditAttendance`, `updateTrigger`),
  which the orchestrator continues to own and thread through the tab, since its
  internals are out of scope this pass.
- Real skeletons replace "Loading employees...". Empty states distinguish "no
  employees yet" from "no results for this search", the latter offering a
  clear-search action.
- Leave table and document grid render as cards below `md`, tables/grids from
  `md` up. Stat tiles 2-up on mobile, 4-up on desktop.

## Theming and Accessibility

All styling on `@theme` tokens — `bg-card`, `text-muted-foreground`,
`border-border`, `ring-ring`, `text-destructive` — replacing hardcoded
`bg-white dark:bg-slate-800` / `cyan-600` / `green-600` pairs. Status colors
keep semantic green/red through consistent badge variants.

Primitives: `ui/input`, `ui/select`, `ui/label`, `ui/tabs`, `ui/dialog`,
`ui/badge`, `ui/button`, `ui/avatar`, `enhanced-date-field`. Call sites use
layout classes only, never colors, per the project convention.

The list becomes a proper listbox/option pattern with keyboard navigation
(arrow keys, Enter) and visible focus rings; today it is click-only `<li>`
elements. Every icon-only button gets an accessible name. Edit fields keep
`aria-invalid` and `aria-describedby`.

## Bugs Fixed

Rebuilding means correcting these rather than carrying them forward.

1. **Leave query fetches the entire system.** `useAllLeaves` has signature
   `(options?: { params?, enabled? })`, but `EmployeeDirectory.tsx:100` calls
   it as `useAllLeaves({ employeeId }, { enabled })` — passing the filter as
   the whole options object, so `params` is `undefined`. Every profile view
   downloads all leaves for all employees and filters them client-side in the
   `useMemo` at line 117. Correct call:
   `useAllLeaves({ params: { employeeId }, enabled: !!id })`, which deletes the
   client-side filter entirely.
2. **`useEmployee(id, { enabled })`** passes a second argument the hook does not
   accept (`useEmployees.ts:28` takes only `id`). Harmless today because the
   hook sets its own `enabled: !!id`, but it is misleading.
3. **Dead approve/reject.** `LeaveSection.tsx:201,207` are `console.log` stubs
   rendered as real buttons. See "Approve / Reject".
4. **Full page reload on "Create User".**
   `window.location.href = '/auth/signup'` at `EmployeeDirectory.tsx:532`
   drops the SPA and re-downloads the bundle. Becomes `navigate()`.
5. **`activeTab` duplicates routing.** Active/Inactive is component state while
   employee selection is a URL param, so the tab resets on back-navigation.
   Both move to the URL (`?status=inactive`), making the view shareable and the
   back button correct.
6. **`selectedEmployeeId` mirrors `urlEmployeeId` in state**, seeded once via
   `useState(urlEmployeeId || null)` at line 62, so the two drift when the URL
   changes externally. The URL becomes the single source of truth.

   Note the boundary: employee selection and the active/inactive tab move to
   the URL this pass. The attendance `dateRange` stays in component state here
   and moves to the URL in the attendance session, since that state belongs to
   the component being rebuilt then.
7. **`as any` casts** on errors (`(employeesError as any)?.message`) and on
   field keys throughout `renderField`. Replaced with typed access; this is
   where the typecheck-count reduction comes from.
8. **Duplicated user lookups.** `getLinkedUserId` and `getLinkedUserName` each
   run a fresh `users.find`, and `isEmployeeLinked` runs `users.some` per row —
   O(rows x users) per render. Replaced with one `Map` keyed by `employeeId`.
9. **Tab switches flash empty.** `InactiveEmployees` issues its own
   `useEmployees({ status: 'inactive' })` while the parent holds
   `{ status: 'active' }`, so each switch is a cold fetch. Keys stay separate;
   `placeholderData` prevents the flash.

## Aadhaar Unmasking (Backend)

Masking is enforced server-side in the `toJSON` transform at
`backend/models/Employee.model.ts:256-259`:

```js
if (ret.aadhaarNumber) {
  ret.aadhaarNumber = 'XXXX-XXXX-' + ret.aadhaarNumber.slice(-4);
}
```

Removing this block lets the real value reach any client that can already fetch
the employee, and allows deleting the frontend workarounds that exist only
because of it: the `aadhaarNumber` strip in `handleSaveEmployee`
(`EmployeeDirectory.tsx:211-214`) and the second strip at line 234 — both
present solely to stop the masked value overwriting the real one on save.
Aadhaar then becomes a normally editable field.

**Decision record.** The user approved this explicitly: HR needs the
information the page exists to show, and masking it was the wrong call. Two
factors were raised before approval and accepted:

- The endpoint is HR/admin-only, so exposure is to staff who already see PAN,
  bank account numbers and salary. Aadhaar is not uniquely privileged among
  what this page already displays.
- The transform affects **every** `toJSON` on the Employee model, so all other
  consumers begin receiving the full number, not just this page.

## Approve / Reject

`useUpdateLeaveStatus` already exists at `hooks/queries/useLeaves.ts:163` and
invalidates the leaves, attendance and dashboard caches on success. No backend
work is required.

Clicking Approve or Reject opens a `ui/dialog` showing the request (type,
dates, duration, reason) with a confirm action, matching the dashboard's
pending-requests pattern — rather than a bare table button firing an
irreversible status change on a single mis-tap. On mobile, an undoable one-tap
action beside a scrolling list is a genuine hazard.

**Verified constraint:** `updateLeaveStatusSchema`
(`backend/validators/request.schemas.ts:37-39`) accepts only
`status: z.enum(['approved','rejected'])`. There is no rejection-reason field,
so the reject dialog is confirm-only. Adding a reason would require a schema
and controller change and is out of scope.

Pending rows get a clear affordance; non-pending rows show status only.

## Behaviour Preserved

All query hooks and keys; the update, toggle-status and unlink mutation flows;
Zod validation through `validateUpdateEmployee` and `validateField`;
`sanitizeText` on display and save; the immutable-`_id` strip in
`handleSaveEmployee`; and the reasoning documented at
`EmployeeDirectory.tsx:141-150` about why `useAuth()` is not an authorization
source (it resolves in an effect, so gating on it flashed a denial for one
frame). That comment and its behaviour carry over.

## Verification

- Backend `pnpm type-check` must stay clean.
- Frontend `pnpm typecheck` and `pnpm lint`, reported as actual numbers against
  the baselines in CLAUDE.md: typecheck **102**, lint **180** (161 errors, 19
  warnings). Expected to fall, since loosely-typed code is being deleted. No
  new `react-hooks/set-state-in-effect` errors.
- No test suite exists, so behaviour is verified by exercising the page at
  375px and at desktop width: approve a leave and confirm caches invalidate;
  edit and save an employee and confirm the unmasked Aadhaar round-trips;
  navigate back from a profile on mobile; switch Active/Inactive and confirm no
  empty flash; keyboard-navigate the list.

## Next Session: Attendance Table

The following is written to be pasted cold into a new session.

---

Rebuild the attendance table in the HRMS employee directory, following the
conventions established by the employee directory redesign
(`docs/superpowers/specs/2026-08-22-employee-directory-redesign.md` — read it
first).

**Files in scope**, under
`frontend/src/components/hr/employeeDirectory/attendance/`:

- `AttendanceTable.tsx` (1,052 lines) — the main target
- `AttendanceAnalytics.tsx` (204)
- `EditAttendanceModal.tsx` (251)
- `TimeInput.tsx` (114)

`AttendanceSection.tsx` in the parent folder is a thin pass-through wrapper and
can be collapsed if it earns nothing after the split.

**Apply the same conventions the directory rebuild established:**

- Split into focused components, one purpose each, in a `components/`
  subfolder; extract derivation into hooks. No file should approach 1,000
  lines.
- `@theme` tokens only (`bg-card`, `text-muted-foreground`, `border-border`,
  `ring-ring`, `text-destructive`). No hardcoded `bg-white dark:bg-slate-800`
  or `cyan-600`/`green-600` pairs.
- shadcn primitives from `components/ui/` — `input`, `select`, `label`,
  `dialog`, `badge`, `button`, `tabs`, and `enhanced-datepicker` /
  `enhanced-calendar` for dates. Style call sites with layout classes only,
  never colors.
- Mobile first: cards below `md`, table from `md` up. A multi-column
  attendance table is unusable at 375px. Tap targets at least 44px.
- Date-range state belongs in the URL, not component state, so the view is
  shareable and the back button works.
- Accessibility: real table semantics on desktop, keyboard-operable controls,
  accessible names on icon-only buttons, `aria-invalid` plus
  `aria-describedby` on edit fields.
- React Compiler is enabled — do not add `useMemo`/`useCallback`/`React.memo`
  for performance by default.

**Specific things to check and fix while in there** (verify each against the
code rather than assuming):

- Whether the `updateTrigger: number` counter threaded from the parent is still
  needed, or whether TanStack Query invalidation already covers it. A manual
  refresh counter alongside a query cache is usually a redundancy.
- Whether attendance queries are correctly scoped server-side, or whether they
  over-fetch and filter client-side — the same class of bug found at
  `EmployeeDirectory.tsx:100` (`useAllLeaves` called with the filter as the
  options object, causing a full-system fetch).
- Any `as any` casts, and any hook called with arguments its signature does not
  accept.
- Any `window.location.href` navigation that should be `navigate()`.

**Constraint.** The parent scroll container (`components/Sidebar.tsx:288`) is
`h-dvh` with `overflow-y-auto` and already provides a fixed mobile bottom bar
plus spacer. Do not add `position: fixed` bottom elements or `h-screen` inside
the page; use `sticky` within the existing scroll context.

**Verification.** Run `pnpm typecheck` and `pnpm lint` in `frontend/` and
report actual numbers against the CLAUDE.md baselines (typecheck 102, lint 180
— 161 errors, 19 warnings); do not increase them. Backend `pnpm type-check`
stays clean. There is no test suite, so exercise the real page at 375px and
desktop: load a month of attendance, edit a record, change the date range, and
confirm the caches invalidate.

Package manager is pnpm, never npm.
