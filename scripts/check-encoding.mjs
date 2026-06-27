import { readFileSync, writeFileSync } from 'fs';

const file = 'artifacts/agenario/src/pages/scan-results.tsx';
let content = readFileSync(file, 'utf8');

// Check what bytes are still wrong
const idx1 = content.indexOf('~10');
if (idx1 >= 0) {
  const snip = content.substring(idx1, idx1 + 10);
  console.log('snip ~10:', JSON.stringify(snip), Buffer.from(snip).toString('hex'));
}

const idx2 = content.indexOf('4â');
if (idx2 >= 0) {
  const snip = content.substring(idx2, idx2 + 10);
  console.log('snip 4â:', JSON.stringify(snip), Buffer.from(snip).toString('hex'));
}

const idx3 = content.indexOf('0â');
if (idx3 >= 0) {
  const snip = content.substring(idx3, idx3 + 10);
  console.log('snip 0â:', JSON.stringify(snip), Buffer.from(snip).toString('hex'));
}
