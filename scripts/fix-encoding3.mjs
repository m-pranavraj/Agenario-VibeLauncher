import { readFileSync, writeFileSync } from 'fs';

const file = 'artifacts/agenario/src/pages/scan-results.tsx';
let content = readFileSync(file, 'utf8');

// c3 83 e2 80 94 = U+00C3 + U+2014 (em dash already replaced into this position)
// This is: Ã + em dash — that means the multiplication sign Ã— was partially fixed
// c3 83 e2 80 94 = "Ã—" where e2 80 94 is already fixed em dash... 
// wait: c3 83 = U+00C3 = Ã, e2 80 94 = U+2014 = —
// So we got "Ã—" in the file but the e2 80 94 became U+2014 in our first pass
// The original was Ã× = c3 97 (where 97 = × U+00D7)
// But the hex shows c3 83 e2 80 94 for the Ã— remaining
// This means the original bytes were c3 97 BUT we already ran a replacement pass
// and c3 97 wasn't Ã×... let me look more carefully:
// c3 83 e2 80 94 - these are 5 bytes for 3 chars: U+00C3(Ã) U+2014(—) 
// Wait: c3 83 = U+00C3 = Ã, then e2 80 94 = em dash (already was replaced)
// So after our first pass turned e2 80 94 -> em dash, we have Ã—
// But originally it was 3 bytes: c3 b7? No...
// The original mojibake for × (U+00D7) when UTF-8 encoded as c3 97:
// c3 97 -> read as latin1: Ã (0xC3) and × (0x97 in latin1 is a special char)
// In Windows-1252: 0x97 = — (en dash), so c3 97 as mojibake = Ã—
// When re-encoded as UTF-8: c3 83 (for Ã U+00C3) + e2 80 94 (for — U+2014)
// YES! That's what we see. And our first pass fixed e2 80 94 -> U+2014 em dash
// So now we have U+00C3 + U+2014 where we want U+00D7 (×)
// Let's fix the remaining 3 patterns directly

// Fix multiplication sign: U+00C3 U+2014 -> U+00D7 (×)
// But this would break any legitimate Ã— that isn't multiplication... 
// Let's check context
const idx = content.indexOf('\u00c3\u2014');
if (idx >= 0) {
  console.log('Found U+00C3 U+2014 at', idx, ':', JSON.stringify(content.substring(idx-5, idx+10)));
}

// The actual remaining patterns based on the hex output:
// ~10Ã—. -> c3 83 e2 80 94 (which after our fix is U+00C3 U+2014)
// Let's check and replace these specific contexts

const fixes = [
  // Ã— multiplication sign remaining (now stored as U+00C3 + U+2014)
  ['\u00c3\u2014', '\u00d7'],
  // em dash patterns that weren't caught in first pass
  // "4â€"5" -> hex 34 c3a2 e282ac e2809c 35 = 4 + U+00E2 + U+20AC + U+201C + 5
  ['\u00e2\u20ac\u201c', '\u2014'],  // different em-dash mojibake variant
  // "0â€"100" same pattern
];

let count = 0;
for (const [bad, good] of fixes) {
  const parts = content.split(bad);
  if (parts.length > 1) {
    console.log(`Replacing "${bad}" [${parts.length - 1} times]`);
    content = parts.join(good);
    count += parts.length - 1;
  }
}

console.log(`Total: ${count} replacements`);
writeFileSync(file, content, 'utf8');

// Verify
const remaining = content.match(/\u00c3\u2014|\u00e2\u20ac\u201c/g);
console.log('Remaining:', remaining ? remaining.length : 0);
