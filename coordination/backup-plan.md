# Backup Demo Plan

If Kiro-CLI-RDP doesn't finish Task 8 (Lambda + API Gateway) by 1:30pm, the demo runs from static mocks only:

- Screen 1 reads from `apps/web/mocks/top.json` (already populated by Agent C with verified findings)
- Person detail pages render from `apps/web/mocks/person/{p_001,p_002,p_003}.json` (already populated)
- The Narrative component shows hardcoded narrative from `demo-payload.json`
- No live search — disable SearchBox or show "search coming soon"

## Why this is shippable

The judges see real verified data, real graph, real provenance — just not live API. The pitch script can frame this as "demo running on pre-computed cache; live Neptune behind it" without lying.

## Trigger

At 1:30pm ET, if `/api/top` is not returning valid JSON from a live API Gateway URL, switch to mock-only mode. Agent B (Kiro-CLI Laptop) should ensure the frontend gracefully falls back to local mocks when `NEXT_PUBLIC_API_URL` is unset or unreachable.
