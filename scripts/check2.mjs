import { readFileSync, writeFileSync } from 'fs';
const file = 'artifacts/agenario/src/pages/scan-results.tsx';
let content = readFileSync(file, 'utf8');

// Check what's on line 3214
const lines = content.split('\n');
const line3214 = lines[3213]; // 0-indexed
console.log('Line 3214:', JSON.stringify(line3214));
console.log('Hex:', Buffer.from(line3214).toString('hex'));

const line5754 = lines[5753];
console.log('Line 5754:', JSON.stringify(line5754.substring(0, 100)));

const line3212 = lines[3211];
console.log('Line 3212:', JSON.stringify(line3212));
console.log('Hex:', Buffer.from(line3212).toString('hex'));
