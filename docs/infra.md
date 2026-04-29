I'm in ~/ottawa2026/CivicGraph-ottawa2026 on the hackathon RDP Ubuntu box. The team is locking the implementation spec in parallel via Claude Code. While that's happening, I want you to provision only the long-lead-time AWS infrastructure that will be needed regardless of final spec decisions. Region: us-west-2. Project tag: Project=civicgraph. Account: 006193923397.

Do all of this in parallel where possible. Save a report to infra/provisioning-status.md with what you created, ARNs, and verification steps.

DO provision

1. Neptune Serverless cluster (longest lead time, 8–12 min)

Identifier: civicgraph-graph

Engine version: latest 1.3.x

Serverless scaling: min 1 NCU, max 8 NCU

Use the default VPC (vpc-... from aws ec2 describe-vpcs --filters Name=isDefault,Values=true)

DB subnet group: create one named civicgraph-subnets covering at least 2 AZs

Security group: create civicgraph-neptune-sg allowing inbound 8182 from itself and from a future Lambda SG (allow inbound 8182 from civicgraph-lambda-sg once that exists; for now, allow from the default VPC CIDR 172.31.0.0/16)

IAM auth enabled

Storage: standard (not I/O-optimized)

Backup retention: 1 day

Deletion protection: false

Tags: Project=civicgraph, AutoDelete=true

Create the writer instance: db.serverless

Print the cluster endpoint and reader endpoint when done

2. S3 staging bucket for Neptune bulk load + cache

Name: civicgraph-staging-006193923397-us-west-2

Region: us-west-2

Block all public access

Default encryption: SSE-S3 (skip KMS, simpler)

Versioning: disabled

Tags: Project=civicgraph, AutoDelete=true

Create these prefixes (empty files or just the path structure): bulk-load/vertices/, bulk-load/edges/, cache/, entity-resolution/

3. IAM role for Neptune bulk loader

Name: civicgraph-neptune-loader-role

Trust policy: rds.amazonaws.com (Neptune uses RDS service principal for bulk load)

Inline policy: read access to the staging bucket above (s3:GetObject, s3:ListBucket on the bucket and its objects)

Associate this role with the Neptune cluster as an associated IAM role

Tags: Project=civicgraph

4. IAM role for the future Lambda functions (create now, attach to functions later)

Name: civicgraph-lambda-execution-role

Trust policy: lambda.amazonaws.com

Managed policies: AWSLambdaVPCAccessExecutionRole, AWSLambdaBasicExecutionRole

Inline policy civicgraph-lambda-permissions:

bedrock:InvokeModel on arn:aws:bedrock:*::foundation-model/anthropic.* and arn:aws:bedrock:us-west-2::inference-profile/us.anthropic.claude-sonnet-4-6

neptune-db:connect, neptune-db:ReadDataViaQuery, neptune-db:WriteDataViaQuery on the cluster ARN above

s3:GetObject on arn:aws:s3:::agency2026-team-2/* and the staging bucket

s3:PutObject on the staging bucket

Tags: Project=civicgraph

5. CloudWatch log group skeletons (avoid auto-created with no retention)

/aws/lambda/civicgraph-top retention 7 days

/aws/lambda/civicgraph-search retention 7 days

/aws/lambda/civicgraph-person retention 7 days

/aws/lambda/civicgraph-org retention 7 days

Tags: Project=civicgraph

6. Verify the team data bucket is accessible

aws s3 ls s3://agency2026-team-2/ — confirm it lists

aws s3 ls s3://agency2026-team-2/ --recursive --summarize --human-readable | tail -10 — get total size

7. CDK bootstrap (so we can use CDK later)

Run cdk bootstrap aws://006193923397/us-west-2 if not already bootstrapped

This is the one-time setup so any future cdk deploy works

DO NOT provision yet

No Lambda functions (no handler code exists)

No API Gateway (depends on Lambda ARNs)

No Amplify app (frontend doesn't exist)

No DynamoDB tables (might not be needed)

No CloudFront distribution (frontend not built)

Do NOT install Bedrock entity resolution code anywhere yet

Output

When all the above is complete or in-progress, write a markdown file infra/provisioning-status.md with:

markdown# CivicGraph — Provisioning Status

Generated: <ISO timestamp>

Region: us-west-2

Account: 006193923397

## Resources created

| Resource | Identifier | ARN | Status | Verified |

|---|---|---|---|---|

| Neptune cluster | civicgraph-graph | arn:... | available/creating | yes/no |

| Neptune writer | civicgraph-graph-writer | arn:... | available/creating | yes/no |

| Staging bucket | civicgraph-staging-... | arn:... | created | yes |

| Neptune loader role | civicgraph-neptune-loader-role | arn:... | created | yes |

| Lambda execution role | civicgraph-lambda-execution-role | arn:... | created | yes |

| Log groups (4) | /aws/lambda/civicgraph-* | n/a | created | yes |

| CDK bootstrap | n/a | n/a | bootstrapped | yes |

## Endpoints

- Neptune writer endpoint: `civicgraph-graph.cluster-xxx.us-west-2.neptune.amazonaws.com:8182`

- Neptune reader endpoint: `civicgraph-graph.cluster-ro-xxx.us-west-2.neptune.amazonaws.com:8182`

- Staging bucket: `s3://civicgraph-staging-006193923397-us-west-2`

## Team data bucket

- Bucket: `s3://agency2026-team-2/`

- Total size: ___ GB

- File count: ___

- Top-level prefixes: ab/, cra/, fed/, general/ (or whatever's there)

## What's next (depends on spec)

- Lambda function deploy

- API Gateway setup

- Amplify hosting

- Frontend deployment

- Bulk load CSV generation (depends on Agent C schema discovery)

- Bulk load execution

- Entity resolution batch

## Teardown command (run after demo, ~5pm)

```bash

# Delete Neptune cluster (takes ~5 min)

aws neptune delete-db-instance --db-instance-identifier civicgraph-graph-writer --skip-final-snapshot

aws neptune delete-db-cluster --db-cluster-identifier civicgraph-graph --skip-final-snapshot

# Empty and delete staging bucket

aws s3 rm s3://civicgraph-staging-006193923397-us-west-2 --recursive

aws s3 rb s3://civicgraph-staging-006193923397-us-west-2

# Detach + delete IAM roles

aws iam delete-role --role-name civicgraph-neptune-loader-role

aws iam delete-role --role-name civicgraph-lambda-execution-role

# Delete log groups

for lg in top search person org; do

  aws logs delete-log-group --log-group-name /aws/lambda/civicgraph-$lg

done

Commit `infra/provisioning-status.md` with message `feat(infra): provision long-lead AWS resources` and push to origin/main.

If anything fails, capture the error in the status file and continue with the rest. Don't block on a single failure.