# CivicGraph — Task List (canonical)

Status: [ ] unstarted | [~] in progress | [x] done

See docs/architecture.md and docs/api-contract.md for technical contracts.

---

## Kiro-CLI-RDP (Agent A) — infra/, apps/api/, data/scripts/

- [x] Task 2: CDK scaffold + deploy Neptune + S3 staging
- [~] Task 4: ETL — JSONL → Neptune bulk-load CSVs → bulk load <!-- claimed by Kiro-CLI-RDP -->
- [ ] Task 6: Top-20 pre-compute (use golden records, skip resolve.py)
- [ ] Task 8: Lambda handlers + Bedrock smoke test + API deploy

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
