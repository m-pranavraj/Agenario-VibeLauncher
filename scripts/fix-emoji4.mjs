import { readFileSync, writeFileSync } from 'fs';
const file = 'artifacts/agenario/src/pages/scan-results.tsx';
let content = readFileSync(file, 'utf8');

const win1252extra = { 0x80:0x20AC,0x82:0x201A,0x83:0x0192,0x84:0x201E,0x85:0x2026,0x86:0x2020,0x87:0x2021,0x88:0x02C6,0x89:0x2030,0x8A:0x0160,0x8B:0x2039,0x8C:0x0152,0x8E:0x017D,0x91:0x2018,0x92:0x2019,0x93:0x201C,0x94:0x201D,0x95:0x2022,0x96:0x2013,0x97:0x2014,0x98:0x02DC,0x99:0x2122,0x9A:0x0161,0x9B:0x203A,0x9C:0x0153,0x9E:0x017E,0x9F:0x0178 };
function bytesToMojibake(bytes) { return bytes.map(b => String.fromCodePoint(b<0x80?b:(b<0xA0?(win1252extra[b]||b):b))).join(''); }
function emoji(cp) { const s=String.fromCodePoint(cp); const buf=Buffer.from(s,'utf8'); return [bytesToMojibake([...buf]),s]; }

// Lock emoji: hex in line is c3b0 c5b8 e2809d e28098
// That's 4 chars: U+00F0(ð) U+0178(Ÿ) U+201D(") U+2018(')
// Wait, e2 80 9d = U+201D (right double quote already fixed?)
// Actually these ARE the mojibake pattern for F0 9F 94 92 (U+1F512 lock)
// F0->ð U+00F0, 9F->Ÿ U+0178, 94->"  U+201D, 92->' U+2019
// And e2 80 9d in the hex IS U+201D (we already replaced " -> U+201D)
// And e2 80 98 IS U+2018 (left single quote '  )
// So the bad string is now: U+00F0 U+0178 U+201D U+2018 (after our prior fixes!)
const lockBad = '\u00f0\u0178\u201d\u2018';
const lockGood = '\uD83D\uDD12'; // 🔒

// arrows U+1F504 = F0 9F 94 84:
// F0->ð, 9F->Ÿ, 94->" U+201D, 84->„ U+201E
const arrowBad = '\u00f0\u0178\u201d\u201e';
const arrowGood = '\uD83D\uDD04'; // 🔄

// cloud with lightning U+26C8... let me check: hex c3 a2 cb 9c c2 81 c3 af c2 b8 c2 8f
// c3 a2 = U+00E2, cb 9c = U+02DC(˜), c2 81 = U+0081, c3 af = U+00EF, c2 b8 = U+00B8, c2 8f = U+008F
// Wait, â˜ï¸ : â = U+00E2, ˜ = U+02DC, (nothing visible? or variant selector?)
// Actually ☁ is U+2601 = E2 98 81 in UTF-8
// E2 -> â U+00E2, 98 -> ˜ U+02DC (win1252 0x98=˜), 81 -> U+0081
// But the hex shows: c3 a2 cb 9c c2 81 ... that's ☁ (cloud) mojibake
// Then c3 af = U+00EF = ï, c2 b8 = U+00B8 = ·, c2 8f = U+008F
// ï¸ with 0x8F -> FE 0F = variation selector-16
// So original bytes: E2 98 81 EF B8 8F = U+2601 U+FE0F = ☁️
const cloudBad = '\u00e2\u02dc\u0081\u00ef\u00b8\u008f';
// But after our prior pass: 0x98->U+02DC and 0x94->U+201D etc 
// Let's check: 98 maps to U+02DC(˜), 81 stays as U+0081
// So cloudBad = U+00E2 U+02DC U+0081 U+00EF U+00B8 U+008F
const cloudGood = '\u2601\uFE0F'; // ☁️

let count = 0;
const fixes = [[lockBad, lockGood], [arrowBad, arrowGood], [cloudBad, cloudGood]];
for (const [bad, good] of fixes) {
  const parts = content.split(bad);
  if (parts.length > 1) { console.log(`Fixed ${JSON.stringify(bad)} -> ${good} [${parts.length-1}x]`); content = parts.join(good); count += parts.length-1; }
  else { console.log(`Not found: hex=${Buffer.from(bad).toString('hex')}`); }
}
console.log(`Total: ${count}`);
writeFileSync(file, content, 'utf8');

// Verify
const remaining = content.match(/ðŸ"'|ðŸ"„|â˜ï¸/g);
console.log('Remaining:', remaining);
