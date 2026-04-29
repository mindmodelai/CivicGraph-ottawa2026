# CivicGraph — Implementation Tasks

## Agent Legend
- **Agent A** = Kiro on RDP Ubuntu (AWS infra, backend, deploys)
- **Agent B** = Claude Code on Windows laptop (frontend)
- **Agent C** = Kiro CLI on Windows laptop (data exploration, findings)

---

## Phase 1: Scaffolding & Parallel Groundwork (10:00–11:00am)

### Task 1: S3 Data Inventory & Schema Discovery
- **Owner:** Agent C
- **Description:** Inventory all files in `s3://agency2026-team-2/`. Document each JSONL file's schema (field names, types, sample records). Identify which files contain director names, board memberships, and grant flows.
- **Dependencies:** None
- **Definition of Done:** `data/schema.md` committed with complete field-level schema for all JSONL files, including row counts and sample records.
- **Estimated Time:** 30 minutes
- **Files:** `data/schema.md`, `data/exploration/`

### Task 2: CDK Infrastructure Scaffold
- **Owner:** Agent A
- **Description:** Initialize CDK TypeScript project in `infra/`. Define four stacks: NetworkStack (default VPC), DataStack (Neptune Serverless cluster `civicgraph-graph` 1–4 NCU + S3 staging bucket), AppStack (Lambda + API Gateway), WebStack (Amplify). Tag all resources `Project=civicgraph`.
- **Dependencies:** None
- **Definition of Done:** `cdk synth` produces CloudFormation templates for all four stacks without errors.
- **Estimated Time:** 40 minutes
- **Files:** `infra/bin/app.ts`, `infra/lib/network-stack.ts`, `infra/lib/data-stack.ts`, `infra/lib/app-stack.ts`, `infra/lib/web-stack.ts`, `infra/package.json`, `infra/tsconfig.json`, `infra/cdk.json`

### Task 3: Deploy NetworkStack + DataStack
- **Owner:** Agent A
- **Description:** Deploy the network and data stacks to us-west-2. Wait for Neptune cluster to reach `available` status (~10 minutes).
- **Dependencies:** Task 2
- **Definition of Done:** `aws neptune describe-db-clusters --db-cluster-identifier civicgraph-graph` returns status `available`.
- **Estimated Time:** 15 minutes (deploy) + 10 minutes (wait)
- **Files:** None (deployment only)

### Task 4: Frontend Scaffold
- **Owner:** Agent B
- **Description:** Initialize Next.js 14 project in `apps/web/` with App Router, TypeScript, Tailwind. Install `cytoscape`, `react-cytoscapejs`, `cytoscape-cose-bilkent`. Set up layout.tsx with Inter font and global styles.
- **Dependencies:** None
- **Definition of Done:** `npm run dev` serves a page at localhost:3000 with Tailwind working.
- **Estimated Time:** 15 minutes
- **Files:** `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/tailwind.config.ts`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/next.config.js`

### Task 5: Mock Fixtures & Shared Types
- **Owner:** Agent B
- **Description:** Create mock JSON fixtures from the API contract (`mocks/top.json`, `mocks/person/p_001.json`). Create `lib/types.ts` with all shared TypeScript interfaces.
- **Dependencies:** Task 4
- **Definition of Done:** Mock files parse without error; types compile cleanly.
- **Estimated Time:** 10 minutes
- **Files:** `apps/web/mocks/top.json`, `apps/web/mocks/person/p_001.json`, `apps/web/lib/types.ts`

### Task 6: Top-20 Landing Page (Mock Data)
- **Owner:** Agent B
- **Description:** Build Screen 1 (`app/page.tsx`): ranked list pulling from mock fixture. Include SearchBox component stub, PersonRow component, tabular-nums styling for large numbers, clickable rows linking to `/person/{id}`.
- **Dependencies:** Task 5
- **Definition of Done:** Landing page renders 20 rows from mock data with correct formatting; clicking a row navigates to person detail route.
- **Estimated Time:** 35 minutes
- **Files:** `apps/web/app/page.tsx`, `apps/web/components/SearchBox.tsx`, `apps/web/components/PersonRow.tsx`, `apps/web/lib/api.ts`, `apps/web/lib/format.ts`

### Task 7: Schema Handoff to Agent A
- **Owner:** Agent C
- **Description:** Commit and push `data/schema.md`. Notify Agent A that schema is ready for ETL development.
- **Dependencies:** Task 1
- **Definition of Done:** `data/schema.md` is on `main` branch and Agent A can `git pull` it.
- **Estimated Time:** 5 minutes (must complete by 10:30am)
- **Files:** `data/schema.md`

### Task 8: ETL Script
- **Owner:** Agent A
- **Description:** Write `data/scripts/etl.py` that reads JSONL from `s3://agency2026-team-2/`, transforms into Neptune bulk-load CSV format (vertices and edges CSVs), uploads to staging bucket.
- **Dependencies:** Task 7 (schema from Agent C)
- **Definition of Done:** ETL produces valid CSV files matching Neptune bulk-load format; uploaded to `s3://<staging>/bulk-load/`.
- **Estimated Time:** 40 minutes
- **Files:** `data/scripts/etl.py`, `data/scripts/requirements.txt`

---

## Phase 2: Core Implementation (11:00am–12:30pm)

### Task 9: Neptune Bulk Load
- **Owner:** Agent A
- **Description:** Trigger Neptune Bulk Loader via POST to the loader endpoint. Monitor load status until complete.
- **Dependencies:** Task 3 (Neptune available), Task 8 (CSVs in S3)
- **Definition of Done:** Neptune loader status is `LOAD_COMPLETED`; sample openCypher query returns expected vertices.
- **Estimated Time:** 20 minutes
- **Files:** None (API calls only)

### Task 10: Person Detail Page with Cytoscape (Mock Data)
- **Owner:** Agent B
- **Description:** Build Screen 2 (`app/person/[id]/page.tsx`): fetches PersonDetailResponse from mock, passes graph data to GraphView component. Implement GraphView.tsx with Cytoscape cose-bilkent layout, node coloring by type, edge labels.
- **Dependencies:** Task 5
- **Definition of Done:** Person detail page renders interactive graph from mock data; nodes are draggable; layout is force-directed.
- **Estimated Time:** 45 minutes
- **Files:** `apps/web/app/person/[id]/page.tsx`, `apps/web/components/GraphView.tsx`, `apps/web/components/NodeTooltip.tsx`

### Task 11: ProvenanceChip & Hover States
- **Owner:** Agent B
- **Description:** Build ProvenanceChip component (clickable badge linking to source URL). Add hover tooltips to graph nodes showing entity details. Add provenance drawer/panel below graph.
- **Dependencies:** Task 10
- **Definition of Done:** Clicking a provenance chip opens source URL in new tab; hovering a node shows tooltip with name/type/funding.
- **Estimated Time:** 30 minutes
- **Files:** `apps/web/components/ProvenanceChip.tsx`, `apps/web/components/GraphView.tsx` (update)

### Task 12: Lambda Handlers — top.ts & search.ts
- **Owner:** Agent A
- **Description:** Implement `top.ts` (read from S3 cache, return TopResponse) and `search.ts` (query Neptune full-text search, return up to 20 fuzzy matches as SearchResponse).
- **Dependencies:** Task 9 (Neptune loaded)
- **Definition of Done:** Local invocation returns valid JSON matching API contract types.
- **Estimated Time:** 30 minutes
- **Files:** `apps/api/handlers/top.ts`, `apps/api/handlers/search.ts`, `apps/api/lib/neptune.ts`, `apps/api/lib/s3.ts`, `apps/api/package.json`

### Task 13: Lambda Handlers — person.ts & org.ts
- **Owner:** Agent A
- **Description:** Implement `person.ts` and `org.ts` handlers. Each runs a 1-hop ego graph openCypher query and assembles PersonDetailResponse / OrgDetailResponse including provenance records.
- **Dependencies:** Task 9 (Neptune loaded), Task 12 (shared lib)
- **Definition of Done:** Both handlers return valid contract-shape JSON for known test IDs.
- **Estimated Time:** 30 minutes
- **Files:** `apps/api/handlers/person.ts`, `apps/api/handlers/org.ts`

### Task 14: Bedrock Entity Resolution Batch
- **Owner:** Agent A
- **Description:** Write `data/scripts/resolve.py`: query all Person vertices, group similar names (Levenshtein pre-filter < 3), send batches to Bedrock Sonnet 4.6 for confidence scoring. Merge vertices with confidence >= 0.7. Cache results by SHA256 in S3.
- **Dependencies:** Task 9 (Neptune loaded)
- **Definition of Done:** Entity resolution completes; merged Person vertices have `aliases[]` and `confidence` properties in Neptune.
- **Estimated Time:** 45 minutes
- **Files:** `data/scripts/resolve.py`

### Task 15: Killer Findings Queries
- **Owner:** Agent C
- **Description:** Run 5 analysis queries against the source data (DuckDB or Pandas): multi-board director distribution, top-50 directors by composite score, cross-jurisdiction directors, shared-address clusters, director-org concentration. Document defensible findings.
- **Dependencies:** Task 1 (schema known)
- **Definition of Done:** `docs/findings.md` committed with 5+ named findings, each with dollar amounts and source filing IDs.
- **Estimated Time:** 60 minutes
- **Files:** `docs/findings.md`, `data/exploration/`

### Task 16: Deploy AppStack (Lambda + API Gateway)
- **Owner:** Agent A
- **Description:** Deploy the AppStack. Verify API Gateway base URL is accessible and all 4 endpoints respond.
- **Dependencies:** Task 12, Task 13
- **Definition of Done:** `curl <api-url>/api/top` returns valid TopResponse JSON.
- **Estimated Time:** 15 minutes
- **Files:** None (deployment only)

### Task 17: SearchBox with Keyboard Navigation
- **Owner:** Agent B
- **Description:** Implement full SearchBox behavior: debounced input (300ms), fetch from `/api/search`, dropdown results list with arrow-key navigation, Enter to select, Escape to close. Accessible: aria-labels, role=listbox.
- **Dependencies:** Task 6
- **Definition of Done:** Typing a name shows dropdown results; keyboard navigation works; selecting navigates to person detail.
- **Estimated Time:** 30 minutes
- **Files:** `apps/web/components/SearchBox.tsx` (update)

### Task 18: Pre-Compute Top-20 Cache
- **Owner:** Agent A
- **Description:** Run the composite-score openCypher query against Neptune. Write the top-20 result as `cache/top.json` in S3 matching the TopResponse schema.
- **Dependencies:** Task 14 (entity resolution complete for accurate scores)
- **Definition of Done:** `s3://<staging>/cache/top.json` exists and contains valid TopResponse with 20 entries.
- **Estimated Time:** 10 minutes
- **Files:** S3 object only

---

## Phase 3: Integration & Polish (12:30–1:30pm)

### Task 19: Frontend API Integration
- **Owner:** Agent B
- **Description:** Replace all mock fetch calls with real API calls using `NEXT_PUBLIC_API_URL` environment variable. Add error handling and loading states. Verify both screens work end-to-end.
- **Dependencies:** Task 16 (API deployed), Task 18 (top-20 cache populated)
- **Definition of Done:** Landing page loads real top-20 data; clicking a person shows real graph from Neptune.
- **Estimated Time:** 25 minutes
- **Files:** `apps/web/lib/api.ts` (update), `apps/web/app/page.tsx` (update), `apps/web/app/person/[id]/page.tsx` (update), `apps/web/.env.local`

### Task 20: End-to-End Verification
- **Owner:** Agent A
- **Description:** Verify all 4 API endpoints return contract-shape JSON with real data. Test the 3 demo hero persons specifically. Fix any schema mismatches.
- **Dependencies:** Task 16, Task 18
- **Definition of Done:** All endpoints return 200 with valid typed responses for top-20 and 3 demo persons.
- **Estimated Time:** 20 minutes
- **Files:** None (testing only)

### Task 21: Style Polish
- **Owner:** Agent B
- **Description:** Typography (Inter), color palette (neutral + accent for entity types), responsive layout, footer with data attribution ("Data: CRA T3010, Government of Canada Open Data, Government of Alberta Open Data"). Ensure tabular-nums on all financial figures.
- **Dependencies:** Task 19
- **Definition of Done:** Both screens are visually polished; responsive at mobile and desktop breakpoints.
- **Estimated Time:** 25 minutes
- **Files:** `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, `apps/web/components/` (various)

### Task 22: Accessibility Audit
- **Owner:** Agent B
- **Description:** Keyboard walkthrough: Tab through all interactive elements, verify focus indicators, aria labels, no focus traps. Test Enter/Escape on search, graph nodes, provenance chips.
- **Dependencies:** Task 21
- **Definition of Done:** Full keyboard navigation works without mouse; no focus traps; screen reader announces element roles.
- **Estimated Time:** 15 minutes
- **Files:** Various component files (fixes)

### Task 23: Demo Findings Integration
- **Owner:** Agent C
- **Description:** Select top 3 most compelling findings. Verify each against source filings (anti-hallucination check). Hand person IDs and narrative to Agent B for demo flow.
- **Dependencies:** Task 15, Task 20
- **Definition of Done:** 3 verified findings documented with person IDs that resolve correctly in the live API.
- **Estimated Time:** 20 minutes
- **Files:** `docs/findings.md` (update)

### Task 24: Degraded Mode Testing
- **Owner:** Agent A
- **Description:** Test fallback behavior: simulate Neptune unreachable (wrong endpoint), verify top-20 still serves from S3, verify pre-cached person details load, verify search returns graceful error.
- **Dependencies:** Task 20
- **Definition of Done:** App serves functional (degraded) view when Neptune is unreachable.
- **Estimated Time:** 15 minutes
- **Files:** `apps/api/handlers/` (fallback logic)

### Task 25: Deploy Frontend to Amplify
- **Owner:** Agent A
- **Description:** Configure Amplify hosting from the GitHub repo. Set build settings for Next.js static export. Set `NEXT_PUBLIC_API_URL` environment variable. Deploy and verify live URL.
- **Dependencies:** Task 19, Task 21
- **Definition of Done:** Amplify URL loads the app with real data from the API.
- **Estimated Time:** 15 minutes
- **Files:** `apps/web/amplify.yml` (if needed)

---

## Phase 4: Submission Prep (1:30–2:00pm)

### Task 26: Demo Video Recording
- **Owner:** Agent B
- **Description:** Record 60-second screen capture showing: search for a person → top-20 page → click into person detail → explore graph → click provenance link. Save to repo.
- **Dependencies:** Task 25
- **Definition of Done:** `demo/civicgraph-demo.mp4` exists in repo, under 60 seconds, shows full user flow.
- **Estimated Time:** 10 minutes
- **Files:** `demo/civicgraph-demo.mp4`

### Task 27: README Finalization
- **Owner:** Agent B
- **Description:** Update README with: one-line description, architecture diagram, quickstart instructions (`npm install`, `npm run dev`), live demo URL, screenshot, data attribution.
- **Dependencies:** Task 25
- **Definition of Done:** README is complete and renders correctly on GitHub.
- **Estimated Time:** 10 minutes
- **Files:** `README.md`

### Task 28: Cost & Resource Audit
- **Owner:** Agent A
- **Description:** Check AWS Cost Explorer for current spend. Verify all resources are tagged `Project=civicgraph`. Confirm total is under $50 USD ceiling.
- **Dependencies:** All deploys complete
- **Definition of Done:** Spend confirmed under $50; all resources discoverable by tag.
- **Estimated Time:** 5 minutes
- **Files:** None

### Task 29: Final Integration Test
- **Owner:** All agents
- **Description:** Full walkthrough of the live demo URL. Verify: top-20 loads < 2s, search returns results < 2s, person graph renders < 3s, provenance links work, keyboard navigation works.
- **Dependencies:** Task 25, Task 22
- **Definition of Done:** All NFRs pass on the live URL; demo flow rehearsed.
- **Estimated Time:** 10 minutes
- **Files:** None

### Task 30: Code Freeze & Tag
- **Owner:** Agent A
- **Description:** Create git tag `v1.0.0-demo` on main. Ensure all agents have pushed. Verify clean `git status` on all machines.
- **Dependencies:** All tasks complete
- **Definition of Done:** Tag `v1.0.0-demo` exists on origin/main; no uncommitted changes on any machine.
- **Estimated Time:** 5 minutes
- **Files:** None

---

## Critical Path

```
Task 1 (schema) ──► Task 7 (handoff, by 10:30am) ──► Task 8 (ETL) ──► Task 9 (bulk load)
                                                                              │
Task 2 (CDK) ──► Task 3 (deploy Neptune) ─────────────────────────────────────┘
                                                                              │
                                               Task 12+13 (handlers) ──► Task 16 (deploy API)
                                                                              │
Task 4 (frontend scaffold) ──► Task 6 (landing) ──► Task 10 (graph) ──► Task 19 (integrate)
                                                                              │
                                                                         Task 25 (Amplify)
```

## Time Budget Summary

| Phase | Window | Hours | Tasks |
|-------|--------|-------|-------|
| Phase 1 | 10:00–11:00am | 1h | Tasks 1–8 |
| Phase 2 | 11:00am–12:30pm | 1.5h | Tasks 9–18 |
| Phase 3 | 12:30–1:30pm | 1h | Tasks 19–25 |
| Phase 4 | 1:30–2:00pm | 0.5h | Tasks 26–30 |
| **Total** | | **4h** | **30 tasks** |
