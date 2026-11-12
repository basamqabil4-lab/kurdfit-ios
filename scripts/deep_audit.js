const fs = require('fs');
const path = require('path');

const pageContent = fs.readFileSync(path.join(__dirname, '../app/page.js'), 'utf8');
const cssContent = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8');

console.log('=== GYM 4 DEEP CODEBASE & THEME AUDIT ===\n');

// 1. Check all Modals in page.js
const modalRegex = /\{(\w*show\w*Modal|\w*Modal\w*)\s*&&/g;
let match;
const modals = new Set();
while ((match = modalRegex.exec(pageContent)) !== null) {
  modals.add(match[1]);
}
console.log('Found Modals / Sheets:', Array.from(modals));

// 2. Scan for hardcoded colors in page.js that may cause contrast issues in Light Mode
const lines = pageContent.split('\n');
const hardcodedIssues = [];

lines.forEach((line, idx) => {
  // Check for hardcoded white text on elements without explicit dark background
  if (line.includes("color: '#ffffff'") || line.includes('color: "#ffffff"') || line.includes("color: 'white'") || line.includes('color: "white"')) {
    // Check if the same line or context specifies a dark background or gradient
    const hasDarkBg = line.includes('background') && (
      line.includes('var(--accent') || line.includes('gradient') || line.includes('#1') || line.includes('#2') || line.includes('#0') || line.includes('rgba(0') || line.includes('rgba(2')
    );
    if (!hasDarkBg) {
      hardcodedIssues.push({ line: idx + 1, text: line.trim(), reason: 'Hardcoded white text without co-located dark background' });
    }
  }

  // Check for hardcoded dark background without theme check
  if ((line.includes("background: '#1") || line.includes("background: '#0") || line.includes("background: 'linear-gradient(180deg, #181c30")) && !line.includes("theme ===") && !line.includes("var(")) {
    hardcodedIssues.push({ line: idx + 1, text: line.trim(), reason: 'Hardcoded dark background in inline style' });
  }

  // Check for dark card hardcoded inline styling
  if (line.includes("rgba(32, 38, 66") || line.includes("rgba(20, 24, 44") || line.includes("rgba(35, 42, 75")) {
    hardcodedIssues.push({ line: idx + 1, text: line.trim(), reason: 'Hardcoded dark blue glass navy in inline style' });
  }
});

console.log(`\nFound ${hardcodedIssues.length} potential inline theme conflicts.`);
console.log('Sample issues:');
hardcodedIssues.slice(0, 15).forEach(issue => {
  console.log(`L${issue.line} [${issue.reason}]: ${issue.text.substring(0, 90)}...`);
});

// 3. Scan globals.css for light-theme coverage
console.log('\n=== CSS Light Theme Coverage Check ===');
const cssClasses = ['dark-card', 'liquid-card', 'liquid-pill', 'modal-content', 'bottom-sheet-content', 'bottom-nav', 'liquid-mesh-blob'];
cssClasses.forEach(cls => {
  const hasDark = cssContent.includes(`.${cls}`);
  const hasLight = cssContent.includes(`.light-theme .${cls}`) || cssContent.includes(`.light-theme [class*="${cls}"]`);
  console.log(`.${cls}: Dark defined: ${hasDark}, Light override: ${hasLight}`);
});

