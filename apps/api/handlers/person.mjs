import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { neptuneQuery } from './neptune.mjs';

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-west-2' });
const MODEL = 'us.anthropic.claude-sonnet-4-6';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  const id = event.pathParameters?.id;
  if (!id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing person id' }) };

  try {
    // Get person
    const persons = await neptuneQuery(`
      MATCH (p:Person {\`~id\`: '${id.replace(/'/g, "\\'")}'})
      RETURN p.\`~id\` AS id, p.name AS name, p.province AS province, p.boards AS boards
    `);
    if (!persons.length) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Person not found' }) };
    const p = persons[0];

    // 1-hop ego graph: person -> orgs -> funders
    const edges = await neptuneQuery(`
      MATCH (p:Person {\`~id\`: '${id}'})-[s:SITS_ON]->(o:Org)
      OPTIONAL MATCH (g:GovEntity)-[f:FUNDED]->(o)
      RETURN p.\`~id\` AS pid, o.\`~id\` AS oid, o.legalName AS orgName, o.businessNumber AS bn,
             s.role AS role, s.yearStart AS yearStart, s.yearEnd AS yearEnd, s.sourceFilingId AS sitsFilingId,
             g.\`~id\` AS gid, g.name AS govName, g.level AS govLevel,
             f.amount AS amount, f.fiscalYear AS fiscalYear, f.program AS program, f.sourceFilingId AS fundedFilingId
    `);

    const nodes = new Map();
    const graphEdges = [];
    nodes.set(p.id, { id: p.id, label: p.name, type: 'person' });

    let totalFunding = 0;
    const provenance = [];
    const orgsSeen = new Set();

    for (const e of edges) {
      if (!nodes.has(e.oid)) nodes.set(e.oid, { id: e.oid, label: e.orgName || e.oid, type: 'org' });
      if (!orgsSeen.has(e.oid)) {
        orgsSeen.add(e.oid);
        graphEdges.push({
          source: p.id, target: e.oid, edgeType: 'SITS_ON',
          role: e.role || undefined, yearStart: e.yearStart || undefined, yearEnd: e.yearEnd || undefined,
          sourceFilingId: e.sitsFilingId || undefined,
        });
      }
      if (e.gid && e.amount) {
        if (!nodes.has(e.gid)) nodes.set(e.gid, { id: e.gid, label: e.govName || e.gid, type: 'gov', jurisdiction: e.govLevel });
        const edgeKey = `${e.gid}-${e.oid}-${e.fiscalYear}`;
        graphEdges.push({
          source: e.gid, target: e.oid, edgeType: 'FUNDED',
          amount: e.amount, fiscalYear: e.fiscalYear || undefined, program: e.program || undefined,
          sourceFilingId: e.fundedFilingId || undefined,
        });
        totalFunding += e.amount;
        if (e.fundedFilingId) {
          provenance.push({
            id: e.fundedFilingId,
            type: e.govLevel === 'federal' ? 'fed_grant' : 'ab_grant',
            description: `${e.govName} → ${e.orgName || e.oid}, FY${e.fiscalYear || '?'}`,
            url: `https://open.canada.ca/data/en/dataset?q=${encodeURIComponent(e.fundedFilingId)}`,
            fiscalYear: e.fiscalYear || undefined,
            amount: e.amount,
          });
        }
      }
    }

    // Limit provenance to 50 entries
    const person = { id: p.id, name: p.name, province: p.province || '', boards: p.boards, totalFunding: Math.round(totalFunding * 100) / 100 };
    const graph = { nodes: [...nodes.values()], edges: graphEdges };

    // Generate narrative via Bedrock
    const narrativePrompt = `You are a Canadian public accountability analyst. Given this data about a person's governance network, write a 2-3 sentence factual summary. No accusations — just facts and patterns.

Person: ${p.name}
Province: ${p.province || 'Unknown'}
Boards: ${p.boards}
Total public funding to their organizations: $${totalFunding.toLocaleString('en-CA')}
Organizations: ${[...nodes.values()].filter(n => n.type === 'org').slice(0, 10).map(n => n.label).join(', ')}
Top funders: ${[...nodes.values()].filter(n => n.type === 'gov').slice(0, 5).map(n => n.label).join(', ')}`;

    const bedrockRes = await bedrock.send(new InvokeModelCommand({
      modelId: MODEL,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
        messages: [{ role: 'user', content: narrativePrompt }],
      }),
    }));
    const narrative = JSON.parse(new TextDecoder().decode(bedrockRes.body)).content[0].text.trim();

    return {
      statusCode: 200, headers: cors,
      body: JSON.stringify({ person, graph, provenance: provenance.slice(0, 50), narrative }),
    };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
}
