# CivicGraph — Requirements Specification

## 1. Functional Requirements (EARS Notation)

### FR-1: Search by Name
**Event:** The user submits a search query containing a person's name.
**Action:** The system performs fuzzy matching against all Person vertices in the graph store.
**Response:** The system returns up to 20 ranked PersonSummary results.
**Stimulus:** GET `/api/search?q={string}` invoked from the SearchBox component.

### FR-2: Top-20 Landing Page
**Event:** The user navigates to the root URL (`/`).
**Action:** The system retrieves the pre-computed ranked list from cached S3 JSON (or live Neptune query as fallback).
**Response:** The system renders a ranked list of 20 RankedPerson entries, each showing name, board count, total public funding (CAD), and composite score.
**Stimulus:** Page load triggers GET `/api/top?n=20`.

### FR-3: Person Detail with Graph
**Event:** The user clicks a person row on the landing page or navigates to `/person/{id}`.
**Action:** The system queries Neptune for the 1-hop ego graph (Person → Orgs via SITS_ON, GovEntities → Orgs via FUNDED/GIFTS_TO).
**Response:** The system renders an interactive Cytoscape force-directed graph (cose-bilkent layout) with the person as center node, connected org nodes sized by funding, and government funder nodes.
**Stimulus:** GET `/api/person/{id}` returns PersonDetailResponse.

### FR-4: Provenance Links
**Event:** The user views any fact (edge amount, board membership, funding record) in the UI.
**Action:** The system surfaces a ProvenanceChip component linked to the original public filing.
**Response:** Clicking the chip opens the source URL (CRA T3010 filing, federal grant record, or AB grant record) in a new tab.
**Stimulus:** ProvenanceRecord.url from the API response.

### FR-5: Entity Resolution via Bedrock
**Event:** The ETL pipeline encounters director name variants across filings (e.g., "J. Smith" vs "Jane Smith" vs "SMITH, JANE").
**Action:** The system invokes Bedrock Claude Sonnet 4.6 (`us.anthropic.claude-sonnet-4-6`) with batched name pairs for semantic similarity scoring.
**Response:** Name variants with confidence >= 0.7 are merged into a single Person vertex with `aliases[]` property. Variants below threshold remain as separate Person vertices.
**Stimulus:** Batch entity resolution script (`data/scripts/resolve.py`) executed during Phase 2 ingest.

### FR-6: Org Detail Page
**Event:** The user clicks an org node in the graph or navigates to `/org/{id}` (stretch goal).
**Action:** The system queries Neptune for the org's ego graph (directors via SITS_ON, funders via FUNDED/GIFTS_TO).
**Response:** The system renders an OrgDetailResponse with graph and provenance.
**Stimulus:** GET `/api/org/{id}`.

### FR-7: Composite Score Ranking
**Event:** The top-20 pre-compute job executes.
**Action:** The system calculates `compositeScore = boards * log10(1 + totalFunding)` for every Person vertex.
**Response:** The top 20 persons by compositeScore are written to `s3://<staging>/cache/top.json`.
**Stimulus:** Scheduled pre-compute (one-time during build, refreshable).

## 2. Non-Functional Requirements

### NFR-1: Search Latency
**Requirement:** Search endpoint returns results in < 2 seconds at p95.
**Measure:** API Gateway latency metric on GET `/api/search`.
**Rationale:** Users expect near-instant search for a demo application.

### NFR-2: Landing Page Render Time
**Requirement:** Top-20 page renders (LCP) in < 2 seconds on a broadband connection.
**Measure:** Lighthouse LCP metric; S3-cached response eliminates cold Neptune queries.
**Rationale:** First impression for judges; cached JSON makes this achievable.

### NFR-3: Graph Render Time
**Requirement:** Person detail page (Cytoscape graph) renders within 3 seconds at p95.
**Measure:** Time from navigation to Cytoscape `layoutstop` event.
**Rationale:** Ego graphs are bounded (1-hop, typically <50 nodes); cose-bilkent is fast for this size.

### NFR-4: Cost Ceiling
**Requirement:** Total AWS spend for the hackathon day must not exceed $50 USD.
**Measure:** AWS Cost Explorer, billing alerts at $25 and $40.
**Rationale:** Workshop Studio sandbox has credits but the team sets a responsible ceiling.
**Controls:** Neptune Serverless 1–4 NCU (auto-scales to zero), Lambda pay-per-invocation, Bedrock pay-per-token (entity resolution is a bounded batch).

### NFR-5: Accessibility
**Requirement:** All interactive elements must be keyboard-navigable (Tab, Enter, Escape). WCAG 2.1 Level A minimum.
**Measure:** Manual keyboard walkthrough of both screens; no focus traps.
**Details:**
- Search box: autofocused on load, Enter submits
- Results list: arrow keys navigate rows, Enter opens detail
- Graph: Tab cycles through nodes, Enter selects, Escape returns to list
- Provenance chips: focusable, Enter opens link

### NFR-6: Degraded Mode (Neptune Unreachable)
**Requirement:** If Neptune is unreachable, the system serves a degraded but functional view.
**Measure:** Top-20 page loads from S3 cache; person detail pages for pre-cached demo persons load from static JSON; search returns a "temporarily unavailable" message with the top-20 as fallback.
**Rationale:** Demo must work even if Neptune cold-starts slowly or hits capacity.

### NFR-7: AWS Resource Tagging
**Requirement:** All AWS resources must be deployed in us-west-2 with tag `Project=civicgraph`.
**Measure:** CDK Aspects apply the tag to all constructs; `aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=civicgraph` returns all resources.

### NFR-8: Data Integrity
**Requirement:** Every fact displayed in the UI must be traceable to a specific source filing.
**Measure:** Every GraphEdge includes `sourceFilingId` and `sourceUrl`; ProvenanceChip renders for each.
**Rationale:** "We surface concentration, not accusations" — provenance is the trust mechanism.

### NFR-9: Region Constraint
**Requirement:** All resources deploy to us-west-2 (demo). Architecture must be portable to ca-central-1 (production) via a single CDK constant change.
**Measure:** Region is parameterized in `infra/bin/app.ts`.

### NFR-10: Security
**Requirement:** No long-term IAM access keys. Lambda uses execution role with least-privilege policies. Neptune accessed via SigV4-signed HTTPS. No secrets in source code.
**Measure:** CDK generates IAM policies; no `.env` files with credentials committed.
