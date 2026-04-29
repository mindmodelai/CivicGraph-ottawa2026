"""Task 6: Top-20 pre-compute — query Neptune, compute composite scores, write top.json to S3."""
import json, math, boto3, urllib.request, urllib.parse
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from datetime import datetime, timezone

NEPTUNE = "civicgraph-graph.cluster-c5qoqo2omjl2.us-west-2.neptune.amazonaws.com"
PORT = 8182
REGION = "us-west-2"
BUCKET = "civicgraph-staging-006193923397-us-west-2"
S3_KEY = "cache/top.json"

session = boto3.Session(region_name=REGION)
creds = session.get_credentials().get_frozen_credentials()

def neptune_query(cypher):
    url = f"https://{NEPTUNE}:{PORT}/openCypher"
    body = urllib.parse.urlencode({"query": cypher})
    req = AWSRequest(method="POST", url=url, data=body,
                     headers={"Content-Type": "application/x-www-form-urlencoded"})
    SigV4Auth(creds, "neptune-db", REGION).add_auth(req)
    r = urllib.request.urlopen(urllib.request.Request(
        url, data=body.encode(), headers=dict(req.headers)), timeout=300)
    return json.loads(r.read())["results"]

# Step 1: Get top 100 persons by board count (candidates)
print("Step 1: Getting top candidates by board count...")
candidates = neptune_query("""
MATCH (p:Person)
WHERE p.boards > 5
RETURN p.`~id` AS id, p.name AS name, p.province AS province, p.boards AS boards
ORDER BY p.boards DESC
LIMIT 100
""")
print(f"  Got {len(candidates)} candidates")

# Step 2: For each candidate, get total funding to their orgs
print("Step 2: Computing funding per candidate...")
results = []
for i, c in enumerate(candidates):
    pid = c["id"]
    rows = neptune_query(f"""
MATCH (p:Person {{`~id`: '{pid}'}})-[:SITS_ON]->(o:Org)<-[f:FUNDED]-(g:GovEntity)
RETURN sum(f.amount) AS totalFunding
""")
    funding = rows[0]["totalFunding"] if rows and rows[0]["totalFunding"] else 0
    score = round(c["boards"] * math.log10(1 + funding), 2) if funding > 0 else 0
    results.append({
        "id": pid,
        "name": c["name"],
        "province": c.get("province", ""),
        "boards": c["boards"],
        "totalFunding": round(funding, 2),
        "compositeScore": score,
    })
    if (i + 1) % 20 == 0:
        print(f"  Processed {i+1}/{len(candidates)}")

# Sort by composite score and take top 20
results.sort(key=lambda x: x["compositeScore"], reverse=True)
results = results[:20]

payload = {"results": results, "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}

# Write to S3
s3 = session.client("s3")
s3.put_object(Bucket=BUCKET, Key=S3_KEY, Body=json.dumps(payload, indent=2), ContentType="application/json")
print(f"\nWrote {len(results)} entries to s3://{BUCKET}/{S3_KEY}")
for r in results:
    print(f"  {r['name']:40s} boards={r['boards']:3d} funding=${r['totalFunding']:>15,.2f} score={r['compositeScore']:.2f}")
