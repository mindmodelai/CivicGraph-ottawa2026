# CivicGraph — Task List (canonical)

Status: [ ] unstarted | [~] in progress | [x] done

See docs/architecture.md and docs/api-contract.md for technical contracts.

---

## Kiro-CLI-RDP (Agent A) — infra/, apps/api/, data/scripts/

- [x] Task 2: CDK scaffold + deploy Neptune + S3 staging
- [~] Task 4: ETL — JSONL → Neptune bulk-load CSVs → bulk load <!-- claimed by Kiro-CLI-RDP -->
- [ ] Task 6: Top-20 pre-compute
  - Query Neptune (`civicgraph-graph.cluster-c5qoqo2omjl2.us-west-2.neptune.amazonaws.com:8182`)
  - Composite score: `boards × log10(1 + totalFunding)` per Person vertex
  - Write result to `s3://civicgraph-staging-006193923397-us-west-2/cache/top.json`
  - Must match TopResponse schema (see docs/api-contract.md): `{ results: RankedPerson[], generatedAt: string }`
  - Use golden records (`general/entity_golden_records.jsonl`) for entity IDs — skip resolve.py
  - **Done when:** `cache/top.json` exists in S3 with 20 entries, each having id/name/province/boards/totalFunding/compositeScore
- [ ] Task 8: Lambda handlers + Bedrock smoke test + API deploy
  - Implement 3 handlers in `apps/api/handlers/`: `top.ts`, `search.ts`, `person.ts`
  - `top.ts`: read `s3://civicgraph-staging-006193923397-us-west-2/cache/top.json`, return TopResponse
  - `search.ts`: Bedrock query understanding (`us.anthropic.claude-sonnet-4-6`) + Neptune openCypher fuzzy search, return SearchResponse
  - `person.ts`: Neptune 1-hop ego graph + Bedrock narrative generation (`us.anthropic.claude-sonnet-4-6`), return PersonDetailResponse with `narrative: string`
  - Neptune endpoint: `civicgraph-graph.cluster-c5qoqo2omjl2.us-west-2.neptune.amazonaws.com:8182`
  - Lambda role: `civicgraph-lambda-execution-role` (already has bedrock:InvokeModel, neptune-db:*, s3:Get/Put)
  - Lambda SG: `sg-01fed06d715bb8d6e` (already allowed into Neptune SG)
  - Deploy via API Gateway REST API
  - **Bedrock smoke test:** Verify `us.anthropic.claude-sonnet-4-6` is callable from Lambda execution role before full deploy
  - **Done when:** All 3 endpoints return contract-shape JSON; Bedrock smoke test passes; API Gateway URL committed to `infra/provisioning-status.md`

## Kiro-CLI Laptop (Agent B) — apps/web/

- [x] Task 3: Next.js scaffold + mock fixtures + shared types
- [x] Task 5: Screen 1 — Top-20 landing page (mock data)
- [x] Task 7: Screen 2 — Person detail + Cytoscape graph (mock data)
- [ ] Task 10: Frontend API integration + SearchBox + live Bedrock narrative (blocked on Task 8)

## Claude Code Laptop (Agent C) — data/exploration/, docs/findings*.md, prompts/, coordination/, progress/

- [x] Task 1: S3 data inventory + schema validation
- [x] Task 9: Killer findings + docs/findings.md + verification + demo payload

## All agents (shared)

- [ ] Task 11: End-to-end verification + style polish (blocked on Task 10)
- [ ] Task 12: Amplify deploy + README + demo rehearsal + submit (blocked on Task 11)

---

## Dependency chain

Task 4 → Task 6 → Task 8 → Task 10 → Task 11 → Task 12

Agent B is idle until Task 8 completes (API deploy). Agent C has no remaining solo tasks — available for scribe/orchestration support.
