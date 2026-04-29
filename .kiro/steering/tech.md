## Where AWS work happens

All AWS provisioning and Bedrock calls run from the **RDP Ubuntu box**. That box uses the `kiro-rdp-UbuntuDesktopInstanceRole` instance role with `WorkshopPermissions` — allow-all with narrow exceptions.

The Windows laptop's `WSParticipantRole` is locked down. It is used only for: read-only S3, frontend dev against mocks, git/GitHub.

## Hard constraints

- Region: us-west-2
- Bedrock model: `us.anthropic.claude-sonnet-4-6` via cross-region inference profile. Bare model IDs for Sonnet 4.5, Opus 4.7, and Haiku 4.5 are denied; all calls must use the `us.` prefix.
- No EC2 instances larger than 4xlarge; no `g*`, `p*`, `x1*`, `x2*`, `z1*`, `metal`
- No long-term IAM access keys
- All resources tagged `Project=civicgraph`, `AutoDelete=true`

## Services available (all permitted on the RDP role)

Lambda, API Gateway, Neptune Serverless, DynamoDB, OpenSearch, Athena, Glue, Amplify, CloudFront, Step Functions, EventBridge, ECS, ECR, CodeBuild, SageMaker, S3, IAM, KMS, Secrets Manager, CloudWatch, X-Ray.