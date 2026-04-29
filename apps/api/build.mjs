import { build } from 'esbuild';
import { readdirSync } from 'fs';

const handlers = readdirSync('handlers').filter(f => f.endsWith('.mjs'));
await Promise.all(handlers.map(f => build({
  entryPoints: [`handlers/${f}`],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: `dist/${f.replace('.mjs', '/index.mjs')}`,
  banner: { js: "import{createRequire}from'module';const require=createRequire(import.meta.url);" },
  external: ['@aws-sdk/*'],
})));
console.log('Built:', handlers);
