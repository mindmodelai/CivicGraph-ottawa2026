# CivicGraph — Provisioning Status

Generated: 2026-04-29T14:43:00Z

Region: us-west-2

Account: 006193923397

## Resources created

| Resource | Identifier | ARN | Status | Verified |
|---|---|---|---|---|
| Neptune cluster | civicgraph-graph | arn:aws:rds:us-west-2:006193923397:cluster:civicgraph-graph | creating | yes |
| Neptune writer | civicgraph-graph-writer | arn:aws:rds:us-west-2:006193923397:db:civicgraph-graph-writer | creating | yes |
| Staging bucket | civicgraph-staging-006193923397-us-west-2 | arn:aws:s3:::civicgraph-staging-006193923397-us-west-2 | created | yes |
| Neptune loader role | civicgraph-neptune-loader-role | arn:aws:iam::006193923397:role/civicgraph-neptune-loader-role | created | yes |
| Lambda execution role | civicgraph-lambda-execution-role | arn:aws:iam::006193923397:role/civicgraph-lambda-execution-role | created | yes |
| Log groups (4) | /aws/lambda/civicgraph-{top,search,person,org} | n/a | created | yes |
| DB subnet group | civicgraph-subnets | arn:aws:rds:us-west-2:006193923397:subgrp:civicgraph-subnets | created | yes |
| Neptune SG | civicgraph-neptune-sg | sg-02f2190501cd229d1 | created | yes |
| Lambda SG | civicgraph-lambda-sg | sg-01fed06d715bb8d6e | created | yes |
| CDK bootstrap | CDKToolkit | n/a | bootstrapped | yes |

## Endpoints

- Neptune writer endpoint: `civicgraph-graph.cluster-c5qoqo2omjl2.us-west-2.neptune.amazonaws.com:8182`
- Neptune reader endpoint: `civicgraph-graph.cluster-ro-c5qoqo2omjl2.us-west-2.neptune.amazonaws.com:8182`
- Staging bucket: `s3://civicgraph-staging-006193923397-us-west-2`

## Networking

- VPC: vpc-0aa08ab1f087432fb (172.31.0.0/16, default VPC)
- Neptune SG inbound rules: port 8182 from civicgraph-lambda-sg (sg-01fed06d715bb8d6e) + VPC CIDR 172.31.0.0/16

## IAM details

- **civicgraph-neptune-loader-role**: trust rds.amazonaws.com, inline policy for s3:GetObject/s3:ListBucket on staging bucket
- **civicgraph-lambda-execution-role**: trust lambda.amazonaws.com
  - Managed: AWSLambdaVPCAccessExecutionRole, AWSLambdaBasicExecutionRole
  - Inline `civicgraph-lambda-permissions`: bedrock:InvokeModel (anthropic.*), neptune-db:{connect,ReadDataViaQuery,WriteDataViaQuery}, s3:GetObject (agency2026-team-2 + staging), s3:PutObject (staging)

## S3 prefixes

- `bulk-load/vertices/`
- `bulk-load/edges/`
- `cache/`
- `entity-resolution/`

## Team data bucket

- Bucket: `s3://agency2026-team-2/`
- Total size: 12.6 GiB
- File count: 78
- Top-level prefixes: ab/, cra/, fed/, general/

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
aws neptune delete-db-instance --db-instance-identifier civicgraph-graph-writer --skip-final-snapshot --region us-west-2
aws neptune delete-db-cluster --db-cluster-identifier civicgraph-graph --skip-final-snapshot --region us-west-2

# Empty and delete staging bucket
aws s3 rm s3://civicgraph-staging-006193923397-us-west-2 --recursive --region us-west-2
aws s3 rb s3://civicgraph-staging-006193923397-us-west-2 --region us-west-2

# Detach policies + delete IAM roles
aws iam detach-role-policy --role-name civicgraph-lambda-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
aws iam detach-role-policy --role-name civicgraph-lambda-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role-policy --role-name civicgraph-lambda-execution-role --policy-name civicgraph-lambda-permissions
aws iam delete-role --role-name civicgraph-lambda-execution-role
aws iam delete-role-policy --role-name civicgraph-neptune-loader-role --policy-name civicgraph-neptune-s3-access
aws iam delete-role --role-name civicgraph-neptune-loader-role

# Delete security groups (after Neptune is gone)
aws ec2 delete-security-group --group-id sg-02f2190501cd229d1 --region us-west-2
aws ec2 delete-security-group --group-id sg-01fed06d715bb8d6e --region us-west-2

# Delete DB subnet group
aws neptune delete-db-subnet-group --db-subnet-group-name civicgraph-subnets --region us-west-2

# Delete log groups
for lg in top search person org; do
  aws logs delete-log-group --log-group-name /aws/lambda/civicgraph-$lg --region us-west-2
done

# Destroy CDK bootstrap (optional)
aws cloudformation delete-stack --stack-name CDKToolkit --region us-west-2
```
