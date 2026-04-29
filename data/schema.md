# CivicGraph — S3 Data Schema

Inventory of `s3://agency2026-team-2/` completed 2026-04-29 10:25am ET.

## Summary

- **63 files** across 4 prefixes: `ab/` (9), `cra/` (37), `fed/` (6), `general/` (12)
- **Total rows:** ~18.5M across key files
- **5 empty files:** `cra/cra_political_activity_funding.jsonl`, `cra/t3010_completeness_issues.jsonl`, `general/donee_trigram_candidates.jsonl`, `general/resolution_batches.jsonl`, `general/splink_aliases.jsonl`

## ⚠️ Critical Finding: Entity Resolution Already Done

`general/entity_golden_records.jsonl` (851K rows) contains **pre-resolved entities** with:
- `aliases[]` — all name variants across datasets
- `merge_history[]` — which entities were merged and why
- `llm_authored` — LLM verdicts with confidence scores and reasoning
- `cra_profile`, `fed_profile`, `ab_profile` — cross-dataset profiles with aggregated stats

**Impact on Task 6:** The Bedrock entity resolution batch may be unnecessary. The ETL can read golden records directly instead of running resolve.py. Agent A should evaluate whether golden records are sufficient or if additional resolution is needed for director names specifically (golden records cover orgs well but may not cover person-to-person name matching for directors).

## Graph Model Mapping

### Vertex: Person → `cra/cra_directors.jsonl`

| Graph Property | Source Field | Notes |
|---|---|---|
| `id` | derive from `last_name + first_name + bn` | No native person ID; must generate |
| `name` | `last_name`, `first_name` | Concatenate; `initials` available but often null |
| `aliases[]` | — | Not in source; comes from entity resolution |
| `province` | — | ⚠️ **MISMATCH**: Not in directors file. Must join via `bn` → `cra_identification.province` |
| `confidence` | — | Not in source; comes from entity resolution |
| `boards` | computed | COUNT DISTINCT `bn` per person |
| `totalFunding` | computed | Sum via SITS_ON → Org → FUNDED |

**Row count:** 2,873,624
**Key fields:** `bn`, `fpe`, `last_name`, `first_name`, `initials`, `position`, `at_arms_length`, `start_date`, `end_date`

### Vertex: Org → `cra/cra_identification.jsonl`

| Graph Property | Source Field | Notes |
|---|---|---|
| `id` | `bn` | Business number (e.g., `831282512RR0001`) |
| `legalName` | `legal_name` | ✓ direct map |
| `businessNumber` | `bn` | ✓ direct map |
| `jurisdiction` | derive from `province` + dataset | CRA = federal registration; province field gives location |
| `totalFundingReceived` | computed | Sum of FUNDED edges |

**Row count:** 421,866
**Key fields:** `bn`, `fiscal_year`, `category`, `sub_category`, `designation`, `legal_name`, `account_name`, `address_line_1`, `city`, `province`, `postal_code`, `country`

### Vertex: GovEntity → derive from `fed/grants_contributions.owner_org` + `ab/ab_grants.ministry`

| Graph Property | Source Field | Notes |
|---|---|---|
| `id` | `owner_org` or `ministry` | Federal: `owner_org` (e.g., `nserc-crsng`). AB: `ministry` |
| `name` | `owner_org_title` or `ministry` | Federal has bilingual title |
| `level` | derive from prefix | `fed/` → 'federal', `ab/` → 'provincial' |
| `department` | `owner_org_title` or `business_unit_name` | ✓ available |

**No dedicated GovEntity file.** Must extract unique values from grants files.

### Edge: SITS_ON → `cra/cra_directors.jsonl`

| Graph Property | Source Field | Notes |
|---|---|---|
| `role` | `position` | e.g., "President", "Secretary", "Treasurer", "Director" |
| `yearStart` | `start_date` | ISO timestamp, extract year |
| `yearEnd` | `end_date` | Nullable (still serving) |
| `sourceFilingId` | derive from `bn + fpe` | T3010 filing identifier |
| `sourceUrl` | construct | `https://apps.cra-arc.gc.ca/ebci/hacc/srch/pub/dsplyRprtngPrd?q.srchNm=&q.stts=0007&selectedCharityBn={bn}&dsrdPg=1` |

**Row count:** 2,873,624 (one row per director-per-filing-period)

### Edge: FUNDED → `fed/grants_contributions.jsonl` + `ab/ab_grants.jsonl`

| Graph Property | Source Field (fed) | Source Field (ab) | Notes |
|---|---|---|---|
| `amount` | `agreement_value` | `amount` | Both strings, need parseFloat. AB has negative values (clawbacks) |
| `fiscalYear` | derive from `agreement_start_date` | `fiscal_year` | Fed: extract year. AB: string like "2014 - 2015" |
| `program` | `prog_name_en` | `program` | ✓ direct map |
| `sourceFilingId` | `ref_number` or `_id` | `id` | ✓ available |
| `sourceUrl` | construct | construct | Fed: `https://search.open.canada.ca/grants/record/{ref_number}` |

**Row counts:** Federal 1,275,521 + Alberta 1,986,676 = 3,262,197 total
**⚠️ Linking challenge:** Federal grants use `recipient_legal_name` (free text) and `recipient_business_number` (often null). Must fuzzy-match to Org vertices. AB grants use `recipient` (free text only, no BN). Golden records may help here.

### Edge: GIFTS_TO → `cra/cra_qualified_donees.jsonl`

| Graph Property | Source Field | Notes |
|---|---|---|
| `amount` | `total_gifts` | String, parseFloat |
| `fiscalYear` | derive from `fpe` | Extract year from filing period end |
| `sourceFilingId` | derive from `bn + fpe + donee_bn` | Composite key |
| `sourceUrl` | construct from `bn` | Same CRA URL pattern as SITS_ON |

**Row count:** 1,664,343
**Key fields:** `bn` (giver), `donee_bn` (receiver), `donee_name`, `total_gifts`, `gifts_in_kind`, `associated`

## Schema Mismatches & Flags for Agent A

### ⚠️ Mismatch 1: No Person ID in source data
The graph model expects `Person.id` but directors have no unique person identifier. Must generate from `(last_name, first_name)` or use entity resolution IDs from golden records. **Risk:** Name collisions (multiple "John Smith" are different people).

### ⚠️ Mismatch 2: Person.province not in directors file
Must join `cra_directors.bn` → `cra_identification.province` to get the org's province (not necessarily the director's province).

### ⚠️ Mismatch 3: Federal grants lack BN for many recipients
`recipient_business_number` is often null in `fed/grants_contributions.jsonl`. Linking federal grants to Org vertices requires fuzzy name matching or using `entity_source_links.jsonl` which maps entities to source records.

### ⚠️ Mismatch 4: AB grants have no BN at all
`ab/ab_grants.jsonl` has only `recipient` (free text name). Must use golden records or fuzzy matching to link to Org vertices.

### ⚠️ Mismatch 5: Amount fields are strings
All monetary values (`total_gifts`, `agreement_value`, `amount`) are strings, not numbers. ETL must parseFloat.

### ✅ Match: Golden records bridge the gap
`entity_golden_records.jsonl` already links entities across CRA, federal, and AB datasets with `entity_source_links.jsonl` providing the join keys. The ETL should use golden records as the entity backbone rather than building entity resolution from scratch.

## Pre-Aggregated Data (Shortcuts for ETL)

| File | Rows | Use |
|---|---|---|
| `cra/govt_funding_by_charity.jsonl` | 166,968 | Pre-computed federal/provincial/municipal funding per charity per year. Can populate `Org.totalFundingReceived` directly |
| `ab/ab_grants_recipients.jsonl` | 452,900 | Pre-aggregated AB grant totals per recipient |
| `cra/_dnq_canonical.jsonl` | ~50K | Canonical donee names with normalized forms |
| `cra/donee_name_quality.jsonl` | 439,867 | Name quality scores for donee matching |

## Lookup Tables

| File | Rows | Purpose |
|---|---|---|
| `cra/cra_category_lookup.jsonl` | ~30 | Charity category codes → names |
| `cra/cra_designation_lookup.jsonl` | ~5 | Designation codes (A=public, B=private, C=charitable org) |
| `cra/cra_province_state_lookup.jsonl` | ~70 | Province/state codes |
| `cra/cra_country_lookup.jsonl` | ~250 | Country codes |
| `cra/cra_program_type_lookup.jsonl` | ~5 | Program type codes |
| `cra/cra_sub_category_lookup.jsonl` | ~100 | Sub-category codes |
| `fed/agreement_type_lookup.jsonl` | ~3 | G=Grant, C=Contribution |
| `fed/province_lookup.jsonl` | ~15 | Province codes |
| `fed/recipient_type_lookup.jsonl` | ~10 | Recipient type codes |
| `fed/country_lookup.jsonl` | ~250 | Country codes |
| `fed/currency_lookup.jsonl` | ~50 | Currency codes |
| `ab/ab_grants_fiscal_years.jsonl` | ~30 | Fiscal year list |
| `ab/ab_grants_ministries.jsonl` | ~100 | Ministry names |
| `ab/ab_grants_programs.jsonl` | ~5K | Program names |
| `ab/ab_non_profit_status_lookup.jsonl` | ~10 | Non-profit status codes |

## Analysis Files (Pre-computed by organizers)

| File | Rows | Purpose |
|---|---|---|
| `cra/identified_hubs.jsonl` | ~30 | Pre-identified hub charities |
| `cra/johnson_cycles.jsonl` | ~5K | Circular gift-giving cycles |
| `cra/loops.jsonl` | ~7K | Gift loops between charities |
| `cra/loop_edges.jsonl` | ~30K | Edges in gift loops |
| `cra/loop_participants.jsonl` | ~15K | Charities participating in loops |
| `cra/loop_financials.jsonl` | ~5K | Financial data for loop participants |
| `cra/scc_components.jsonl` | ~5K | Strongly connected components |
| `cra/scc_summary.jsonl` | ~500 | SCC summary stats |
| `cra/partitioned_cycles.jsonl` | ~200 | Partitioned cycle analysis |
| `cra/matrix_census.jsonl` | ~10K | Census of gift matrix |
| `general/entity_resolution_log.jsonl` | 1,266,141 | Full resolution audit trail |
| `general/entity_merge_candidates.jsonl` | 1,643,060 | Candidate pairs for merging |
| `general/splink_predictions.jsonl` | 540,640 | Splink probabilistic matching results |
| `general/splink_build_metadata.jsonl` | 1 | Splink model metadata |
| `general/ministries.jsonl` | ~50 | Ministry reference data |
| `general/ministries_crosswalk.jsonl` | ~200 | Ministry name crosswalk |
| `general/ministries_history.jsonl` | ~100 | Ministry name changes over time |

## Recommended ETL Strategy for Agent A

1. **Use `entity_golden_records.jsonl` as the entity backbone** — 851K pre-resolved entities with aliases, cross-dataset profiles, and LLM verdicts. This replaces most of Task 6 (Bedrock entity resolution).

2. **Use `entity_source_links.jsonl` to join** — 5.16M links connecting golden record entity IDs to source records across CRA, federal, and AB datasets.

3. **Use `govt_funding_by_charity.jsonl` for funding aggregates** — Pre-computed federal/provincial/municipal totals per charity. Avoids re-aggregating 3.2M grant records.

4. **Directors still need deduplication** — Golden records cover orgs well but director names (Person vertices) may still need dedup. Consider grouping by `(last_name, first_name)` within the same `bn` first, then cross-org matching via golden records.

5. **Generate Person IDs** from golden record entity IDs where possible, falling back to hash of `(last_name, first_name)` for unresolved directors.
