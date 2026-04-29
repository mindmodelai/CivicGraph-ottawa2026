# CivicGraph — Architecture

## What we're building

A web app where a user types a person's name and instantly sees every Canadian charity board that person serves on, plus every dollar of federal and Alberta public funding flowing to those boards. Built on 23M rows of open government data (CRA T3010, federal grants, AB grants).

## Two screens

**Screen 1 — Top 20.** Ranked list of named directors by composite score (board count × log10(1 + aggregate funding)). Each row: name, board count, total public funding. Clickable.

**Screen 2 — Person Detail.** Interactive Cytoscape force-directed graph. Center node = the person. Connected nodes = orgs they direct + government funders of those orgs. Edges show dollar amounts and source filings. Every fact has a clickable provenance chip. A one-paragraph AI-generated narrative summarizes the funding pattern in plain English.

## AWS architecture (us-west-2)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         AWS us-west-2                                │
│                                                                      │
│  ┌─────────────┐    ┌────────────┐    ┌──────────────────────────┐  │
│  │ AWS Amplify  │───►│ CloudFront │───►│ S3 (Next.js static)      │  │
│  └─────────────┘    └────────────┘    └──────────────────────────┘  │
│                                                                      │
│  LIVE PATH (per request)                                             │
│  ────────────────────                                                │
│  ┌──────────────────┐                                               │
│  │ API Gateway REST  │                                               │
│  └────────┬─────────┘                                               │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────┐     ┌──────────────────────────────┐   │
│  │ Lambda (Node 20 ARM64)  │────►│ Neptune Serverless (1–4 NCU) │   │
│  │  handlers/top.ts        │     │ openCypher queries            │   │
│  │  handlers/search.ts     │     └──────────────────────────────┘   │
│  │  handlers/person.ts     │                                        │
│  └────────┬────────────────┘     ┌──────────────────────────────┐   │
│           ├─────────────────────►│ Bedrock Sonnet 4.6            │   │
│           │                      │ • narrative gen (person.ts)    │   │
│           │                      │ • query understanding          │   │
│           │                      │   (search.ts, natural lang)   │   │
│           │                      └──────────────────────────────┘   │
│           │                                                          │
│           └─────────────────────►┌──────────────────────────────┐   │
│                                  │ S3 (cache/top.json)           │   │
│                                  └──────────────────────────────┘   │
│                                                                      │
│  OFFLINE PATH (one-time during build)                                │
│  ────────────────────────────────                                    │
│  ┌──────────────────────────────┐                                   │
│  │ s3://agency2026-team-2/      │ (organizer-provisioned data)      │
│  └────────────┬─────────────────┘                                   │
│               ▼                                                      │
│  ┌──────────────────────────────┐                                   │
│  │ data/scripts/etl.py          │ JSONL → Neptune bulk-load CSVs    │
│  │ (runs on RDP box)            │                                   │
│  └────────────┬─────────────────┘                                   │
│               ▼                                                      │
│  ┌──────────────────────────────┐                                   │
│  │ Neptune Bulk Loader          │                                   │
│  └────────────┬─────────────────┘                                   │
│               ▼                                                      │
│  ┌──────────────────────────────┐     ┌─────────────────────────┐   │
│  │ data/scripts/resolve.py      │────►│ Bedrock Sonnet 4.6      │   │
│  │ Entity resolution batch      │     │ (name similarity scoring)│   │
│  │ (runs on RDP box)            │     └─────────────────────────┘   │
│  └────────────┬─────────────────┘                                   │
│               ▼                                                      │
│  ┌──────────────────────────────┐                                   │
│  │ Top-20 pre-compute query     │──► s3://<staging>/cache/top.json  │
│  └──────────────────────────────┘                                   │
│                                                                      │
│  Tag: Project=civicgraph, AutoDelete=true on ALL resources           │
└──────────────────────────────────────────────────────────────────────┘
```

## Graph data model

### Vertices

| Label | Properties | Source |
|-------|-----------|--------|
| **Person** | `id`, `name`, `aliases[]`, `province`, `confidence`, `boards` (computed), `totalFunding` (computed) | CRA T3010 director filings, entity resolution |
| **Org** | `id`, `legalName`, `businessNumber`, `jurisdiction` ('federal'\|'AB'\|'other'), `totalFundingReceived` (computed) | CRA T3010 charity registrations |
| **GovEntity** | `id`, `name`, `level` ('federal'\|'provincial'), `department` | Federal grants metadata, AB grants metadata |

### Edges

| Label | From → To | Properties | Source |
|-------|-----------|-----------|--------|
| **SITS_ON** | Person → Org | `role`, `yearStart`, `yearEnd`, `sourceFilingId`, `sourceUrl` | CRA T3010 Schedule 2 |
| **FUNDED** | GovEntity → Org | `amount` (CAD), `fiscalYear`, `program`, `sourceFilingId`, `sourceUrl` | Federal proactive disclosure, AB grant records |
| **GIFTS_TO** | Org → Org | `amount` (CAD), `fiscalYear`, `sourceFilingId`, `sourceUrl` | CRA T3010 Schedule 2 (gifts between registered charities) |

## Service-by-service decisions

| Service | Choice | Justification |
|---------|--------|---------------|
| Compute | Lambda Node.js 20 ARM64 | Serverless, cheap, ~200ms cold start with ARM |
| API | API Gateway REST | CORS handling, throttling built-in, maps to 3 endpoints |
| Graph | Neptune Serverless 1–4 NCU | Auto-scales to near-zero; openCypher; bulk loader for fast ingest |
| AI (live) | Bedrock `us.anthropic.claude-sonnet-4-6` | Narrative generation on person detail; query understanding on search |
| AI (offline) | Bedrock `us.anthropic.claude-sonnet-4-6` | Entity resolution batch during ETL |
| Frontend | Next.js 14 static export | App Router + Tailwind + Cytoscape.js; no server runtime needed |
| Hosting | AWS Amplify | Auto-deploys from GitHub, built-in CloudFront CDN |
| IaC | CDK TypeScript | Same language as backend/frontend |
| Cache | S3 JSON files | Top-20 cached as JSON; no Redis needed |

## Data flow

### Offline (one-time, runs on RDP box)

1. **ETL (~10:30am):** `data/scripts/etl.py` reads JSONL from `s3://agency2026-team-2/`, transforms into Neptune bulk-load CSVs, uploads to staging bucket, triggers Neptune Bulk Loader.
2. **Entity resolution (~11:15am):** `data/scripts/resolve.py` queries all Person vertices, groups similar names (Levenshtein pre-filter), sends batches to Bedrock for confidence scoring. Merges vertices with confidence >= 0.7. Caches results by SHA256 in S3.
3. **Top-20 pre-compute (~11:45am):** openCypher query computes composite scores, writes top-20 to `s3://<staging>/cache/top.json`.

### Live (per request)

- `/api/top` → Lambda reads `cache/top.json` from S3 → returns TopResponse
- `/api/search?q=` → Lambda sends query to Bedrock for intent extraction → openCypher fuzzy search on Neptune → returns SearchResponse
- `/api/person/{id}` → Lambda runs 1-hop ego graph on Neptune + calls Bedrock for narrative generation → returns PersonDetailResponse with `narrative` field

## Failure modes and fallbacks

| Failure | Fallback |
|---------|----------|
| Neptune unreachable | Top-20 from S3 cache; person detail from pre-cached static JSON for demo heroes; search returns "unavailable" with top-20 as fallback |
| Bedrock throttled (live) | Return response without narrative field; UI shows "Summary unavailable" |
| Bedrock throttled (offline) | Cache by SHA256; failed batches keep records as separate Persons |
| Amplify deploy fails | Run `next dev` on RDP box as backup demo URL |
| Neptune bulk load slow | Fall back to DuckDB-in-Lambda querying JSONL directly from S3 |
