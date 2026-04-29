# Design

See `docs/architecture.md` for the canonical architecture, data model, and service decisions.

Implementation-specific notes that don't belong in docs:
- Cytoscape layout: `cose-bilkent`
- Neptune query language: openCypher
- Bedrock model ID: `us.anthropic.claude-sonnet-4-6` (cross-region inference profile)
- Lambda runtime: Node.js 20, ARM64
- All Neptune writes use IAM auth via SigV4-signed HTTPS to the cluster endpoint on port 8182
