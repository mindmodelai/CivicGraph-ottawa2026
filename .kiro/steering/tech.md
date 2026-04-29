# Tech stack

## Confirmed
- Region: us-west-2
- Data source: s3://agency2026-team-2/ (CRA, federal, AB grant data)
- Frontend: Next.js 14 App Router + TypeScript + Tailwind
- Graph viz: Cytoscape.js with cose-bilkent layout
- Package manager: npm

## To be determined based on permission audit
- Backend compute: Lambda Function URL, Lightsail container, or static-only
- Graph store: Neptune Serverless, DuckDB-in-Lambda, or pre-computed JSON in S3
- AI: Bedrock via Kiro IDE only (the WSParticipantRole cannot invoke Bedrock directly from the app)

## Hard constraints
- No long-term IAM access keys
- All AWS resources must live in us-west-2
- Avoid services denied by ws-default-policy: API Gateway, Amplify, DynamoDB, RDS, EC2, Athena, Glue
