# CivicGraph — 5-Minute Demo Script

Read aloud. Timing marks in brackets. Short sentences. Breathe at paragraph breaks.

---

## [0:00–0:30] Open

Two named officers. One health authority. Two point one billion dollars in public funding over five years. That's it. Two people on the governance record.

We'll come back to Grand River Health in a moment. First — what CivicGraph is.

---

## [0:30–1:30] What it is

CivicGraph takes 23 million rows of Canadian open data and unifies them into a single queryable governance network.

Three datasets. CRA T3010 charity filings — that's every board director of every registered charity in Canada. Federal grants and contributions — proactive disclosure. And the Alberta grants ledger.

One question drives the whole thing: who controls the boards that receive public money?

We built a graph. People on one side. Organizations on the other. Edges for board seats. Edges for funding. Every edge traces back to its source filing.

Then we ran a composite score — board seats times the log of total funding — and surfaced the 20 most structurally interesting people in the dataset.

---

## [1:30–3:00] Live demo

Let me show you.

*[Click: open Screen 1 — Top 20 list]*

This is the landing page. Twenty ranked entries. Each row shows a name, how many boards they sit on, and the total public funding flowing to those boards.

*[Click: Grand River Health row]*

Grand River Health. Business number 107579823. Two point one three billion dollars, all provincial. And on the CRA filing? Two declared officers. Ron Gagnon, CEO. Doug Murray, CFO. That's it. No external board members on record.

For context — Parkland School Division, 673 million, four directors. Cape Breton-Victoria, 876 million, two directors. This is a pattern. Not an anomaly.

*[Click: back, then click Nalugwa, Victoria]*

Now breadth. Victoria Nalugwa. Fifty-five distinct charity boards in British Columbia. That's not a name collision — Nalugwa is unique in the dataset. One person, fifty-five governance seats. The organizations collectively received about a hundred thousand dollars. Small money per org, but remarkable reach.

*[Click: back, then click Yeates, Glenda]*

Now cross-jurisdiction. Glenda Yeates sits on three boards — Carleton University in Ontario, the Government of the Province of Alberta, and Canadian Blood Services. Those three organizations collectively received 573 million federal and 88 billion provincial. She bridges federal and provincial funding streams.

*[Click: provenance chip on one edge]*

Every number links to its source. That's a CRA public filing URL. One click to verify.

---

## [3:00–4:00] Architecture

How it works.

Neptune Serverless for the graph — openCypher queries, auto-scales to near-zero. Lambda handlers in Node for the API. Bedrock Claude Sonnet 4.6 for two things: live narrative generation on the person detail page, and query understanding in the search box.

The ETL runs once — reads JSONL from S3, transforms to Neptune bulk-load CSVs, loads in about ten minutes. The top-20 is pre-computed and cached as a JSON file in S3. Cold start to first pixel under two seconds.

Frontend is Next.js on Amplify. Cytoscape.js for the graph visualization. The whole stack is AWS-native, region-portable. Change one CDK constant and you're in ca-central-1.

---

## [4:00–4:45] What it's for

CivicGraph is a prioritization tool. Not an accusation engine.

It surfaces structural signals. Governance concentration — too few eyes on too much money. Breadth — one person on dozens of boards. Cross-jurisdiction bridging — the same directors appearing in both federal and provincial funding streams.

Every fact links to its source filing. No black boxes. No hallucinated claims.

---

## [4:45–5:00] Close

The offer is simple. Any government department, any newsroom, any auditor can deploy this in their own AWS perimeter. The data is already public. We just made it queryable.

Thank you.

---

*Total: ~5 minutes at conversational pace. Practice at least once with a timer.*
