# CivicGraph — Requirements

## US-1: Find a person
As a journalist, I can type a name in the search box and see up to 20 matching directors with their canonical names, board count, and total public funding received.

Acceptance: Search returns within 2 seconds for any common name in the dataset. Results show source filings.

## US-2: See the top 20
As a citizen visiting the homepage, I see a ranked list of 20 named directors, sorted by composite score (boards × log10(1 + funding)), with each row showing name, board count, total funding, and a clickable link to detail.

Acceptance: Top-20 loads within 2 seconds (cached). Every name is real and verifiable against a CRA T3010 filing.

## US-3: Explore a person's network
As a researcher clicking a director's name, I see an interactive Cytoscape graph showing every charity board they direct and every government funder of those boards, with edge weights representing dollar amounts.

Acceptance: Graph renders within 3 seconds. Nodes are draggable. Hover shows funding amounts and years.

## US-4: Trace any fact to its source
As an auditor, every dollar amount and board membership in the UI has a clickable provenance chip that opens the source filing (CRA T3010 schedule, federal grant record, or Alberta grant record) in a new tab.

Acceptance: 100% of facts in the UI link to a real public source URL.

## US-5: Read the AI-generated context
As a non-technical user, the person detail page shows a one-paragraph plain-English summary of the funding pattern (generated live by Claude Sonnet 4.6 via Bedrock).

Acceptance: Summary loads within 5 seconds of clicking a person. Reads as a neutral observation, not an accusation.

## Non-Functional Requirements

### NFR-1: Cost ceiling
Total AWS spend for the hackathon must not exceed $50 USD. Billing alerts at $25 and $40.

### NFR-2: Degraded mode
If Neptune is unreachable, the top-20 page loads from S3 cache. Person detail for pre-cached demo persons loads from static JSON. Search returns "temporarily unavailable" with top-20 as fallback.

### NFR-3: Provenance traceability
Every fact displayed in the UI (dollar amount, board membership, funding record) must be traceable to a specific source filing via `sourceFilingId` and `sourceUrl` on every graph edge.

### NFR-4: Resource tagging
All AWS resources tagged `Project=civicgraph`, `AutoDelete=true`. Region: us-west-2. Architecture portable to ca-central-1 via a single CDK constant.

### NFR-5: Security
No long-term IAM access keys. Lambda uses execution role with least-privilege. Neptune accessed via SigV4-signed HTTPS. No secrets in source code.
