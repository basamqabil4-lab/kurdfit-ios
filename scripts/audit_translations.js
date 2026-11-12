const fs = require('fs');
const page = fs.readFileSync('app/page.js', 'utf8');

console.log('=== LANGUAGE AUDIT ANALYSIS ===\n');

// 1. Check keys in TRANSLATIONS.ku vs TRANSLATIONS.en
const kuBlockMatch = page.match(/ku:\s*\{([\s\S]*?)\n\s{2}\},\s*\n\s{2}en:/);
const enBlockMatch = page.match(/en:\s*\{([\s\S]*?)\n\s{2}\}\s*\n\};/);

let kuKeys = [];
let enKeys = [];

if (kuBlockMatch) {
  const keyMatches = kuBlockMatch[1].match(/^\s{4}([a-zA-Z0-9_]+):/gm);
  if (keyMatches) {
    kuKeys = keyMatches.map(k => k.trim().replace(':', ''));
  }
}

if (enBlockMatch) {
  const keyMatches = enBlockMatch[1].match(/^\s{4}([a-zA-Z0-9_]+):/gm);
  if (keyMatches) {
    enKeys = keyMatches.map(k => k.trim().replace(':', ''));
  }
}

console.log('Total keys in ku:', kuKeys.length);
console.log('Total keys in en:', enKeys.length);

const missingInEn = kuKeys.filter(k => !enKeys.includes(k));
const missingInKu = enKeys.filter(k => !kuKeys.includes(k));

console.log('Keys in ku but missing in en (' + missingInEn.length + '):', missingInEn);
console.log('Keys in en but missing in ku (' + missingInKu.length + '):', missingInKu);

// 2. Find all t('...') calls in page.js
const tCallRegex = /\bt\(\s*['"]([a-zA-Z0-9_]+)['"]\s*\)/g;
const usedTKeys = new Set();
let match;
while ((match = tCallRegex.exec(page)) !== null) {
  usedTKeys.add(match[1]);
}

console.log('\nTotal unique t(...) calls in page.js:', usedTKeys.size);
const missingFromKu = Array.from(usedTKeys).filter(k => !kuKeys.includes(k));
console.log('t(...) keys called in UI but missing from TRANSLATIONS.ku (' + missingFromKu.length + '):', missingFromKu);

// 3. Scan for Kurdish text that is hardcoded (not using t())
const kurdishCharRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const lines = page.split('\n');
let kurdishLinesTotal = 0;
let hardcodedKurdishLines = [];

lines.forEach((l, idx) => {
  if (kurdishCharRegex.test(l)) {
    kurdishLinesTotal++;
    // Exclude TRANSLATIONS definition (lines 500-615)
    if (idx < 500 || idx > 660) {
      if (!l.includes("t('") && !l.includes('t("')) {
        hardcodedKurdishLines.push({ line: idx + 1, text: l.trim() });
      }
    }
  }
});

console.log('\nTotal lines containing Kurdish script:', kurdishLinesTotal);
console.log('Lines containing hardcoded Kurdish outside TRANSLATIONS:', hardcodedKurdishLines.length);

console.log('\nSample hardcoded areas:');
hardcodedKurdishLines.slice(0, 20).forEach(h => {
  console.log(`L${h.line}: ${h.text.substring(0, 90)}`);
});
