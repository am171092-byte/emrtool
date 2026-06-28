
# RheumCare — Rheumatology EMR PWA (Frontend with Mock Data)

Build the complete frontend per the spec. All data lives in an in-memory mock API layer that mimics the real backend contract, so swapping to your Cloud Run + Drive backend later is just a base-URL change.

## Approach

- **No backend wired yet.** All `fetch(VITE_API_BASE_URL/...)` calls are replaced by a single `src/lib/api.ts` mock client with the same function signatures (`getPatients`, `createVisit`, `aiAssist`, etc.). When `VITE_API_BASE_URL` is set later, flip one flag to switch from mock to real `fetch`.
- **Mock store** seeded with ~8 realistic rheumatology patients (RA, SLE, gout, PsA), each with 2–5 historical visits, vitals, investigations, and a couple with DAS28 history for the trend chart.
- **Auth is mocked**: "Sign in with Google" button just sets a fake doctor in context and routes to `/dashboard`. Real OAuth redirect logic is stubbed behind the same boundary.
- **AI assistant** returns canned but realistic-looking responses per task (SOAP, drug info, safety check, differential, etc.) so the UI is fully exercisable.

## Modules (all 11, one pass)

1. **Auth shell** — login screen, in-memory doctor context, 401 handler stub.
2. **Dashboard** — greeting, stats row, recent patients, upcoming follow-ups, quick actions.
3. **Patient list** — search (debounced), table/card responsive, sort, pagination, FAB on mobile.
4. **Patient record** — sticky summary (allergies/meds/comorbidities/problem list as editable chips), 4 tabs: Visit Timeline, Vitals History (+ Recharts line chart), Investigations, Attachments.
5. **New/Edit Patient form** — personal, clinical, optional vitals; live BMI; live age.
6. **Visit form** — SOAP with AI-assist buttons, vitals pre-filled from last visit, prescriptions w/ rheum drug autocomplete, investigations, follow-up, inline DAS28 toggle.
7. **Joint Map** — SVG body diagram with 28 DAS28 hotspots (shoulders, elbows, wrists, MCP 1–5, PIP 1–5, knees, all bilateral), Tender/Swollen modes, per-joint notes, live TJC/SJC, "Send to DAS28".
8. **DAS28 calculator** — TJC/SJC steppers, ESR/CRP radio, VAS slider, real-time DAS28-ESR and DAS28-CRP, color-coded activity badge, score bar 0–8, copy summary, historical trend chart (Recharts).
9. **AI assistant** — slide-in drawer with context chip, de-identify toggle, 6 quick-action cards, free chat with markdown rendering, disclaimer pinned.
10. **Print / Export** — `@media print` visit summary; "Export PDF" generates a client-side PDF via jsPDF (mock backend stand-in).
11. **Settings** — profile, mock Drive section, app preferences (default ESR/CRP saved to localStorage, theme), sign out.

## Design system

- Tokens in `src/styles.css`: primary `#1B4F72`, accent `#1A9E74`, warning `#E67E22`, danger `#C0392B`, muted `#6B7A8D`, border `#DDE3EC`, surface `#F7F9FC`, card `#FFFFFF`. All mapped to shadcn semantic tokens — no hardcoded hex in components.
- Fonts via `@fontsource/inter` and `@fontsource/jetbrains-mono`. Mono for scores/vitals.
- Radii: 10/8/6. 8px spacing scale. 44px min touch targets.
- Hand-silhouette SVG watermark on DAS28 + Joint Map panels.
- Dark mode supported (system + override in settings).

## Navigation

- Desktop: shadcn Sidebar (260px) with Cmd+K search, doctor footer.
- Mobile: bottom nav (5 icons).
- Keyboard shortcuts: Cmd+K, Cmd+S, Cmd+N, Esc.

## Routing (TanStack Start)

```
src/routes/
  __root.tsx              (providers, head meta, theme)
  index.tsx               (redirect to /dashboard or /login)
  login.tsx
  _app.tsx                (sidebar/bottom-nav layout, requires mock auth)
  _app.dashboard.tsx
  _app.patients.index.tsx
  _app.patients.new.tsx
  _app.patients.$patientId.tsx
  _app.patients.$patientId.edit.tsx
  _app.patients.$patientId.visits.new.tsx
  _app.patients.$patientId.visits.$visitId.edit.tsx
  _app.patients.$patientId.joint-map.tsx
  _app.patients.$patientId.das28.tsx
  _app.ai-assistant.tsx
  _app.settings.tsx
```

AI drawer also accessible globally from sidebar button.

## PWA

Manifest + icons for installability. Service worker (vite-plugin-pwa, `NetworkFirst` for HTML, `CacheFirst` for hashed assets) with guards so it never registers in Lovable preview. Excludes all `/api/*` from caching. Note: offline only works in published app, not preview.

## Tech additions

- `bun add recharts jspdf react-markdown @fontsource/inter @fontsource/jetbrains-mono vite-plugin-pwa`
- shadcn components already present cover most needs (Sidebar, Sheet/Drawer, Dialog, Tabs, Table, Select, Slider, Toast, etc.).

## Out of scope (frontend-only build)

- Real Google OAuth flow
- Real Google Drive storage
- Real Gemini API proxy
- Real PDF export endpoint (replaced by client-side jsPDF)

These all live behind `src/lib/api.ts`. When your backend is ready, set `VITE_API_BASE_URL`, flip `USE_MOCK = false`, and the UI works unchanged.

## Deliverable check (vs your checklist)

✅ DAS28 real-time with both ESR/CRP formulas · ✅ 28-joint interactive map feeding DAS28 · ✅ AI routed through abstraction (mock now, backend later) · ✅ Print view · ✅ Dark mode · ✅ Responsive 3 breakpoints · ✅ 44px touch targets · ✅ PWA installable · ✅ No PHI in service worker cache (nothing real to cache anyway) · ✅ No JWT in localStorage (mock token in memory)
