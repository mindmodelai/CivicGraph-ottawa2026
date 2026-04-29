# Agent A — RDP Ubuntu (AWS infra + backend + ETL)

You own: `infra/`, `apps/api/`, `data/scripts/`, all AWS deploys.

Read `prompts/standing-instructions.md` for commit protocol.

## Current state

- **Task 2 DONE:** Neptune cluster `civicgraph-graph` provisioned, staging bucket created, IAM roles created. See `infra/provisioning-status.md` for all endpoints and ARNs.
- **Task 1 DONE (Agent C):** Schema discovery complete. See `data/schema.md` for full inventory.

## Critical finding from Agent C

`general/entity_golden_records.jsonl` (851K rows) already contains pre-resolved entities with aliases, LLM verdicts, and cross-dataset profiles. **Use golden records as the entity backbone for the ETL instead of building entity resolution from scratch.** This simplifies Task 6 — skip `resolve.py` and use golden records + `entity_source_links.jsonl` directly.

## Your remaining tasks (in order)

### Task 4: ETL — JSONL → Neptune bulk-load CSVs → bulk load
- Read `data/schema.md` for field mappings and mismatches
- Write `data/scripts/etl.py`: read from `s3://agency2026-team-2/`, transform to Neptune bulk-load CSV
- Key files: `cra/cra_directors.jsonl` (2.87M, SITS_ON edges), `cra/cra_identification.jsonl` (422K, Org vertices), `cra/cra_qualified_donees.jsonl` (1.66M, GIFTS_TO edges), `fed/grants_contributions.jsonl` (1.28M, FUNDED edges), `ab/ab_grants.jsonl` (1.99M, FUNDED edges)
- Use `general/entity_golden_records.jsonl` for entity IDs and linking
- Use `cra/govt_funding_by_charity.jsonl` for pre-aggregated funding totals
- Upload CSVs to `s3://civicgraph-staging-006193923397-us-west-2/bulk-load/`
- Trigger Neptune Bulk Loader, monitor until `LOAD_COMPLETED`
- **Done when:** Sample openCypher query returns expected vertices and edges

### Task 6: Top-20 pre-compute (entity resolution already done in golden records)
- Run composite score query: `boards × log10(1 + totalFunding)`
- Write result to `s3://civicgraph-staging-006193923397-us-west-2/cache/top.json` matching TopResponse schema
- **Done when:** `cache/top.json` exists with 20 entries

### Task 8: Lambda handlers + Bedrock smoke test + API deploy
- Implement 3 handlers in `apps/api/handlers/`: `top.ts`, `search.ts`, `person.ts`
- Match `docs/api-contract.md` exactly — PersonDetailResponse includes `narrative: string` (live Bedrock call)
- `search.ts`: Bedrock query understanding + Neptune fuzzy search
- `person.ts`: Neptune 1-hop ego graph + Bedrock narrative generation
- **Bedrock smoke test:** Verify `us.anthropic.claude-sonnet-4-6` is callable from Lambda execution role before deploying
- Deploy via API Gateway
- **Done when:** All 3 endpoints return contract-shape JSON; Bedrock smoke test passes

## AWS resources (from provisioning-status.md)

- Neptune endpoint: `civicgraph-graph.cluster-c5qoqo2omjl2.us-west-2.neptune.amazonaws.com:8182`
- Staging bucket: `s3://civicgraph-staging-006193923397-us-west-2`
- Lambda role: `civicgraph-lambda-execution-role`
- Neptune loader role: `civicgraph-neptune-loader-role`
- Lambda SG: `sg-01fed06d715bb8d6e`
- Neptune SG: `sg-02f2190501cd229d1`
- Region: `us-west-2`
- Bedrock model: `us.anthropic.claude-sonnet-4-6`

## Schema mismatches to handle in ETL

1. No Person ID in source — generate from golden record entity IDs or hash of `(last_name, first_name)`
2. Person.province not in directors file — join via `bn` → `cra_identification.province`
3. Federal grants often lack `recipient_business_number` — use `entity_source_links.jsonl` to bridge
4. AB grants have no BN — use golden records or fuzzy matching
5. All monetary values are strings — parseFloat in ETL
