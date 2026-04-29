"""CivicGraph findings queries — runs on Windows laptop with read-only S3 access."""
import json, csv, io, math, sys
from collections import defaultdict, Counter
import boto3

s3 = boto3.client('s3', region_name='us-west-2')
BUCKET = 'agency2026-team-2'

def select_jsonl(key, expr, limit=None):
    """Stream S3 Select results as dicts."""
    rows = []
    resp = s3.select_object_content(
        Bucket=BUCKET, Key=key,
        Expression=expr, ExpressionType='SQL',
        InputSerialization={'JSON': {'Type': 'LINES'}},
        OutputSerialization={'JSON': {}}
    )
    buf = b''
    for event in resp['Payload']:
        if 'Records' in event:
            buf += event['Records']['Payload']
    for line in buf.decode('utf-8').strip().split('\n'):
        if line:
            rows.append(json.loads(line))
            if limit and len(rows) >= limit:
                break
    return rows

def stream_full_jsonl(key, fields=None):
    """Download and parse full JSONL, optionally keeping only specified fields."""
    obj = s3.get_object(Bucket=BUCKET, Key=key)
    for line in obj['Body'].iter_lines():
        if line:
            rec = json.loads(line)
            if fields:
                yield {f: rec.get(f) for f in fields}
            else:
                yield rec

print("=" * 60)
print("Q1: Multi-board director count distribution")
print("=" * 60)

# Count distinct BNs per (last_name, first_name) from cra_directors
# Extract bn_root from full BN (first 9 chars) to count distinct orgs
director_orgs = defaultdict(set)
print("Streaming cra_directors.jsonl (2.87M rows)...")
count = 0
for rec in stream_full_jsonl('cra/cra_directors.jsonl', ['bn', 'last_name', 'first_name', 'position']):
    bn_root = rec['bn'][:9] if rec['bn'] else None
    name_key = (rec.get('last_name', ''), rec.get('first_name', ''))
    if bn_root and name_key[0]:
        director_orgs[name_key].add(bn_root)
    count += 1
    if count % 500000 == 0:
        print(f"  ...processed {count:,} rows, {len(director_orgs):,} unique directors")

print(f"\nTotal rows: {count:,}")
print(f"Unique director names: {len(director_orgs):,}")

# Distribution
board_counts = Counter()
for name, orgs in director_orgs.items():
    board_counts[len(orgs)] += 1

print("\nBoard count distribution:")
print(f"  {'Boards':>8} | {'Directors':>10} | {'Cumulative':>10}")
print(f"  {'-'*8}-+-{'-'*10}-+-{'-'*10}")
total = sum(board_counts.values())
cumul = 0
for n_boards in sorted(board_counts.keys()):
    n_dirs = board_counts[n_boards]
    cumul += n_dirs
    if n_boards <= 10 or n_boards % 5 == 0 or n_dirs > 100:
        print(f"  {n_boards:>8} | {n_dirs:>10,} | {cumul:>10,}")

# Top multi-board directors
multi = [(name, len(orgs)) for name, orgs in director_orgs.items() if len(orgs) >= 5]
multi.sort(key=lambda x: -x[1])
print(f"\nTop 30 multi-board directors (>= 5 boards):")
print(f"  {'Name':40} | {'Boards':>6}")
print(f"  {'-'*40}-+-{'-'*6}")
for (last, first), n in multi[:30]:
    print(f"  {last}, {(first or ''):30} | {n:>6}")

print(f"\nDirectors on 5+ boards: {len([x for x in multi if x[1] >= 5]):,}")
print(f"Directors on 10+ boards: {len([x for x in multi if x[1] >= 10]):,}")
print(f"Directors on 20+ boards: {len([x for x in multi if x[1] >= 20]):,}")

# Save for Q2
print("\n\nNow loading funding data for Q2...")

# Load govt funding by charity (pre-aggregated, only 167K rows)
print("Loading govt_funding_by_charity.jsonl...")
org_funding = defaultdict(float)  # bn_root -> total_govt
for rec in stream_full_jsonl('cra/govt_funding_by_charity.jsonl', ['bn', 'total_govt']):
    bn_root = rec['bn'][:9] if rec['bn'] else None
    try:
        amt = float(rec.get('total_govt', 0) or 0)
    except (ValueError, TypeError):
        amt = 0
    if bn_root:
        org_funding[bn_root] += amt

print(f"Loaded funding for {len(org_funding):,} orgs")

print("\n" + "=" * 60)
print("Q2: Top 50 directors by composite score")
print("    score = boards × log10(1 + totalFunding)")
print("=" * 60)

# Compute composite scores
scored = []
for name_key, orgs in director_orgs.items():
    boards = len(orgs)
    total_funding = sum(org_funding.get(bn_root, 0) for bn_root in orgs)
    if total_funding > 0:
        score = boards * math.log10(1 + total_funding)
        scored.append((name_key, boards, total_funding, score, orgs))

scored.sort(key=lambda x: -x[3])

print(f"\n{'Rank':>4} | {'Name':40} | {'Boards':>6} | {'Total Funding':>16} | {'Score':>8}")
print(f"{'-'*4}-+-{'-'*40}-+-{'-'*6}-+-{'-'*16}-+-{'-'*8}")
for i, (name_key, boards, funding, score, orgs) in enumerate(scored[:50], 1):
    last, first = name_key
    print(f"{i:>4} | {last}, {(first or ''):30} | {boards:>6} | ${funding:>14,.0f} | {score:>8.2f}")

# Save top 50 for later verification
top50 = scored[:50]

print("\n\n" + "=" * 60)
print("Q3: Cross-jurisdiction directors")
print("    Directors whose orgs receive BOTH federal AND provincial funding")
print("=" * 60)

# Load per-charity federal vs provincial breakdown
org_fed = defaultdict(float)
org_prov = defaultdict(float)
for rec in stream_full_jsonl('cra/govt_funding_by_charity.jsonl', ['bn', 'federal', 'provincial']):
    bn_root = rec['bn'][:9] if rec['bn'] else None
    if bn_root:
        try:
            org_fed[bn_root] += float(rec.get('federal', 0) or 0)
        except (ValueError, TypeError):
            pass
        try:
            org_prov[bn_root] += float(rec.get('provincial', 0) or 0)
        except (ValueError, TypeError):
            pass

# Find directors whose orgs span both federal and provincial funding
cross_juris = []
for name_key, orgs in director_orgs.items():
    has_fed = any(org_fed.get(bn, 0) > 0 for bn in orgs)
    has_prov = any(org_prov.get(bn, 0) > 0 for bn in orgs)
    if has_fed and has_prov and len(orgs) >= 2:
        fed_total = sum(org_fed.get(bn, 0) for bn in orgs)
        prov_total = sum(org_prov.get(bn, 0) for bn in orgs)
        cross_juris.append((name_key, len(orgs), fed_total, prov_total, fed_total + prov_total))

cross_juris.sort(key=lambda x: -x[4])

print(f"\nDirectors on 2+ boards with BOTH federal AND provincial funding: {len(cross_juris):,}")
print(f"\n{'Rank':>4} | {'Name':40} | {'Boards':>6} | {'Federal':>14} | {'Provincial':>14} | {'Total':>14}")
print(f"{'-'*4}-+-{'-'*40}-+-{'-'*6}-+-{'-'*14}-+-{'-'*14}-+-{'-'*14}")
for i, (name_key, boards, fed, prov, total) in enumerate(cross_juris[:30], 1):
    last, first = name_key
    print(f"{i:>4} | {last}, {(first or ''):30} | {boards:>6} | ${fed:>12,.0f} | ${prov:>12,.0f} | ${total:>12,.0f}")

print("\n\n" + "=" * 60)
print("Q4: Director-org concentration patterns")
print("    Orgs where a small number of directors control large funding")
print("=" * 60)

# Invert: for each org, count directors and total funding
org_directors = defaultdict(set)
for name_key, orgs in director_orgs.items():
    for bn in orgs:
        org_directors[bn].add(name_key)

# Find orgs with few directors but high funding
concentrated = []
for bn, directors in org_directors.items():
    funding = org_funding.get(bn, 0)
    if funding > 100000 and len(directors) <= 5:
        concentrated.append((bn, len(directors), funding))

concentrated.sort(key=lambda x: -x[2])

# Look up org names
print("Loading org names...")
org_names = {}
for rec in stream_full_jsonl('cra/cra_identification.jsonl', ['bn', 'legal_name']):
    bn_root = rec['bn'][:9] if rec['bn'] else None
    if bn_root and bn_root not in org_names:
        org_names[bn_root] = rec.get('legal_name', 'Unknown')

print(f"\nOrgs with <=5 directors and >$100K govt funding: {len(concentrated):,}")
print(f"\n{'Rank':>4} | {'Org Name':50} | {'BN':>11} | {'Directors':>9} | {'Govt Funding':>14}")
print(f"{'-'*4}-+-{'-'*50}-+-{'-'*11}-+-{'-'*9}-+-{'-'*14}")
for i, (bn, n_dirs, funding) in enumerate(concentrated[:30], 1):
    name = org_names.get(bn, 'Unknown')[:50]
    print(f"{i:>4} | {name:50} | {bn:>11} | {n_dirs:>9} | ${funding:>12,.0f}")

print("\n\nDone. Use these findings for docs/findings.md.")
