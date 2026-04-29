# Agent B — Windows Laptop (Frontend)

You own: `apps/web/`

Read `prompts/standing-instructions.md` for commit protocol.

## Your tasks (in order)

### Task 3: Next.js scaffold + mock fixtures + shared types
- Initialize Next.js 14 in `apps/web/` with App Router, TypeScript, Tailwind
- Install: `cytoscape`, `react-cytoscapejs`, `cytoscape-cose-bilkent`
- Create mock fixtures from `docs/api-contract.md`: `mocks/top.json`, `mocks/person/p_001.json`
- Create `lib/types.ts` with all shared TypeScript interfaces from the API contract
- **Done when:** `npm run dev` serves localhost:3000; mocks parse; types compile

### Task 5: Screen 1 — Top-20 landing page (mock data)
- Build `app/page.tsx`: ranked list from `mocks/top.json`
- Components: SearchBox (stub), PersonRow
- Tabular-nums for large numbers, clickable rows link to `/person/{id}`
- **Done when:** Landing page renders 20 rows; clicking a row navigates to person detail

### Task 7: Screen 2 — Person detail + Cytoscape graph (mock data)
- Build `app/person/[id]/page.tsx`: fetch PersonDetailResponse from mock
- GraphView component: Cytoscape cose-bilkent layout, node coloring by type, edge labels
- ProvenanceChip components (clickable, opens source URL in new tab)
- Narrative paragraph from `PersonDetailResponse.narrative`
- Hover tooltips on nodes
- **Done when:** Interactive graph renders from mock; nodes draggable; provenance chips clickable; narrative displayed

### Task 10: Frontend API integration + SearchBox + live Bedrock narrative
- **Depends on:** Task 8 (Agent A deploys API)
- Replace mock fetches with real API calls using `NEXT_PUBLIC_API_URL`
- Full SearchBox: debounced input (300ms), fetch `/api/search`, dropdown with keyboard nav (arrow keys, Enter, Escape), aria-labels
- Display `narrative` field from PersonDetailResponse
- Loading and error states
- **Done when:** Both screens work end-to-end against real API

## API contract summary

3 endpoints (see `docs/api-contract.md` for full types):

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/top?n=20` | `TopResponse` — cached, fast |
| GET | `/api/search?q={string}` | `SearchResponse` — up to 20 results |
| GET | `/api/person/{id}` | `PersonDetailResponse` — graph + provenance + narrative |

Key type: `PersonDetailResponse` includes `narrative: string` (live Bedrock-generated summary).

## CSS-first approach

- Use pure CSS for all styling and simple interactions
- `position: sticky` for sidebar, CSS transitions for hover effects
- JavaScript only for: Cytoscape graph, SearchBox state, API fetches
- No animation libraries
