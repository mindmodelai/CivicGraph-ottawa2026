# CivicGraph

**The governance network behind Canada's public funding.**

**Live Demo:** [https://main.dtb5pniv8a3tl.amplifyapp.com/](https://main.dtb5pniv8a3tl.amplifyapp.com/)

---

## What is CivicGraph?

CivicGraph turns 23 million rows of open Canadian government data into a queryable graph of the people and organizations behind every publicly-funded board. It answers one question: **who controls the boards that receive public money?**

This is a prioritization tool for journalists, auditors, and policy researchers — not an accusation engine. Every fact in the UI is one click away from its source filing.

## The Problem

Canadian public funding flows through thousands of registered charities, health authorities, school boards, and government entities. The governance records exist — CRA T3010 filings, federal grants disclosures, provincial grants ledgers — but they're scattered across separate datasets with no unified view of the people connecting them.

CivicGraph unifies these datasets into a single searchable graph, surfacing structural patterns that would take weeks to find manually:

- **Governance concentration** — too few eyes on too much public money
- **Board seat breadth** — single individuals on dozens of organizations
- **Cross-jurisdiction bridging** — directors connecting federal and provincial funding streams

## What it found

| Finding | Detail | Source |
|---------|--------|--------|
| Governance concentration | **Grand River Health** — $2.13B in provincial funding, 2 declared officers on record | CRA T3010 + govt_funding_by_charity |
| Breadth of reach | **Victoria Nalugwa** — 55 distinct charity boards in BC (unique name, single person) | CRA T3010 director filings |
| Cross-jurisdiction bridging | **Glenda Yeates** — 3 boards spanning $573M federal + $88B provincial | CRA T3010 + federal grants |

---

## How to Use

### Live Demo

Visit [https://main.dtb5pniv8a3tl.amplifyapp.com/](https://main.dtb5pniv8a3tl.amplifyapp.com/)

1. **Screen 1 — Top 20 List:** The landing page shows the 20 most structurally interesting governance entries, ranked by composite score (board seats x log of total funding). Click any row to explore.

2. **Screen 2 — Person Detail:** An interactive force-directed graph showing the person at center, connected to every organization they direct and every government funder of those organizations. Edges show dollar amounts. Provenance chips link to source filings. An AI-generated narrative summarizes the pattern in plain English.

3. **Search:** Type a name in the search box to find any person or organization in the dataset.

### Run Locally

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

## Data Sources

| Dataset | Records | What it provides |
|---------|---------|------------------|
| CRA T3010 director filings | 2.87M | Board membership (Person → Org) |
| CRA charity identification | 422K | Organization metadata |
| CRA govt funding by charity | 167K | Federal/provincial funding totals |
| Federal grants & contributions | 1.28M | FUNDED edges (federal) |
| Alberta grants ledger | 1.99M | FUNDED edges (provincial) |
| Entity golden records | 851K | Pre-resolved entities with aliases |

---

## Project Structure

```
apps/web/          Next.js frontend (Cytoscape.js graph, Tailwind)
apps/api/          Lambda handlers (top, search, person)
data/scripts/      ETL pipeline (Python)
data/exploration/  Analysis notebooks and demo payloads
docs/              Architecture, API contract, findings, demo script
infra/             CDK stacks and provisioning status
prompts/           Agent coordination files
```

## Team

Built by three AI agents coordinated through git:
- **Kiro-CLI-RDP** — AWS infrastructure, backend, ETL
- **Kiro-CLI Laptop** — Frontend (Next.js + Cytoscape)
- **Claude Code Laptop** — Data exploration, findings, coordination

Human operator: Samuel Hebeisen

---

## License

MIT
