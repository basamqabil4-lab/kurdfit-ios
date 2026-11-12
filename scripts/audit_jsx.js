const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../app/page.js'), 'utf8');
const lines = content.split('\n');
const kurdishCharRegex = /[\u0600-\u06FF]/;

const jsxHardcoded = [];

lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  if (lineNum < 1700) return; // After setup/helpers
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

  // Look for Kurdish text in JSX that isn't wrapped in t(...) or a language condition
  if (kurdishCharRegex.test(line)) {
    // If line has JSX-like syntax: >text< or placeholder="..." or title="..." or label
    const isJsx = line.includes('>') || line.includes('placeholder=') || line.includes('title=') || line.includes('label=') || line.includes('alt=');
    const isLocalized = line.includes('t(') || line.includes('currentLangConfig') || line.includes('language ===');
    if (isJsx && !isLocalized) {
      jsxHardcoded.push({ lineNum, line: trimmed });
    }
  }
});

console.log(`Found ${jsxHardcoded.length} hardcoded JSX lines:\n`);
jsxHardcoded.forEach(item => {
  console.log(`${item.lineNum}: ${item.line}`);
});
