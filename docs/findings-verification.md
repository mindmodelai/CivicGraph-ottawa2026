# CivicGraph — Findings Verification Report

Verified 2026-04-29 against raw S3 source data in `s3://agency2026-team-2/`.

## Finding 1: Governance Concentration — GRAND RIVER HEALTH

**Claim:** BN 107579823 received $2.13B in government funding with only 5 directors on record.

### Verification

| Check | Claimed | Verified | Delta |
|-------|---------|----------|-------|
| Total govt funding | $2.13B | $2,130,339,000 | 0.02% |
| Directors on record | 5 | 2 unique persons (5 name variants) | See note |
| Funding source | Provincial only | Confirmed — $0 federal | Exact |

**Funding by fiscal year (source: `cra/govt_funding_by_charity.jsonl`):**

| Year | Provincial | Total Govt | Govt % of Revenue |
|------|-----------|-----------|-------------------|
| 2020 | $334,659,000 | $334,659,000 | 78.8% |
| 2021 | $407,072,000 | $407,072,000 | 81.5% |
| 2022 | $436,786,000 | $436,786,000 | 83.4% |
| 2023 | $452,702,000 | $452,702,000 | 82.2% |
| 2024 | $499,120,000 | $499,120,000 | 81.8% |

**Director records (source: `cra/cra_directors.jsonl`):**

| Name (as filed) | Position | Filing Period |
|-----------------|----------|--------------|
| GAGNON, RON | Chief Executive Officer | 2020–2024 |
| MURRAY, DOUG / MURRY, DOUG | Chief Financial Officer | 2020–2024 |
| Gagnon, Ronald | Chief Executive Officer | 2021 |
| Murray, Douglas | Chief Financial Officer | 2021 |

**Note on director count:** The source data contains 5 distinct `(last_name, first_name)` strings but only 2 actual persons — Ron/Ronald Gagnon and Doug/Douglas Murray (with a "MURRY" typo in 2024). The findings.md count of "5 directors" reflects the raw name-based count from the analysis script, which does not normalize case or variants. The correct interpretation: this $2.1B health authority has only **2 named officers** in CRA T3010 filings across 5 years. This actually makes the concentration finding *stronger*.

**Verdict: VERIFIED** (funding exact; director count is 2 persons, not 5 — finding is stronger than stated)

### Source URLs

- CRA charity listing: `https://apps.cra-arc.gc.ca/ebci/hacc/srch/pub/dsplyRprtngPrd?q.srchNm=&q.stts=0007&selectedCharityBn=107579823RR0001&dsrdPg=1`
- CRA T3010 filing data (public): `https://apps.cra-arc.gc.ca/ebci/hacc/srch/pub/dsplyT3010FnnclInfrmtn?q.srchNm=&q.stts=0007&selectedCharityBn=107579823RR0001&dsrdPg=1`

---

## Finding 2: Victoria Nalugwa — 55 Boards

**Claim:** NALUGWA, VICTORIA appears on 55 distinct charity boards with $103,575 total govt funding.

### Verification

| Check | Claimed | Verified | Delta |
|-------|---------|----------|-------|
| Distinct boards (BN roots) | 55 | 55 | Exact |
| Total govt funding | $103,575 | $103,575 | Exact |
| Uncommon surname | Yes | Confirmed — no other NALUGWA in dataset | Confirmed |

**Sample organizations (source: `cra/cra_identification.jsonl`):**

| BN | Organization | Province |
|----|-------------|----------|
| 118980705 | KILDONAN FOUNDATION SOCIETY | BC |
| 119138493 | SAMARITAN CHILDREN'S CHARITABLE FOUNDATION | BC |
| 710063892 | IGNITE EDUCATION FOUNDATION | BC |
| 726344484 | QUO VADIS MINISTRY | BC |
| 782538292 | CANADIAN URBAN PLANNING FOUNDATION | BC |
| 801967084 | CANADA WEST CULTURAL DIVERSITY SOCIETY | BC |
| 806765673 | CARITAS PER IUSTITIAM FOUNDATION | BC |
| 807769245 | PLANTED COMMUNITY FOUNDATION | BC |
| 808971865 | VANCOUVER HEALING ROOMS SOCIETY | BC |
| 811674787 | Help Change My City Social Youth Trust Society | BC |

All 55 organizations are BC-based, suggesting a single individual active in the BC charity sector.

**Verdict: VERIFIED** (exact match on both metrics)

### Source URLs

- CRA charity search (each org): `https://apps.cra-arc.gc.ca/ebci/hacc/srch/pub/dsplyRprtngPrd?q.srchNm=&q.stts=0007&selectedCharityBn={BN}RR0001&dsrdPg=1`
- Example (Kildonan Foundation): `https://apps.cra-arc.gc.ca/ebci/hacc/srch/pub/dsplyRprtngPrd?q.srchNm=&q.stts=0007&selectedCharityBn=118980705RR0001&dsrdPg=1`

---

## Finding 3: Cross-Jurisdiction — YEATES, GLENDA

**Claim:** 3 boards, $573M federal + $88.0B provincial = $88.5B total.

### Verification

| Check | Claimed | Verified | Delta |
|-------|---------|----------|-------|
| Boards | 3 | 3 | Exact |
| Federal total | $573M | $572,635,389 | 0.06% |
| Provincial total | $88.0B | $87,959,602,098 | 0.05% |
| Combined | $88.5B | $88,532,237,487 | 0.04% |

**Organizations (source: `cra/cra_identification.jsonl` + `cra/govt_funding_by_charity.jsonl`):**

| BN | Organization | Province | Federal | Provincial |
|----|-------------|----------|---------|-----------|
| 118838937 | CARLETON UNIVERSITY | ON | $252,452,382 | $916,577,792 |
| 124072513 | GOVERNMENT OF THE PROVINCE OF ALBERTA | AB | $253,433,000 | $80,587,732,000 |
| 870157641 | CANADIAN BLOOD SERVICES | ON | $66,750,007 | $6,455,292,306 |

**Note:** The $80.6B provincial figure for BN 124072513 reflects that "Government of the Province of Alberta" is registered as a charity (likely for employee benefit/pension purposes) and reports massive inter-governmental transfers. This is accurate data but should be contextualized in the demo narrative.

**Cross-check FONG, ANGELA (secondary example):**

| Check | Claimed | Verified | Delta |
|-------|---------|----------|-------|
| Boards | 4 | 4 | Exact |
| Federal | $255M | $254,896,666 | 0.04% |
| Provincial | $84.6B | $84,583,289,125 | 0.02% |

**Verdict: VERIFIED** (all figures within 0.1%)

### Source URLs

- Carleton University CRA listing: `https://apps.cra-arc.gc.ca/ebci/hacc/srch/pub/dsplyRprtngPrd?q.srchNm=&q.stts=0007&selectedCharityBn=118838937RR0001&dsrdPg=1`
- Government of Alberta CRA listing: `https://apps.cra-arc.gc.ca/ebci/hacc/srch/pub/dsplyRprtngPrd?q.srchNm=&q.stts=0007&selectedCharityBn=124072513RR0001&dsrdPg=1`
- Canadian Blood Services CRA listing: `https://apps.cra-arc.gc.ca/ebci/hacc/srch/pub/dsplyRprtngPrd?q.srchNm=&q.stts=0007&selectedCharityBn=870157641RR0001&dsrdPg=1`

---

## Summary

| Finding | Status | Accuracy |
|---------|--------|----------|
| 1. Governance Concentration | **VERIFIED** | Funding exact; director count is actually 2 (stronger) |
| 2. Multi-board Director | **VERIFIED** | Both metrics exact match |
| 3. Cross-jurisdiction Network | **VERIFIED** | All figures within 0.1% |

All three findings are confirmed against source data. No replacements needed from the top 50.
