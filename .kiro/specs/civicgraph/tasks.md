# CivicGraph — Task List (canonical)

Status: [ ] unstarted | [~] in progress | [x] done

See docs/architecture.md and docs/api-contract.md for technical contracts.

---

## Kiro-CLI-RDP (Agent A) — infra/, apps/api/, data/scripts/

- [x] Task 2: CDK scaffold + deploy Neptune + S3 staging
- [x] Task 4: ETL — JSONL → Neptune bulk-load CSVs → bulk load <!-- completed: 990,334 records, 0 errors, 107s -->
- [x] Task 6: Top-20 pre-compute <!-- completed 2026-04-29T17:05Z: 20 entries, top=ANDREW SMITH score=293.22 -->
  - Query Neptune (`civicgraph-graph.cluster-c5qoqo2omjl2.us-west-2.neptune.amazonaws.com:8182`)
  - Composite score: `boards × log10(1 + totalFunding)` per Person vertex
  - Write result to `s3://civicgraph-staging-006193923397-us-west-2/cache/top.json`
  - Must match TopResponse schema (see docs/api-contract.md): `{ results: RankedPerson[], generatedAt: string }`
  - Use golden records (`general/entity_golden_records.jsonl`) for entity IDs — skip resolve.py
  - **Done when:** `cache/top.json` exists in S3 with 20 entries, each having id/name/province/boards/totalFunding/compositeScore
- [x] Task 8: Lambda handlers + Bedrock smoke test + API deploy <!-- completed 2026-04-29T17:21Z: all 3 endpoints live, Bedrock narrative working, CORS enabled -->
  - Implement 3 handlers in `apps/api/handlers/`: `top.ts`, `search.ts`, `person.ts`
  - `top.ts`: read `s3://civicgraph-staging-006193923397-us-west-2/cache/top.json`, return TopResponse
  - `search.ts`: Bedrock query understanding (`us.anthropic.claude-sonnet-4-6`) + Neptune openCypher fuzzy search, return SearchResponse
  - `person.ts`: Neptune 1-hop ego graph + Bedrock narrative generation (`us.anthropic.claude-sonnet-4-6`), return PersonDetailResponse with `narrative: string`
  - Neptune endpoint: `civicgraph-graph.cluster-c5qoqo2omjl2.us-west-2.neptune.amazonaws.com:8182`
  - Lambda role: `civicgraph-lambda-execution-role` (already has bedrock:InvokeModel, neptune-db:*, s3:Get/Put)
  - Lambda SG: `sg-01fed06d715bb8d6e` (already allowed into Neptune SG)
  - Deploy via API Gateway REST API with CORS enabled (`Access-Control-Allow-Origin: *`) for frontend integration
  - **Bedrock smoke test:** Verify `us.anthropic.claude-sonnet-4-6` is callable from Lambda execution role before full deploy
  - **Done when:** (1) `curl <api-url>/api/top` returns valid TopResponse with 20 entries; (2) `curl <api-url>/api/person/<id>` returns PersonDetailResponse including a non-empty `narrative` string; (3) Bedrock smoke test passes; (4) API Gateway base URL committed to `infra/provisioning-status.md`

- [x] A-DEPLOY-WEB: Deploy apps/web/ to AWS Amplify Hosting in us-west-2 <!-- done by Kiro-CLI-RDP-Amplify at 2026-04-29T15:52:00Z -->
  - Create an Amplify app pointed at GitHub repo `mindmodelai/CivicGraph-ottawa2026`, branch `main`, monorepo path `apps/web`
  - Build settings: Next.js 14 App Router, Node 20, default amplify.yml (or write one if needed)
  - Set environment variable `NEXT_PUBLIC_API_URL` initially to empty (frontend falls back to mocks)
  - After API Gateway is deployed in Task 8, update `NEXT_PUBLIC_API_URL` to the public API URL and trigger a rebuild
  - Capture the public Amplify domain (e.g. `https://main.<app-id>.amplifyapp.com`)
  - Write the public URL to `infra/demo-url.txt` and commit
  - All resources tagged `Project=civicgraph`, `AutoDelete=true`, region `us-west-2`
  - **Done when:** Public Amplify URL renders Screen 1 with 20 entries from mocks, and Person detail pages render for p_001/p_002/p_003

## Kiro-CLI Laptop (Agent B) — apps/web/

- [x] Task 3: Next.js scaffold + mock fixtures + shared types
- [x] Task 5: Screen 1 — Top-20 landing page (mock data)
- [x] Task 7: Screen 2 — Person detail + Cytoscape graph (mock data)
- [~] B-MOCK-SWAP: Copy real-data mocks from data/exploration/staged-mocks/ to apps/web/public/mocks/ <!-- in progress by Kiro-CLI Laptop -->
  - Replace placeholder mocks with verified findings data (top.json, person/*.json)
  - **Done when:** Amplify rebuild shows real names/numbers on Screen 1 and person detail pages
- [ ] Task 10: Frontend API integration + SearchBox + live Bedrock narrative (blocked on Task 8 publishing infra/api-endpoint.txt)

## Claude Code Laptop (Agent C) — data/exploration/, docs/findings*.md, prompts/, coordination/, progress/

- [x] Task 1: S3 data inventory + schema validation
- [x] Task 9: Killer findings + docs/findings.md + verification + demo payload
- [~] C-STAGE-MOCKS: Stage real-data mocks at data/exploration/staged-mocks/ for frontend swap <!-- in progress by Claude Code Laptop -->
  - Generate top.json and person/{id}.json from verified findings matching API contract schema
  - **Done when:** data/exploration/staged-mocks/ contains top.json + 3 person detail JSONs

## All agents (shared)

- [ ] Task 11: End-to-end verification + style polish (blocked on Task 10)
- [ ] Task 12: Amplify deploy + README + demo rehearsal + submit (blocked on Task 11)

---

## Dependency chain

Task 4 → Task 6 → Task 8 → Task 10 → Task 11 → Task 12

Agent B is working on mock swap (B-MOCK-SWAP) while waiting for Task 8. Agent C is staging real-data mocks (C-STAGE-MOCKS). Task 6 auto-unblocks when Task 4 bulk load reaches LOAD_COMPLETED.

## Orchestrator notes

The frontend deploys via Amplify because the laptop's WSParticipantRole is locked down (no Amplify provisioning). Amplify must be created from the RDP role. Order of operations: Kiro-CLI-RDP creates the Amplify app and gets it building from main against mocks (fast — <10 min). Then Kiro-CLI-RDP finishes Lambda+API Gateway (Task 8). Then Kiro-CLI-RDP updates the Amplify env var with the API URL and redeploys.
