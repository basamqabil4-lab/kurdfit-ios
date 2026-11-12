const fs = require('fs');
const path = require('path');

const page = fs.readFileSync(path.join(__dirname, '../app/page.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8');

console.log('====================================================');
console.log('    GYM 4 APP: COMPREHENSIVE UI & THEME AUDIT');
console.log('====================================================\n');

// 1. Analyze CSS Variable System
console.log('--- 1. CSS Variables System Check ---');
const darkVars = {};
const lightVars = {};

const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
if (rootMatch) {
  rootMatch[1].split(';').forEach(decl => {
    const parts = decl.split(':');
    if (parts.length >= 2 && parts[0].trim().startsWith('--')) {
      darkVars[parts[0].trim()] = parts.slice(1).join(':').trim();
    }
  });
}

const lightMatch = css.match(/\.light-theme\s*\{([^}]+)\}/);
if (lightMatch) {
  lightMatch[1].split(';').forEach(decl => {
    const parts = decl.split(':');
    if (parts.length >= 2 && parts[0].trim().startsWith('--')) {
      lightVars[parts[0].trim()] = parts.slice(1).join(':').trim();
    }
  });
}

console.log(`Dark theme defines ${Object.keys(darkVars).length} variables.`);
console.log(`Light theme defines ${Object.keys(lightVars).length} variables.`);

// Check for missing variables in light theme
const missingInLight = Object.keys(darkVars).filter(v => !(v in lightVars) && !v.startsWith('--accent'));
console.log('Variables not explicitly mapped in .light-theme:', missingInLight);

// 2. Scan for hardcoded #ffffff and #000000 in page.js
console.log('\n--- 2. Hardcoded Text & Color Audit in page.js ---');
const lines = page.split('\n');
const whiteTextLocations = [];
const blackTextLocations = [];
const inlineGradients = [];

lines.forEach((l, idx) => {
  const lineNo = idx + 1;
  // White color checks
  if (/(?:color:\s*['"](?:#ffffff|white)['"])/i.test(l)) {
    // If line has no accent background or dark background
    if (!l.includes('var(--accent') && !l.includes('linear-gradient(90deg') && !l.includes('#EF4444') && !l.includes('rgba(239, 68, 68')) {
      whiteTextLocations.push({ line: lineNo, code: l.trim() });
    }
  }
  // Black color checks
  if (/(?:color:\s*['"](?:#000000|black|#0f172a)['"])/i.test(l)) {
    blackTextLocations.push({ line: lineNo, code: l.trim() });
  }
  // Dark gradients in inline styles
  if (l.includes("linear-gradient(") && (l.includes("#181c30") || l.includes("#101222") || l.includes("#0f172a") || l.includes("rgba(32, 38, 66") || l.includes("rgba(35, 42, 75"))) {
    inlineGradients.push({ line: lineNo, code: l.trim() });
  }
});

console.log(`Total lines with isolated white text: ${whiteTextLocations.length}`);
console.log(`Total lines with dark inline gradients: ${inlineGradients.length}`);

// 3. Examine each Tab View in page.js
console.log('\n--- 3. View / Tab Implementation Audits ---');
const tabs = ['home', 'workout', 'diet', 'progress', 'profile', 'ai'];
tabs.forEach(tab => {
  const tabPattern = `activeTab === '${tab}'`;
  const count = (page.match(new RegExp(tabPattern, 'g')) || []).length;
  console.log(`Tab '${tab}': referenced ${count} times in conditional rendering.`);
});

// 4. Examine Bottom Sheets & Modals
console.log('\n--- 4. Modal and Bottom Sheet Accessibility in Light/Dark ---');
const modalNames = [
  'showHomeMealsModal',
  'showScanModal',
  'showAiFoodModal',
  'showNotificationsModal',
  'showNewCourseModal',
  'showAiDietModal',
  'showSettingsModal',
  'showAuthModal',
  'showEditProfileModal',
  'showGoalModal',
  'showResetModal',
  'selectedFoodForPortion'
];

modalNames.forEach(m => {
  const startIdx = page.indexOf(`${m} &&`);
  if (startIdx === -1) {
    console.log(`Modal ${m}: NOT FOUND`);
    return;
  }
  const snippet = page.substring(startIdx, startIdx + 800);
  const usesBottomSheet = snippet.includes('bottom-sheet-content');
  const hasHardcodedBg = snippet.includes('linear-gradient(180deg, #181c30') || snippet.includes('backgroundColor: \'rgba(0,0,0');
  const hasHardcodedWhiteText = snippet.includes("color: '#ffffff'") || snippet.includes('color: "#ffffff"');
  console.log(`Modal [${m}]: bottom-sheet: ${usesBottomSheet}, hardcoded dark bg: ${hasHardcodedBg}, hardcoded white text: ${hasHardcodedWhiteText}`);
});

