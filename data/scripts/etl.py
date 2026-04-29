#!/usr/bin/env python3
"""ETL: JSONL from S3 → Neptune openCypher bulk-load CSVs → upload to staging bucket."""

import csv
import hashlib
import io
import json
import os
import sys
import tempfile
from collections import defaultdict

import boto3

REGION = "us-west-2"
SOURCE_BUCKET = "agency2026-team-2"
STAGING_BUCKET = "civicgraph-staging-006193923397-us-west-2"
NEPTUNE_ENDPOINT = "civicgraph-graph.cluster-c5qoqo2omjl2.us-west-2.neptune.amazonaws.com"
NEPTUNE_PORT = 8182
LOADER_ROLE = "arn:aws:iam::006193923397:role/civicgraph-neptune-loader-role"

s3 = boto3.client("s3", region_name=REGION)


def stream_jsonl(key):
    """Stream JSONL from S3 line by line."""
    resp = s3.get_object(Bucket=SOURCE_BUCKET, Key=key)
    for line in resp["Body"].iter_lines():
        if line:
            yield json.loads(line)


def safe_str(v):
    """Escape a value for CSV: replace newlines, handle None."""
    if v is None:
        return ""
    return str(v).replace("\n", " ").replace("\r", "")


def parse_float(v):
    """Parse a string/number to float, return 0.0 on failure."""
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def extract_year(iso_str):
    """Extract year from ISO date string."""
    if not iso_str:
        return ""
    return str(iso_str)[:4]


def bn_root(bn):
    """Extract root BN (9 digits) from full BN like 831282512RR0001."""
    if not bn:
        return ""
    return bn[:9] if len(bn) >= 9 else bn


def person_id(last_name, first_name):
    """Generate a stable person ID from name."""
    key = f"{(last_name or '').strip().upper()}|{(first_name or '').strip().upper()}"
    return "p_" + hashlib.sha256(key.encode()).hexdigest()[:12]


def upload_csv(local_path, s3_key):
    """Upload a local file to the staging bucket."""
    print(f"  Uploading {s3_key} ({os.path.getsize(local_path):,} bytes)")
    s3.upload_file(local_path, STAGING_BUCKET, s3_key)


# ── Phase 1: Build lookup tables ──────────────────────────────────────────────

def build_bn_to_entity():
    """Map bn_root → golden record entity_id from entity_source_links."""
    print("Building bn_root → entity_id lookup from entity_source_links...")
    bn_to_eid = {}
    for row in stream_jsonl("general/entity_source_links.jsonl"):
        if row.get("source_table") == "cra_identification":
            pk = row.get("source_pk", {})
            br = pk.get("bn_root", "")
            if br:
                bn_to_eid[br] = row["entity_id"]
    print(f"  Mapped {len(bn_to_eid):,} bn_roots to entity IDs")
    return bn_to_eid


def build_bn_to_province():
    """Map bn (full) → province from cra_identification (latest fiscal year)."""
    print("Building bn → province lookup from cra_identification...")
    bn_prov = {}
    bn_year = {}
    for row in stream_jsonl("cra/cra_identification.jsonl"):
        bn = row.get("bn", "")
        fy = row.get("fiscal_year", 0)
        if bn and (bn not in bn_year or fy > bn_year[bn]):
            bn_prov[bn] = row.get("province", "")
            bn_year[bn] = fy
    print(f"  Mapped {len(bn_prov):,} BNs to provinces")
    return bn_prov


def build_golden_persons():
    """Load golden records of type individual → {entity_id: record}."""
    print("Loading golden record persons...")
    persons = {}
    for row in stream_jsonl("general/entity_golden_records.jsonl"):
        if row.get("entity_type") == "individual":
            persons[row["id"]] = row
    print(f"  Loaded {len(persons):,} individual golden records")
    return persons


# ── Phase 2: Generate vertex CSVs ─────────────────────────────────────────────

def write_person_vertices(bn_to_entity, bn_to_province, golden_persons, tmpdir):
    """
    Person vertices from cra_directors, deduplicated by (last_name, first_name).
    Uses golden record entity_id where available via bn_root lookup.
    """
    print("Generating Person vertices from cra_directors...")
    # Collect unique persons: pid → {name, province, boards set}
    persons = {}  # pid → dict
    pid_lookup = {}  # (last_upper, first_upper) → pid

    for row in stream_jsonl("cra/cra_directors.jsonl"):
        ln = (row.get("last_name") or "").strip()
        fn = (row.get("first_name") or "").strip()
        if not ln:
            continue
        bn_full = row.get("bn", "")
        br = bn_root(bn_full)

        # Try to get golden record entity_id for this person
        # Directors don't have direct entity links, so we use name-based ID
        key = (ln.upper(), fn.upper())
        if key not in pid_lookup:
            pid = person_id(ln, fn)
            pid_lookup[key] = pid
            prov = bn_to_province.get(bn_full, "")
            persons[pid] = {
                "name": f"{fn} {ln}".strip(),
                "province": prov,
                "bns": set(),
            }
        pid = pid_lookup[key]
        persons[pid]["bns"].add(br)
        # Update province if we didn't have one
        if not persons[pid]["province"]:
            persons[pid]["province"] = bn_to_province.get(bn_full, "")

    path = os.path.join(tmpdir, "persons.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([":ID", "name:String", "province:String", "boards:Int", ":LABEL"])
        for pid, p in persons.items():
            w.writerow([pid, safe_str(p["name"]), p["province"], len(p["bns"]), "Person"])

    print(f"  {len(persons):,} Person vertices")
    return path, persons, pid_lookup


def write_org_vertices(tmpdir):
    """Org vertices from cra_identification, deduplicated by bn (latest fiscal year)."""
    print("Generating Org vertices from cra_identification...")
    orgs = {}  # bn → dict
    for row in stream_jsonl("cra/cra_identification.jsonl"):
        bn = row.get("bn", "")
        fy = row.get("fiscal_year", 0)
        if not bn:
            continue
        if bn not in orgs or fy > orgs[bn].get("fy", 0):
            orgs[bn] = {
                "legal_name": row.get("legal_name", ""),
                "province": row.get("province", ""),
                "fy": fy,
            }

    path = os.path.join(tmpdir, "orgs.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([":ID", "legalName:String", "businessNumber:String", "province:String", ":LABEL"])
        for bn, o in orgs.items():
            w.writerow([bn, safe_str(o["legal_name"]), bn, o["province"], "Org"])

    print(f"  {len(orgs):,} Org vertices")
    return path, set(orgs.keys())


def write_gov_vertices(tmpdir):
    """GovEntity vertices extracted from fed grants owner_org + ab grants ministry."""
    print("Generating GovEntity vertices from grants...")
    govs = {}  # id → {name, level}

    # Federal
    for row in stream_jsonl("fed/grants_contributions.jsonl"):
        oid = row.get("owner_org", "")
        if oid and oid not in govs:
            title = row.get("owner_org_title", oid)
            # Take English part before " | "
            name = title.split(" | ")[0] if " | " in title else title
            govs[f"gov_fed_{oid}"] = {"name": name, "level": "federal", "dept": name}

    # Alberta
    for row in stream_jsonl("ab/ab_grants.jsonl"):
        ministry = (row.get("ministry") or "").strip()
        if ministry:
            mid = "gov_ab_" + hashlib.md5(ministry.encode()).hexdigest()[:8]
            if mid not in govs:
                govs[mid] = {"name": ministry.title(), "level": "provincial", "dept": ministry.title()}

    path = os.path.join(tmpdir, "govs.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([":ID", "name:String", "level:String", "department:String", ":LABEL"])
        for gid, g in govs.items():
            w.writerow([gid, safe_str(g["name"]), g["level"], safe_str(g["dept"]), "GovEntity"])

    print(f"  {len(govs):,} GovEntity vertices")
    return path, govs


# ── Phase 3: Generate edge CSVs ───────────────────────────────────────────────

def write_sits_on_edges(pid_lookup, org_ids, tmpdir):
    """SITS_ON edges from cra_directors."""
    print("Generating SITS_ON edges from cra_directors...")
    count = 0
    seen = set()
    path = os.path.join(tmpdir, "sits_on.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([":ID", ":START_ID", ":END_ID", ":TYPE",
                     "role:String", "yearStart:String", "yearEnd:String",
                     "sourceFilingId:String"])
        for row in stream_jsonl("cra/cra_directors.jsonl"):
            ln = (row.get("last_name") or "").strip()
            fn = (row.get("first_name") or "").strip()
            bn_full = row.get("bn", "")
            if not ln or not bn_full:
                continue
            key = (ln.upper(), fn.upper())
            pid = pid_lookup.get(key)
            if not pid or bn_full not in org_ids:
                continue
            # Deduplicate: one edge per person-org-role
            role = row.get("position", "Director")
            dedup = (pid, bn_full, role)
            if dedup in seen:
                continue
            seen.add(dedup)
            eid = f"so_{hashlib.md5(f'{pid}{bn_full}{role}'.encode()).hexdigest()[:12]}"
            ys = extract_year(row.get("start_date"))
            ye = extract_year(row.get("end_date"))
            sfid = f"{bn_full}_{row.get('fpe', '')[:10]}"
            w.writerow([eid, pid, bn_full, "SITS_ON", safe_str(role), ys, ye, sfid])
            count += 1

    print(f"  {count:,} SITS_ON edges")
    return path


def write_funded_edges(org_ids, govs, tmpdir):
    """
    FUNDED edges from govt_funding_by_charity (pre-aggregated).
    Creates one edge per bn per fiscal_year with total_govt amount.
    Maps to GovEntity using federal/provincial split.
    """
    print("Generating FUNDED edges from govt_funding_by_charity...")
    count = 0
    path = os.path.join(tmpdir, "funded_govt.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([":ID", ":START_ID", ":END_ID", ":TYPE",
                     "amount:Double", "fiscalYear:Int", "program:String",
                     "sourceFilingId:String"])
        for row in stream_jsonl("cra/govt_funding_by_charity.jsonl"):
            bn = row.get("bn", "")
            if not bn or bn not in org_ids:
                continue
            fy = row.get("fiscal_year", 0)
            fed_amt = parse_float(row.get("federal", 0))
            prov_amt = parse_float(row.get("provincial", 0))
            muni_amt = parse_float(row.get("municipal", 0))
            total = parse_float(row.get("total_govt", 0))

            if total <= 0:
                continue

            # Create a single FUNDED edge from a generic gov entity
            if fed_amt > 0:
                gid = "gov_fed_tbs-sct"  # Use Treasury Board as generic federal funder
                eid = f"fu_{hashlib.md5(f'{gid}{bn}{fy}f'.encode()).hexdigest()[:12]}"
                w.writerow([eid, gid, bn, "FUNDED", round(fed_amt, 2), fy, "Federal Government Funding", f"{bn}_{fy}"])
                count += 1
            if prov_amt > 0:
                gid = "gov_ab_prov"  # Generic provincial
                if gid not in govs:
                    govs[gid] = {"name": "Provincial Government", "level": "provincial", "dept": "Provincial Government"}
                eid = f"fu_{hashlib.md5(f'{gid}{bn}{fy}p'.encode()).hexdigest()[:12]}"
                w.writerow([eid, gid, bn, "FUNDED", round(prov_amt, 2), fy, "Provincial Government Funding", f"{bn}_{fy}"])
                count += 1
            if muni_amt > 0:
                gid = "gov_muni"
                if gid not in govs:
                    govs[gid] = {"name": "Municipal Government", "level": "municipal", "dept": "Municipal Government"}
                eid = f"fu_{hashlib.md5(f'{gid}{bn}{fy}m'.encode()).hexdigest()[:12]}"
                w.writerow([eid, gid, bn, "FUNDED", round(muni_amt, 2), fy, "Municipal Government Funding", f"{bn}_{fy}"])
                count += 1

    print(f"  {count:,} FUNDED edges (from govt_funding_by_charity)")
    return path


def write_funded_edges_fed_detail(org_ids, govs, tmpdir):
    """FUNDED edges from fed/grants_contributions with department-level detail."""
    print("Generating FUNDED edges from fed/grants_contributions...")
    count = 0
    path = os.path.join(tmpdir, "funded_fed.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([":ID", ":START_ID", ":END_ID", ":TYPE",
                     "amount:Double", "fiscalYear:Int", "program:String",
                     "sourceFilingId:String"])
        for row in stream_jsonl("fed/grants_contributions.jsonl"):
            rbn = row.get("recipient_business_number")
            if not rbn:
                continue
            # Normalize BN
            rbn = rbn.strip()
            if rbn not in org_ids:
                continue
            oid = row.get("owner_org", "")
            gid = f"gov_fed_{oid}"
            if gid not in govs:
                continue
            amt = parse_float(row.get("agreement_value", 0))
            if amt <= 0:
                continue
            fy_str = extract_year(row.get("agreement_start_date"))
            fy = int(fy_str) if fy_str else 0
            prog = row.get("prog_name_en", "")
            ref = row.get("ref_number", row.get("_id", ""))
            eid = f"ff_{hashlib.md5(f'{gid}{rbn}{ref}'.encode()).hexdigest()[:12]}"
            w.writerow([eid, gid, rbn, "FUNDED", round(amt, 2), fy, safe_str(prog), safe_str(ref)])
            count += 1

    print(f"  {count:,} FUNDED edges (fed detail)")
    return path


def write_funded_edges_ab_detail(org_ids, govs, tmpdir):
    """FUNDED edges from ab/ab_grants — only where recipient matches an org BN via golden records."""
    print("Generating FUNDED edges from ab/ab_grants (skipping — no BN linkage)...")
    # AB grants have no BN field. Linking requires fuzzy matching which is expensive.
    # The govt_funding_by_charity already captures provincial funding totals.
    # Skip detailed AB edges for now.
    print("  Skipped (provincial totals covered by govt_funding_by_charity)")
    return None


def write_gifts_to_edges(org_ids, tmpdir):
    """GIFTS_TO edges from cra_qualified_donees."""
    print("Generating GIFTS_TO edges from cra_qualified_donees...")
    count = 0
    path = os.path.join(tmpdir, "gifts_to.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([":ID", ":START_ID", ":END_ID", ":TYPE",
                     "amount:Double", "fiscalYear:Int",
                     "sourceFilingId:String"])
        seen = set()
        for row in stream_jsonl("cra/cra_qualified_donees.jsonl"):
            giver_bn = row.get("bn", "")
            donee_bn = row.get("donee_bn", "")
            if not giver_bn or not donee_bn:
                continue
            if giver_bn not in org_ids or donee_bn not in org_ids:
                continue
            amt = parse_float(row.get("total_gifts", 0))
            if amt <= 0:
                continue
            fy = extract_year(row.get("fpe"))
            fy_int = int(fy) if fy else 0
            # Deduplicate by giver+donee+fy
            dedup = (giver_bn, donee_bn, fy)
            if dedup in seen:
                continue
            seen.add(dedup)
            eid = f"gt_{hashlib.md5(f'{giver_bn}{donee_bn}{fy}'.encode()).hexdigest()[:12]}"
            sfid = f"{giver_bn}_{donee_bn}_{fy}"
            w.writerow([eid, giver_bn, donee_bn, "GIFTS_TO", round(amt, 2), fy_int, sfid])
            count += 1

    print(f"  {count:,} GIFTS_TO edges")
    return path


# ── Phase 4: Upload and trigger bulk load ──────────────────────────────────────

def trigger_bulk_load():
    """Trigger Neptune bulk loader via HTTP API."""
    import urllib.request
    url = f"https://{NEPTUNE_ENDPOINT}:{NEPTUNE_PORT}/loader"
    payload = json.dumps({
        "source": f"s3://{STAGING_BUCKET}/bulk-load/",
        "format": "opencypher",
        "iamRoleArn": LOADER_ROLE,
        "region": REGION,
        "failOnError": "FALSE",
        "parallelism": "HIGH",
        "updateSingleCardinalityProperties": "TRUE",
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        print(f"  Bulk load triggered: {json.dumps(result, indent=2)}")
        return result.get("payload", {}).get("loadId")
    except Exception as e:
        print(f"  Direct HTTPS failed ({e}), trying via curl...")
        return None


def main():
    print("=" * 60)
    print("CivicGraph ETL: JSONL → Neptune bulk-load CSVs")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        # Phase 1: Lookups
        bn_to_entity = build_bn_to_entity()
        bn_to_province = build_bn_to_province()
        golden_persons = build_golden_persons()

        # Phase 2: Vertices
        persons_path, persons, pid_lookup = write_person_vertices(
            bn_to_entity, bn_to_province, golden_persons, tmpdir
        )
        orgs_path, org_ids = write_org_vertices(tmpdir)
        govs_path, govs = write_gov_vertices(tmpdir)

        # Phase 3: Edges
        sits_on_path = write_sits_on_edges(pid_lookup, org_ids, tmpdir)
        funded_govt_path = write_funded_edges(org_ids, govs, tmpdir)
        funded_fed_path = write_funded_edges_fed_detail(org_ids, govs, tmpdir)
        write_funded_edges_ab_detail(org_ids, govs, tmpdir)
        gifts_to_path = write_gifts_to_edges(org_ids, tmpdir)

        # Rewrite govs CSV to include any new govs added during edge generation
        with open(govs_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow([":ID", "name:String", "level:String", "department:String", ":LABEL"])
            for gid, g in govs.items():
                w.writerow([gid, safe_str(g["name"]), g["level"], safe_str(g["dept"]), "GovEntity"])
        print(f"  Updated GovEntity vertices: {len(govs):,}")

        # Phase 4: Upload
        print("\nUploading CSVs to staging bucket...")
        uploads = [
            (persons_path, "bulk-load/vertices/persons.csv"),
            (orgs_path, "bulk-load/vertices/orgs.csv"),
            (govs_path, "bulk-load/vertices/govs.csv"),
            (sits_on_path, "bulk-load/edges/sits_on.csv"),
            (funded_govt_path, "bulk-load/edges/funded_govt.csv"),
            (funded_fed_path, "bulk-load/edges/funded_fed.csv"),
            (gifts_to_path, "bulk-load/edges/gifts_to.csv"),
        ]
        for local, s3key in uploads:
            if local and os.path.exists(local):
                upload_csv(local, s3key)

    print("\n✓ ETL complete. CSVs uploaded to s3://{}/bulk-load/".format(STAGING_BUCKET))
    payload = {
        "source": f"s3://{STAGING_BUCKET}/bulk-load/",
        "format": "opencypher",
        "iamRoleArn": LOADER_ROLE,
        "region": REGION,
        "failOnError": "FALSE",
        "parallelism": "HIGH",
    }
    print("\nTo trigger bulk load, run:")
    print(f"  curl -X POST https://{NEPTUNE_ENDPOINT}:{NEPTUNE_PORT}/loader \\")
    print("    -H 'Content-Type: application/json' \\")
    print(f"    -d '{json.dumps(payload)}'")


if __name__ == "__main__":
    main()
