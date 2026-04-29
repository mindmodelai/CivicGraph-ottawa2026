# CivicGraph — Findings

Analysis of `s3://agency2026-team-2/` source data. Queries run against `cra/cra_directors.jsonl` (2.87M rows), `cra/govt_funding_by_charity.jsonl` (167K rows), and `cra/cra_identification.jsonl` (422K rows).

**Caveat:** Name-based matching without entity resolution means common names (Smith, Brown, Tremblay) almost certainly aggregate multiple different people. The most defensible findings use uncommon names or structural patterns. The `general/entity_golden_records.jsonl` file contains pre-resolved entities that should be used for production-quality results.

---

## Top 3 Demo Findings

### Finding 1: Governance Concentration — $2.1B with 5 directors

**GRAND RIVER HEALTH** (BN 107579823) received **$2.13 billion** in government funding across all filing years, governed by only **5 directors** on record.

Other concentrated orgs:
- **Conseil Scolaire Catholique MonAvenir** (BN 870515996): $1.54B, 4 directors
- **Cape Breton-Victoria Regional Centre for Education** (BN 897171641): $876M, 2 directors
- **Parkland School Division No 70** (BN 140396748): $673M, 4 directors

**780 organizations** have 5 or fewer directors and over $100K in government funding. This is a structural pattern — not dependent on name matching — making it highly defensible.

Source: `cra/cra_directors.jsonl` (board membership), `cra/govt_funding_by_charity.jsonl` (funding totals).

### Finding 2: Victoria Nalugwa — 55 boards, one person

**NALUGWA, VICTORIA** appears on **55 distinct charity boards** in CRA T3010 filings. Unlike "SMITH, RICHARD" (104 boards, almost certainly multiple people), "Nalugwa" is an uncommon surname making this likely a single individual.

The organizations she directs collectively received **$103,575** in government funding — modest per-org, but the sheer breadth of board seats is notable. This is the kind of pattern CivicGraph is designed to surface: not an accusation, but a signal worth investigating.

For comparison:
- **Franken, Gary**: 43 boards, $15.1M in funding (composite score 308.74)
- **Terrio, Paul**: 42 boards, $1.3M in funding (composite score 256.29)
- **BINGHAM, MIKAEL**: 38 boards, $442K in funding (composite score 214.54)
- **BRITTON, SHEILA**: 45 boards (uncommon name, likely single person)

Source: `cra/cra_directors.jsonl`, matched by `(last_name, first_name)` across distinct `bn_root` values.

### Finding 3: Cross-jurisdiction funding networks — $80B+ flows

**75,971 directors** sit on 2+ boards that receive **both federal AND provincial** government funding. The top entries reveal directors connected to massive institutional funding:

- **YEATES, GLENDA**: 3 boards, $573M federal + $88.0B provincial = **$88.5B total**
- **FONG, ANGELA**: 4 boards, $255M federal + $84.6B provincial = **$84.8B total**
- **MINTZ, JACK**: 5 boards, $255M federal + $83.2B provincial = **$83.4B total**

The provincial funding figures ($80B+) indicate these directors sit on boards of very large institutions — likely universities, health authorities, or school boards that receive bulk provincial transfers. The pattern shows how a small number of governance actors bridge federal and provincial funding streams.

Source: `cra/govt_funding_by_charity.jsonl` (federal/provincial breakdown), `cra/cra_directors.jsonl` (board membership).

---

## Supporting Statistics

| Metric | Value |
|--------|-------|
| Total director filings | 2,873,624 |
| Unique director names | 899,925 |
| Directors on 5+ boards | 8,666 |
| Directors on 10+ boards | 1,271 |
| Directors on 20+ boards | 173 |
| Orgs with govt funding data | 43,404 |
| Cross-jurisdiction directors (2+ boards, fed+prov) | 75,971 |
| Concentrated orgs (<=5 directors, >$100K funding) | 780 |

## Name Collision Warning

The top composite scores are dominated by common names that are almost certainly aggregating multiple different people:

| Name | Boards | Total Funding | Likely Real? |
|------|--------|---------------|-------------|
| SMITH, RICHARD | 104 | $4.0B | No — name collision |
| GAGNON, RICHARD | 89 | $476M | No — name collision |
| SMITH, DAVID | 69 | $16.4B | No — name collision |
| Canada Trust | 116 | $2K | Corporate trustee, not a person |
| NALUGWA, VICTORIA | 55 | $104K | **Yes — uncommon name** |
| Franken, Gary | 43 | $15.1M | **Likely yes** |
| Terrio, Paul | 42 | $1.3M | **Likely yes** |
| BINGHAM, MIKAEL | 38 | $442K | **Likely yes — uncommon spelling** |

The entity resolution in `general/entity_golden_records.jsonl` should be used to disambiguate these in the production ETL.

## Query Reproduction

All queries can be reproduced by running:
```
python data/scripts/findings.py
```
Requires `boto3` and read access to `s3://agency2026-team-2/`.
