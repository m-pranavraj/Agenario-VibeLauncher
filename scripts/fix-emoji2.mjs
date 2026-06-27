import { readFileSync, writeFileSync } from 'fs';

const file = 'artifacts/agenario/src/pages/scan-results.tsx';
let content = readFileSync(file, 'utf8');

// Unicode code points to build correct emoji strings
const U = (cp) => String.fromCodePoint(cp);

// Build the bad mojibake strings from their byte patterns
// A 4-byte UTF-8 emoji like U+1F7E2 (green circle) encodes as:
// F0 9F 9F A2 in UTF-8
// When these 4 bytes are read as Latin-1/Win-1252 chars:
// F0 = ð, 9F = \x9F (Windows-1252 maps 9F to Ÿ), 9F = Ÿ, A2 = ¢
// Wait: in Windows-1252: 9F = Ÿ (U+0178)
// But the file shows "ðŸŸ¢" which is:
// ð = U+00F0, Ÿ = U+0178, ¢ = U+00A2
// As UTF-8 bytes: F0 C5 B8 C2 A2... hmm that's 5 bytes for 3 chars
// But in Win-1252 interpretation: F0 9F 9F A2 -> ð Ÿ Ÿ ¢
// Oh wait: "ðŸŸ¢" is 4 chars: ð (U+00F0) + Ÿ (U+0178) + Ÿ (U+0178) + ¢ (U+00A2)
// But U+0178 is Ÿ, U+00F0 is ð, U+00A2 is ¢

// Actually the mojibake happens like this for 4-byte emojis:
// U+1F7E2 = F0 9F 9F A2 in UTF-8
// Each byte interpreted as Win-1252:
// F0 -> ð (U+00F0)
// 9F -> Ÿ (U+0178) [Win-1252 0x9F = U+0178]  
// 9F -> Ÿ (U+0178) 
// A2 -> ¢ (U+00A2)
// Then those 4 chars encoded as UTF-8:
// ð (U+00F0) = C3 B0
// Ÿ (U+0178) = C5 B8
// Ÿ (U+0178) = C5 B8
// ¢ (U+00A2) = C2 A2
// So ðŸŸ¢ in the file = bytes C3 B0 C5 B8 C5 B8 C2 A2

// This is getting complex. Let's just build the known mojibake strings character by character
// using Unicode code points, which are safe in JS:

const win1252extra = {
  0x80: 0x20AC, // €
  0x81: 0x0081,
  0x82: 0x201A, // ‚
  0x83: 0x0192, // ƒ
  0x84: 0x201E, // „
  0x85: 0x2026, // …
  0x86: 0x2020, // †
  0x87: 0x2021, // ‡
  0x88: 0x02C6, // ˆ
  0x89: 0x2030, // ‰
  0x8A: 0x0160, // Š
  0x8B: 0x2039, // ‹
  0x8C: 0x0152, // Œ
  0x8D: 0x008D,
  0x8E: 0x017D, // Ž
  0x8F: 0x008F,
  0x90: 0x0090,
  0x91: 0x2018, // '
  0x92: 0x2019, // '
  0x93: 0x201C, // "
  0x94: 0x201D, // "
  0x95: 0x2022, // •
  0x96: 0x2013, // –
  0x97: 0x2014, // —
  0x98: 0x02DC, // ˜
  0x99: 0x2122, // ™
  0x9A: 0x0161, // š
  0x9B: 0x203A, // ›
  0x9C: 0x0153, // œ
  0x9D: 0x009D,
  0x9E: 0x017E, // ž
  0x9F: 0x0178, // Ÿ
};

function bytesToMojibake(bytes) {
  // Convert UTF-8 bytes -> interpret as Win-1252 -> build Unicode string -> encode as UTF-8 string
  return bytes.map(b => {
    const cp = b < 0x80 ? b : (b < 0xA0 ? (win1252extra[b] || b) : b);
    return String.fromCodePoint(cp);
  }).join('');
}

// Build pairs: [mojibake, correct_string]
// For emoji like U+1F7E2, UTF-8 bytes are F0 9F 9F A2
function emoji(cp) {
  const s = String.fromCodePoint(cp);
  const buf = Buffer.from(s, 'utf8');
  const mojibake = bytesToMojibake([...buf]);
  return [mojibake, s];
}

const emojiPairs = [
  emoji(0x1F7E2), // 🟢 green circle
  emoji(0x1F535), // 🔵 blue circle
  emoji(0x26AA),  // ⚪ white circle (3-byte)
  emoji(0x1F7E1), // 🟡 yellow circle
  emoji(0x1F7E0), // 🟠 orange circle
  emoji(0x1FA77), // 🩷 pink heart
  emoji(0x1F30A), // 🌊 wave
  emoji(0x1F916), // 🤖 robot
  emoji(0x1F534), // 🔴 red circle
  emoji(0x1F4B3), // 💳 credit card
  emoji(0x1F5C4), // 🗄 file cabinet
  emoji(0x1F512), // 🔒 lock
  emoji(0x1F510), // 🔐 locked with key
  emoji(0x1F4E7), // 📧 email
  emoji(0x1F4AC), // 💬 speech bubble
  emoji(0x1F4E6), // 📦 box
  emoji(0x1F513), // 🔓 unlocked
  emoji(0x1F9F9), // 🧹 broom
  emoji(0x1F4A1), // 💡 lightbulb
  emoji(0x1F680), // 🚀 rocket
  emoji(0x26A0),  // ⚠ warning (3-byte, no variation selector)
  emoji(0x1F3AF), // 🎯 dart
  emoji(0x1F4CB), // 📋 clipboard
  emoji(0x1F9E0), // 🧠 brain
  emoji(0x1F4F8), // 📸 camera
  emoji(0x1F389), // 🎉 party
  emoji(0x1F517), // 🔗 link
  emoji(0x26A1),  // ⚡ zap (3-byte)
  emoji(0x1F504), // 🔄 arrows
  emoji(0x1F50D), // 🔍 magnifying glass
  emoji(0x1F4F5), // 📵 no mobile (probably used differently)
];

// Also fix ⚠️ which may be ⚠ + variation selector U+FE0F
// variation selector: FE 0F in UTF-8

let count = 0;
for (const [bad, good] of emojiPairs) {
  if (!bad || bad === good) continue;
  const parts = content.split(bad);
  if (parts.length > 1) {
    console.log(`Replacing "${bad}" -> "${good}" [${parts.length - 1}x]`);
    content = parts.join(good);
    count += parts.length - 1;
  }
}

console.log(`Total: ${count} emoji replacements`);
writeFileSync(file, content, 'utf8');
