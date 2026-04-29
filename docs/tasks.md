# CivicGraph — Tasks

Three agents, one repo. Each agent reads `docs/architecture.md` and `docs/api-contract.md` before starting.

- **Agent A** = Kiro on RDP Ubuntu (AWS infra, backend, data scripts, deploys)
- **Agent B** = Claude Code on Windows laptop (frontend)
- **Agent C** = Kiro CLI on Windows laptop (data exploration, findings)

Sync: `git pull --rebase` before edit, commit-push after. Prefix: `feat(api):`, `feat(web):`, `feat(data):`, `feat(infra):`, `docs:`.

---

## Task 1: S3 data inventory + schema validation
- **Owner:** Agent C
- **Time:** 10:00–10:30
- **Depends on:** —
- **Description:** Inventory all files in `s3://agency2026-team-2/`. Document each JSONL file's schema (field names, types, sample records). Validate against the graph data model in `docs/architecture.md`. Flag mismatches by 10:30am.
- **Non-blocking:** Agent A starts Task 2 in parallel. If schema mismatches are found, Agent C notifies Agent A immediately.
- **Done when:** `data/schema.md` committed with field-level schema for all JSONL files, row counts, and any mismatch notes.

## Task 2: CDK scaffold + deploy Neptune + S3 staging
- **Owner:** Agent A
- **Time:** 10:00–10:45
- **Depends on:** —
- **Description:** Initialize CDK TypeScript project in `infra/`. Define stacks: NetworkStack (VPC), DataStack (Neptune Serverless 1–4 NCU + S3 staging bucket), AppStack (Lambda + API Gateway), WebStack (Amplify). Tag all resources `Project=civicgraph`, `AutoDelete=true`. Deploy NetworkStack + DataStack. Wait for Neptune `available` status.
- **Done when:** `cdk synth` clean; Neptune cluster `civicgraph-graph` status is `available`; staging S3 bucket exists.

## Task 3: Next.js scaffold + mock fixtures + shared types
- **Owner:** Agent B
- **Time:** 10:00–10:30
- **Depends on:** —
- **Description:** Initialize Next.js 14 in `apps/web/` with App Router, TypeScript, Tailwind. Install `cytoscape`, `react-cytoscapejs`, `cytoscape-cose-bilkent`. Create mock JSON fixtures from `docs/api-contract.md` (`mocks/top.json`, `mocks/person/p_001.json`). Create `lib/types.ts` with all shared TypeScript interfaces.
- **Done when:** `npm run dev` serves localhost:3000; mocks parse; types compile.

## Task 4: ETL: JSONL → Neptune bulk-load CSVs → bulk load
- **Owner:** Agent A
- **Time:** 10:30–11:15
- **Depends on:** Task 1 (schema)
- **Description:** Write `data/scripts/etl.py`: read JSONL from `s3://agency2026-team-2/`, transform into Neptune bulk-load CSV format (vertices: Person, Org, GovEntity; edges: SITS_ON, FUNDED, GIFTS_TO), upload to staging bucket, trigger Neptune Bulk Loader. Monitor until `LOAD_COMPLETED`.
- **Done when:** Neptune loader status is `LOAD_COMPLETED`; sample openCypher query returns expected vertices and edges.

## Task 5: Screen 1 — Top-20 landing page (mock data)
- **Owner:** Agent B
- **Time:** 10:30–11:15
- **Depends on:** Task 3
- **Description:** Build `app/page.tsx` (Screen 1): ranked list from `mocks/top.json`. Components: SearchBox (stub), PersonRow. Tabular-nums for large numbers. Clickable rows link to `/person/{id}`.
- **Done when:** Landing page renders 20 rows from mock data; clicking a row navigates to person detail route.

## Task 6: Bedrock entity resolution batch + top-20 pre-compute
- **Owner:** Agent A
- **Time:** 11:15–12:00
- **Depends on:** Task 4
- **Description:** Write `data/scripts/resolve.py`: query all Person vertices, group similar names (Levenshtein pre-filter), send batches to Bedrock `us.anthropic.claude-sonnet-4-6` for confidence scoring. Merge vertices with confidence >= 0.7 (store `aliases[]`, `confidence`). Cache results by SHA256 in S3. Then run the top-20 composite score query and write result to `s3://<staging>/cache/top.json`.
- **Done when:** Entity resolution complete; `cache/top.json` exists with 20 entries matching TopResponse schema.

## Task 7: Screen 2 — Person detail + Cytoscape graph (mock data)
- **Owner:** Agent B
- **Time:** 11:15–12:00
- **Depends on:** Task 5
- **Description:** Build `app/person/[id]/page.tsx` (Screen 2): fetch PersonDetailResponse from mock, render GraphView (Cytoscape cose-bilkent layout, node coloring by type, edge labels), ProvenanceChip components, and narrative paragraph. Hover tooltips on nodes.
- **Done when:** Person detail renders interactive graph from mock; nodes draggable; provenance chips clickable; narrative paragraph displayed.

## Task 8: Lambda handlers + Bedrock smoke test + API deploy
- **Owner:** Agent A
- **Time:** 12:00–12:45
- **Depends on:** Task 6
- **Description:** Implement 3 Lambda handlers matching `docs/api-contract.md`:
  - `top.ts`: read `cache/top.json` from S3, return TopResponse
  - `search.ts`: Bedrock query understanding + Neptune fuzzy search, return SearchResponse
  - `person.ts`: Neptune 1-hop ego graph + Bedrock narrative generation, return PersonDetailResponse

  **Bedrock smoke test:** Before deploying, verify `us.anthropic.claude-sonnet-4-6` is callable from the Lambda execution role. Test with a minimal InvokeModel call. This catches IAM permission gaps before Agent B integrates.

  Deploy AppStack. Verify all 3 endpoints return contract-shape JSON.
- **Done when:** `curl <api-url>/api/top` returns valid JSON; Bedrock smoke test passes; all 3 endpoints respond.

## Task 9: Killer findings + docs/findings.md
- **Owner:** Agent C
- **Time:** 10:30–12:30
- **Depends on:** Task 1
- **Description:** Run analysis queries against source data (DuckDB or Pandas):
  - Multi-board director count distribution
  - Top 50 directors by composite score
  - Cross-jurisdiction directors (federal AND AB funding)
  - Shared-address director clusters
  - Director-org concentration patterns

  Document defensible findings. Each finding: named person, dollar amounts, source filing IDs, defensibility note. Select top 3 for demo. Verify each against source filings (anti-hallucination check).
- **Done when:** `docs/findings.md` committed with 5+ findings; top 3 verified and flagged for demo.

## Task 10: Frontend API integration + SearchBox + live Bedrock narrative
- **Owner:** Agent B
- **Time:** 12:45–1:15
- **Depends on:** Task 8
- **Description:** Replace all mock fetches with real API calls using `NEXT_PUBLIC_API_URL`. Implement full SearchBox: debounced input (300ms), fetch `/api/search`, dropdown with keyboard navigation (arrow keys, Enter, Escape), aria-labels. Display the `narrative` field from PersonDetailResponse on the person detail page. Add loading and error states.
- **Done when:** Both screens work end-to-end against real API; search returns real results; narrative displays on person detail.

## Task 11: End-to-end verification + style polish
- **Owner:** All agents
- **Time:** 1:15–1:45
- **Depends on:** Task 10
- **Description:** Full walkthrough of live app. Verify: top-20 loads < 2s, search returns results < 2s, person graph renders < 3s, narrative loads < 5s, provenance links work. Style polish: Inter typography, color palette, responsive layout, footer with data attribution, tabular-nums on financials. Fix any integration bugs.
- **Done when:** All user stories pass manual verification on live URL. App looks polished.

## Task 12: Amplify deploy + README + demo rehearsal + submit
- **Owner:** All agents
- **Time:** 1:45–1:55
- **Depends on:** Task 11
- **Description:** Deploy frontend to Amplify (or confirm already deployed). Update README with: one-line description, architecture diagram, quickstart (`npm install`, `npm run dev`), live demo URL, data attribution. Rehearse the demo flow: search → top-20 → click person → explore graph → click provenance → read narrative. Tag `v1.0.0-demo` on main.
- **Done when:** Live URL works. README renders on GitHub. Tag exists. Demo rehearsed once.

---

## Post-demo stretch list (if we win)
- Org detail page (`/org/{id}`)
- Accessibility audit (keyboard nav, focus indicators, screen reader)
- 60-second demo video

## Definition of done for the demo
- Screen 1 loads top-20 list with 3+ real, named, defensible findings in the top 5
- Screen 2 renders an interactive graph for any of the top-20 people with AI narrative
- All 3 API endpoints return contract-shape JSON
- Demo URL is live and shareable
- README has architecture diagram and quickstart
- All AWS resources tagged `Project=civicgraph`, `AutoDelete=true`
