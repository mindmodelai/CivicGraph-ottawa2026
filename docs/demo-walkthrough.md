# Demo Walkthrough — Click-by-Click

For the operator on stage. Two columns: what to do, what to say.

## Before you start

- Open the live URL in Chrome (full screen, no bookmarks bar)
- If live URL is down, open `http://localhost:3000` (run `cd apps/web && npm run dev` beforehand)
- Have `data/exploration/demo-payload.json` open in a tab as emergency fallback reference
- Silence notifications. Close Slack.

---

## The Demo

| # | ACTION | SAY |
|---|--------|-----|
| 1 | Open browser. Navigate to Amplify URL (check `infra/demo-url.txt`). Screen 1 loads. | "Two named officers of a health authority that received $2.1 billion in public funding over five years. We'll come back to that." |
| 2 | Pause 3 seconds. Let the list render. | "First — what CivicGraph is." |
| 3 | Gesture at screen. Don't click yet. | "23 million rows of Canadian open data unified into a queryable governance network. CRA T3010 charity filings, federal grants, Alberta grants. One question: who controls the boards that receive public money?" |
| 4 | Point to the ranked list. | "We computed a composite score — board seats times the log of total funding — and surfaced the 20 most structurally interesting people in the dataset." |
| 5 | **Click: Grand River Health row** (or search "Grand River" if not in top 20). | "Grand River Health. Business number 107579823." |
| 6 | Wait for person detail + graph to load (~2s). | "$2.13 billion, all provincial. Two declared officers on the CRA filing. Ron Gagnon, CEO. Doug Murray, CFO. No external board members on record." |
| 7 | Point to the narrative paragraph below the graph. | "That narrative is generated live by Claude Sonnet 4.6 — it summarizes the funding pattern in plain English from the graph data." |
| 8 | **Click: a provenance chip** on any funding edge. | "Every number links to its source. That opens the CRA public filing. One click to verify." |
| 9 | **Click: browser back button.** Return to Top 20. | — |
| 10 | **Click: Nalugwa, Victoria row** (or search "Nalugwa"). | "Now breadth. Victoria Nalugwa. Fifty-five distinct charity boards in British Columbia." |
| 11 | Wait for graph to render. Point at the spread of nodes. | "That's not a name collision — Nalugwa is unique in the dataset. One person, 55 governance seats. The organizations collectively received about $100K." |
| 12 | **Click: browser back button.** Return to Top 20. | — |
| 13 | **Click: Yeates, Glenda row** (or search "Yeates"). | "Cross-jurisdiction. Glenda Yeates sits on three boards bridging federal and provincial funding streams." |
| 14 | Point to the graph edges showing dollar amounts. | "$573 million federal. $88 billion provincial. Carleton University, Government of Alberta, Canadian Blood Services." |
| 15 | **Click: browser back button.** | "That's the product. Let me show you how it works." |
| 16 | Switch to architecture slide (or just narrate). | "Neptune Serverless for the graph. Lambda for the API. Bedrock Sonnet 4.6 for live narrative and query understanding. Next.js on Amplify. Whole stack is AWS-native, region-portable." |
| 17 | Face the audience. | "This is a prioritization tool for journalists, auditors, policy researchers. Every fact links to its source filing. Any government department can deploy this in their own perimeter. The data is already public. We just made it queryable. Thank you." |

---

## Fallbacks

| Problem | Recovery |
|---------|----------|
| Amplify URL is down | Use localhost:3000 (pre-started) |
| Person detail graph doesn't load | Say "the live API is warming up" — navigate to a different person, retry |
| Narrative field is empty | Say "the AI summary is generating" — point to the graph instead, continue |
| Search doesn't return results | Use direct navigation from the top-20 list instead of search |
| Everything is down | Open `data/exploration/demo-payload.json` in browser, narrate from the JSON with "let me show you the data directly" |

---

## Timing check

Practice once with a timer. Target: 5 minutes total. If you're at 3:30 after the third person click, you're on pace.
