const fs = require('fs');
const path = require('path');
const p = fs.readFileSync(path.join(__dirname, '../app/page.js'), 'utf8');

const modals = [
  'showAiFoodModal',
  'showNotificationsModal',
  'showNewCourseModal',
  'showAiDietModal',
  'showSettingsModal',
  'showAuthModal',
  'showEditProfileModal',
  'showGoalModal',
  'showHomeMealsModal',
  'showScanModal',
  'showResetModal',
  'showWorkoutCompleteModal',
  'selectedFoodForPortion'
];

modals.forEach(m => {
  const searchPattern = m + ' &&';
  const idx = p.indexOf(searchPattern);
  if (idx !== -1) {
    const chunk = p.substring(idx, idx + 600);
    console.log('=== ' + m + ' ===');
    console.log(chunk.split('\n').slice(0, 15).join('\n'));
    console.log('-------------------------------------------');
  }
});
