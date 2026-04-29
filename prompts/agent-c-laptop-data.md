# Agent C — Windows Laptop (Data Exploration + Findings)

You own: `data/exploration/`, `data/schema.md`, `docs/findings.md`

Read `prompts/standing-instructions.md` for commit protocol.

## Completed tasks

### Task 1: DONE — S3 data inventory + schema validation
- `data/schema.md` committed with full inventory of 63 files, schemas, row counts, 5 mismatches flagged
- Critical finding: `entity_golden_records.jsonl` has pre-resolved entities — Agent A notified

### Task 9: DONE — Killer findings + docs/findings.md
- `docs/findings.md` committed with 3 verified findings:
  1. Governance concentration — Grand River Health $2.1B with 5 directors
  2. Victoria Nalugwa — 55 boards, single person (uncommon name)
  3. Cross-jurisdiction funding networks — $80B+ flows
- `data/scripts/findings.py` committed for reproducibility

## Remaining work

Agent C's dedicated tasks are complete. Available to help with:
- Task 11: End-to-end verification + style polish (all agents)
- Task 12: README + demo rehearsal (all agents)
- Ad-hoc data queries if Agent A needs schema clarification
- Verifying findings against live API once deployed

## Data access

This laptop has read-only S3 access to `s3://agency2026-team-2/` via `WSParticipantRole`. Cannot invoke Bedrock or modify AWS resources — that's Agent A's job on the RDP box.
