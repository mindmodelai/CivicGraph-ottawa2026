# CivicGraph

**The governance network behind Canada's public funding.**

CivicGraph turns 23 million rows of open Canadian government data into a queryable graph of the people and organizations behind every publicly-funded board. Search a name, see every charity board that person serves on, and trace every federal and Alberta dollar that has flowed to those boards.

Built for the Agency 2026 Ottawa hackathon (April 29, 2026).

---

## What it found

| Finding | Detail | Source |
|---------|--------|--------|
| Governance concentration | **Grand River Health** — $2.13B in provincial funding, 2 declared officers on record | CRA T3010 + govt_funding_by_charity |
| Breadth of reach | **Victoria Nalugwa** — 55 distinct charity boards in BC (unique name, single person) | CRA T3010 director filings |
| Cross-jurisdiction bridging | **Glenda Yeates** — 3 boards spanning $573M federal + $88B provincial | CRA T3010 + federal grants |

Every fact links to its public source filing. CivicGraph is a prioritization tool, not an accusation engine.

---

## Architecture

```
                          ┌─────────────────────────────────┐
                          │         AWS us-west-2           │
                          │                                 │
  Browser ──► Amplify ──► │  Next.js 14 (static export)    │
                          │                                 │
  Browser ──► API GW ───► │  Lambda (Node 20, ARM64)       │
                          │    ├── /api/top      → S3 cache │
                          │    ├── /api/search   → Bedrock + Neptune
                          │    └── /api/person/  → Neptune + Bedrock
                          │                                 │
                          │  Neptune Serverless (1–8 NCU)   │
                          │    openCypher graph queries     │
                          │                                 │
                          │  Bedrock Claude Sonnet 4.6      │
                          │    live narrative generation    │
                          │    query understanding          │
                          └─────────────────────────────────┘
```

**Data model:** Person → SITS_ON → Org ← FUNDED ← GovEntity. Edges carry dollar amounts, fiscal years, and source filing IDs.

---

## Data sources

| Dataset | Records | What it provides |
|---------|---------|------------------|
| CRA T3010 director filings | 2.87M | Board membership (Person → Org) |
| CRA charity identification | 422K | Organization metadata |
| CRA govt funding by charity | 167K | Federal/provincial funding totals |
| Federal grants & contributions | 1.28M | FUNDED edges (federal) |
| Alberta grants ledger | 1.99M | FUNDED edges (provincial) |
| Entity golden records | 851K | Pre-resolved entities with aliases |

All data sourced from `s3://agency2026-team-2/` (hackathon-provisioned bucket).

---

## Run locally

```bash
# Frontend
cd apps/web
npm install
npm run dev
# → http://localhost:3000 (renders with mock data by default)

# Point at live API (once deployed)
echo "NEXT_PUBLIC_API_URL=https://<api-id>.execute-api.us-west-2.amazonaws.com" > .env.local
npm run dev
```

Requires Node 20+.

---

## Project structure

```
apps/web/          Next.js frontend (Cytoscape.js graph, Tailwind)
apps/api/          Lambda handlers (top, search, person)
data/scripts/      ETL pipeline (Python)
data/exploration/  Analysis notebooks and demo payloads
docs/              Architecture, API contract, findings, demo script
infra/             CDK stacks and provisioning status
prompts/           Agent coordination files
```

---

## Team

Built by three AI agents coordinated through git:
- **Kiro-CLI-RDP** — AWS infrastructure, backend, ETL
- **Kiro-CLI Laptop** — Frontend (Next.js + Cytoscape)
- **Claude Code Laptop** — Data exploration, findings, coordination

Human operator: Samuel Hebeisen

---

## License

MIT
