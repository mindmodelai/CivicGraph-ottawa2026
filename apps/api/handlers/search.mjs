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

async function extractSearchTerms(query) {
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 200,
      messages: [{ role: 'user', content: `Extract the person name from this search query. Return ONLY the name, nothing else.\n\nQuery: "${query}"` }],
    }),
  }));
  const data = JSON.parse(new TextDecoder().decode(res.body));
  return data.content[0].text.trim();
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  const q = event.queryStringParameters?.q || '';
  if (!q) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing ?q= parameter' }) };

  try {
    const name = await extractSearchTerms(q);
    const rows = await neptuneQuery(`
      MATCH (p:Person)
      WHERE toLower(p.name) CONTAINS toLower('${name.replace(/'/g, "\\'")}')
      RETURN p.\`~id\` AS id, p.name AS name, p.province AS province, p.boards AS boards
      ORDER BY p.boards DESC
      LIMIT 20
    `);

    // Get funding for each result
    const results = await Promise.all(rows.map(async (r) => {
      const funding = await neptuneQuery(`
        MATCH (p:Person {\`~id\`: '${r.id}'})-[:SITS_ON]->(o:Org)<-[f:FUNDED]-(g:GovEntity)
        RETURN sum(f.amount) AS totalFunding
      `);
      return {
        id: r.id, name: r.name, province: r.province || '',
        boards: r.boards, totalFunding: funding[0]?.totalFunding || 0,
      };
    }));

    return { statusCode: 200, headers: cors, body: JSON.stringify({ query: q, results }) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
}
