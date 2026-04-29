import { build } from 'esbuild';

const shared = {
  bundle: true, platform: 'node', target: 'node20', format: 'esm',
  banner: { js: "import{createRequire}from'module';const require=createRequire(import.meta.url);" },
};

// top.mjs only uses @aws-sdk (provided by Lambda runtime)
await build({ ...shared, entryPoints: ['handlers/top.mjs'], outfile: 'dist/top/index.mjs', external: ['@aws-sdk/*'] });

// search + person use @aws-crypto and @smithy for Neptune SigV4 — must bundle those
await build({ ...shared, entryPoints: ['handlers/search.mjs'], outfile: 'dist/search/index.mjs', external: ['@aws-sdk/client-bedrock-runtime', '@aws-sdk/credential-provider-node'] });
await build({ ...shared, entryPoints: ['handlers/person.mjs'], outfile: 'dist/person/index.mjs', external: ['@aws-sdk/client-bedrock-runtime', '@aws-sdk/credential-provider-node'] });

console.log('Built: top, search, person');
