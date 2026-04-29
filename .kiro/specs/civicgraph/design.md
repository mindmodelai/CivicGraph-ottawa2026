# CivicGraph — Design Specification

## 1. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                        AWS us-west-2                                │
│                                                                     │
│   ┌─────────────┐     ┌────────────┐     ┌─────────────────────┐  │
│   │ AWS Amplify  │────►│ CloudFront │────►│ S3 (Next.js static) │  │
│   └─────────────┘     └────────────┘     └─────────────────────┘  │
│          │                                                          │
│          │ HTTPS                                                    │
│          ▼                                                          │
│   ┌──────────────────┐                                             │
│   │ API Gateway REST │                                             │
│   └────────┬─────────┘                                             │
│            │                                                        │
│            ▼                                                        │
│   ┌────────────────────────┐                                       │
│   │ Lambda (Node 20 ARM64) │                                       │
│   │  handlers/top.ts       │                                       │
│   │  handlers/search.ts    │                                       │
│   │  handlers/person.ts    │                                       │
│   │  handlers/org.ts       │                                       │
│   └────────┬───────────────┘                                       │
│            │                                                        │
│       ┌────┼──────────────┐                                        │
│       │    │              │                                         │
│       ▼    ▼              ▼                                         │
│   ┌────────────┐  ┌───────────┐  ┌───────────────────────────┐    │
│   │  Neptune   │  │  Bedrock  │  │ S3 (cache + provenance)   │    │
│   │ Serverless │  │ Sonnet4.6 │  │ s3://<staging>/cache/     │    │
│   │ 1-4 NCU   │  │           │  │ s3://agency2026-team-2/   │    │
│   │ openCypher │  │           │  └───────────────────────────┘    │
│   └────────────┘  └───────────┘                                    │
│                                                                     │
│   Tag: Project=civicgraph on ALL resources                         │
└────────────────────────────────────────────────────────────────────┘
```

## 2. Graph Data Model

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

### Index Strategy
- Neptune full-text search index on `Person.name` and `Person.aliases` for fuzzy search
- Property index on `Person.id`, `Org.id`, `GovEntity.id` for O(1) lookups

## 3. Service-by-Service Decisions

| Service | Choice | Justification |
|---------|--------|---------------|
| Compute | Lambda Node.js 20 ARM64 | Serverless, cheap, ~200ms cold start with ARM, matches frontend language |
| API | API Gateway REST | CORS handling, WAF-ready, throttling built-in, maps cleanly to 4 endpoints |
| Graph | Neptune Serverless 1–4 NCU | Auto-scales to near-zero when idle; openCypher for readable queries; bulk loader for fast ingest |
| AI | Bedrock `us.anthropic.claude-sonnet-4-6` | Verified working in sandbox; used offline for entity resolution batch, not in hot path |
| Frontend | Next.js 14 static export | App Router + Tailwind + Cytoscape.js; static export means no server runtime needed |
| Hosting | AWS Amplify | Auto-deploys from GitHub, free tier sufficient, built-in CloudFront CDN |
| IaC | CDK TypeScript | Same language as backend/frontend; Kiro generates CDK constructs natively |
| Cache | S3 JSON files | Top-20 cached as JSON; person detail pre-cached for demo heroes; no Redis needed |

## 4. Data Flow

### 4.1 Ingest (One-time, ~10:00am)
```
s3://agency2026-team-2/*.jsonl
       │
       ▼
data/scripts/etl.py (Python, runs on RDP)
       │ Reads JSONL, normalizes schema
       │ Outputs Gremlin bulk-load CSVs:
       │   - vertices_person.csv
       │   - vertices_org.csv
       │   - vertices_gov.csv
       │   - edges_sits_on.csv
       │   - edges_funded.csv
       │   - edges_gifts_to.csv
       ▼
s3://<staging>/bulk-load/
       │
       ▼
Neptune Bulk Loader API (POST /loader)
       │
       ▼
Neptune cluster: civicgraph-graph
```

### 4.2 Entity Resolution (One-time, ~11:00am)
```
Neptune: SELECT all Person vertices
       │
       ▼
data/scripts/resolve.py
       │ Groups by similar names (Levenshtein pre-filter)
       │ Sends batches to Bedrock Sonnet 4.6
       │ Prompt: "Are these the same person? Confidence 0-1."
       │ Cache: SHA256(input_batch) → S3 results
       ▼
confidence >= 0.7 → MERGE vertices (keep canonical name, store aliases[])
confidence <  0.7 → KEEP SEPARATE (precision over recall)
       │
       ▼
Neptune: UPDATE Person.aliases, Person.confidence
```

### 4.3 Top-20 Pre-Compute (One-time, ~12:00pm)
```
Neptune openCypher:
  MATCH (p:Person)-[:SITS_ON]->(o:Org)<-[:FUNDED]-(g:GovEntity)
  WITH p, count(DISTINCT o) AS boards, sum(funding) AS totalFunding
  WITH p, boards, totalFunding, boards * log10(1 + totalFunding) AS score
  ORDER BY score DESC LIMIT 20
  RETURN p.id, p.name, p.province, boards, totalFunding, score
       │
       ▼
s3://<staging>/cache/top.json (TopResponse shape)
```

### 4.4 Live Queries (Per Request)
```
Client → API Gateway → Lambda
       │
       ├─ /api/top     → S3 GetObject (cache/top.json) → return
       ├─ /api/search  → Neptune full-text search → return top 20
       ├─ /api/person/{id} → Neptune 1-hop ego graph → return
       └─ /api/org/{id}   → Neptune 1-hop ego graph → return
```

## 5. Failure Modes and Fallbacks

| Failure | Detection | Fallback | User Experience |
|---------|-----------|----------|-----------------|
| Neptune unreachable | Lambda timeout or connection refused | Serve top-20 from S3 cache; person detail from pre-cached static JSON for demo heroes; search returns "unavailable" message | Landing page works; detail works for top-3 demo persons; search shows graceful error |
| Bedrock throttled | 429/ThrottlingException | Cache by SHA256 of input batch; failed batches keep records as separate Persons | Lower merge rate but no data loss; UI shows more name variants |
| Amplify deploy fails | Deploy status ≠ SUCCEED | Run `next dev` on RDP box, expose via CloudFront origin or direct URL | Demo URL changes but app is accessible |
| Neptune bulk load slow | Loader status LOAD_IN_PROGRESS past 11:30am | Fall back to DuckDB-in-Lambda querying JSONL directly from S3 | Same API shape, slower queries but functional |
| Lambda cold start | First-request latency > 3s | Provisioned concurrency (1) on search handler if budget allows; otherwise accept first-hit penalty | First user waits ~1s extra; subsequent requests fast |

## 6. Frontend Component Breakdown (`apps/web/`)

```
apps/web/
├── app/
│   ├── layout.tsx          # Root layout: Inter font, Tailwind globals, nav header
│   ├── page.tsx            # Screen 1: Top-20 ranked list
│   └── person/
│       └── [id]/
│           └── page.tsx    # Screen 2: Person detail with graph
├── components/
│   ├── SearchBox.tsx       # Autofocused search input, debounced, keyboard-navigable results dropdown
│   ├── GraphView.tsx       # Cytoscape canvas: cose-bilkent layout, hover tooltips, click navigation
│   ├── ProvenanceChip.tsx  # Small badge linking to source filing URL
│   ├── PersonRow.tsx       # Single row in top-20 list (name, boards, funding, score)
│   ├── NodeTooltip.tsx     # Hover tooltip on graph nodes (name, type, funding)
│   └── ErrorBoundary.tsx   # Graceful fallback for component failures
├── lib/
│   ├── api.ts              # Fetch wrapper: NEXT_PUBLIC_API_URL prefix, error handling
│   ├── types.ts            # Re-export of shared TypeScript types from API contract
│   └── format.ts           # Number formatting (CAD currency), date formatting
├── mocks/
│   ├── top.json            # Mock TopResponse
│   └── person/
│       └── p_001.json      # Mock PersonDetailResponse
└── public/
    └── favicon.ico
```

### Component Responsibilities

| Component | Props/State | Key Behavior |
|-----------|-------------|--------------|
| `page.tsx` (root) | Fetches TopResponse on mount | Renders SearchBox + PersonRow list; handles loading/error states |
| `page.tsx` (person) | Fetches PersonDetailResponse by `id` param | Passes graph data to GraphView, provenance to chip list |
| `SearchBox` | `onSelect(id)` callback | Debounce 300ms, fetch `/api/search?q=`, dropdown with keyboard nav |
| `GraphView` | `nodes: GraphNode[], edges: GraphEdge[]` | Cytoscape init, cose-bilkent layout, tap handlers, responsive resize |
| `ProvenanceChip` | `record: ProvenanceRecord` | Renders type icon + short label, opens `url` in new tab on click/Enter |
| `PersonRow` | `person: RankedPerson, rank: number` | Displays rank, name, boards count, formatted funding, score badge |

## 7. Backend Handler List (`apps/api/`)

```
apps/api/
├── handlers/
│   ├── top.ts              # GET /api/top — reads from S3 cache, falls back to live Neptune query
│   ├── search.ts           # GET /api/search — Neptune full-text search with fuzzy matching
│   ├── person.ts           # GET /api/person/{id} — Neptune 1-hop ego graph for a person
│   └── org.ts              # GET /api/org/{id} — Neptune 1-hop ego graph for an org
├── lib/
│   ├── neptune.ts          # Neptune HTTPS client with SigV4 signing (aws4 package)
│   ├── bedrock.ts          # Bedrock InvokeModel client (used by resolve script, not live API)
│   ├── s3.ts               # S3 GetObject/PutObject for cache reads/writes
│   └── types.ts            # Shared types (re-exported from docs/api-contract types)
└── package.json
```

### Handler Logic Summary

| Handler | Input | Neptune Query Pattern | Fallback |
|---------|-------|----------------------|----------|
| `top.ts` | `?n=20` (optional) | N/A — reads S3 `cache/top.json` | Return stale cache (never fails if cache exists) |
| `search.ts` | `?q=string` | `MATCH (p:Person) WHERE p.name CONTAINS $q OR any(a IN p.aliases WHERE a CONTAINS $q) RETURN p LIMIT 20` | Return empty results with error message |
| `person.ts` | `/{id}` path param | `MATCH (p:Person {id: $id})-[r:SITS_ON]->(o:Org)<-[f:FUNDED]-(g:GovEntity) RETURN p, r, o, f, g` | Return pre-cached JSON if available |
| `org.ts` | `/{id}` path param | `MATCH (o:Org {id: $id})<-[r:SITS_ON]-(p:Person), (o)<-[f:FUNDED]-(g:GovEntity) RETURN o, r, p, f, g` | Return pre-cached JSON if available |
