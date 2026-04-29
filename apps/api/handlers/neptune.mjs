import { Sha256 } from '@aws-crypto/sha256-js';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { URL } from 'url';

const NEPTUNE = process.env.NEPTUNE_ENDPOINT;
const PORT = process.env.NEPTUNE_PORT || '8182';
const REGION = process.env.AWS_REGION || 'us-west-2';

const signer = new SignatureV4({
  service: 'neptune-db',
  region: REGION,
  credentials: defaultProvider(),
  sha256: Sha256,
});

export async function neptuneQuery(cypher) {
  const url = new URL(`https://${NEPTUNE}:${PORT}/openCypher`);
  const body = `query=${encodeURIComponent(cypher)}`;
  const req = new HttpRequest({
    method: 'POST',
    protocol: 'https:',
    hostname: NEPTUNE,
    port: parseInt(PORT),
    path: '/openCypher',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      host: `${NEPTUNE}:${PORT}`,
    },
    body,
  });
  const signed = await signer.sign(req);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: signed.headers,
    body,
  });
  if (!res.ok) throw new Error(`Neptune ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.results;
}
