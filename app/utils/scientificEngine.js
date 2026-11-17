// Scientific Workout and Nutrition Engine for Kurd Fit
import { resolveVerifiedExerciseEntry, VERIFIED_EXERCISES_BY_ID } from './exerciseMedia.js';

export function cleanJsonText(str) {
  if (!str) return '{}';
  let clean = str.replace(/```json/gi, '').replace(/```/gi, '').trim();
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = clean.lastIndexOf('}');
    if (lastBrace !== -1) clean = clean.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1) {
    const lastBracket = clean.lastIndexOf(']');
    if (lastBracket !== -1) clean = clean.substring(firstBracket, lastBracket + 1);
  }
  return clean;
}

export function normalizeExperienceLevel(level = 'intermediate') {
  const raw = String(level || '').toLowerCase().trim();
  if (raw === 'beginner' || raw.includes('سەرەتایی') || raw.includes('مبتدئ') || raw.includes('مبتدی')) return 'beginner';
  if (raw === 'advanced' || raw.includes('پێشکەوتوو') || raw.includes('متقدم') || raw.includes('پیشرفته')) return 'advanced';
  return 'intermediate';
}

export function parseInjuryFlags(healthConditions = []) {
  const list = Array.isArray(healthConditions)
    ? healthConditions
    : (healthConditions ? [String(healthConditions)] : []);
  const norm = list.map(c => String(c || '').toLowerCase());
  return {
    hasBack: norm.some(c =>
      c.includes('پشت') || c.includes('دیسک') || c.includes('بڕبڕە') ||
      c.includes('back') || c.includes('disc') || c.includes('disk') ||
      c.includes('spine') || c.includes('lumbar') || c.includes('sciatica') ||
      c.includes('الظهر') || c.includes('ديسك') || c.includes('کمر')
    ),
    hasKnee: norm.some(c =>
      c.includes('ئەژنۆ') || c.includes('knee') || c.includes('meniscus') ||
      c.includes('acl') || c.includes('patella') || c.includes('الركبة') ||
      c.includes('ركبة') || c.includes('زانو')
    ),
    hasShoulder: norm.some(c =>
      c.includes('شان') || c.includes('shoulder') || c.includes('rotator') ||
      c.includes('impingement') || c.includes('الكتف') || c.includes('كتف') ||
      c.includes('شانه')
    )
  };
}

export function getDefaultWarmUpNote(lang = 'ku') {
  if (lang === 'en') return 'Warm-up: 2 ramp-up sets (50% × 8 reps, 75% × 4 reps) before working sets';
  if (lang === 'ar') return 'الإحماء: مجموعتان تدريجيتان (50% × 8 تكرارات، 75% × 4 تكرارات) قبل المجموعات الأساسية';
  if (lang === 'fa') return 'گرم کردن: ۲ ست آماده‌سازی (۵۰٪ × ۸ تکرار، ۷۵٪ × ۴ تکرار) پیش از ست‌های اصلی';
  return 'گەرمکردن: ٢ سێتی ئامادەکاری (٥٠٪ × ٨ تەکرار، ٧٥٪ × ٤ تەکرار) پێش سێتە سەرەکییەکان';
}

export function getMesocycleNote(lang = 'ku') {
  if (lang === 'en') {
    return '5-Week Mesocycle: Weeks 1–4 apply progressive overload (+1–2 reps or +2.5 kg weekly within target RIR); Week 5 is a scheduled Deload week (reduce working sets by ~40% with lighter load for full recovery).';
  }
  if (lang === 'ar') {
    return 'دورة تدريبية من 5 أسابيع: الأسابيع 1–4 لزيادة الحمل التدريجي (+1–2 تكرار أو +2.5 كغم أسبوعياً)؛ الأسبوع 5 أسبوع استشفاء (Deload) بتقليل المجموعات بنسبة 40%.';
  }
  if (lang === 'fa') {
    return 'چرخه‌ ۵ هفته‌ای: هفته‌های ۱ تا ۴ اضافه‌بار تدریجی (+۱ تا ۲ تکرار یا +۲.۵ کیلوگرم)؛ هفته ۵ هفته ریکاوری (Deload) با کاهش ۴۰ درصدی ست‌ها.';
  }
  return 'خولی زانستیی ٥ هەفتەیی (Mesocycle): هەفتەکانی ١–٤ زیادکردنی پلەبەندی بار (+١–٢ تەکرار یان +٢.٥ کگ هەفتانە لەناو RIR دیاریکراو)؛ هەفتەی ٥ هەفتەی دیڵۆدە (Deload) بە کەمکردنەوەی ٤٠٪ ی کۆمەڵەکان (Sets) بۆ چاکبوونەوەی تەواو.';
}

export function classifyExerciseTier(ex) {
  const en = (ex?.englishName || ex?.canonicalName || ex?.name || '').toLowerCase();
  if (
    en.includes('bike') || en.includes('treadmill') || en.includes('walk') ||
    en.includes('elliptical') || en.includes('cycling') || en.includes('running') ||
    en.includes('march') || en.includes('mountain climber') || en.includes('jump rope')
  ) {
    return 'cardio';
  }
  const isHeavyLower = (
    (en.includes('squat') && !en.includes('goblet') && !en.includes('bulgarian') && !en.includes('split') && !en.includes('bodyweight')) ||
    en.includes('deadlift') ||
    en.includes('leg press') ||
    en.includes('hip thrust')
  );
  const isHeavyUpper = (
    en.includes('barbell bench') || en.includes('incline dumbbell bench') || en.includes('incline barbell') ||
    en.includes('machine chest press') || en.includes('neutral-grip machine press') || en.includes('neutral grip machine press') ||
    en.includes('barbell row') || en.includes('bent over row') || en.includes('chest-supported') || en.includes('chest supported') ||
    en.includes('lat pulldown') || en.includes('pull-up') || en.includes('chin-up') ||
    en.includes('overhead press') || en.includes('military press')
  );
  if (isHeavyLower || isHeavyUpper) return 'heavy_compound';

  const isSecondary = (
    en.includes('press') || en.includes('row') || en.includes('squat') || en.includes('lunge') ||
    en.includes('dip') || en.includes('push-up') || en.includes('push up') ||
    en.includes('hyperextension') || en.includes('glute bridge') || en.includes('reverse push')
  );
  if (isSecondary) return 'secondary_compound';

  return 'isolation';
}

export function normalizeScientificRest(ex) {
  const tier = classifyExerciseTier(ex);
  const parsed = parseInt(ex?.rest, 10);
  if (tier === 'heavy_compound') {
    if (!Number.isNaN(parsed) && parsed >= 150 && parsed <= 180) return `${parsed}s`;
    const en = (ex?.englishName || ex?.canonicalName || '').toLowerCase();
    return (en.includes('squat') || en.includes('deadlift') || en.includes('leg press') || en.includes('hip thrust')) ? '180s' : '150s';
  }
  if (tier === 'secondary_compound') {
    if (!Number.isNaN(parsed) && parsed >= 90 && parsed <= 120) return `${parsed}s`;
    const en = (ex?.englishName || ex?.canonicalName || '').toLowerCase();
    return (en.includes('push-up') || en.includes('pike') || en.includes('lunge') || en.includes('goblet') || en.includes('bridge')) ? '90s' : '120s';
  }
  if (tier === 'cardio') {
    if (!Number.isNaN(parsed) && parsed >= 60 && parsed <= 90) return `${parsed}s`;
    return '60s';
  }
  if (!Number.isNaN(parsed) && parsed >= 60 && parsed <= 90) return `${parsed}s`;
  const en = (ex?.englishName || ex?.canonicalName || '').toLowerCase();
  return (en.includes('leg curl') || en.includes('leg extension') || en.includes('pec deck') || en.includes('cable fly') || en.includes('overhead')) ? '75s' : '60s';
}

export function resolveCanonicalExerciseName(rawName = '', fallbackName = '') {
  const pickAscii = (val) => {
    const str = String(val || '')
      .replace(/\([^\)]*[\u0600-\u06FF][^\)]*\)/g, '')
      .replace(/[^\x20-\x7E\u00B0]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return str;
  };
  let candidate = pickAscii(rawName);
  if (!candidate || candidate.length < 3) {
    candidate = pickAscii(fallbackName);
  }
  if (!candidate) return '';
  return candidate.replace(/\s*\((?:stretch-mediated|quad isolation|machine|safe|tempo)[^)]*\)/gi, '').trim();
}

// قوفڵکردنی هەر ڕاهێنانێک لەسەر کەتەلۆگی پشتڕاستکراوی exercises-index.json (ID-Verified Zero-Guessing)
export function bindVerifiedExerciseMetadata(exObj, fallbackMuscle = '', trustExistingId = false) {
  if (!exObj || typeof exObj !== 'object') return exObj;
  const preferredId = (trustExistingId && exObj.exerciseId && VERIFIED_EXERCISES_BY_ID[exObj.exerciseId])
    ? exObj.exerciseId
    : '';

  const candidatesToTry = [
    resolveCanonicalExerciseName(exObj.canonicalName, ''),
    resolveCanonicalExerciseName(exObj.englishName, ''),
    resolveCanonicalExerciseName(exObj.nameEn, ''),
    resolveCanonicalExerciseName(exObj.name, ''),
  ].filter(Boolean);

  const muscleHint = exObj.muscle || fallbackMuscle || '';
  let verified = null;
  if (preferredId) {
    verified = resolveVerifiedExerciseEntry({ ...exObj, canonicalName: candidatesToTry[0] || '' }, muscleHint, preferredId);
  }
  if (!verified) {
    for (const candidateName of candidatesToTry) {
      verified = resolveVerifiedExerciseEntry(candidateName, muscleHint, '');
      if (verified) break;
    }
  }

  if (verified) {
    return {
      ...exObj,
      exerciseId: verified.exerciseId,
      canonicalName: verified.canonicalName,
      bodyPart: verified.bodyPart,
      englishName: exObj.englishName || candidatesToTry[0] || verified.canonicalName,
    };
  }

  return {
    ...exObj,
    exerciseId: null,
    canonicalName: candidatesToTry[0] || '',
  };
}

export function sanitizeWorkoutPlan(course, location = 'gym', equipment = '', healthConditions = [], lang = 'ku', athleteWeightKg = null) {
  if (!course || !Array.isArray(course.weeklyPlan)) return course;

  const isHome = (location === 'home') || (course.trainingLocation === 'home') || (course.location === 'home');
  const eq = (equipment || course.homeEquipment || '').toLowerCase();
  const hasDumbbells = eq.includes('دەستەوانە') || eq.includes('دەمبڵ') || eq.includes('dumbbell');
  const mergedConditions = Array.isArray(healthConditions) && healthConditions.length > 0
    ? healthConditions
    : (Array.isArray(course.healthConditions) ? course.healthConditions : []);
  if (mergedConditions.length > 0) {
    course.healthConditions = mergedConditions;
  }
  const { hasBack, hasKnee, hasShoulder } = parseInjuryFlags(mergedConditions);
  const exp = normalizeExperienceLevel(course.experienceLevel);

  const pickReplacement = (candidates, seenSet) => {
    for (const c of candidates) {
      if (!seenSet.has(c.englishName.toLowerCase())) return { ...c };
    }
    return { ...candidates[0] };
  };

  course.weeklyPlan.forEach(day => {
    if (!day || !Array.isArray(day.exercises)) return;

    let hasSeenBack = false;
    const seenExerciseKeys = new Set();
    const cleanList = [];

    day.exercises.forEach(rawEx => {
      if (!rawEx) return;
      const ex = { ...rawEx };
      const seededEnglish = resolveCanonicalExerciseName(rawEx.englishName || rawEx.canonicalName || rawEx.nameEn, rawEx.name);
      const origEnglish = seededEnglish || String(rawEx.englishName || rawEx.canonicalName || '');
      if (!ex.englishName && seededEnglish) ex.englishName = seededEnglish;
      let en = origEnglish.toLowerCase();
      let ku = (ex.name || '').toLowerCase();

      if (isHome && !hasDumbbells) {
        if (en.includes('squat') || ku.includes('سکوات')) {
          if (en.includes('bulgarian') || en.includes('split') || ku.includes('بولگاری')) {
            ex.englishName = 'Bulgarian Split Squats';
            ex.name = 'سکواتی بولگاری بە یەک پێ';
            ex.muscle = 'ڕان';
          } else {
            ex.englishName = 'Bodyweight Squats';
            ex.name = 'سکوات بە کێشی جەستە';
            ex.muscle = 'ڕان';
          }
        } else if (en.includes('lunge') || ku.includes('هەنگاونان') || ku.includes('لانجز')) {
          ex.englishName = 'Bodyweight Lunges';
          ex.name = 'هەنگاونان بێ کێش (Lunges)';
          ex.muscle = 'قاچ';
        } else if (en.includes('deadlift') || en.includes('romanian') || en.includes('glute') || en.includes('bridge') || en.includes('hip thrust') || ku.includes('دیدلیفت') || ku.includes('پرد')) {
          ex.englishName = 'Glute Bridge';
          ex.name = 'بەرزکردنەوەی حەوز لەسەر زەوی (Glute Bridge)';
          ex.muscle = 'سمت و پشت';
        } else if (en.includes('calf') || ku.includes('پوز') || ku.includes('سۆڵە')) {
          ex.englishName = 'Bodyweight Standing Calf Raise';
          ex.name = 'بەرزبوونەوە لەسەر پەنجەی پێ (Standing Calf Raise)';
          ex.muscle = 'پوز';
        } else if (en.includes('row') || en.includes('table') || en.includes('door') || en.includes('pull-up') || en.includes('chin-up') || en.includes('lat') || ku.includes('دەرگا') || ku.includes('مێز') || ku.includes('ڕاکێشان')) {
          if (hasSeenBack) {
            ex.englishName = 'Superman Holds';
            ex.name = 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman Holds)';
            ex.muscle = 'خوارەوەی پشت';
          } else {
            ex.englishName = 'Floor Reverse Push-up';
            ex.name = 'بەرزکردنەوەی جەستە بە ئەنیشک لەسەر زەوی (Reverse Push-up)';
            ex.muscle = 'پشت';
            hasSeenBack = true;
          }
        } else if (en.includes('superman') || en.includes('hyperextension') || ku.includes('سوپەرمان')) {
          ex.englishName = 'Superman Holds';
          ex.name = 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman Holds)';
          ex.muscle = 'خوارەوەی پشت';
        } else if (en.includes('pike') || (en.includes('shoulder') && !hasDumbbells) || ku.includes('پایک')) {
          ex.englishName = 'Pike Push-ups';
          ex.name = 'شناوی پایک بۆ شان (Pike Push-ups)';
          ex.muscle = 'شان';
        } else if (en.includes('leg raise') || en.includes('leg-hip') || ku.includes('بەرزکردنەوەی قاچ')) {
          ex.englishName = 'Lying Leg Raises';
          ex.name = 'بەرزکردنەوەی قاچ لەسەر زەوی بۆ سک';
          ex.muscle = 'سک';
        } else if (en.includes('dip') || ku.includes('دیپس')) {
          ex.englishName = 'Bench Dips';
          ex.name = 'پاشەملە لەسەر کورسی (Bench Dips)';
          ex.muscle = 'ترایسێپس';
        } else if (en.includes('curl') || ku.includes('قۆڵ') || ku.includes('بایسێپس')) {
          ex.englishName = 'Bodyweight Biceps Curl';
          ex.name = 'کێشانی قۆڵ بە بەرگری جەستە (Biceps Curl)';
          ex.muscle = 'بایسێپس';
        } else if (en.includes('bench press') || en.includes('chest press') || ku.includes('پاڵەپەستۆی سنگ')) {
          ex.englishName = 'Push-ups';
          ex.name = 'شناو بە کێشی جەستە (Push-ups)';
          ex.muscle = 'سنگ';
        }
      } else if (isHome && hasDumbbells) {
        if (en.includes('backpack') && en.includes('squat')) {
          ex.englishName = 'Dumbbell Goblet Squat';
          ex.name = 'سکوات بە دەمبڵ (Goblet Squat)';
        } else if (en.includes('backpack') && en.includes('deadlift')) {
          ex.englishName = 'Dumbbell Romanian Deadlift';
          ex.name = 'دیدلیفت بە دەمبڵ بۆ پشت و سمت';
        } else if (en.includes('backpack') && en.includes('curl')) {
          ex.englishName = 'Dumbbell Biceps Curl';
          ex.name = 'قۆڵ دووسەر (بایسێپس) بە دەمبڵ';
        }
      }

      en = (ex.englishName || '').toLowerCase();
      ku = (ex.name || '').toLowerCase();

      // STRICT DETERMINISTIC INJURY SAFETY GATE
      if (hasBack) {
        const isUnsafeBackSquat =
          (en.includes('barbell') && en.includes('squat')) ||
          en.includes('back squat') ||
          en.includes('front squat') ||
          en.includes('good morning');
        const isRdl = en.includes('romanian') && (en.includes('deadlift') || en.includes('rdl'));
        const isDeadlift = (en.includes('deadlift') || ku.includes('دیدلیفت') || ku.includes('دێدلیفت')) && !isRdl;
        const isBentRow =
          (en.includes('bent-over') || en.includes('bent over') || en.includes('barbell row') || en.includes('t-bar row') || en.includes('t bar row')) &&
          !en.includes('chest-supported') && !en.includes('chest supported') && !en.includes('machine');

        if (isUnsafeBackSquat && !en.includes('good morning')) {
          const safe = isHome
            ? pickReplacement([
                { englishName: 'Glute Bridge', name: 'بەرزکردنەوەی حەوز لەسەر زەوی (پاراستنی پشت)', muscle: 'سمت و پشتی ڕان' },
                { englishName: 'Superman Holds', name: 'سوپەرمان بۆ بەهێزکردنی پشت بە سەلامەتی', muscle: 'خوارەوەی پشت' }
              ], seenExerciseKeys)
            : pickReplacement([
                { englishName: 'Leg Press', name: 'قاچ پرێس بە ئامێر (پاراستنی بڕبڕەی پشت)', muscle: 'چوار سەرەی ڕان' },
                { englishName: 'Seated Leg Curl', name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (پاراستنی پشت)', muscle: 'پشتی ڕان' }
              ], seenExerciseKeys);
          Object.assign(ex, safe);
        } else if (isRdl) {
          const safe = isHome
            ? pickReplacement([
                { englishName: 'Glute Bridge', name: 'بەرزکردنەوەی حەوز لەسەر زەوی (پاراستنی پشت)', muscle: 'سمت و پشتی ڕان' },
                { englishName: 'Superman Holds', name: 'سوپەرمان لەسەر زەوی (پاراستنی پشت)', muscle: 'خوارەوەی پشت' }
              ], seenExerciseKeys)
            : pickReplacement([
                { englishName: 'Seated Leg Curl', name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (پاراستنی پشت)', muscle: 'پشتی ڕان' },
                { englishName: 'Hyperextensions', name: 'هایپەرئێکستێنشنی کۆنتڕۆڵکراو (پاراستنی پشت)', muscle: 'خوارەوەی پشت و سمت' }
              ], seenExerciseKeys);
          Object.assign(ex, safe);
        } else if (isDeadlift || en.includes('good morning')) {
          const safe = isHome
            ? pickReplacement([
                { englishName: 'Superman Holds', name: 'سوپەرمان لەسەر زەوی (پاراستنی پشت)', muscle: 'خوارەوەی پشت' },
                { englishName: 'Glute Bridge', name: 'بەرزکردنەوەی حەوز لەسەر زەوی (پاراستنی پشت)', muscle: 'سمت و پشتی ڕان' }
              ], seenExerciseKeys)
            : pickReplacement([
                { englishName: 'Hyperextensions', name: 'هایپەرئێکستێنشنی کۆنتڕۆڵکراو (پاراستنی پشت)', muscle: 'خوارەوەی پشت و سمت' },
                { englishName: 'Seated Leg Curl', name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (پاراستنی پشت)', muscle: 'پشتی ڕان' }
              ], seenExerciseKeys);
          Object.assign(ex, safe);
        } else if (isBentRow) {
          const safe = isHome
            ? { englishName: 'Floor Reverse Push-up', name: 'ڕاهێنانی پشت لەسەر زەوی (پاراستنی پشت)', muscle: 'ناوەڕاستی پشت' }
            : { englishName: 'Chest-Supported Machine Row', name: 'پاروو بە ئامێر بە پاڵپشتی سنگ (پاراستنی بڕبڕەی پشت)', muscle: 'ناوەڕاستی پشت' };
          Object.assign(ex, safe);
        }
      }

      en = (ex.englishName || '').toLowerCase();
      ku = (ex.name || '').toLowerCase();

      if (hasKnee) {
        const isKneeSquat = (en.includes('squat') || ku.includes('سکوات')) && !en.includes('calf');
        const isLunge = en.includes('lunge') || ku.includes('لانجز') || ku.includes('هەنگاونان');
        const isLegExt = en.includes('leg extension') || ku.includes('لێگ ئێکس');
        const isLegPress = en.includes('leg press') || ku.includes('لێگ پرێس') || ku.includes('قاچ پرێس');
        const isJumpingCardio =
          en.includes('jump') || en.includes('burpee') || en.includes('mountain climber') ||
          en.includes('box') || en.includes('plyo') || en.includes('sprint') ||
          en.includes('interval running') || en.includes('running') || en.includes('treadmill run');

        if (isKneeSquat || isLunge || isLegPress) {
          const safe = isHome
            ? pickReplacement([
                { englishName: 'Glute Bridge', name: 'بەرزکردنەوەی حەوز لەسەر زەوی (پاراستنی ئەژنۆ)', muscle: 'سمت و پشتی ڕان' },
                { englishName: 'Low-Impact Walk', name: 'پیاسەی هێواش و بێ-پەستان (پاراستنی ئەژنۆ)', muscle: 'کاردیۆ و قاچ' }
              ], seenExerciseKeys)
            : pickReplacement([
                { englishName: 'Glute Bridge', name: 'بەرزکردنەوەی حەوز (Glute Bridge - پاراستنی ئەژنۆ)', muscle: 'سمت و پشتی ڕان' },
                { englishName: 'Seated Leg Curl', name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (پاراستنی ئەژنۆ)', muscle: 'پشتی ڕان' },
                { englishName: 'Lying Leg Curl', name: 'ڕاکێشانی پشتی قاچ بە پاڵکەوتنەوە (پاراستنی ئەژنۆ)', muscle: 'پشتی ڕان' }
              ], seenExerciseKeys);
          Object.assign(ex, safe);
        } else if (isLegExt) {
          const safe = isHome
            ? { englishName: 'Glute Bridge', name: 'بەرزکردنەوەی حەوز لەسەر زەوی (پاراستنی ئەژنۆ)', muscle: 'سمت و پشتی ڕان' }
            : pickReplacement([
                { englishName: 'Lying Leg Curl', name: 'ڕاکێشانی پشتی قاچ بە پاڵکەوتنەوە (پاراستنی ئەژنۆ)', muscle: 'پشتی ڕان' },
                { englishName: 'Seated Leg Curl', name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (پاراستنی ئەژنۆ)', muscle: 'پشتی ڕان' }
              ], seenExerciseKeys);
          Object.assign(ex, safe);
        } else if (isJumpingCardio) {
          const safe = isHome
            ? { englishName: 'Low-Impact Walk', name: 'پیاسەی هێواش بێ بازدان (پاراستنی ئەژنۆ)', muscle: 'کاردیۆی سەلامەت', sets: 1, reps: '20 min' }
            : pickReplacement([
                { englishName: 'Stationary Bike', name: 'پاسکیلی وەستاو (پاراستنی ئەژنۆ)', muscle: 'کاردیۆی سەلامەت', sets: 1, reps: '20 min' },
                { englishName: 'Low-Impact Walk', name: 'پیاسەی هێواش بەبێ لێژی توند (پاراستنی ئەژنۆ)', muscle: 'کاردیۆی سەلامەت', sets: 1, reps: '20 min' }
              ], seenExerciseKeys);
          Object.assign(ex, safe);
        }
      }

      en = (ex.englishName || '').toLowerCase();

      if (hasShoulder) {
        const isBehindNeckOrUpright =
          en.includes('behind-the-neck') || en.includes('behind the neck') ||
          en.includes('upright row') || en.includes('military press') || en.includes('overhead press') ||
          en.includes('pike push');
        const isDips = en.includes('dip') || ku.includes('دیپس');
        const isHeavyFlatBench =
          en.includes('barbell bench press') ||
          en.includes('flat barbell bench') ||
          en === 'bench press' ||
          en.includes('decline barbell bench');

        if (isBehindNeckOrUpright) {
          const safe = isHome
            ? { englishName: hasDumbbells ? 'Dumbbell Lateral Raise' : 'Superman Holds', name: 'بەرزکردنەوەی شان بۆ لا تەنیشت بە سەلامەتی (پاراستنی شان)', muscle: 'تەنیشتی شان' }
            : { englishName: 'Cable Lateral Raise', name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ (پاراستنی شان)', muscle: 'تەنیشتی شان' };
          Object.assign(ex, safe);
        } else if (isDips) {
          const safe = isHome
            ? { englishName: hasDumbbells ? 'Dumbbell Floor Press' : 'Push-ups', name: 'پاڵەپەستۆی کۆنتڕۆڵکراو لەسەر زەوی (پاراستنی شان)', muscle: 'سنگ' }
            : pickReplacement([
                { englishName: 'Pec Deck Machine Fly', name: 'پێک دێک فلای بە ئامێر (پاراستنی جومگەی شان)', muscle: 'سنگ' },
                { englishName: 'Neutral-Grip Machine Press', name: 'پرێسی ئامێر بە دەستی نیوتڕاڵ (پاراستنی شان)', muscle: 'سنگ' }
              ], seenExerciseKeys);
          Object.assign(ex, safe);
        } else if (isHeavyFlatBench) {
          const safe = isHome
            ? { englishName: hasDumbbells ? 'Dumbbell Neutral Grip Bench Press' : 'Push-ups', name: 'پاڵەپەستۆ بە گرتنی بێ-زیان (پاراستنی شان)', muscle: 'سنگ' }
            : pickReplacement([
                { englishName: 'Neutral-Grip Machine Press', name: 'پرێسی ئامێر بە دەستی نیوتڕاڵ (پاراستنی جومگەی شان)', muscle: 'سنگ' },
                { englishName: 'Pec Deck Machine Fly', name: 'پێک دێک فلای بە ئامێر (پاراستنی شان)', muscle: 'سنگ' }
              ], seenExerciseKeys);
          Object.assign(ex, safe);
        }
      }

      // ستانداردکردنی زانستیی پشوو و توندی بەپێی RIR و پلەی جوڵە
      const tier = classifyExerciseTier(ex);
      const isCompound = tier === 'heavy_compound' || tier === 'secondary_compound';
      if (!ex.rir) {
        if (exp === 'beginner') ex.rir = 'RIR 2-3';
        else if (exp === 'advanced' && tier === 'isolation') ex.rir = 'RIR 0-1';
        else ex.rir = isCompound ? 'RIR 1-2' : (exp === 'intermediate' ? 'RIR 1-2' : 'RIR 0-1');
      }
      ex.rest = normalizeScientificRest(ex);
      const wasReplaced = (ex.englishName || '') !== origEnglish;
      if (wasReplaced) {
        delete ex.exerciseId;
        delete ex.canonicalName;
        delete ex.bodyPart;
      }
      const verifiedBound = bindVerifiedExerciseMetadata(ex, ex.muscle || '', !wasReplaced);
      Object.assign(ex, verifiedBound);

      // ڕێگری لە دووبارەبوونەوەی هەمان ڕاهێنان لە یەک ڕۆژدا (Deduplication)
      const dedupeKey = (ex.exerciseId || ex.canonicalName || ex.englishName || ex.name || '').toLowerCase().trim();
      if (!seenExerciseKeys.has(dedupeKey)) {
        seenExerciseKeys.add(dedupeKey);
        cleanList.push(ex);
      }
    });

    if (cleanList.length > 0 && !day.isRestDay) {
      cleanList.forEach((ex, idx) => {
        const tier = classifyExerciseTier(ex);
        if (idx === 0 && tier !== 'cardio') {
          if (!ex.warmUpNote) {
            ex.warmUpNote = getDefaultWarmUpNote(lang);
          }
        } else {
          delete ex.warmUpNote;
        }
      });
    }

    day.exercises = cleanList;
    if (day.isRestDay || cleanList.length === 0) {
      day.estimatedCalories = 0;
    } else {
      const effectiveWeight = Number(athleteWeightKg) || Number(course.athleteWeight) || 75;
      day.estimatedCalories = calculateWorkoutBurnedCalories({
        day,
        weight: effectiveWeight,
        pace: course.goalPace || 'normal',
        restSeconds: course.restIntervalSeconds || 90
      });
    }
  });

  if (!course.mesocycleNote) {
    course.mesocycleNote = getMesocycleNote(lang);
  }
  if (course.rationale && !course.rationale.includes('5-') && !course.rationale.includes('٥ هەفتەیی') && !course.rationale.includes('Deload')) {
    course.rationale = `${course.rationale} ${course.mesocycleNote}`;
  }

  return course;
}

const BODY_PART_MAP = {
  m1: { ku: 'سنگ', en: 'Chest' },
  m2: { ku: 'شان', en: 'Shoulders' },
  m3: { ku: 'پشت', en: 'Back' },
  m4: { ku: 'باڵ و قۆڵ', en: 'Arms (Biceps & Triceps)' },
  m5: { ku: 'ورگ و کەمەر', en: 'Abs & Waist' },
  m6: { ku: 'ڕان و قاچ', en: 'Legs (Quads & Hamstrings)' },
  m7: { ku: 'پوز', en: 'Calves' },
  f1: { ku: 'سنگ', en: 'Chest' },
  f2: { ku: 'کەمەر', en: 'Waist & Obliques' },
  f3: { ku: 'ورگ', en: 'Belly & Lower Abs' },
  f4: { ku: 'سمت و حەوز', en: 'Glutes & Hips' },
  f5: { ku: 'ڕان و قاچ', en: 'Legs & Thighs' },
  f6: { ku: 'باڵ', en: 'Arms' },
  f7: { ku: 'پشت', en: 'Back' }
};

export function resolveBodyGoalList(ids = [], lang = 'ku') {
  if (!Array.isArray(ids)) return [];
  return ids.map(id => {
    const found = BODY_PART_MAP[id];
    if (!found) return id;
    return lang === 'en' ? found.en : `${found.ku} (${found.en})`;
  });
}

if (typeof window !== "undefined") window.generateWorkoutDirectly = async (profile, targetDays, location = 'gym', equipment = '', lang = 'ku') => {
   const days = Number(targetDays) || Number(profile?.availableDaysPerWeek) || 4;
   const isHome = location === 'home';
   const enlargeList = resolveBodyGoalList(profile?.bodyGoals?.enlarge || [], lang);
   const shrinkList = resolveBodyGoalList(profile?.bodyGoals?.shrink || [], lang);
   const enlargeText = enlargeList.join(', ');
   const shrinkText = shrinkList.join(', ');
   const isFemale = profile?.gender === 'female' || profile?.gender === 'مێ' || profile?.gender === 'ئافرەت';
   const genderLabel = isFemale ? 'Female (ئافرەت)' : 'Male (پیاو)';
   const ageVal = Number(profile?.age) || 23;
   const weightVal = Number(profile?.weight) || 75;
   const heightVal = Number(profile?.height) || 175;
   const targetWeightVal = Number(profile?.targetWeight) || weightVal;
   const paceVal = profile?.goalPace || 'normal';
   const expLevel = normalizeExperienceLevel(profile?.experienceLevel);
   const expScienceRules =
     expLevel === 'beginner'
       ? `EXPERIENCE LEVEL: BEGINNER (<1 year training age)
- Weekly Volume: STRICTLY 8–10 direct sets per muscle group per week.
- Intensity: RIR 2-3 on every working set.
- Selection: Prioritize stable machines & basic compounds (Machine Chest Press, Chest-Supported Machine Row, Lat Pulldown, Leg Press, Seated Leg Curl). STRICTLY AVOID high-skill movements like Bulgarian Split Squats or Barbell Deadlifts.`
       : expLevel === 'advanced'
       ? `EXPERIENCE LEVEL: ADVANCED (3+ years training age)
- Weekly Volume: 16–20 sets per muscle group per week across multi-angle compounds & isolations.
- Intensity: RIR 1-2 on heavy compounds, RIR 0-1 on safe isolations and machines.`
       : `EXPERIENCE LEVEL: INTERMEDIATE (1–3 years training age)
- Weekly Volume: 12–16 sets per muscle group per week.
- Intensity: RIR 1-2 across working sets.
- Selection: Include stretch-mediated hypertrophy movements (Incline Dumbbell Biceps Curl, Overhead Cable Triceps Extension, Seated Leg Curl).`;
   const supplementsText = Array.isArray(profile?.supplements) && profile.supplements.length > 0 ? profile.supplements.join(', ') : 'None (Natural)';
   const langName = lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : lang === 'fa' ? 'Persian' : 'Kurdish (Sorani)';

   const physique = profile?.physiqueAnalysis || null;
   const physiqueInfo = physique ? `
- AI Vision Physique Scan Findings:
  * Estimated Body Fat: ${physique.bodyFatPercentage || 'N/A'}%
  * Somatotype / Body Type: ${physique.bodyType || 'N/A'}
  * Visually Lagging Muscle Groups (TOP PRIORITY TO DEVELOP): ${(physique.laggingMuscles || []).join(', ') || 'None'}
  * Well-Developed Muscles: ${(physique.strongMuscles || []).join(', ') || 'Balanced'}
  * Posture & Symmetry Notes: ${physique.postureFeedback || 'Symmetric'}
` : '';

   const homeRules = isHome ? `
CRITICAL RULES FOR HOME WORKOUT:
- DO NOT invent improvised household items (NEVER use words like "Backpack", "Water bottle", "Couch", "Towel", "Broom").
- For Bodyweight Home Workout (no equipment):
  * Chest: Push-ups, Diamond Push-ups, Wide Push-ups
  * Back: Floor Reverse Push-up, Superman Holds, Glute Bridges
  * Shoulders: Pike Push-ups
  * Arms: Bench Dips, Diamond Push-ups, Bodyweight Biceps Curl
  * Legs & Glutes: Bodyweight Squats, Bulgarian Split Squats, Bodyweight Lunges, Glute Bridges, Bodyweight Standing Calf Raise
  * Core & Waist: Plank, Crunches, Russian Twists, Mountain Climbers, Lying Leg Raises
- NEVER duplicate the same exercise twice on the same day.
- NEVER use Doorway Rows, Table Inverted Rows, Gym Ladders, Barbells, or Gym Benches for home bodyweight.
` : '';

   const prompt = `You are an elite sports scientist and personal trainer.
Design a strictly personalized ${days}-day weekly workout program in ${langName} based on this exact athlete profile:
- Name: ${profile?.name || 'Athlete'}
- Gender: ${genderLabel}
- Age: ${ageVal} years old
- Current Weight: ${weightVal} kg | Height: ${heightVal} cm | Target Weight: ${targetWeightVal} kg
- Primary Goal: ${profile?.goal || (targetWeightVal > weightVal ? 'Muscle Gain' : targetWeightVal < weightVal ? 'Fat Loss' : 'Body Recomposition')}
- Progression Pace: ${paceVal}
- Supplements, Vitamins & Hormones Used: ${supplementsText}
- Priority Muscles to ENLARGE / Hypertrophy Focus: ${enlargeText || (isFemale ? 'Glutes, Legs & Toned Upper Body' : 'Balanced Chest, Back, Shoulders, Arms & Legs')}
- Priority Areas to SHRINK / Burn Fat & Tone: ${shrinkText || 'Core & Overall Body Fat'}
- Training Days: ${days} days per week (${7 - days} rest days)
- Location: ${isHome ? 'Home Workout' : 'Gym'}${equipment ? ` (Available Equipment: ${equipment})` : ''}
- Injuries / Health Conditions: ${(profile?.healthConditions || []).join(', ') || 'None'}
${expScienceRules}
${physiqueInfo}
${homeRules}

MODERN SPORTS SCIENCE MANDATES:
1. OPTIMAL SPLIT STRUCTURE:
   - If ${days} === 4: STRICTLY use Upper / Lower Split (Saturday: Upper A, Sunday: Lower A, Monday: Rest, Tuesday: Upper B, Wednesday: Lower B, Thursday & Friday: Rest). DO NOT use a 1x/week Bro-Split.
   - If ${days} === 3: STRICTLY use Full Body Split (Saturday: Full Body A, Monday: Full Body B, Wednesday: Full Body C, with rest days between). This hits each muscle 3x/week for peak hypertrophy.
   - If ${days} === 2: STRICTLY use Full Body A and Full Body B (spaced 2-3 days apart).
   - If ${days} === 5: STRICTLY use Upper / Lower + Push / Pull / Legs (Hybrid Split). Push day MUST contain ONLY Chest, Shoulders & Triceps (zero Rows or Biceps).
   - If ${days} === 6: STRICTLY use Push A / Pull A / Legs A / Push B / Pull B / Legs B.
2. EXERCISE TIERING & SCIENTIFIC REST INTERVALS (NEVER use 35s or 45s rest):
   - Heavy Compound (1st exercise): 3-4 sets, 6-10 reps, STRICTLY 150s - 180s rest. Attach a concise "warmUpNote" ONLY on the 1st heavy compound of each workout day (e.g., "Warm-up: 2 ramp-up sets (50% x 8 reps, 75% x 4 reps) before working sets").
   - Secondary Compound (2nd/3rd exercise): 3-4 sets, 8-12 reps, STRICTLY 90s - 120s rest.
   - Isolation (4th+ exercise): 3-4 sets, 10-15 reps, STRICTLY 60s - 90s rest.
3. BIOMECHANICS: No redundant exercises in the same workout with identical angles (e.g. no Flat Barbell Press + Flat DB Press together).
4. CARDIO: For fat loss, add 15-20 min Low-Impact Steady-State (LISS) cardio (Walking on Incline Treadmill, or Stationary Bike if knee issues) at the end of lifting.
5. 5-WEEK MESOCYCLE PROGRESSION: Design for a 5-week block — Weeks 1–4 apply progressive overload, Week 5 is a scheduled Deload with 40% fewer sets. Include this in "mesocycleNote" and summarize it inside "rationale".

PERSONALIZATION REQUIREMENTS:
1. You MUST tailor the weekly split, exercise selection, sets, reps, and rest periods directly to the athlete's gender (${genderLabel}), age (${ageVal}), weight (${weightVal}kg -> ${targetWeightVal}kg), supplements/hormones (${supplementsText}), and priority body goals (Enlarge: ${enlargeText || 'Balanced'}, Shrink: ${shrinkText || 'None'}).
2. Give extra volume (+1 exercise or +1 set) to the priority muscles in "Enlarge", and include targeted high-rep metabolic/core/toning exercises for areas in "Shrink". If the athlete uses Creatine, Pre-Workout, Proteins, or Hormones, optimize work volume and recovery accordingly.
${physique && physique.laggingMuscles && physique.laggingMuscles.length > 0 ? `3. AI PHYSIQUE SCAN VISUAL INTEGRATION: The athlete's physique was scanned by AI camera vision. Visually lagging muscle groups are: ${physique.laggingMuscles.join(', ')}. You MUST give direct priority to these lagging muscle groups across the training week (positioning them early in the workouts, adding targeted hypertrophic variation and adequate volume to bring up lagging areas).` : ''}
4. Strictly avoid any exercise that stresses the listed injuries (${(profile?.healthConditions || []).join(', ') || 'None'}).
5. In "rationale", write a clear 1-2 sentence explanation in ${langName} mentioning the athlete's weight (${weightVal}kg -> ${targetWeightVal}kg), supplements (${supplementsText}), and selected focus muscles (including any AI-scanned lagging muscles) so they see the program is custom-built for them.

Return ONLY a valid JSON object matching this exact structure:
{
  "id": "ai_course_${days}d_${Date.now()}",
  "title": "Personalized title in ${langName}",
  "englishSubtitle": "${days}-Day Custom AI Split",
  "daysPerWeek": ${days},
  "durationDays": ${profile?.targetDays || 45},
  "mesocycleNote": "5-week mesocycle note (Weeks 1-4 progressive overload, Week 5 Deload with 40% fewer sets) in ${langName}",
  "rationale": "Personalized scientific explanation in ${langName}",
  "weeklyPlan": [
    {
      "dayKey": "d1",
      "dayName": "Day name in ${langName}",
      "focus": "Focus muscles in ${langName}",
      "estimatedCalories": 440,
      "isRestDay": false,
      "exercises": [
        {
          "name": "Exercise name in ${langName}",
          "englishName": "Standard Exercise Name in English (use clear ExerciseDB naming: barbell bench press, dumbbell incline bench press, cable pulldown (pro lat bar), lever seated row, sled 45 leg press, lever seated leg curl)",
          "canonicalName": "Canonical ExerciseDB English name for GIF media lookup (e.g. cable pulldown (pro lat bar), lever seated row, dumbbell incline bench press)",
          "sets": 4,
          "reps": "8-10",
          "rest": "150s",
          "rir": "${expLevel === 'beginner' ? 'RIR 2-3' : 'RIR 1-2'}",
          "warmUpNote": "2 ramp-up sets: 50% x 8 reps, 75% x 4 reps before working sets (first heavy compound of day only)",
          "muscle": "Target muscle in ${langName}"
        }
      ]
    }
  ]
}
Note: "weeklyPlan" must have exactly 7 objects (Saturday d1 through Friday d7).
Exactly ${days} days must have isRestDay: false (each with 4-6 tailored exercises matching the experience volume), and ${7 - days} days must have isRestDay: true (exercises: []).
RESPOND ONLY WITH PURE JSON. NO MARKDOWN.`;

   try {
     const resText = await window.callGeminiAPI(prompt);
     const cleaned = cleanJsonText(resText);
     let parsed = null;
     try {
       parsed = JSON.parse(cleaned);
     } catch {
       parsed = JSON.parse(cleaned.replace(/[\r\n]+/g, ' '));
     }
     if (parsed && Array.isArray(parsed.weeklyPlan) && parsed.weeklyPlan.length === 7) {
       parsed.trainingLocation = location;
       parsed.homeEquipment = equipment;
       parsed.experienceLevel = expLevel;
       parsed.athleteWeight = weightVal;
       parsed.goalPace = paceVal;
       parsed.healthConditions = profile?.healthConditions || [];
       parsed.isAiOnlineGenerated = true;
       parsed.startDate = resolveCourseStartDate(parsed);
       const sanitized = sanitizeWorkoutPlan(parsed, location, equipment, profile?.healthConditions || [], lang, weightVal);
       sanitized.isAiOnlineGenerated = true;
       sanitized.startDate = sanitized.startDate || parsed.startDate;
       return sanitized;
     }
   } catch (onlineErr) {
     console.warn("Online workout generation failed, using scientific algorithm fallback:", onlineErr);
   }

   // گەرەنتیکردنی سەرکەوتن بە مەکینەی زانستیی ناوخۆیی (Guaranteed Scientific Fallback)
   return generateAiScientificProgram(profile, days, location, equipment, lang);
};

if (typeof window !== "undefined") window.swapExerciseDirectly = async (profile, currentExercise, dayFocus = '', existingDayExercises = [], lang = 'ku') => {
   const langName = lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : lang === 'fa' ? 'Persian' : 'Kurdish (Sorani)';
   const excludedNames = (existingDayExercises || [])
     .map(e => `${e.name || ''} (${e.englishName || ''})`)
     .join(', ');
   const prompt = `You are an elite strength and conditioning coach.
The athlete wants to replace this single exercise in today's workout:
- Current Exercise to Replace: "${currentExercise?.name || ''}" (${currentExercise?.englishName || ''})
- Target Muscle: "${currentExercise?.muscle || dayFocus || 'General'}"
- Day Focus: "${dayFocus}"
- Athlete Location: ${profile?.trainingLocation === 'home' ? 'Home Workout' : 'Gym'}
- Athlete Injuries: ${(profile?.healthConditions || []).join(', ') || 'None'}
- Athlete Supplements: ${(profile?.supplements || []).join(', ') || 'None'}
- STRICTLY EXCLUDED EXERCISES (already in today's workout or being replaced — DO NOT return any of these): ${excludedNames}

Choose ONE biomechanically effective replacement exercise targeting the same muscle group (or complementary muscle) that is NOT in the excluded list.
Return ONLY a valid JSON object (no markdown):
{
  "name": "Exercise name in ${langName}",
  "englishName": "Standard Exercise Name in English (e.g. Incline Dumbbell Bench Press, Lat Pulldown, Cable Lateral Raise, Leg Press, Dumbbell Hammer Curl)",
  "canonicalName": "Canonical ExerciseDB English name (ASCII only, no Kurdish/Arabic text)",
  "sets": ${Number(currentExercise?.sets) || 4},
  "reps": "${currentExercise?.reps || '10-12'}",
  "rest": "${currentExercise?.rest || '60s'}",
  "muscle": "${currentExercise?.muscle || 'ماسولکەی ئامانج'}"
}`;
   const resText = await window.callGeminiAPI(prompt + "\nRESPOND ONLY IN PURE VALID JSON. NO MARKDOWN.");
   const cleaned = cleanJsonText(resText);
   const parsed = JSON.parse(cleaned);
   if (parsed && (parsed.name || parsed.englishName || parsed.canonicalName)) {
     const rawSwapped = {
       name: parsed.name || parsed.englishName || parsed.canonicalName,
       englishName: parsed.englishName || parsed.canonicalName || parsed.name,
       canonicalName: parsed.canonicalName || parsed.englishName || parsed.name,
       sets: Number(parsed.sets) || Number(currentExercise?.sets) || 4,
       reps: String(parsed.reps || currentExercise?.reps || '10-12'),
       rest: String(parsed.rest || currentExercise?.rest || '60s'),
       muscle: parsed.muscle || currentExercise?.muscle || 'ماسولکە'
     };
     return bindVerifiedExerciseMetadata(rawSwapped, rawSwapped.muscle, false);
   }
   throw new Error("Invalid replacement exercise from AI");
};

if (typeof window !== "undefined") window.generateCoachReplyDirectly = async (query, profile, recentMessages = [], lang = 'ku', coachContext = {}) => {
   const langName = lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : lang === 'fa' ? 'Persian' : 'Kurdish (Sorani)';
   const compactProfile = buildCoachScientificProfile(profile, coachContext);
   const historyText = Array.isArray(recentMessages) && recentMessages.length > 0
     ? recentMessages.slice(-8).map(m => `${m.sender === 'user' ? 'User' : 'Coach'}: ${m.text}`).join('\n')
     : '';
   const systemInstruction = `You are the intelligent AI Coach inside the BQ GYM app.
You have unrestricted conversational intelligence: you can hold any kind of natural conversation, chat warmly like a real human mentor and friend, answer any question (sports, bodybuilding, nutrition, supplements, vitamins, hormones, health, recovery, lifestyle, motivation, general knowledge, or casual conversation), and give deeply accurate, helpful answers in ${langName}.
You know the athlete's complete scientific profile:
- Experience Level: ${compactProfile.experienceLevel}
- Current Mesocycle Week: Week ${compactProfile.currentWeek} of 10 | Deload Active: ${compactProfile.isDeloadActive ? 'YES (-40% volume, RIR 3-4 recovery focus)' : 'No'}
- Daily Nutrition & Hydration Targets: ${compactProfile.goalCalories} kcal | Protein: ${compactProfile.goalProtein}g | Carbs: ${compactProfile.goalCarbs}g | Fat: ${compactProfile.goalFat}g | Fiber: ${compactProfile.goalFiber}g | Water: ${compactProfile.goalWaterMl} ml
- Allergies / Disliked Foods (STRICTLY AVOID in meal recommendations): ${compactProfile.allergiesOrDislikes}
- Health Conditions / Injuries: ${(compactProfile.injuries || []).join(', ') || 'None'}
- Recent Weight Trend: ${compactProfile.weightHistoryTrend?.summary || 'No recent weight logs'}
- Exact Supplements/Vitamins/Hormones: ${(compactProfile.supplements || []).join(', ') || 'None'}
Always tailor your training, recovery, hydration, and meal advice strictly around their allergies, injuries, deload status, current week, experience level, and weight trend.
Always reply in ${langName} inside the JSON structure requested.`;

   const prompt = `Athlete Profile: ${JSON.stringify(compactProfile)}
${historyText ? `Conversation History:\n${historyText}\n` : ''}Athlete's new message: "${query}"

Respond naturally, thoroughly, and conversationally in ${langName} to whatever the athlete said or asked.
Return ONLY a valid JSON object (no markdown):
{"reply": "your complete, natural, helpful response in ${langName}", "thought": "brief reasoning in ${langName}", "suggestedReplies": ["short relevant follow-up 1 in ${langName}", "short relevant follow-up 2 in ${langName}"], "action": null}`;
   const resText = await window.callGeminiAPI(prompt, systemInstruction);
   const cleaned = cleanJsonText(resText);
   try {
     const parsed = JSON.parse(cleaned);
     if (parsed && parsed.reply) return parsed;
   } catch {
     try {
       const parsed2 = JSON.parse(cleaned.replace(/[\r\n]+/g, ' '));
       if (parsed2 && parsed2.reply) return parsed2;
     } catch {}
   }
   const replyMatch = String(resText || '').match(/"reply"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\})/);
   return {
     reply: replyMatch ? replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : String(resText || '').replace(/```json|```/gi, '').trim(),
     thought: '',
     suggestedReplies: [],
     action: null
   };
};




// ==================== پێوانە و پارێزگاری کالۆری و ماکرۆ (ISSN & Eric Helms Science) ====================
/**
 * Ensures target calories never drop below BMR or clinical biological safety minimums (1250 F / 1500 M).
 */
export function applyCalorieSafetyFloor(calories, { bmr = 0, gender = 'male' } = {}) {
  const isFemale = gender === 'female' || gender === 'مێ' || gender === 'ئافرەت';
  const biologicalMin = isFemale ? 1250 : 1500;
  const parsedBmr = Math.round(Number(bmr) || 0);
  const effectiveFloor = Math.max(biologicalMin, parsedBmr);
  return Math.max(Math.round(Number(calories) || effectiveFloor), effectiveFloor);
}

/**
 * Computes BMR using Katch-McArdle when bodyFatPercentage is known, else Mifflin-St Jeor.
 */
export function computeScientificBmr({ weight = 78, height = 178, age = 23, gender = 'male', bodyFatPercentage = null } = {}) {
  const currentWeight = Math.max(30, Number(weight) || 78);
  const currentHeight = Math.max(120, Number(height) || 178);
  const currentAge = Math.max(14, Number(age) || 23);
  const isFemale = gender === 'female' || gender === 'مێ' || gender === 'ئافرەت';
  const bf = Number(bodyFatPercentage);

  if (Number.isFinite(bf) && bf >= 3 && bf <= 60) {
    const leanBodyMassKg = Math.max(25, currentWeight * (1 - bf / 100));
    const bmr = Math.round(370 + (21.6 * leanBodyMassKg));
    return {
      bmr,
      bmrEquation: 'Katch-McArdle',
      leanBodyMassKg: Math.round(leanBodyMassKg * 10) / 10
    };
  }

  const mifflin = isFemale
    ? (10 * currentWeight) + (6.25 * currentHeight) - (5 * currentAge) - 161
    : (10 * currentWeight) + (6.25 * currentHeight) - (5 * currentAge) + 5;

  return {
    bmr: Math.round(mifflin),
    bmrEquation: 'Mifflin-St Jeor',
    leanBodyMassKg: null
  };
}

// ==================== مەکینەی زانستی داڕشتنی ئامانج و ڕێژەی پێویستی کالۆری (ISSN & Eric Helms Engine) ====================
export function calculateScientificGoalByAi({ 
  weight = 78, 
  height = 178, 
  age = 23, 
  gender = 'male',
  targetWeight = 84, 
  targetDays = 45, 
  availableDaysPerWeek = 4, 
  trainingLocation = 'gym', 
  goal = '', 
  goalPace = 'normal',
  healthConditions = [],
  supplements = [],
  physiqueAnalysis = null,
  bodyFatPercentage = null
}) {
  const currentWeight = Math.max(35, Number(weight) || 78);
  const currentHeight = Math.max(120, Number(height) || 178);
  const currentAge = Math.max(14, Number(age) || 23);
  const currentTargetWeight = Number(targetWeight) > 0 ? Number(targetWeight) : (currentWeight + 6);
  const daysPerWeek = Number(availableDaysPerWeek) || 4;
  const pace = (goalPace && ['slow', 'normal', 'fast', 'very_fast'].includes(goalPace)) ? goalPace : 'normal';
  const isFemale = gender === 'female' || gender === 'مێ' || gender === 'ئافرەت';

  // ١. هەژمارکردنی BMR: Katch-McArdle کاتێک ڕێژەی چەوری زانراوە، ئەگەر نا Mifflin-St Jeor
  const effectiveBf = bodyFatPercentage ?? physiqueAnalysis?.bodyFatPercentage ?? null;
  const { bmr, bmrEquation, leanBodyMassKg } = computeScientificBmr({
    weight: currentWeight,
    height: currentHeight,
    age: currentAge,
    gender,
    bodyFatPercentage: effectiveBf
  });

  // ٢. هاوکۆلکەی چاڵاکی (TDEE Activity Multiplier)
  let activityMultiplier = 1.55;
  if (daysPerWeek <= 2) activityMultiplier = 1.375;
  else if (daysPerWeek === 3) activityMultiplier = 1.45;
  else if (daysPerWeek === 4) activityMultiplier = 1.55;
  else if (daysPerWeek === 5) activityMultiplier = 1.65;
  else if (daysPerWeek >= 6) activityMultiplier = 1.75;

  if (trainingLocation === 'gym') {
    activityMultiplier += 0.05;
  }

  const tdee = Math.round(bmr * activityMultiplier);

  const deltaKg = Math.abs(currentTargetWeight - currentWeight);
  let computedDays = Number(targetDays) || 45;

  // خێرایی واقیعی گۆڕانی کێش: Cut لە سنووری زانستیی 0.5% - 1.0% کێشی لەش لە هەفتەیەکدا (Eric Helms)
  if (deltaKg > 0) {
    let weeklyRateKg;
    if (currentTargetWeight < currentWeight) {
      const weeklyPct = pace === 'slow' ? 0.005 : pace === 'normal' ? 0.0075 : 0.01;
      weeklyRateKg = Math.max(0.25, currentWeight * weeklyPct);
    } else {
      weeklyRateKg = pace === 'slow' ? 0.25 : pace === 'normal' ? 0.4 : pace === 'fast' ? 0.6 : 0.75;
    }
    const minDays = pace === 'slow' ? 30 : pace === 'normal' ? 21 : 14;
    computedDays = Math.max(minDays, Math.round((deltaKg / weeklyRateKg) * 7));
  }

  // کێشی بنەڕەتی بۆ پڕۆتین: Lean Body Mass (ئەگەر هەبێت) یان کێشی ڕێکخراو بۆ BMI بەرز
  const heightM = currentHeight / 100;
  const bmi = currentWeight / (heightM * heightM);
  const adjustedRefWeight = (() => {
    if (leanBodyMassKg) return leanBodyMassKg;
    if (bmi > 28) {
      const refUpperWeight = 25 * heightM * heightM;
      return refUpperWeight + 0.4 * (currentWeight - refUpperWeight);
    }
    return currentWeight;
  })();

  let calculatedGoalName = goal;
  let calculatedCalories = tdee;
  let calculatedProtein = 160;
  let calculatedFat = 65;
  let calculatedCarbs = 220;

  if (currentTargetWeight > currentWeight) {
    // قۆناغی گەشە (Bulk): 1.8 - 2.2 g/kg پڕۆتین، زیادەی کۆنتڕۆڵکراو
    let surplus = 350;
    let proteinPerKg = 2.0;
    if (pace === 'slow') {
      surplus = 200;
      proteinPerKg = 1.85;
    } else if (pace === 'normal') {
      surplus = 350;
      proteinPerKg = 2.0;
    } else if (pace === 'fast') {
      surplus = 500;
      proteinPerKg = 2.1;
    } else if (pace === 'very_fast') {
      surplus = 650;
      proteinPerKg = 2.2;
    }

    calculatedCalories = Math.round(tdee + surplus);

    if (!calculatedGoalName || calculatedGoalName.includes('دابەزاندن') || calculatedGoalName.includes('سوتاندن')) {
      calculatedGoalName = 'گەشەی ماسولکە';
    }

    // ئەگەر LBM بەکاربهێنرێت لە قۆناغی Bulk دا کەمێک بەرزتر (2.0-2.2 g/kg LBM یا 1.8-2.2 g/kg گشتی) دەگرێت
    calculatedProtein = Math.round(adjustedRefWeight * proteinPerKg);
    const minFatFloor = Math.round(currentWeight * 0.6);
    calculatedFat = Math.max(minFatFloor, Math.round((calculatedCalories * 0.25) / 9));
  } else if (currentTargetWeight < currentWeight) {
    // قۆناغی وشککردنەوە (Cut): 0.5%-1.0% کێشی لەش/هەفتە، 2.2 - 2.6 g/kg پڕۆتین، پاراستنی >= 0.6 g/kg چەوری و >= BMR
    const weeklyPct = pace === 'slow' ? 0.005 : pace === 'normal' ? 0.0075 : 0.01;
    const weeklyLossKg = currentWeight * weeklyPct;
    const deficit = Math.min(900, Math.max(250, Math.round((weeklyLossKg * 7700) / 7)));
    const proteinPerKg = pace === 'slow' ? 2.2 : pace === 'normal' ? 2.35 : pace === 'fast' ? 2.5 : 2.6;

    calculatedCalories = applyCalorieSafetyFloor(tdee - deficit, { bmr, gender });

    if (!calculatedGoalName || calculatedGoalName.includes('زیادکردن') || calculatedGoalName.includes('گەشە')) {
      calculatedGoalName = 'سوتاندنی چەوری';
    }

    calculatedProtein = Math.round(adjustedRefWeight * proteinPerKg);
    const minFatFloor = Math.round(currentWeight * 0.6);
    calculatedFat = Math.max(minFatFloor, Math.round((calculatedCalories * 0.23) / 9));
  } else {
    // Recomposition / Maintenance
    let calAdjustment = 0;
    if (pace === 'fast') calAdjustment = -150;
    else if (pace === 'very_fast') calAdjustment = -250;
    calculatedCalories = applyCalorieSafetyFloor(tdee + calAdjustment, { bmr, gender });

    if (!calculatedGoalName) {
      calculatedGoalName = 'جێگیرکردنی کێش';
    }
    calculatedProtein = Math.round(adjustedRefWeight * 2.1);
    const minFatFloor = Math.round(currentWeight * 0.6);
    calculatedFat = Math.max(minFatFloor, Math.round((calculatedCalories * 0.25) / 9));
  }

  // کارایی سەپلیمێنت و هۆرمۆن لەسەر پڕۆتین، کالۆری و ئاو
  const suppList = Array.isArray(supplements) ? supplements.map(s => String(s).toLowerCase()) : [];
  const hasHormones = suppList.some(s => s.includes('test') || s.includes('تێستۆستیرۆن') || s.includes('هۆرمۆن') || s.includes('tren') || s.includes('deca') || s.includes('anavar') || s.includes('sarm') || s.includes('rad') || s.includes('mk-677') || s.includes('پێپتاید') || s.includes('ئینسۆلین') || s.includes('gh'));
  const hasCreatineOrPre = suppList.some(s => s.includes('creatine') || s.includes('کریاتین') || s.includes('pre') || s.includes('تاقە') || s.includes('وزە') || s.includes('c4'));
  const hasFatBurner = suppList.some(s => s.includes('carnitine') || s.includes('کارنیتین') || s.includes('clen') || s.includes('کلین') || s.includes('چەوری سووتێنەر') || s.includes('burner') || s.includes('yohimbine'));
  const hasMassGainer = suppList.some(s => s.includes('mass') || s.includes('گەینەر'));

  if (hasHormones) {
    calculatedProtein = Math.round(calculatedProtein * 1.15);
    if (currentTargetWeight > currentWeight) {
      calculatedCalories += 180;
    }
  }
  if (hasMassGainer && currentTargetWeight > currentWeight) {
    calculatedCalories += 150;
  }
  if (hasFatBurner && currentTargetWeight < currentWeight) {
    calculatedProtein = Math.max(calculatedProtein, Math.round(adjustedRefWeight * 2.5));
  }

  // کاتێک سکانی بینینی جەستە (AI Physique Vision) کالۆری پێشنیار دەکات، دەخرێتە ژێر پشتێنەی سەلامەتی (BMR و 1250/1500)
  if (physiqueAnalysis && typeof physiqueAnalysis === 'object') {
    if (physiqueAnalysis.recommendedCalories && Number(physiqueAnalysis.recommendedCalories) > 0) {
      calculatedCalories = applyCalorieSafetyFloor(Number(physiqueAnalysis.recommendedCalories), { bmr, gender });
      const minFatFloor = Math.round(currentWeight * 0.6);
      const fatPct = currentTargetWeight < currentWeight ? 0.23 : 0.25;
      calculatedFat = Math.max(minFatFloor, Math.round((calculatedCalories * fatPct) / 9));
    }
    if (physiqueAnalysis.recommendedProtein && Number(physiqueAnalysis.recommendedProtein) >= 50) {
      const scientificMinProt = Math.round(adjustedRefWeight * (currentTargetWeight < currentWeight ? 2.2 : 1.8));
      calculatedProtein = Math.max(scientificMinProt, Math.round(Number(physiqueAnalysis.recommendedProtein)));
    }
  }

  // دڵنیاکردنەوە لە کاربۆهیدرات لە باقی کالۆری دوای پڕۆتین و چەوری
  calculatedCarbs = Math.max(50, Math.round((calculatedCalories - (calculatedProtein * 4) - (calculatedFat * 9)) / 4));
  const calculatedFiber = Math.max(20, Math.round((calculatedCalories / 1000) * 12));

  // بڕی ئاوی ڕۆژانە بەپێی کێش و سەپلیمێنت
  let baseWaterMl = Math.round(currentWeight * 38);
  if (hasCreatineOrPre) baseWaterMl += 600;
  if (hasHormones) baseWaterMl += 600;
  if (hasFatBurner) baseWaterMl += 400;
  const calculatedWaterMl = Math.max(2500, Math.min(6000, Math.round(baseWaterMl / 100) * 100));

  return {
    targetWeight: currentTargetWeight,
    targetDays: computedDays,
    goal: calculatedGoalName,
    goalPace: pace,
    bmr,
    bmrEquation,
    leanBodyMassKg,
    goalCalories: calculatedCalories,
    goalProtein: calculatedProtein,
    goalCarbs: calculatedCarbs,
    goalFat: calculatedFat,
    goalFiber: calculatedFiber,
    goalWaterMl: calculatedWaterMl
  };
}

// ==================== مەکینەی زانستی داڕشتنی کۆرس بەپێی دۆخی ڕاستەقینەی بەکارهێنەر ====================
export function generateAiScientificProgram({ weight = 78, targetWeight = 84, targetDays = 45, age = 23, gender = 'male', goal = '', goalPace = 'normal', bodyGoals = { enlarge: [], shrink: [] }, healthConditions = [], physiqueAnalysis = null, experienceLevel = 'intermediate' } = {}, selectedDaysCount = 4, location = 'gym', equipment = '', lang = 'ku') {
  const conditions = healthConditions || [];
  const { hasKnee, hasBack, hasShoulder } = parseInjuryFlags(conditions);
  const exp = normalizeExperienceLevel(experienceLevel);
  const isBeginner = exp === 'beginner';
  const isIntermediate = exp === 'intermediate';
  const isAdvanced = exp === 'advanced';

  const isFemale = gender === 'female' || gender === 'مێ' || gender === 'ئافرەت';
  const isBulk = targetWeight > weight || goal.includes('زیادکردن') || goal.includes('گەشە') || goal.toLowerCase().includes('bulk');
  const isCut = targetWeight < weight || goal.includes('دابەزاندن') || goal.includes('سوتاندن') || goal.toLowerCase().includes('cut') || goal.toLowerCase().includes('loss');
  const pace = (goalPace && ['slow', 'normal', 'fast', 'very_fast'].includes(goalPace)) ? goalPace : 'normal';

  const enlargeIds = Array.isArray(bodyGoals?.enlarge) ? bodyGoals.enlarge : [];
  const shrinkIds = Array.isArray(bodyGoals?.shrink) ? bodyGoals.shrink : [];

  const lagging = (physiqueAnalysis?.laggingMuscles || []).map(m => String(m).toLowerCase());
  const lagChest = lagging.some(m => m.includes('سنگ') || m.includes('chest'));
  const lagDelts = lagging.some(m => m.includes('شان') || m.includes('delt') || m.includes('shoulder'));
  const lagBack = lagging.some(m => m.includes('پشت') || m.includes('back') || m.includes('lat'));
  const lagArms = lagging.some(m => m.includes('باڵ') || m.includes('قۆڵ') || m.includes('arm') || m.includes('bicep') || m.includes('tricep'));
  const lagLegs = lagging.some(m => m.includes('قاچ') || m.includes('ڕان') || m.includes('leg') || m.includes('quad'));
  const lagCore = lagging.some(m => m.includes('ورگ') || m.includes('کۆڕ') || m.includes('abs') || m.includes('core'));

  const wantChest = enlargeIds.some(x => x === 'm1' || x === 'f1' || String(x).includes('سنگ')) || lagChest;
  const wantShoulders = enlargeIds.some(x => x === 'm2' || String(x).includes('شان')) || lagDelts;
  const wantBack = enlargeIds.some(x => x === 'm3' || x === 'f7' || String(x).includes('پشت')) || lagBack;
  const wantArms = enlargeIds.some(x => x === 'm4' || x === 'f6' || String(x).includes('باڵ') || String(x).includes('قۆڵ')) || lagArms;
  const wantGlutes = enlargeIds.some(x => x === 'f4' || String(x).includes('سمت')) || (isFemale && !enlargeIds.length);
  const wantLegs = enlargeIds.some(x => x === 'm6' || x === 'f5' || String(x).includes('ڕان') || String(x).includes('قاچ')) || lagLegs;
  const wantCalves = enlargeIds.some(x => x === 'm7' || String(x).includes('پوز'));
  const shrinkCore = shrinkIds.some(x => ['m5', 'f2', 'f3'].includes(x) || String(x).includes('ورگ') || String(x).includes('کەمەر')) || isCut || lagCore;
  const shrinkLower = shrinkIds.some(x => ['m6', 'f4', 'f5'].includes(x));

  // ڕێکخستنی زانستیی سێت و ڕێژەی RIR بەپێی ئاستی یاریزان (Experience Level) و کاتی پشووی زانستی
  const isSenior = Number(age) >= 42;
  const restSec = pace === 'slow' ? 120 : 90; // هەرگیز پشووی نا-زانستی ٣٥ یان ٤٥ چرکە بەکارناهێنرێت
  const rirCompound = isBeginner ? 'RIR 2-3' : 'RIR 1-2';
  const rirIso = isBeginner ? 'RIR 2-3' : isAdvanced ? 'RIR 0-1' : 'RIR 1-2';

  // کۆنترۆڵی سێتی هەفتانە: سەرەتایی (٨-١٠)، ناوەند (١٢-١٦)، پێشکەوتوو (١٦-٢٠)
  const setsHeavy = isBeginner ? 3 : isSenior ? 3 : 4;
  const setsPrimary = isBeginner ? (selectedDaysCount >= 5 ? 3 : (selectedDaysCount <= 3 ? 3 : 4)) : isAdvanced ? 4 : 4;
  const setsSec = isBeginner ? (selectedDaysCount >= 5 ? 2 : 3) : isAdvanced ? 4 : 3;
  const setsIso = isBeginner ? (selectedDaysCount === 6 ? 3 : (selectedDaysCount <= 3 ? 3 : 4)) : isAdvanced ? 4 : 3;

  const repsMain = isBeginner
    ? '8-12'
    : isBulk
    ? (pace === 'very_fast' ? '6-8' : '8-10')
    : (pace === 'fast' || pace === 'very_fast' ? '10-12' : '8-12');

  const repsSec = isBeginner ? '10-12' : (isBulk ? '10-12' : '12-15');

  const cardioMins = pace === 'slow' ? 15 : pace === 'normal' ? 20 : pace === 'fast' ? 25 : 30;
  const isHome = location === 'home';
  const hasDumbbells = equipment.toLowerCase().includes('دەستەوانە') || equipment.toLowerCase().includes('دەمبڵ') || equipment.toLowerCase().includes('dumbbell');
  const hasBands = equipment.toLowerCase().includes('لاستیک') || equipment.toLowerCase().includes('قایش') || equipment.toLowerCase().includes('band');

  const cardioEx = isHome ? {
    name: hasKnee ? 'پیاسەی هێواش بێ-پەستان (' + cardioMins + ' خولەک - پاراستنی ئەژنۆ)' : 'چیاڕەوی خێرا و کاردیۆ (Mountain Climbers)',
    englishName: hasKnee ? 'Low-Impact Walk' : 'Mountain Climbers',
    sets: hasKnee ? 1 : 3,
    reps: hasKnee ? cardioMins + ' خولەک' : '45s',
    rest: '60s',
    rir: rirIso,
    muscle: 'کاردیۆ و سوتاندنی چەوری'
  } : hasKnee ? {
    name: 'پاسکیلی وەستاو (' + cardioMins + ' خولەک - پاراستنی ئەژنۆ)',
    englishName: 'Stationary Bike',
    sets: 1,
    reps: cardioMins + ' خولەک',
    rest: '60s',
    rir: rirIso,
    muscle: 'کاردیۆ و سوتاندنی چەوری'
  } : {
    name: 'پیاسەی خێرا بە لێژی لەسەر تەرمیل (' + cardioMins + ' خولەک)',
    englishName: 'Walking on Incline Treadmill',
    sets: 1,
    reps: cardioMins + ' خولەک',
    rest: '60s',
    rir: rirIso,
    muscle: 'کاردیۆ و سوتاندنی چەوری'
  };

  const coreBurnEx = isHome ? {
    name: 'پێچکردنی ڕووسی بۆ توندکردنی کەمەر و ورگ',
    englishName: 'Russian Twists',
    sets: isBeginner ? 3 : 4,
    reps: '15-20',
    rest: '60s',
    rir: rirIso,
    muscle: 'ورگ و کەمەر'
  } : {
    name: 'کڕانچی سک بە کێبڵ بۆ بەهێزکردنی ورگ',
    englishName: 'Cable Rope Crunch',
    sets: isBeginner ? 3 : 4,
    reps: '12-15',
    rest: '60s',
    rir: rirIso,
    muscle: 'ورگ و کەمەر'
  };

  const attachCustomFinishers = (list, dayType, shouldCardio) => {
    const out = [...list];
    if (dayType === 'push' && wantChest && !isBeginner) {
      out.push(isHome
        ? { name: 'شناوی خاو بە تەرکیزی سنگ (Tempo Push-ups)', englishName: 'Push-ups', sets: 3, reps: '12-15', rest: '90s', rir: rirIso, muscle: 'سنگ (تەرکیزی تایبەت)' }
        : { name: 'پێک دێک فلای بە ئامێر بۆ ناوەڕاستی سنگ', englishName: 'Pec Deck Machine Fly', sets: setsIso, reps: '12-15', rest: '75s', rir: rirIso, muscle: 'سنگ (تەرکیزی تایبەت)' }
      );
    }
    if (dayType === 'pull' && wantBack && !isBeginner) {
      out.push(isHome
        ? { name: 'ڕاهێنانی سوپەرمان بە ڕاگرتن بۆ پشت', englishName: 'Superman Holds', sets: setsIso, reps: '15', rest: '60s', rir: rirIso, muscle: 'پشت (تەرکیزی تایبەت)' }
        : { name: 'ڕاکێشانی کێبڵ بە دەسکی تەسک (Close-Grip Pulldown)', englishName: 'Close Grip Lat Pulldown', sets: setsSec, reps: '10-12', rest: '120s', rir: rirCompound, muscle: 'پانیی پشت (تەرکیزی تایبەت)' }
      );
    }
    if ((dayType === 'arms' || dayType === 'pull') && wantArms && !isBeginner && out.length < 7) {
      out.push(isHome
        ? { name: hasDumbbells ? 'کۆنسێنترەیشن کێرڵ بە دەمبڵ بۆ لووتکەی باڵ' : 'کێشانی قۆڵ بە بەرگری جەستە', englishName: hasDumbbells ? 'Dumbbell Concentration Curl' : 'Bodyweight Biceps Curl', sets: setsIso, reps: '12-15', rest: '60s', rir: rirIso, muscle: 'باڵ و قۆڵ (تەرکیزی تایبەت)' }
        : { name: 'پریچەر کێرڵ بە ئامێر یان باڕی EZ بۆ گەورەکردنی باڵ', englishName: 'EZ Bar Preacher Curl', sets: setsIso, reps: '10-12', rest: '60s', rir: rirIso, muscle: 'باڵ و قۆڵ (تەرکیزی تایبەت)' }
      );
    }
    if (dayType === 'legs' && wantGlutes && !out.some(e => (e.englishName || '').toLowerCase().includes('hip thrust') || (e.englishName || '').toLowerCase().includes('glute bridge'))) {
      out.unshift(isHome
        ? { name: 'بەرزکردنەوەی حەوز لەسەر زەوی (Glute Bridge)', englishName: 'Glute Bridge', sets: setsPrimary, reps: '15-20', rest: '90s', rir: rirCompound, muscle: 'سمت و حەوز' }
        : { name: 'باڕبێڵ هیپ ثرەست بۆ فۆڕمکردنی سمت', englishName: 'Barbell Hip Thrust', sets: setsPrimary, reps: '10-12', rest: '150s', rir: rirCompound, muscle: 'سمت و حەوز' }
      );
    }
    if (dayType === 'legs' && wantCalves && !out.some(e => (e.englishName || '').toLowerCase().includes('calf'))) {
      out.push(isHome
        ? { name: 'بەرزبوونەوەی پوز لەسەر پەنجەی پێ', englishName: 'Bodyweight Standing Calf Raise', sets: isBeginner ? 3 : 4, reps: '15-20', rest: '60s', rir: rirIso, muscle: 'پوز (تەرکیزی تایبەت)' }
        : { name: 'سۆڵە بە دانیشتنەوە بە ئامێر (Seated Calf Raise)', englishName: 'Seated Calf Raise', sets: isBeginner ? 3 : 4, reps: '15-20', rest: '60s', rir: rirIso, muscle: 'پوز (تەرکیزی تایبەت)' }
      );
    }
    if (shrinkCore && (dayType === 'arms' || dayType === 'full' || dayType === 'pull')) {
      out.push(coreBurnEx);
    }
    if (shouldCardio && (isCut || shrinkCore || shrinkLower)) {
      out.push(cardioEx);
    }
    return out;
  };

  // کالۆری سووتاو بە شێوەی دینامیکی بەپێی کێش، ژمارەی سێتەکان و کاردیۆ حیساب دەکرێت لە خوارەوە
  const chestSets = wantChest && !isBeginner ? setsPrimary + 1 : setsPrimary;
  const backSets = wantBack && !isBeginner ? setsPrimary + 1 : setsPrimary;
  const legSets = (wantLegs || wantGlutes) && !isBeginner ? setsPrimary + 1 : setsPrimary;
  const armSets = wantArms && !isBeginner ? setsIso + 1 : setsIso;
  const shoulderSets = wantShoulders && !isBeginner ? setsSec + 1 : setsSec;

  // ==================== ١. خشتەی بەشی سەرەوە A (Upper Body A - Chest & Horizontal Pull + Arms) ====================
  const exUpperA = isHome ? [
    { name: hasDumbbells ? 'پاڵەپەستۆی سنگ بە دەمبڵ لەسەر زەوی' : 'شناو (Push-ups)', englishName: hasDumbbells ? 'Floor Dumbbell Press' : 'Push-ups', sets: chestSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'سنگ' },
    { name: hasDumbbells ? 'پاروو بە دەمبڵ بە چەمانەوە' : 'بەرزکردنەوەی جەستە بە ئەنیشک لەسەر زەوی (Reverse Push-up)', englishName: (hasDumbbells && !hasBack) ? 'Bent Over Dumbbell Row' : 'Floor Reverse Push-up', sets: backSets, reps: repsMain, rest: '120s', rir: rirCompound, muscle: 'ناوەڕاستی پشت' },
    { name: hasDumbbells ? 'شان پرێس بە دەمبڵ' : 'شناوی پایک (Pike Push-ups)', englishName: (hasDumbbells || hasShoulder) ? 'Dumbbell Shoulder Press' : 'Pike Push-ups', sets: shoulderSets, reps: repsSec, rest: '90s', rir: rirCompound, muscle: 'شان' },
    { name: hasDumbbells ? 'شان بەرزکردنەوە بۆ لا تەنیشت بە دەمبڵ' : 'شناوی فراوان (Wide Push-ups)', englishName: hasDumbbells ? 'Dumbbell Lateral Raise' : 'Wide Push-ups', sets: setsIso, reps: '12-15', rest: '60s', rir: rirIso, muscle: hasDumbbells ? 'تەنیشتی شان' : 'سنگ' },
    { name: hasDumbbells ? 'پاشەملە بە دەمبڵ' : (hasShoulder ? 'شناوی دایمۆند (Diamond Push-ups)' : 'پاشەملە لەسەر کورسی (Bench Dips)'), englishName: hasDumbbells ? 'Dumbbell Triceps Extension' : (hasShoulder ? 'Diamond Push-ups' : 'Bench Dips'), sets: armSets, reps: '12-15', rest: '60s', rir: rirIso, muscle: 'ترایسێپس' },
    { name: hasDumbbells ? 'قۆڵ دووسەر بە دەمبڵ' : 'کێشانی قۆڵ بە بەرگری جەستە', englishName: hasDumbbells ? 'Dumbbell Biceps Curl' : 'Bodyweight Biceps Curl', sets: armSets, reps: repsSec, rest: '60s', rir: rirIso, muscle: 'بایسێپس' }
  ] : isBeginner ? [
    // سەرەتایی: ئامێری جێگیر و ڕێڕەوی ئاسان (8-10 سێت/هەفتە، RIR 2-3)
    { name: 'پرێسی سنگ بە ئامێر (پاراستنی جومگە)', englishName: hasShoulder ? 'Neutral-Grip Machine Press' : 'Machine Chest Press', sets: 4, reps: '10-12', rest: '150s', rir: 'RIR 2-3', muscle: 'سنگ' },
    { name: 'پاروو بە ئامێر بە پاڵپشتی سنگ (Chest-Supported Machine Row)', englishName: 'Chest-Supported Machine Row', sets: 4, reps: '10-12', rest: '150s', rir: 'RIR 2-3', muscle: 'ناوەڕاستی پشت' },
    { name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ', englishName: 'Cable Lateral Raise', sets: 4, reps: '12-15', rest: '60s', rir: 'RIR 2-3', muscle: 'تەنیشتی شان' },
    { name: 'پاشەملە بە کێبڵ بە پەت', englishName: 'Triceps Rope Pushdown', sets: 4, reps: '12-15', rest: '60s', rir: 'RIR 2-3', muscle: 'ترایسێپس' },
    { name: 'قۆڵ دووسەر بە دەمبڵ (Dumbbell Biceps Curl)', englishName: 'Dumbbell Biceps Curl', sets: 4, reps: '10-12', rest: '60s', rir: 'RIR 2-3', muscle: 'بایسێپس' }
  ] : isAdvanced ? [
    // پێشکەوتوو (16-20 سێت/هەفتە، RIR 0-1 لە ئایسۆلەیشن و ئامێر)
    { name: 'پاڵەپەستۆی سەرەوەی سنگ بە دەمبڵ لەسەر کورسی لار', englishName: 'Incline Dumbbell Bench Press', sets: 4, reps: repsMain, rest: '150s', rir: 'RIR 1-2', muscle: 'سنگ (سەرەوە)' },
    { name: hasBack ? 'پاروو بە ئامێر بە پاڵپشتی سنگ' : 'پاروو بە باڕبێڵ (Barbell Row)', englishName: hasBack ? 'Chest-Supported Machine Row' : 'Barbell Row', sets: 4, reps: repsMain, rest: '150s', rir: 'RIR 1-2', muscle: 'ناوەڕاستی پشت' },
    { name: hasShoulder ? 'پرێسی ئامێر بە دەستی نیوتڕاڵ' : 'پاڵەپەستۆی تەختی سنگ بە دەمبڵ', englishName: hasShoulder ? 'Neutral-Grip Machine Press' : 'Flat Dumbbell Press', sets: 4, reps: repsSec, rest: '120s', rir: 'RIR 1-2', muscle: 'ناوەڕاستی سنگ' },
    { name: 'ڕاکێشانی کێبڵ بە دانیشتنەوە (Seated Cable Row)', englishName: 'Seated Cable Row', sets: 4, reps: '10-12', rest: '120s', rir: 'RIR 0-1', muscle: 'ناوەڕاستی پشت' },
    { name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ', englishName: 'Cable Lateral Raise', sets: 4, reps: '12-15', rest: '60s', rir: 'RIR 0-1', muscle: 'تەنیشتی شان' },
    { name: 'ترایسێپس بە پشتەسەر بە کێبڵ', englishName: 'Overhead Cable Triceps Extension', sets: 4, reps: '10-12', rest: '75s', rir: 'RIR 0-1', muscle: 'ترایسێپس' },
    { name: 'کەلەشکێنەر بە باڕی EZ (Skull Crushers)', englishName: 'Barbell Skull Crusher', sets: 4, reps: '10-12', rest: '75s', rir: 'RIR 0-1', muscle: 'ترایسێپس' },
    { name: 'قۆڵ دووسەر بە دەمبڵ لەسەر کورسی لار', englishName: 'Incline Dumbbell Biceps Curl', sets: 4, reps: '10-12', rest: '75s', rir: 'RIR 0-1', muscle: 'بایسێپس' },
    { name: 'پریچەر کێرڵ بە باڕبێڵ (Preacher Curl)', englishName: 'Barbell Preacher Curl', sets: 4, reps: '10-12', rest: '60s', rir: 'RIR 0-1', muscle: 'بایسێپس' }
  ] : [
    // ناوەند (12-16 سێت/هەفتە، RIR 1-2، گەورەکردن لە دۆخی کشاندا)
    { name: 'پاڵەپەستۆی سەرەوەی سنگ بە دەمبڵ لەسەر کورسی لار', englishName: 'Incline Dumbbell Bench Press', sets: 4, reps: repsMain, rest: '150s', rir: 'RIR 1-2', muscle: 'سنگ (سەرەوە)' },
    { name: hasBack ? 'پاروو بە ئامێر بە پاڵپشتی سنگ' : 'ڕاکێشانی کێبڵ بە دانیشتنەوە (Seated Cable Row)', englishName: hasBack ? 'Chest-Supported Machine Row' : 'Seated Cable Row', sets: 4, reps: repsMain, rest: '150s', rir: 'RIR 1-2', muscle: 'ناوەڕاستی پشت' },
    { name: hasShoulder ? 'پرێسی ئامێر بە دەستی نیوتڕاڵ' : 'پاڵەپەستۆی تەختی سنگ بە دەمبڵ', englishName: hasShoulder ? 'Neutral-Grip Machine Press' : 'Flat Dumbbell Press', sets: 3, reps: repsSec, rest: '120s', rir: 'RIR 1-2', muscle: 'ناوەڕاستی سنگ' },
    { name: 'ڕاکێشانی کێبڵ بە دەسکی تەسک (Close-Grip Pulldown)', englishName: 'Close Grip Lat Pulldown', sets: 4, reps: '10-12', rest: '150s', rir: 'RIR 1-2', muscle: 'پانیی پشت' },
    { name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ', englishName: 'Cable Lateral Raise', sets: 4, reps: '12-15', rest: '60s', rir: 'RIR 1-2', muscle: 'تەنیشتی شان' },
    { name: 'ترایسێپس بە پشتەسەر بە کێبڵ (Stretch-Mediated)', englishName: 'Overhead Cable Triceps Extension', sets: 4, reps: '10-12', rest: '75s', rir: 'RIR 1-2', muscle: 'ترایسێپس' },
    { name: 'قۆڵ دووسەر بە دەمبڵ لەسەر کورسی لار (Stretch-Mediated)', englishName: 'Incline Dumbbell Biceps Curl', sets: 4, reps: '10-12', rest: '75s', rir: 'RIR 1-2', muscle: 'بایسێپس' }
  ];

  // ==================== ٢. خشتەی بەشی خوارەوە A (Lower Body A - Quad & Knee/Spine Safe) ====================
  const exLowerA = isHome ? [
    { name: hasKnee ? 'بەرزکردنەوەی حەوز لەسەر زەوی (Glute Bridge)' : (hasDumbbells ? 'سکوات بە دەمبڵ (Goblet Squat)' : 'سکوات بە کێشی جەستە'), englishName: hasKnee ? 'Glute Bridge' : (hasDumbbells ? 'Dumbbell Goblet Squat' : 'Bodyweight Squats'), sets: legSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: hasKnee ? 'سمت' : 'ڕان' },
    { name: (hasKnee || isBeginner) ? 'بەرزکردنەوەی حەوز لەسەر زەوی (Glute Bridge)' : (hasDumbbells ? 'هەنگاونان بە دەمبڵ (Lunges)' : 'سکواتی بولگاری بە یەک پێ'), englishName: (hasKnee || isBeginner) ? 'Glute Bridge' : (hasDumbbells ? 'Dumbbell Lunges' : 'Bulgarian Split Squats'), sets: setsSec, reps: '10-12', rest: '90s', rir: rirCompound, muscle: 'ڕان و سمت' },
    { name: hasDumbbells ? 'بەرزبوونەوە لەسەر پەنجەی پێ بە دەمبڵ' : 'بەرزبوونەوەی پوز بێ کێش', englishName: hasDumbbells ? 'Dumbbell Calf Raises' : 'Bodyweight Standing Calf Raise', sets: wantCalves ? 4 : setsIso, reps: '15-20', rest: '60s', rir: rirIso, muscle: 'پوز' },
    { name: 'کڕانچی سک لەسەر زەوی', englishName: 'Crunches', sets: setsSec, reps: '15-20', rest: '60s', rir: rirIso, muscle: 'ورگ' }
  ] : isBeginner ? [
    // سەرەتایی: بێ سکواتی بولگاری و بێ دیدلیفت — ئامێری جێگیر (٨-١٠ سێت/هەفتە)
    { name: hasKnee ? 'بەرزکردنەوەی حەوز (Glute Bridge - پاراستنی ئەژنۆ)' : 'قاچ پرێس بە ئامێر (Leg Press)', englishName: hasKnee ? 'Glute Bridge' : 'Leg Press', sets: 4, reps: '10-12', rest: '180s', rir: 'RIR 2-3', muscle: hasKnee ? 'سمت و پشتی ڕان' : 'چوار سەرەی ڕان' },
    { name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (Seated Leg Curl)', englishName: 'Seated Leg Curl', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 2-3', muscle: 'پشتی ڕان' },
    { name: 'بەرزبوونەوە لەسەر پەنجەی پێ بە ئامێر', englishName: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: '60s', rir: 'RIR 2-3', muscle: 'پوز' },
    { name: 'کڕانچی سک بە کێبڵ بە پەت', englishName: 'Cable Rope Crunch', sets: 3, reps: '15', rest: '60s', rir: 'RIR 2-3', muscle: 'ورگ' }
  ] : isAdvanced ? [
    { name: (hasKnee || hasBack) ? (hasKnee ? 'بەرزکردنەوەی حەوز (Glute Bridge)' : 'قاچ پرێس بە ئامێر (Leg Press)') : 'سکوات بە باڕبێڵ لەسەر شان', englishName: hasKnee ? 'Glute Bridge' : (hasBack ? 'Leg Press' : 'Barbell Back Squat'), sets: 4, reps: repsMain, rest: '180s', rir: 'RIR 1-2', muscle: 'چوار سەرەی ڕان' },
    { name: hasKnee ? 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە' : 'قاچ پرێس بە ئامێر (Leg Press)', englishName: hasKnee ? 'Seated Leg Curl' : 'Leg Press', sets: 4, reps: '10-12', rest: '180s', rir: 'RIR 0-1', muscle: 'چوار سەرەی ڕان' },
    { name: hasKnee ? 'ڕاکێشانی پشتی قاچ بە پاڵکەوتنەوە' : 'سکواتی بولگاری بە یەک پێ بە دەمبڵ', englishName: hasKnee ? 'Lying Leg Curl' : 'Bulgarian Split Squats', sets: 4, reps: '10-12', rest: '120s', rir: 'RIR 1-2', muscle: 'ڕان و سمت' },
    { name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (Seated Leg Curl)', englishName: 'Seated Leg Curl', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 0-1', muscle: 'پشتی ڕان' },
    { name: 'هایپەرئێکستێنشن بۆ پشتی ڕان و سمت (Hyperextensions)', englishName: 'Hyperextensions', sets: 4, reps: '12-15', rest: '90s', rir: 'RIR 0-1', muscle: 'پشتی ڕان و خوارەوەی پشت' },
    { name: 'بەرزبوونەوە لەسەر پەنجەی پێ بە ئامێر', englishName: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: '60s', rir: 'RIR 0-1', muscle: 'پوز' },
    { name: 'کڕانچی سک بە کێبڵ بە پەت', englishName: 'Cable Rope Crunch', sets: 4, reps: '15-20', rest: '60s', rir: 'RIR 0-1', muscle: 'ورگ' }
  ] : [
    { name: (hasKnee || hasBack) ? (hasKnee ? 'بەرزکردنەوەی حەوز (Glute Bridge)' : 'قاچ پرێس بە ئامێر (Leg Press)') : 'سکوات بە باڕبێڵ لەسەر شان', englishName: hasKnee ? 'Glute Bridge' : (hasBack ? 'Leg Press' : 'Barbell Back Squat'), sets: 4, reps: repsMain, rest: '180s', rir: 'RIR 1-2', muscle: 'چوار سەرەی ڕان' },
    { name: hasKnee ? 'ڕاکێشانی پشتی قاچ بە پاڵکەوتنەوە' : 'سکواتی بولگاری بە یەک پێ بە دەمبڵ', englishName: hasKnee ? 'Lying Leg Curl' : 'Bulgarian Split Squats', sets: 3, reps: '10-12', rest: '120s', rir: 'RIR 1-2', muscle: 'ڕان و سمت' },
    { name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (Stretch-Mediated)', englishName: 'Seated Leg Curl', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 1-2', muscle: 'پشتی ڕان' },
    { name: hasKnee ? 'بەرزکردنەوەی حەوز (Glute Bridge)' : 'لێگ ئێکس تێنشن بە ئامێر', englishName: hasKnee ? 'Glute Bridge' : 'Leg Extension Machine', sets: 3, reps: '12-15', rest: '75s', rir: 'RIR 1-2', muscle: 'چوار سەرەی ڕان' },
    { name: 'بەرزبوونەوە لەسەر پەنجەی پێ بە ئامێر', englishName: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: '60s', rir: 'RIR 1-2', muscle: 'پوز' },
    { name: 'کڕانچی سک بە کێبڵ بە پەت', englishName: 'Cable Rope Crunch', sets: 3, reps: '15-20', rest: '60s', rir: 'RIR 1-2', muscle: 'ورگ' }
  ];

  // ==================== ٣. خشتەی بەشی سەرەوە B (Upper Body B - Vertical Pull & Shoulder/Chest Angle) ====================
  const exUpperB = isHome ? [
    { name: hasDumbbells ? 'پاروو بە دەمبڵ بە تاک دەست' : 'بەرزکردنەوەی جەستە بە ئەنیشک لەسەر زەوی (Reverse Push-up)', englishName: hasDumbbells ? 'Single Arm Dumbbell Row' : 'Floor Reverse Push-up', sets: backSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'پشت' },
    { name: hasDumbbells ? 'شان پرێس بە دەمبڵ' : 'شناوی پایک بۆ شان (Pike Push-ups)', englishName: (hasDumbbells || hasShoulder) ? 'Dumbbell Shoulder Press' : 'Pike Push-ups', sets: shoulderSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'شان' },
    { name: hasBands ? 'پاڵەپەستۆی سنگ بە لاستیک (Band Bench Press)' : 'شناوی فراوان (Wide Push-ups)', englishName: hasBands ? 'Band Bench Press' : 'Wide Push-ups', sets: setsSec, reps: '12-15', rest: '60s', rir: rirIso, muscle: 'سنگ' },
    { name: 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman Holds)', englishName: 'Superman Holds', sets: setsSec, reps: '15', rest: '60s', rir: rirIso, muscle: 'خوارەوەی پشت' },
    { name: hasDumbbells ? 'هامر کێرڵ بە دەمبڵ' : 'کێشانی قۆڵ بە بەرگری جەستە', englishName: hasDumbbells ? 'Dumbbell Hammer Curl' : 'Bodyweight Biceps Curl', sets: armSets, reps: repsSec, rest: '60s', rir: rirIso, muscle: 'بایسێپس و براکیالیس' },
    { name: hasDumbbells ? 'پاشەملە بە دەمبڵ' : 'شناوی دایمۆند (Diamond Push-ups)', englishName: hasDumbbells ? 'Dumbbell Triceps Extension' : 'Diamond Push-ups', sets: armSets, reps: '12', rest: '60s', rir: rirIso, muscle: 'ترایسێپس' }
  ] : isBeginner ? [
    { name: 'ڕاکێشانی کێبڵ بۆ سەر سنگ بە دەسکی فراوان', englishName: 'Lat Pulldown Wide Grip', sets: 4, reps: '10-12', rest: '150s', rir: 'RIR 2-3', muscle: 'پانیی پشت (لاتس)' },
    { name: 'پێک دێک فلای بە ئامێر (Pec Deck Machine Fly)', englishName: 'Pec Deck Machine Fly', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 2-3', muscle: 'سنگ' },
    { name: hasShoulder ? 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ' : 'دەمبڵ شۆڵدەر پرێس بە دانیشتنەوە', englishName: hasShoulder ? 'Cable Lateral Raise' : 'Seated Dumbbell Shoulder Press', sets: 4, reps: '10-12', rest: '120s', rir: 'RIR 2-3', muscle: 'شان' },
    { name: 'کۆکردنەوەی پشتی شان بە کێبڵ (Face Pull)', englishName: 'Cable Face Pull', sets: 2, reps: '15', rest: '60s', rir: 'RIR 2-3', muscle: 'پشتی شان' },
    { name: 'ترایسێپس بە پشتەسەر بە کێبڵ', englishName: 'Overhead Cable Triceps Extension', sets: 4, reps: '12', rest: '75s', rir: 'RIR 2-3', muscle: 'ترایسێپس' },
    { name: 'هامر کێرڵ بە دەمبڵ', englishName: 'Dumbbell Hammer Curl', sets: 4, reps: '10-12', rest: '60s', rir: 'RIR 2-3', muscle: 'بایسێپس' }
  ] : isAdvanced ? [
    { name: 'ڕاکێشانی کێبڵ بۆ سەر سنگ بە دەسکی فراوان', englishName: 'Lat Pulldown Wide Grip', sets: 4, reps: repsMain, rest: '150s', rir: 'RIR 1-2', muscle: 'پانیی پشت (لاتس)' },
    { name: hasShoulder ? 'پرێسی ئامێر بە دەستی نیوتڕاڵ' : 'پرێسی سنگ بە ئامێر (Machine Chest Press)', englishName: hasShoulder ? 'Neutral-Grip Machine Press' : 'Machine Chest Press', sets: 4, reps: '10-12', rest: '150s', rir: 'RIR 0-1', muscle: 'سنگ' },
    { name: 'پێک دێک فلای بە ئامێر (Pec Deck Machine Fly)', englishName: 'Pec Deck Machine Fly', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 0-1', muscle: 'سنگ' },
    { name: hasShoulder ? 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ' : 'دەمبڵ شۆڵدەر پرێس بە دانیشتنەوە', englishName: hasShoulder ? 'Cable Lateral Raise' : 'Seated Dumbbell Shoulder Press', sets: 4, reps: repsMain, rest: '120s', rir: 'RIR 1-2', muscle: 'شان' },
    { name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە دەمبڵ', englishName: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest: '60s', rir: 'RIR 0-1', muscle: 'تەنیشتی شان' },
    { name: 'ڕاکێشانی کێبڵ بە دانیشتنەوە (Seated Cable Row)', englishName: 'Seated Cable Row', sets: 4, reps: '10-12', rest: '120s', rir: 'RIR 0-1', muscle: 'ناوەڕاستی پشت' },
    { name: 'کۆکردنەوەی پشتی شان بە کێبڵ (Face Pull)', englishName: 'Cable Face Pull', sets: 4, reps: '15', rest: '60s', rir: 'RIR 0-1', muscle: 'پشتی شان' },
    { name: 'هامر کێرڵ بە دەمبڵ', englishName: 'Dumbbell Hammer Curl', sets: 4, reps: repsSec, rest: '60s', rir: 'RIR 0-1', muscle: 'بایسێپس و براکیالیس' },
    { name: 'بایسێپس کێرڵ بە کێبڵ', englishName: 'Cable Bicep Curl', sets: 4, reps: '12-15', rest: '60s', rir: 'RIR 0-1', muscle: 'بایسێپس' },
    { name: 'پاشەملە بە کێبڵ بە پەت', englishName: 'Triceps Rope Pushdown', sets: 4, reps: '12-15', rest: '60s', rir: 'RIR 0-1', muscle: 'ترایسێپس' },
    { name: 'پاشەملەی ترایسێپس بە دەمبڵ لە پشت سەر', englishName: 'Overhead Dumbbell Triceps Extension', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 0-1', muscle: 'ترایسێپس' }
  ] : [
    { name: 'ڕاکێشانی کێبڵ بۆ سەر سنگ بە دەسکی فراوان', englishName: 'Lat Pulldown Wide Grip', sets: 4, reps: repsMain, rest: '150s', rir: 'RIR 1-2', muscle: 'پانیی پشت (لاتس)' },
    { name: hasShoulder ? 'پرێسی ئامێر بە دەستی نیوتڕاڵ' : 'دەمبڵ شۆڵدەر پرێس بە دانیشتنەوە', englishName: hasShoulder ? 'Neutral-Grip Machine Press' : 'Seated Dumbbell Shoulder Press', sets: 4, reps: repsMain, rest: '120s', rir: 'RIR 1-2', muscle: 'شان' },
    { name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە دەمبڵ', englishName: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest: '60s', rir: 'RIR 1-2', muscle: 'تەنیشتی شان' },
    { name: 'فڕینی سنگ بە کێبڵ لە ڕاوەستانەوە', englishName: 'Standing Cable Chest Fly', sets: 3, reps: '12-15', rest: '75s', rir: 'RIR 1-2', muscle: 'سنگ' },
    { name: 'پێک دێک فلای بە ئامێر (Pec Deck Machine Fly)', englishName: 'Pec Deck Machine Fly', sets: 3, reps: '12-15', rest: '75s', rir: 'RIR 1-2', muscle: 'سنگ' },
    { name: 'کۆکردنەوەی پشتی شان بە کێبڵ (Face Pull)', englishName: 'Cable Face Pull', sets: 4, reps: '15', rest: '60s', rir: 'RIR 1-2', muscle: 'پشتی شان' },
    { name: 'هامر کێرڵ بە دەمبڵ بۆ ئەستوورکردنی قۆڵ', englishName: 'Dumbbell Hammer Curl', sets: 4, reps: repsSec, rest: '60s', rir: 'RIR 1-2', muscle: 'بایسێپس و براکیالیس' },
    { name: 'پریچەر کێرڵ بە باڕی EZ', englishName: 'Barbell Preacher Curl', sets: 4, reps: '10-12', rest: '60s', rir: 'RIR 1-2', muscle: 'بایسێپس' },
    { name: 'پاشەملە بە کێبڵ بە پەت', englishName: 'Triceps Rope Pushdown', sets: 4, reps: '12', rest: '60s', rir: 'RIR 1-2', muscle: 'ترایسێپس' },
    { name: 'کەلەشکێنەر بە باڕبێڵ', englishName: 'Barbell Skull Crusher', sets: 4, reps: '10-12', rest: '75s', rir: 'RIR 1-2', muscle: 'ترایسێپس' }
  ];

  // ==================== ٤. خشتەی بەشی خوارەوە B (Lower Body B - Posterior Chain & Glutes) ====================
  const exLowerB = isHome ? [
    { name: (hasDumbbells && !hasBack && !isBeginner) ? 'دیدلیفت بە دەمبڵ بۆ پشت و سمت' : 'بەرزکردنەوەی حەوز لەسەر زەوی (Glute Bridge)', englishName: (hasDumbbells && !hasBack && !isBeginner) ? 'Dumbbell Romanian Deadlift' : 'Glute Bridge', sets: legSets, reps: repsMain, rest: '120s', rir: rirCompound, muscle: 'پشتی قاچ و سمت' },
    { name: 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman Holds)', englishName: 'Superman Holds', sets: setsSec, reps: '15', rest: '60s', rir: rirIso, muscle: 'خوارەوەی پشت' },
    { name: (hasKnee || isBeginner) ? 'بەرزبوونەوەی پوز لەسەر پەنجەی پێ' : (hasDumbbells ? 'هەنگاونان بە دەمبڵ (Lunges)' : 'سکواتی بولگاری بە یەک پێ'), englishName: (hasKnee || isBeginner) ? 'Bodyweight Standing Calf Raise' : (hasDumbbells ? 'Dumbbell Lunges' : 'Bulgarian Split Squats'), sets: setsSec, reps: '12-15', rest: '90s', rir: rirCompound, muscle: (hasKnee || isBeginner) ? 'پوز' : 'قاچ و سمت' },
    { name: 'پلانکی زانستی بۆ بەهێزکردنی کۆڕ و کەمەر', englishName: 'Scientific Plank Hold', sets: setsSec, reps: '60s', rest: '60s', rir: rirIso, muscle: 'سک و کەمەر' }
  ] : isBeginner ? [
    // سەرەتایی: بێ دیدلیفت — ئامێری سەلامەت بۆ سمت و پشتی ڕان و چوارسەرە
    { name: 'باڕبێڵ هیپ ثرەست / بەرزکردنەوەی حەوز بۆ سمت', englishName: 'Barbell Hip Thrust', sets: 4, reps: '10-12', rest: '150s', rir: 'RIR 2-3', muscle: 'سمت و حەوز' },
    { name: 'ڕاکێشانی پشتی قاچ بە پاڵکەوتنەوە (Lying Leg Curl)', englishName: 'Lying Leg Curl', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 2-3', muscle: 'پشتی ڕان' },
    { name: hasKnee ? 'بەرزکردنەوەی حەوز (Glute Bridge)' : 'لێگ ئێکس تێنشن بە ئامێر', englishName: hasKnee ? 'Glute Bridge' : 'Leg Extension Machine', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 2-3', muscle: 'چوار سەرەی ڕان' },
    { name: 'سۆڵە بە دانیشتنەوە بە ئامێر (Seated Calf Raise)', englishName: 'Seated Calf Raise', sets: 4, reps: '15', rest: '60s', rir: 'RIR 2-3', muscle: 'پوز' },
    { name: 'پلانکی زانستی بۆ بەهێزکردنی کۆڕ و کەمەر', englishName: 'Scientific Plank Hold', sets: 3, reps: '60s', rest: '60s', rir: 'RIR 2-3', muscle: 'سک و کەمەر' }
  ] : isAdvanced ? [
    { name: hasBack ? 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (پاراستنی پشت)' : 'ڕۆمانیەن دێدلیفت بە باڕبێڵ بۆ پشتی قاچ و سمت', englishName: hasBack ? 'Seated Leg Curl' : 'Romanian Deadlift', sets: 4, reps: repsMain, rest: hasBack ? '75s' : '180s', rir: hasBack ? 'RIR 0-1' : 'RIR 1-2', muscle: 'پشتی قاچ و سمت' },
    { name: 'باڕبێڵ هیپ ثرەست بۆ گەورەکردن و فۆڕمکردنی سمت', englishName: 'Barbell Hip Thrust', sets: 4, reps: '10-12', rest: '150s', rir: 'RIR 1-2', muscle: 'سمت و حەوز' },
    { name: 'ڕاکێشانی پشتی قاچ بە پاڵکەوتنەوە (Lying Leg Curl)', englishName: 'Lying Leg Curl', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 0-1', muscle: 'پشتی ڕان' },
    { name: hasKnee ? 'بەرزکردنەوەی حەوز (Glute Bridge)' : 'لێگ ئێکس تێنشن بە ئامێر بۆ چوار سەرەی ڕان', englishName: hasKnee ? 'Glute Bridge' : 'Leg Extension Machine', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 0-1', muscle: 'چوار سەرەی ڕان' },
    { name: 'سۆڵە بە دانیشتنەوە بە ئامێر (Seated Calf Raise)', englishName: 'Seated Calf Raise', sets: 4, reps: '15', rest: '60s', rir: 'RIR 0-1', muscle: 'پوز' },
    { name: 'پلانکی زانستی بۆ بەهێزکردنی کۆڕ و کەمەر', englishName: 'Scientific Plank Hold', sets: 4, reps: '60s', rest: '60s', rir: 'RIR 0-1', muscle: 'سک و کەمەر' }
  ] : [
    { name: hasBack ? 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (پاراستنی پشت)' : 'ڕۆمانیەن دێدلیفت بە باڕبێڵ بۆ پشتی قاچ و سمت', englishName: hasBack ? 'Seated Leg Curl' : 'Romanian Deadlift', sets: 4, reps: repsMain, rest: hasBack ? '75s' : '180s', rir: 'RIR 1-2', muscle: 'پشتی قاچ و سمت' },
    { name: 'باڕبێڵ هیپ ثرەست بۆ گەورەکردن و فۆڕمکردنی سمت', englishName: 'Barbell Hip Thrust', sets: wantGlutes ? 5 : 4, reps: '10-12', rest: '150s', rir: 'RIR 1-2', muscle: 'سمت و حەوز' },
    { name: 'ڕاکێشانی پشتی قاچ بە پاڵکەوتنەوە', englishName: 'Lying Leg Curl', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 1-2', muscle: 'پشتی ڕان' },
    { name: hasKnee ? 'بەرزکردنەوەی حەوز (Glute Bridge)' : 'لێگ ئێکس تێنشن بە ئامێر بۆ چوار سەرەی ڕان', englishName: hasKnee ? 'Glute Bridge' : 'Leg Extension Machine', sets: 3, reps: '12-15', rest: '75s', rir: 'RIR 1-2', muscle: 'چوار سەرەی ڕان' },
    { name: 'سۆڵە بە دانیشتنەوە بە ئامێر (Seated Calf Raise)', englishName: 'Seated Calf Raise', sets: 4, reps: '15', rest: '60s', rir: 'RIR 1-2', muscle: 'پوز' },
    { name: 'پلانکی زانستی بۆ بەهێزکردنی کۆڕ و کەمەر', englishName: 'Scientific Plank Hold', sets: 3, reps: '60s', rest: '60s', rir: 'RIR 1-2', muscle: 'سک و کەمەر' }
  ];

  // ==================== ٥. خشتەکانی Full Body A, B, C (بۆ یاریزانانی ٣ و ٢ ڕۆژە) ====================
  const fbSets = isBeginner ? 3 : 4;
  const fbTwoDaySets = isBeginner ? 4 : 4;
  const fbActiveSets = selectedDaysCount === 2 ? fbTwoDaySets : fbSets;
  const exFullBodyA = isHome ? [
    { name: 'پاڵەپەستۆی سنگ بە دەمبڵ لەسەر زەوی (یان شناو)', englishName: hasDumbbells ? 'Floor Dumbbell Press' : 'Push-ups', sets: fbActiveSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'سنگ' },
    ...(isAdvanced ? [{ name: hasBands ? 'پاڵەپەستۆی سنگ بە لاستیک (Band Bench Press)' : 'شناوی فراوان (Wide Push-ups)', englishName: hasBands ? 'Band Bench Press' : 'Wide Push-ups', sets: 4, reps: '12-15', rest: '90s', rir: rirIso, muscle: 'سنگ' }] : []),
    { name: hasKnee ? 'بەرزکردنەوەی حەوز لەسەر زەوی (Glute Bridge)' : 'سکوات بە دەمبڵ (یان بێ کێش)', englishName: hasKnee ? 'Glute Bridge' : (hasDumbbells ? 'Dumbbell Goblet Squat' : 'Bodyweight Squats'), sets: fbActiveSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: hasKnee ? 'سمت' : 'ڕان' },
    { name: 'بەرزکردنەوەی جەستە بە ئەنیشک لەسەر زەوی', englishName: 'Floor Reverse Push-up', sets: fbActiveSets, reps: repsSec, rest: '90s', rir: rirCompound, muscle: 'پشت' },
    { name: hasDumbbells ? 'شان بەرزکردنەوە بۆ لا تەنیشت بە دەمبڵ' : 'شناوی پایک', englishName: (hasDumbbells || hasShoulder) ? 'Dumbbell Lateral Raise' : 'Pike Push-ups', sets: setsSec, reps: '12-15', rest: '60s', rir: rirIso, muscle: 'شان' },
    { name: 'کڕانچی سک لەسەر زەوی', englishName: 'Crunches', sets: setsSec, reps: '15-20', rest: '60s', rir: rirIso, muscle: 'سک' }
  ] : [
    { name: isBeginner ? 'پرێسی سنگ بە ئامێر (Machine Chest Press)' : 'پاڵەپەستۆی سەرەوەی سنگ بە دەمبڵ لەسەر کورسی لار', englishName: isBeginner ? (hasShoulder ? 'Neutral-Grip Machine Press' : 'Machine Chest Press') : 'Incline Dumbbell Bench Press', sets: fbActiveSets, reps: repsMain, rest: '150s', rir: rirCompound, muscle: 'سنگ (سەرەوە)' },
    ...(isAdvanced ? [{ name: hasShoulder ? 'پێک دێک فلای بە ئامێر' : 'پاڵەپەستۆی تەختی سنگ بە دەمبڵ', englishName: hasShoulder ? 'Pec Deck Machine Fly' : 'Flat Dumbbell Press', sets: 4, reps: repsSec, rest: hasShoulder ? '75s' : '120s', rir: 'RIR 0-1', muscle: 'ناوەڕاستی سنگ' }] : []),
    { name: (hasKnee || hasBack || isBeginner) ? (hasKnee ? 'بەرزکردنەوەی حەوز (Glute Bridge)' : 'قاچ پرێس بە ئامێر (Leg Press)') : 'سکوات بە باڕبێڵ لەسەر شان', englishName: hasKnee ? 'Glute Bridge' : ((hasBack || isBeginner) ? 'Leg Press' : 'Barbell Back Squat'), sets: fbActiveSets, reps: repsMain, rest: '180s', rir: rirCompound, muscle: 'چوار سەرەی ڕان' },
    ...(selectedDaysCount === 3 ? [{ name: 'ڕاکێشانی پشتی قاچ بە پاڵکەوتنەوە (Lying Leg Curl)', englishName: 'Lying Leg Curl', sets: fbActiveSets, reps: '12-15', rest: '75s', rir: rirIso, muscle: 'پشتی ڕان' }] : []),
    ...(isAdvanced && !hasKnee ? [{ name: 'لێگ ئێکس تێنشن بە ئامێر (Quad Isolation)', englishName: 'Leg Extension Machine', sets: 4, reps: '12-15', rest: '75s', rir: 'RIR 0-1', muscle: 'چوار سەرەی ڕان' }] : []),
    ...(isAdvanced && selectedDaysCount === 3 ? [{ name: 'هایپەرئێکستێنشن بۆ پشتی ڕان و سمت', englishName: 'Hyperextensions', sets: 4, reps: '12-15', rest: '90s', rir: 'RIR 0-1', muscle: 'پشتی ڕان و خوارەوەی پشت' }] : []),
    { name: 'ڕاکێشانی کێبڵ بۆ سەر سنگ بە دەسکی فراوان', englishName: 'Lat Pulldown Wide Grip', sets: fbActiveSets, reps: repsSec, rest: '150s', rir: rirCompound, muscle: 'پانیی پشت' },
    ...(isAdvanced ? [{ name: 'پاروو بە ئامێر بە پاڵپشتی سنگ (Chest-Supported Machine Row)', englishName: 'Chest-Supported Machine Row', sets: 4, reps: '10-12', rest: '150s', rir: 'RIR 0-1', muscle: 'ناوەڕاستی پشت' }] : []),
    { name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ', englishName: 'Cable Lateral Raise', sets: fbActiveSets, reps: '12-15', rest: '60s', rir: rirIso, muscle: 'تەنیشتی شان' },
    { name: 'ترایسێپس بە پشتەسەر بە کێبڵ', englishName: 'Overhead Cable Triceps Extension', sets: setsSec, reps: '10-12', rest: '75s', rir: rirIso, muscle: 'ترایسێپس' },
    { name: 'کڕانچی سک بە کێبڵ بە پەت', englishName: 'Cable Rope Crunch', sets: setsSec, reps: '15-20', rest: '60s', rir: rirIso, muscle: 'ورگ' }
  ];

  const exFullBodyB = isHome ? [
    { name: hasDumbbells ? 'پاڵەپەستۆی سنگ بە دەمبڵ لەسەر زەوی' : 'شناو (Push-ups)', englishName: hasDumbbells ? 'Floor Dumbbell Press' : 'Push-ups', sets: fbActiveSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'سنگ' },
    { name: (hasDumbbells && !hasBack && !isBeginner) ? 'دیدلیفت بە دەمبڵ بۆ پشت و سمت' : 'بەرزکردنەوەی حەوز لەسەر زەوی', englishName: (hasDumbbells && !hasBack && !isBeginner) ? 'Dumbbell Romanian Deadlift' : 'Glute Bridge', sets: fbActiveSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'پشتی قاچ و سمت' },
    { name: hasDumbbells ? 'شان پرێس بە دەمبڵ' : 'شناوی پایک بۆ شان', englishName: (hasDumbbells || hasShoulder) ? 'Dumbbell Shoulder Press' : 'Pike Push-ups', sets: fbActiveSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'شان' },
    { name: hasDumbbells && !hasBack ? 'پاروو بە دەمبڵ بە چەمانەوە' : 'ڕاهێنانی سوپەرمان لەسەر زەوی', englishName: (hasDumbbells && !hasBack) ? 'Bent Over Dumbbell Row' : 'Superman Holds', sets: fbActiveSets, reps: repsSec, rest: '90s', rir: rirCompound, muscle: 'پشت' },
    { name: (hasKnee || isBeginner) ? 'بەرزکردنەوەی حەوز لەسەر زەوی' : 'سکواتی بولگاری بە یەک پێ', englishName: (hasKnee || isBeginner) ? 'Glute Bridge' : 'Bulgarian Split Squats', sets: setsSec, reps: '12-15', rest: '90s', rir: rirCompound, muscle: 'قاچ' },
    { name: hasDumbbells ? 'قۆڵ دووسەر بە دەمبڵ' : (hasShoulder ? 'شناوی دایمۆند (Diamond Push-ups)' : 'پاشەملە لەسەر کورسی'), englishName: hasDumbbells ? 'Dumbbell Biceps Curl' : (hasShoulder ? 'Diamond Push-ups' : 'Bench Dips'), sets: fbActiveSets, reps: '12', rest: '60s', rir: rirIso, muscle: 'قۆڵ' }
  ] : [
    { name: hasShoulder ? 'پرێسی ئامێر بە دەستی نیوتڕاڵ' : 'پرێسی سنگ بە ئامێر (Machine Chest Press)', englishName: hasShoulder ? 'Neutral-Grip Machine Press' : 'Machine Chest Press', sets: fbActiveSets, reps: repsMain, rest: '150s', rir: rirCompound, muscle: 'ناوەڕاستی سنگ' },
    { name: (hasBack || isBeginner) ? 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە (Seated Leg Curl)' : 'ڕۆمانیەن دێدلیفت بە باڕبێڵ', englishName: (hasBack || isBeginner) ? 'Seated Leg Curl' : 'Romanian Deadlift', sets: fbActiveSets, reps: repsMain, rest: (hasBack || isBeginner) ? '75s' : '180s', rir: rirCompound, muscle: 'پشتی قاچ و سمت' },
    { name: hasShoulder ? 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ' : 'دەمبڵ شۆڵدەر پرێس بە دانیشتنەوە', englishName: hasShoulder ? 'Cable Lateral Raise' : 'Seated Dumbbell Shoulder Press', sets: fbActiveSets, reps: repsMain, rest: hasShoulder ? '60s' : '120s', rir: rirCompound, muscle: 'شان' },
    ...(isAdvanced ? [{ name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە دەمبڵ', englishName: 'Dumbbell Lateral Raise', sets: 4, reps: '12-15', rest: '60s', rir: 'RIR 0-1', muscle: 'تەنیشتی شان' }] : []),
    { name: 'پاروو بە ئامێر بە پاڵپشتی سنگ', englishName: 'Chest-Supported Machine Row', sets: fbActiveSets, reps: repsSec, rest: '150s', rir: rirCompound, muscle: 'ناوەڕاستی پشت' },
    { name: hasKnee ? 'ڕاکێشانی پشتی قاچ بە پاڵکەوتنەوە' : 'لێگ ئێکس تێنشن بە ئامێر', englishName: hasKnee ? 'Lying Leg Curl' : 'Leg Extension Machine', sets: fbActiveSets, reps: '12-15', rest: '75s', rir: rirIso, muscle: 'چوار سەرەی ڕان' },
    { name: 'قۆڵ دووسەر بە دەمبڵ لەسەر کورسی لار', englishName: 'Incline Dumbbell Biceps Curl', sets: fbActiveSets, reps: '10-12', rest: '75s', rir: rirIso, muscle: 'بایسێپس' },
    { name: 'پاشەملە بە کێبڵ بە پەت', englishName: 'Triceps Rope Pushdown', sets: fbActiveSets, reps: '12', rest: '60s', rir: rirIso, muscle: 'ترایسێپس' }
  ];

  const exFullBodyC = isHome ? [
    { name: 'بەرزکردنەوەی حەوز لەسەر زەوی (Glute Bridge)', englishName: 'Glute Bridge', sets: fbSets, reps: '15-20', rest: '90s', rir: rirCompound, muscle: 'سمت و حەوز' },
    { name: (hasKnee || isBeginner) ? 'بەرزبوونەوەی پوز لەسەر پەنجەی پێ' : 'سکواتی بولگاری بە یەک پێ', englishName: (hasKnee || isBeginner) ? 'Bodyweight Standing Calf Raise' : 'Bulgarian Split Squats', sets: fbSets, reps: '10-12', rest: '90s', rir: rirCompound, muscle: 'قاچ' },
    { name: 'شناوی فراوان (Wide Push-ups)', englishName: 'Wide Push-ups', sets: fbSets, reps: '12-15', rest: '90s', rir: rirCompound, muscle: 'سنگ' },
    { name: 'بەرزکردنەوەی جەستە بە ئەنیشک لەسەر زەوی (Reverse Push-up)', englishName: 'Floor Reverse Push-up', sets: fbSets, reps: '12', rest: '90s', rir: rirCompound, muscle: 'پشت' },
    { name: 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman Holds)', englishName: 'Superman Holds', sets: fbSets, reps: '15', rest: '60s', rir: rirIso, muscle: 'خوارەوەی پشت' },
    { name: 'پلانکی زانستی بۆ بەهێزکردنی سک', englishName: 'Scientific Plank Hold', sets: setsSec, reps: '60s', rest: '60s', rir: rirIso, muscle: 'کۆڕ و سک' }
  ] : [
    { name: 'باڕبێڵ هیپ ثرەست بۆ گەورەکردن و فۆڕمکردنی سمت', englishName: 'Barbell Hip Thrust', sets: fbSets, reps: '10-12', rest: '150s', rir: rirCompound, muscle: 'سمت و حەوز' },
    { name: (hasKnee || isBeginner) ? 'قاچ پرێس بە ئامێر (Leg Press)' : 'سکواتی بولگاری بە یەک پێ بە دەمبڵ', englishName: hasKnee ? 'Lying Leg Curl' : (isBeginner ? 'Leg Press' : 'Bulgarian Split Squats'), sets: fbSets, reps: '10-12', rest: hasKnee ? '75s' : '150s', rir: rirCompound, muscle: 'قاچ و سمت' },
    { name: 'پێک دێک فلای بە ئامێر (Pec Deck Machine Fly)', englishName: 'Pec Deck Machine Fly', sets: fbSets, reps: '12-15', rest: '75s', rir: rirIso, muscle: 'سنگ' },
    { name: 'ڕاکێشانی کێبڵ بە دانیشتنەوە (Seated Cable Row)', englishName: 'Seated Cable Row', sets: fbSets, reps: '10-12', rest: '120s', rir: rirCompound, muscle: 'ناوەڕاستی پشت' },
    { name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە', englishName: 'Seated Leg Curl', sets: fbSets, reps: '12-15', rest: '75s', rir: rirIso, muscle: 'پشتی ڕان' },
    { name: 'کۆکردنەوەی پشتی شان بە کێبڵ (Face Pull)', englishName: 'Cable Face Pull', sets: fbSets, reps: '15', rest: '60s', rir: rirIso, muscle: 'پشت و شان' },
    { name: 'پلانکی زانستی بۆ بەهێزکردنی کۆڕ و کەمەر', englishName: 'Scientific Plank Hold', sets: setsSec, reps: '60s', rest: '60s', rir: rirIso, muscle: 'کۆڕ و کەمەر' }
  ];

  // ==================== ٦. خشتەکانی PPL بۆ یاریزانانی ٥ و ٦ ڕۆژە (چاککردنی هەڵەی Push A - تەنها سنگ، شان و ترایسێپس) ====================
  const pplPrimarySets = isBeginner ? (selectedDaysCount === 6 ? 2 : 3) : 4;
  const pplSecSets = isBeginner ? 2 : (isAdvanced ? 4 : 3);
  const pplSingleSets = isBeginner ? 3 : 4;
  const pplArmSets = isBeginner ? (selectedDaysCount === 6 ? 2 : 3) : (isAdvanced ? 4 : 3);

  const exPushA = isHome ? [
    { name: hasDumbbells ? 'پاڵەپەستۆی سنگ بە دەمبڵ لەسەر زەوی' : 'شناو (Push-ups)', englishName: hasDumbbells ? 'Floor Dumbbell Press' : 'Push-ups', sets: pplPrimarySets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'سنگ' },
    { name: 'شناوی فراوان (Wide Push-ups)', englishName: 'Wide Push-ups', sets: pplSecSets, reps: '12-15', rest: '90s', rir: rirCompound, muscle: 'سنگ' },
    { name: hasDumbbells ? 'شان پرێس بە دەمبڵ' : 'شناوی پایک بۆ شان (Pike Push-ups)', englishName: (hasDumbbells || hasShoulder) ? 'Dumbbell Shoulder Press' : 'Pike Push-ups', sets: pplSingleSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'شان' },
    { name: hasDumbbells ? 'شان بەرزکردنەوە بۆ لا تەنیشت بە دەمبڵ' : 'شناوی دایمۆند (Diamond Push-ups)', englishName: hasDumbbells ? 'Dumbbell Lateral Raise' : 'Diamond Push-ups', sets: pplArmSets, reps: '12-15', rest: '60s', rir: rirIso, muscle: hasDumbbells ? 'تەنیشتی شان' : 'ترایسێپس' },
    { name: hasDumbbells ? 'پاشەملە بە دەمبڵ' : (hasShoulder ? 'شناوی دایمۆند (Diamond Push-ups)' : 'پاشەملە لەسەر کورسی (Bench Dips)'), englishName: hasDumbbells ? 'Dumbbell Triceps Extension' : (hasShoulder ? 'Diamond Push-ups' : 'Bench Dips'), sets: pplArmSets, reps: '12-15', rest: '60s', rir: rirIso, muscle: 'ترایسێپس' }
  ] : [
    { name: isBeginner ? 'پرێسی سنگ بە ئامێر (Machine Chest Press)' : 'پاڵەپەستۆی سەرەوەی سنگ بە دەمبڵ لەسەر کورسی لار', englishName: isBeginner ? (hasShoulder ? 'Neutral-Grip Machine Press' : 'Machine Chest Press') : 'Incline Dumbbell Bench Press', sets: pplPrimarySets, reps: repsMain, rest: '150s', rir: rirCompound, muscle: 'سنگ (سەرەوە)' },
    { name: (hasShoulder && !isBeginner) ? 'پرێسی ئامێر بە دەستی نیوتڕاڵ' : (isBeginner ? 'پێک دێک فلای بە ئامێر' : 'پاڵەپەستۆی تەختی سنگ بە دەمبڵ'), englishName: (hasShoulder && !isBeginner) ? 'Neutral-Grip Machine Press' : (isBeginner ? 'Pec Deck Machine Fly' : 'Flat Dumbbell Press'), sets: isBeginner ? (selectedDaysCount === 5 ? 3 : pplSecSets) : pplSecSets, reps: repsSec, rest: isBeginner ? '75s' : '120s', rir: rirCompound, muscle: 'ناوەڕاستی سنگ' },
    ...(hasShoulder && isBeginner ? [] : [{ name: hasShoulder ? 'پێک دێک فلای بە ئامێر' : 'دەمبڵ شۆڵدەر پرێس بە دانیشتنەوە', englishName: hasShoulder ? 'Pec Deck Machine Fly' : 'Seated Dumbbell Shoulder Press', sets: isBeginner ? (selectedDaysCount === 6 ? 2 : 3) : (isAdvanced ? 4 : 3), reps: '10-12', rest: hasShoulder ? '75s' : '120s', rir: rirCompound, muscle: hasShoulder ? 'سنگ' : 'شان' }]),
    { name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ', englishName: 'Cable Lateral Raise', sets: isBeginner ? 3 : (isAdvanced ? 4 : 3), reps: '12-15', rest: '60s', rir: rirIso, muscle: 'تەنیشتی شان' },
    ...(isBeginner ? [] : [{ name: 'پاشەملە بە کێبڵ بە پەت', englishName: 'Triceps Rope Pushdown', sets: isAdvanced ? 4 : 3, reps: '12-15', rest: '60s', rir: rirIso, muscle: 'ترایسێپس' }]),
    { name: isBeginner ? 'پاشەملە بە کێبڵ بە پەت' : 'ترایسێپس بە پشتەسەر بە کێبڵ', englishName: isBeginner ? 'Triceps Rope Pushdown' : 'Overhead Cable Triceps Extension', sets: 4, reps: '10-12', rest: isBeginner ? '60s' : '75s', rir: rirIso, muscle: 'ترایسێپس' }
  ];

  const exPullA = isHome ? [
    { name: hasDumbbells ? 'پاروو بە دەمبڵ بە تاک دەست' : 'بەرزکردنەوەی جەستە بە ئەنیشک لەسەر زەوی (Reverse Push-up)', englishName: hasDumbbells ? 'Single Arm Dumbbell Row' : 'Floor Reverse Push-up', sets: pplPrimarySets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'ناوەڕاستی پشت' },
    { name: 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman Holds)', englishName: 'Superman Holds', sets: pplSecSets, reps: '15', rest: '60s', rir: rirIso, muscle: 'خوارەوەی پشت' },
    { name: hasDumbbells ? 'قۆڵ دووسەر بە دەمبڵ' : 'کێشانی قۆڵ بە بەرگری جەستە', englishName: hasDumbbells ? 'Dumbbell Biceps Curl' : 'Bodyweight Biceps Curl', sets: pplArmSets, reps: repsSec, rest: '60s', rir: rirIso, muscle: 'بایسێپس' },
    { name: hasDumbbells ? 'هامر کێرڵ بە دەمبڵ' : 'کێشانی قۆڵ بە بەرگری جەستە', englishName: hasDumbbells ? 'Dumbbell Hammer Curl' : 'Bodyweight Biceps Curl', sets: pplArmSets, reps: '12', rest: '60s', rir: rirIso, muscle: 'بایسێپس' }
  ] : [
    { name: 'ڕاکێشانی کێبڵ بۆ سەر سنگ بە دەسکی فراوان', englishName: 'Lat Pulldown Wide Grip', sets: pplPrimarySets, reps: repsMain, rest: '150s', rir: rirCompound, muscle: 'پانیی پشت (لاتس)' },
    { name: 'پاروو بە ئامێر بە پاڵپشتی سنگ (Chest-Supported Machine Row)', englishName: 'Chest-Supported Machine Row', sets: isBeginner ? 2 : 4, reps: repsMain, rest: '150s', rir: rirCompound, muscle: 'ناوەڕاستی پشت' },
    ...(isBeginner && selectedDaysCount === 6 ? [] : [{ name: 'کۆکردنەوەی پشتی شان بە کێبڵ (Face Pull)', englishName: 'Cable Face Pull', sets: isBeginner ? 2 : (isAdvanced ? 4 : 2), reps: '15', rest: '60s', rir: rirIso, muscle: 'پشتی شان' }]),
    { name: isBeginner ? 'قۆڵ دووسەر بە دەمبڵ' : 'قۆڵ دووسەر بە دەمبڵ لەسەر کورسی لار', englishName: isBeginner ? 'Dumbbell Biceps Curl' : 'Incline Dumbbell Biceps Curl', sets: pplArmSets, reps: '10-12', rest: isBeginner ? '60s' : '75s', rir: rirIso, muscle: 'بایسێپس' },
    { name: 'هامر کێرڵ بە دەمبڵ بۆ ئەستوورکردنی قۆڵ', englishName: 'Dumbbell Hammer Curl', sets: pplArmSets, reps: repsSec, rest: '60s', rir: rirIso, muscle: 'بایسێپس و براکیالیس' }
  ];
  const exLegsA = exLowerA;

  const exPushB = isHome ? [
    { name: hasDumbbells ? 'شان پرێس بە دەمبڵ' : 'شناوی پایک بۆ شان (Pike Push-ups)', englishName: (hasDumbbells || hasShoulder) ? 'Dumbbell Shoulder Press' : 'Pike Push-ups', sets: pplSingleSets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'شان' },
    { name: hasDumbbells ? 'پاڵەپەستۆی سنگ بە دەمبڵ لەسەر زەوی' : 'شناو (Push-ups)', englishName: hasDumbbells ? 'Floor Dumbbell Press' : 'Push-ups', sets: pplPrimarySets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'سنگ' },
    { name: 'شناوی فراوان (Wide Push-ups)', englishName: 'Wide Push-ups', sets: pplSecSets, reps: '12-15', rest: '90s', rir: rirCompound, muscle: 'سنگ' },
    { name: hasDumbbells ? 'شان بەرزکردنەوە بۆ لا تەنیشت بە دەمبڵ' : 'شناوی دایمۆند (Diamond Push-ups)', englishName: hasDumbbells ? 'Dumbbell Lateral Raise' : 'Diamond Push-ups', sets: pplArmSets, reps: '12-15', rest: '60s', rir: rirIso, muscle: hasDumbbells ? 'تەنیشتی شان' : 'ترایسێپس' },
    { name: hasDumbbells ? 'پاشەملە بە دەمبڵ' : (hasShoulder ? 'شناوی دایمۆند (Diamond Push-ups)' : 'پاشەملە لەسەر کورسی (Bench Dips)'), englishName: hasDumbbells ? 'Dumbbell Triceps Extension' : (hasShoulder ? 'Diamond Push-ups' : 'Bench Dips'), sets: pplArmSets, reps: '12', rest: '60s', rir: rirIso, muscle: 'ترایسێپس' }
  ] : [
    { name: hasShoulder ? 'پرێسی ئامێر بە دەستی نیوتڕاڵ' : 'دەمبڵ شۆڵدەر پرێس بە دانیشتنەوە', englishName: hasShoulder ? 'Neutral-Grip Machine Press' : 'Seated Dumbbell Shoulder Press', sets: 3, reps: repsMain, rest: hasShoulder ? '150s' : '120s', rir: rirCompound, muscle: hasShoulder ? 'سنگ' : 'شان' },
    { name: 'پرێسی سنگ بە ئامێر (Machine Chest Press)', englishName: hasShoulder ? 'Neutral-Grip Machine Press' : 'Machine Chest Press', sets: pplPrimarySets, reps: '10-12', rest: '150s', rir: rirCompound, muscle: 'سنگ' },
    { name: 'پێک دێک فلای بە ئامێر (Pec Deck Machine Fly)', englishName: 'Pec Deck Machine Fly', sets: pplSecSets, reps: '12-15', rest: '75s', rir: rirIso, muscle: 'سنگ' },
    { name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ', englishName: 'Cable Lateral Raise', sets: isBeginner ? 2 : 3, reps: '12-15', rest: '60s', rir: rirIso, muscle: 'تەنیشتی شان' },
    { name: 'پاشەملە بە کێبڵ بە پەت', englishName: 'Triceps Rope Pushdown', sets: pplArmSets, reps: '12', rest: '60s', rir: rirIso, muscle: 'ترایسێپس' },
    { name: 'ترایسێپس بە پشتەسەر بە کێبڵ', englishName: 'Overhead Cable Triceps Extension', sets: pplArmSets, reps: '10-12', rest: '75s', rir: rirIso, muscle: 'ترایسێپس' }
  ];

  const exPullB = isHome ? [
    { name: 'بەرزکردنەوەی جەستە بە ئەنیشک لەسەر زەوی (Reverse Push-up)', englishName: 'Floor Reverse Push-up', sets: pplPrimarySets, reps: repsMain, rest: '90s', rir: rirCompound, muscle: 'پشت' },
    { name: 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman Holds)', englishName: 'Superman Holds', sets: pplSecSets, reps: '15', rest: '60s', rir: rirIso, muscle: 'خوارەوەی پشت' },
    { name: hasDumbbells ? 'هامر کێرڵ بە دەمبڵ' : 'کێشانی قۆڵ بە بەرگری جەستە', englishName: hasDumbbells ? 'Dumbbell Hammer Curl' : 'Bodyweight Biceps Curl', sets: pplArmSets, reps: repsSec, rest: '60s', rir: rirIso, muscle: 'بایسێپس' }
  ] : [
    { name: 'پاروو بە ئامێر بە پاڵپشتی سنگ (Chest-Supported Machine Row)', englishName: 'Chest-Supported Machine Row', sets: pplPrimarySets, reps: repsMain, rest: '150s', rir: rirCompound, muscle: 'ناوەڕاستی پشت' },
    { name: 'ڕاکێشانی کێبڵ بۆ سەر سنگ بە دەسکی تەسک', englishName: 'Close Grip Lat Pulldown', sets: isBeginner ? 2 : 4, reps: repsSec, rest: '150s', rir: rirCompound, muscle: 'پانیی پشت' },
    { name: 'کۆکردنەوەی پشتی شان بە کێبڵ (Face Pull)', englishName: 'Cable Face Pull', sets: 2, reps: '15', rest: '60s', rir: rirIso, muscle: 'پشتی شان' },
    { name: 'هامر کێرڵ بە دەمبڵ', englishName: 'Dumbbell Hammer Curl', sets: pplArmSets, reps: repsSec, rest: '60s', rir: rirIso, muscle: 'بایسێپس و براکیالیس' },
    { name: isBeginner ? 'قۆڵ دووسەر بە دەمبڵ' : 'قۆڵ دووسەر بە دەمبڵ لەسەر کورسی لار', englishName: isBeginner ? 'Dumbbell Biceps Curl' : 'Incline Dumbbell Biceps Curl', sets: pplArmSets, reps: '10-12', rest: isBeginner ? '60s' : '75s', rir: rirIso, muscle: 'بایسێپس' }
  ];

  const exLegsB = exLowerB;

  const finalUpperA = attachCustomFinishers(exUpperA, 'push', pace !== 'slow');
  const finalLowerA = attachCustomFinishers(exLowerA, 'legs', pace === 'fast' || pace === 'very_fast');
  const finalUpperB = attachCustomFinishers(exUpperB, 'push', pace !== 'slow');
  const finalLowerB = attachCustomFinishers(exLowerB, 'legs', pace === 'fast' || pace === 'very_fast');

  const finalFullA = attachCustomFinishers(exFullBodyA, 'full', true);
  const finalFullB = attachCustomFinishers(exFullBodyB, 'full', pace !== 'slow');
  const finalFullC = attachCustomFinishers(exFullBodyC, 'full', true);

  const finalPushA = attachCustomFinishers(exPushA, 'push', pace !== 'slow');
  const finalPullA = attachCustomFinishers(exPullA, 'pull', true);
  const finalLegsA = attachCustomFinishers(exLegsA, 'legs', pace === 'fast' || pace === 'very_fast');
  const finalPushB = attachCustomFinishers(exPushB, 'push', pace !== 'slow');
  const finalPullB = attachCustomFinishers(exPullB, 'pull', true);
  const finalLegsB = attachCustomFinishers(exLegsB, 'legs', pace === 'fast' || pace === 'very_fast');

  let weeklyPlan = [];
  let courseTitle = '';
  let englishSubtitle = '';
  let rationale = '';

  const expLabelKu = isBeginner ? 'سەرەتایی (٨–١٠ سێت/هەفتە، RIR 2-3)' : isAdvanced ? 'پێشکەوتوو (١٦–٢٠ سێت/هەفتە، RIR 0-1 لە ئایسۆلەیشن)' : 'ناوەند (١٢–١٦ سێت/هەفتە، RIR 1-2)';
  const enlargeNamesKu = resolveBodyGoalList(enlargeIds, 'ku').join('، ');
  const shrinkNamesKu = resolveBodyGoalList(shrinkIds, 'ku').join('، ');
  const customFocusSummary = [
    `کێش: ${weight}کگ ← ${targetWeight}کگ`,
    `ئاست: ${expLabelKu}`,
    enlargeNamesKu ? `گەورەکردنی (${enlargeNamesKu})` : '',
    shrinkNamesKu ? `تواندنەوەی (${shrinkNamesKu})` : '',
    conditions.length > 0 ? `پاراستنی (${conditions.join('، ')})` : ''
  ].filter(Boolean).join(' • ');

  const mesocycleNote = getMesocycleNote(lang);
  const paceRationale = 'کاتی پشووی زانستی: ١٥٠–١٨٠ چرکە بۆ کۆمپاوەندە قورسەکان، ٩٠–١٢٠ چرکە بۆ کۆمپاوەندی دووەم، و ٦٠–٩٠ چرکە بۆ ئایسۆلەیشن.';

  if (selectedDaysCount === 2) {
    courseTitle = `کۆرسی زانستی (٢ ڕۆژە - Full Body) • ${isBulk ? 'زیادکردنی ماسولکە' : isCut ? 'سوتاندنی چەوری' : 'ڕێکخستنی جەستە'}`;
    englishSubtitle = 'Scientific 2-Day Full Body Split';
    rationale = `داڕێژراو بەپێی پێوەرە زانستییەکان (${customFocusSummary}). دوو ڕۆژی Full Body بە پشووی زانستی بۆ دەستەبەرکردنی چاکبوونەوە. ${paceRationale} ${mesocycleNote}`;
    weeklyPlan = [
      { dayKey: 'd1', dayName: 'شەممە', focus: 'تەواوی جەستە A (Full Body Power)', isRestDay: false, exercises: finalFullA },
      { dayKey: 'd2', dayName: 'یەکشەممە', focus: 'پشووی زانستی و چاکبوونەوە', isRestDay: true, exercises: [] },
      { dayKey: 'd3', dayName: 'دووشەممە', focus: 'پشووی هایدرەیشن و گەشە', isRestDay: true, exercises: [] },
      { dayKey: 'd4', dayName: 'سێشەممە', focus: 'تەواوی جەستە B (Full Body Hypertrophy)', isRestDay: false, exercises: finalFullB },
      { dayKey: 'd5', dayName: 'چوارشەممە', focus: 'پشوو', isRestDay: true, exercises: [] },
      { dayKey: 'd6', dayName: 'پێنجشەممە', focus: 'پشوو', isRestDay: true, exercises: [] },
      { dayKey: 'd7', dayName: 'هەینی', focus: 'پشوو', isRestDay: true, exercises: [] }
    ];
  } else if (selectedDaysCount === 3) {
    courseTitle = `کۆرسی زانستی (٣ ڕۆژە - Full Body 3x) • ${isBulk ? 'زیادکردنی ماسولکە' : isCut ? 'سوتاندنی چەوری' : 'ڕێکخستنی جەستە'}`;
    englishSubtitle = 'Scientific 3-Day Full Body Hypertrophy';
    rationale = `سیستەمی مۆدێرنی Full Body: تەواوی ماسولکەکانی جەستە هەفتەی ٣ جار هاندەدرێن (${customFocusSummary}). ${paceRationale} ${mesocycleNote}`;
    weeklyPlan = [
      { dayKey: 'd1', dayName: 'شەممە', focus: 'تەواوی جەستە A (سنگ، چوارسەرەی ڕان و پشت)', isRestDay: false, exercises: finalFullA },
      { dayKey: 'd2', dayName: 'یەکشەممە', focus: 'پشووی زانستی و دروستبوونی پرۆتین (MPS)', isRestDay: true, exercises: [] },
      { dayKey: 'd3', dayName: 'دووشەممە', focus: 'تەواوی جەستە B (پشتی ڕان، شان و قۆڵ)', isRestDay: false, exercises: finalFullB },
      { dayKey: 'd4', dayName: 'سێشەممە', focus: 'پشووی زانستی و چاکبوونەوەی دەمار', isRestDay: true, exercises: [] },
      { dayKey: 'd5', dayName: 'چوارشەممە', focus: 'تەواوی جەستە C (سمت، سنگ، پوز و کۆڕ)', isRestDay: false, exercises: finalFullC },
      { dayKey: 'd6', dayName: 'پێنجشەممە', focus: 'پشووی هایدرەیشن و گەشە', isRestDay: true, exercises: [] },
      { dayKey: 'd7', dayName: 'هەینی', focus: 'پشووی هەفتانە', isRestDay: true, exercises: [] }
    ];
  } else if (selectedDaysCount === 5) {
    courseTitle = `کۆرسی زانستی (٥ ڕۆژە - Upper/Lower + PPL) • ${isBulk ? 'زیادکردنی ماسولکە' : isCut ? 'سوتاندنی چەوری' : 'ڕێکخستنی جەستە'}`;
    englishSubtitle = 'Scientific 5-Day Hybrid Split';
    rationale = `سیستەمی پێشکەوتووی Hybrid: دوو ڕۆژی هێزی سەرەوە/خوارەوە لەگەڵ سێ ڕۆژی چڕیی PPL (${customFocusSummary}). ${paceRationale} ${mesocycleNote}`;
    weeklyPlan = [
      { dayKey: 'd1', dayName: 'شەممە', focus: 'سەرەوە هێز (Upper Body Power)', isRestDay: false, exercises: finalUpperA },
      { dayKey: 'd2', dayName: 'یەکشەممە', focus: 'خوارەوە هێز (Lower Body Power)', isRestDay: false, exercises: finalLowerA },
      { dayKey: 'd3', dayName: 'دووشەممە', focus: 'پشووی زانستی و چاکبوونەوەی دەمار', isRestDay: true, exercises: [] },
      { dayKey: 'd4', dayName: 'سێشەممە', focus: 'پاڵنان (Push Hypertrophy - سنگ، شان و ترایسێپس)', isRestDay: false, exercises: finalPushA },
      { dayKey: 'd5', dayName: 'چوارشەممە', focus: 'ڕاکێشان (Pull Hypertrophy - پشت و قۆڵ)', isRestDay: false, exercises: finalPullA },
      { dayKey: 'd6', dayName: 'پێنجشەممە', focus: 'قاچ و سمت (Legs & Glutes Hypertrophy)', isRestDay: false, exercises: finalLegsB },
      { dayKey: 'd7', dayName: 'هەینی', focus: 'پشووی هەفتانە', isRestDay: true, exercises: [] }
    ];
  } else if (selectedDaysCount === 6) {
    courseTitle = `کۆرسی زانستی (٦ ڕۆژە - PPL x 2) • ${isBulk ? 'زیادکردنی ماسولکە' : isCut ? 'سوتاندنی چەوری' : 'ڕێکخستنی جەستە'}`;
    englishSubtitle = 'Scientific PPL x2 Pro Hypertrophy';
    rationale = `سیستەمی پرۆفیشناڵی Push/Pull/Legs دوو جار لە هەفتەیەکدا (${customFocusSummary}). ${paceRationale} ${mesocycleNote}`;
    weeklyPlan = [
      { dayKey: 'd1', dayName: 'شەممە', focus: 'ڕۆژی Push A (سنگ و سێ سەر)', isRestDay: false, exercises: finalPushA },
      { dayKey: 'd2', dayName: 'یەکشەممە', focus: 'ڕۆژی Pull A (پانیی پشت و بایسێپس)', isRestDay: false, exercises: finalPullA },
      { dayKey: 'd3', dayName: 'دووشەممە', focus: 'ڕۆژی Legs A (چوار سەرەی ڕان و پوز)', isRestDay: false, exercises: finalLegsA },
      { dayKey: 'd4', dayName: 'سێشەممە', focus: 'ڕۆژی Push B (شان، سنگ و ترایسێپس)', isRestDay: false, exercises: finalPushB },
      { dayKey: 'd5', dayName: 'چوارشەممە', focus: 'ڕۆژی Pull B (ناوەڕاستی پشت و باڵ)', isRestDay: false, exercises: finalPullB },
      { dayKey: 'd6', dayName: 'پێنجشەممە', focus: 'ڕۆژی Legs B (پشتی ڕان، سمت و کۆڕ)', isRestDay: false, exercises: finalLegsB },
      { dayKey: 'd7', dayName: 'هەینی', focus: 'پشووی هەفتانە و چاکبوونەوە', isRestDay: true, exercises: [] }
    ];
  } else {
    courseTitle = `کۆرسی زانستی (٤ ڕۆژە - Upper / Lower) • ${isBulk ? 'زیادکردنی ماسولکە' : isCut ? 'سوتاندنی چەوری' : 'ڕێکخستنی جەستە'}`;
    englishSubtitle = 'Scientific Upper / Lower Split (2x MPS Frequency)';
    rationale = `داڕێژراو بە سیستەمی زانستیی Upper / Lower: هەر ماسولکەیەک ٢ جار لە هەفتەیەکدا هاندەدرێت (${customFocusSummary}). ${paceRationale} ${mesocycleNote}`;
    weeklyPlan = [
      { dayKey: 'd1', dayName: 'شەممە', focus: 'سەرەوە A (سنگ و ناوەڕاستی پشت)', isRestDay: false, exercises: finalUpperA },
      { dayKey: 'd2', dayName: 'یەکشەممە', focus: 'خوارەوە A (چوار سەرەی ڕان و پوز)', isRestDay: false, exercises: finalLowerA },
      { dayKey: 'd3', dayName: 'دووشەممە', focus: 'پشووی زانستی و چاکبوونەوەی ماسولکە', isRestDay: true, exercises: [] },
      { dayKey: 'd4', dayName: 'سێشەممە', focus: 'سەرەوە B (پانیی پشت، شان و قۆڵ)', isRestDay: false, exercises: finalUpperB },
      { dayKey: 'd5', dayName: 'چوارشەممە', focus: 'خوارەوە B (پشتی ڕان، سمت و کۆڕ)', isRestDay: false, exercises: finalLowerB },
      { dayKey: 'd6', dayName: 'پێنجشەممە', focus: 'پشووی زانستی و چاکبوونەوەی دەمار', isRestDay: true, exercises: [] },
      { dayKey: 'd7', dayName: 'هەینی', focus: 'پشووی هەفتانە', isRestDay: true, exercises: [] }
    ];
  }

  if (physiqueAnalysis?.laggingMuscles && physiqueAnalysis.laggingMuscles.length > 0) {
    rationale = `ئەم بەرنامەیە بە شیکاری بینینی جەستە (AI Physique Vision) و بە لەبەرچاوگرتنی ماسولکە دواکەوتووەکانت (${physiqueAnalysis.laggingMuscles.join('، ')}) دارێژراوە. ` + rationale;
  }

  const rawProgram = {
    id: 'ai_course_' + selectedDaysCount + 'd_' + Date.now(),
    startDate: new Date().toISOString(),
    title: courseTitle,
    englishSubtitle: englishSubtitle,
    athleteWeight: Number(weight) || 75,
    goalPace: pace,
    experienceLevel: exp,
    healthConditions: conditions,
    trainingLocation: location,
    homeEquipment: equipment,
    restIntervalSeconds: restSec,
    daysPerWeek: selectedDaysCount,
    durationDays: targetDays || 45,
    mesocycleNote,
    rationale,
    weeklyPlan
  };

  return sanitizeWorkoutPlan(rawProgram, location, equipment, conditions, lang, Number(weight) || 75);
}

export const MALE_BODY_PARTS = [
  { id: 'm1', ku: 'سنگ', en: 'Chest', ar: 'الصدر', fa: 'سینه' },
  { id: 'm2', ku: 'شان', en: 'Shoulders', ar: 'الأكتاف', fa: 'شانه‌ها' },
  { id: 'm3', ku: 'پشت', en: 'Back', ar: 'الظهر', fa: 'پشت' },
  { id: 'm4', ku: 'باڵ و قۆڵ', en: 'Arms', ar: 'الذراعين', fa: 'بازوها' },
  { id: 'm5', ku: 'ورگ و کەمەر', en: 'Abs & Waist', ar: 'البطن والخصر', fa: 'شکم و پهلو' },
  { id: 'm6', ku: 'ڕان و قاچ', en: 'Legs', ar: 'الأرجل والفخذين', fa: 'پاها و ران‌ها' },
  { id: 'm7', ku: 'پوز', en: 'Calves', ar: 'بطات الساق', fa: 'ساق پا' }
];
export const FEMALE_BODY_PARTS = [
  { id: 'f1', ku: 'سنگ', en: 'Chest', ar: 'الصدر', fa: 'سینه' },
  { id: 'f2', ku: 'کەمەر', en: 'Waist', ar: 'الخصر', fa: 'کمر و پهلو' },
  { id: 'f3', ku: 'ورگ', en: 'Belly', ar: 'البطن', fa: 'شکم' },
  { id: 'f4', ku: 'سمت و حەوز', en: 'Glutes & Hips', ar: 'الأرداف والمؤخرة', fa: 'باسن و ران' },
  { id: 'f5', ku: 'ڕان و قاچ', en: 'Legs', ar: 'الأرجل', fa: 'پاها' },
  { id: 'f6', ku: 'باڵ', en: 'Arms', ar: 'الذراعين', fa: 'بازوها' },
  { id: 'f7', ku: 'پشت', en: 'Back', ar: 'الظهر', fa: 'پشت' }
];

export const DEFAULT_7_DAY_DIET = [
  // ڕۆژی ١: شەممە
  {
    breakfast: [
      { id: 'd0_1', name: 'هێلکەی کوڵاو', englishName: 'Boiled Eggs', calories: 210, protein: 18, carbs: 2, fat: 15, quantity: 3, unit: 'دانە', isEaten: false },
      { id: 'd0_2', name: 'شۆڤان بە شیر و گوێز', englishName: 'Oats with Milk & Walnuts', calories: 320, protein: 14, carbs: 48, fat: 8, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    lunch: [
      { id: 'd0_3', name: 'سنگی مریشکی برژاو', englishName: 'Grilled Chicken Breast', calories: 330, protein: 58, carbs: 0, fat: 6, quantity: 200, unit: 'گرام', isEaten: false },
      { id: 'd0_4', name: 'برنجی کوردی بە کەم چەوری', englishName: 'Kurdish White Rice', calories: 280, protein: 5, carbs: 62, fat: 2, quantity: 1, unit: 'قاپ', isEaten: false },
      { id: 'd0_5', name: 'زەڵاتەی سەوزی وەرزی', englishName: 'Fresh Green Salad', calories: 45, protein: 2, carbs: 8, fat: 1, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd0_6', name: 'مۆز و بادەم', englishName: 'Banana & Almonds', calories: 190, protein: 4, carbs: 28, fat: 8, quantity: 1, unit: 'دانە', isEaten: false }
    ],
    dinner: [
      { id: 'd0_7', name: 'ماسی سلمۆن لەگەڵ زەڵاتە', englishName: 'Salmon Fillet & Green Salad', calories: 410, protein: 38, carbs: 8, fat: 22, quantity: 180, unit: 'گرام', isEaten: false }
    ]
  },
  // ڕۆژی ٢: یەکشەممە
  {
    breakfast: [
      { id: 'd1_1', name: 'ئۆملێتی هێلکە و پەنیری لۆفاتی کوردی', englishName: 'Egg Omelet with Low Fat Cheese', calories: 240, protein: 22, carbs: 4, fat: 12, quantity: 1, unit: 'قاپ', isEaten: false },
      { id: 'd1_2', name: 'نانی تیری / هەورامی', englishName: 'Thin Kurdish Flatbread', calories: 190, protein: 6, carbs: 40, fat: 1, quantity: 1, unit: 'نان', isEaten: false }
    ],
    lunch: [
      { id: 'd1_3', name: 'گۆشتی سووری نەرمەی برژاو (بێ چەوری)', englishName: 'Lean Grilled Beef', calories: 360, protein: 46, carbs: 0, fat: 16, quantity: 180, unit: 'گرام', isEaten: false },
      { id: 'd1_4', name: 'پەتاتەی کوڵاو بە زەیتی زەیتوون', englishName: 'Boiled Potato with Olive Oil', calories: 220, protein: 4, carbs: 46, fat: 3, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd1_5', name: 'سێو لەگەڵ کەرەی فستق', englishName: 'Apple with Peanut Butter', calories: 180, protein: 5, carbs: 22, fat: 9, quantity: 1, unit: 'دانە', isEaten: false }
    ],
    dinner: [
      { id: 'd1_6', name: 'سنگی مریشکی برژاو لەگەڵ سەوزەوات', englishName: 'Grilled Chicken with Steamed Veggies', calories: 340, protein: 48, carbs: 12, fat: 7, quantity: 180, unit: 'گرام', isEaten: false },
      { id: 'd1_7', name: 'ماستی ماڵەوەی کوردی', englishName: 'Homemade Kurdish Yogurt', calories: 95, protein: 7, carbs: 8, fat: 4, quantity: 1, unit: 'قاپ', isEaten: false }
    ]
  },
  // ڕۆژی ٣: دووشەممە
  {
    breakfast: [
      { id: 'd2_1', name: 'هێلکەی تێکدراو بە تەماتە (مەنمەن)', englishName: 'Scrambled Eggs with Tomatoes', calories: 230, protein: 17, carbs: 6, fat: 14, quantity: 3, unit: 'هێلکە', isEaten: false },
      { id: 'd2_2', name: 'نانی جۆ', englishName: 'Barley Bread', calories: 180, protein: 6, carbs: 36, fat: 2, quantity: 1, unit: 'نان', isEaten: false }
    ],
    lunch: [
      { id: 'd2_3', name: 'ماسی قزل ئالا (برژاو لە فڕن)', englishName: 'Baked Trout Fish', calories: 340, protein: 42, carbs: 0, fat: 15, quantity: 200, unit: 'گرام', isEaten: false },
      { id: 'd2_4', name: 'برنجی کوردی بە کەم چەوری', englishName: 'Kurdish White Rice', calories: 280, protein: 5, carbs: 62, fat: 2, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd2_5', name: 'ماستی یۆنانی بە هەنگوین و گوێز', englishName: 'Greek Yogurt with Honey & Walnuts', calories: 210, protein: 15, carbs: 18, fat: 8, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    dinner: [
      { id: 'd2_6', name: 'زەڵاتەی دەوڵەمەند بە سنگی مریشک', englishName: 'Chicken Caesar Fitness Salad', calories: 320, protein: 40, carbs: 10, fat: 12, quantity: 1, unit: 'قاپ', isEaten: false }
    ]
  },
  // ڕۆژی ٤: سێشەممە
  {
    breakfast: [
      { id: 'd3_1', name: 'شۆڤان بە مۆز و دارچین', englishName: 'Oatmeal with Banana & Cinnamon', calories: 310, protein: 14, carbs: 54, fat: 6, quantity: 1, unit: 'قاپ', isEaten: false },
      { id: 'd3_2', name: 'هێلکەی کوڵاو', englishName: 'Boiled Eggs', calories: 140, protein: 12, carbs: 1, fat: 10, quantity: 2, unit: 'دانە', isEaten: false }
    ],
    lunch: [
      { id: 'd3_3', name: 'سنگی مریشک بە لیمۆ و بەهارات', englishName: 'Lemon Herb Chicken Breast', calories: 350, protein: 55, carbs: 2, fat: 8, quantity: 220, unit: 'گرام', isEaten: false },
      { id: 'd3_4', name: 'پەتاتەی برژاو لە فڕن', englishName: 'Oven Baked Potato', calories: 210, protein: 4, carbs: 48, fat: 1, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd3_5', name: 'میوەی فرێش و مشتێک بادەم', englishName: 'Fresh Fruit & Almonds', calories: 175, protein: 4, carbs: 24, fat: 7, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    dinner: [
      { id: 'd3_6', name: 'گۆشتی قیمەی نەرمە لەگەڵ تەماتە و باینجان', englishName: 'Lean Minced Meat with Eggplant & Tomatoes', calories: 360, protein: 38, carbs: 14, fat: 14, quantity: 1, unit: 'قاپ', isEaten: false }
    ]
  },
  // ڕۆژی ٥: چوارشەممە
  {
    breakfast: [
      { id: 'd4_1', name: 'هێلکەی کوڵاو', englishName: 'Boiled Eggs', calories: 210, protein: 18, carbs: 2, fat: 15, quantity: 3, unit: 'دانە', isEaten: false },
      { id: 'd4_2', name: 'پەنیری سپی کەم خوێ لەگەڵ خەیار و تەماتە', englishName: 'Low Salt White Cheese with Veggies', calories: 160, protein: 12, carbs: 6, fat: 9, quantity: 80, unit: 'گرام', isEaten: false },
      { id: 'd4_3', name: 'نانی تیری', englishName: 'Kurdish Flatbread', calories: 190, protein: 6, carbs: 40, fat: 1, quantity: 1, unit: 'نان', isEaten: false }
    ],
    lunch: [
      { id: 'd4_4', name: 'فەسیلەی مریشک یان قەلی برژاو', englishName: 'Grilled Turkey or Chicken Breast', calories: 330, protein: 56, carbs: 0, fat: 6, quantity: 200, unit: 'گرام', isEaten: false },
      { id: 'd4_5', name: 'برنجی کوردی کەم ڕۆن', englishName: 'Kurdish Rice', calories: 280, protein: 5, carbs: 62, fat: 2, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd4_6', name: 'سمووسی میوە لەگەڵ شیری کەم چەوری', englishName: 'Fruit Smoothie with Low Fat Milk', calories: 200, protein: 9, carbs: 36, fat: 2, quantity: 1, unit: 'پەرداخ', isEaten: false }
    ],
    dinner: [
      { id: 'd4_7', name: 'ماسی سلمۆن لەگەڵ برۆکلی کوڵاو', englishName: 'Grilled Salmon with Steamed Broccoli', calories: 390, protein: 36, carbs: 8, fat: 20, quantity: 180, unit: 'گرام', isEaten: false }
    ]
  },
  // ڕۆژی ٦: پێنجشەممە
  {
    breakfast: [
      { id: 'd5_1', name: 'ئۆملێت لەگەڵ سپێناخ و قارچک', englishName: 'Spinach & Mushroom Omelet', calories: 250, protein: 20, carbs: 5, fat: 16, quantity: 3, unit: 'هێلکە', isEaten: false },
      { id: 'd5_2', name: 'نانی جۆ', englishName: 'Barley Bread', calories: 180, protein: 6, carbs: 36, fat: 2, quantity: 1, unit: 'نان', isEaten: false }
    ],
    lunch: [
      { id: 'd5_3', name: 'کەبابی گۆشتی سووری نەرمەی فڕن (بێ چەوری)', englishName: 'Lean Oven-Baked Beef Kebab', calories: 370, protein: 44, carbs: 4, fat: 17, quantity: 180, unit: 'گرام', isEaten: false },
      { id: 'd5_4', name: 'برنجی سپی کوردی', englishName: 'White Rice', calories: 280, protein: 5, carbs: 62, fat: 2, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd5_5', name: 'پرتەقاڵ لەگەڵ بادەم', englishName: 'Orange with Raw Almonds', calories: 160, protein: 4, carbs: 20, fat: 7, quantity: 1, unit: 'دانە', isEaten: false }
    ],
    dinner: [
      { id: 'd5_6', name: 'سنگی مریشکی برژاو لەگەڵ قارچک و لیمۆ', englishName: 'Grilled Chicken with Sautéed Mushrooms', calories: 330, protein: 48, carbs: 6, fat: 8, quantity: 180, unit: 'گرام', isEaten: false }
    ]
  },
  // ڕۆژی ٧: هەینی
  {
    breakfast: [
      { id: 'd6_1', name: 'هێلکەی کوڵاو', englishName: 'Boiled Eggs', calories: 210, protein: 18, carbs: 2, fat: 15, quantity: 3, unit: 'دانە', isEaten: false },
      { id: 'd6_2', name: 'هەنگوینی سروشتی لەگەڵ گوێز', englishName: 'Raw Honey with Kurdish Walnuts', calories: 170, protein: 3, carbs: 24, fat: 8, quantity: 1, unit: 'کەوچک', isEaten: false },
      { id: 'd6_3', name: 'نانی هەورامی', englishName: 'Traditional Flatbread', calories: 190, protein: 6, carbs: 40, fat: 1, quantity: 1, unit: 'نان', isEaten: false }
    ],
    lunch: [
      { id: 'd6_4', name: 'مریشکی برژاوی کوردی (بێ پێست)', englishName: 'Roasted Kurdish Chicken (Skinless)', calories: 360, protein: 54, carbs: 0, fat: 10, quantity: 220, unit: 'گرام', isEaten: false },
      { id: 'd6_5', name: 'برنج لەگەڵ شلەی نۆک / سەوزەوات', englishName: 'Rice with Chickpea Stew', calories: 310, protein: 9, carbs: 64, fat: 3, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd6_6', name: 'شلیک یان میوەی وەرزی لەگەڵ چای سەوز', englishName: 'Fresh Strawberries with Green Tea', calories: 110, protein: 2, carbs: 24, fat: 0.5, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    dinner: [
      { id: 'd6_7', name: 'ماسی تۆنەی بێ ڕۆن لەگەڵ زەڵاتە و لیمۆ', englishName: 'Tuna Salad with Lemon & Greens', calories: 310, protein: 42, carbs: 8, fat: 6, quantity: 1, unit: 'قاپ', isEaten: false }
    ]
  }
];

// ==================== خشتە و فەرهەنگەکانی فرەزمانی بۆ ناوی ڕۆژەکان، خواردن و ڕاهێنان ====================
export const DAY_NAMES = {
  ku: ['شەممە', 'یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی'],
  en: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  ar: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
  fa: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه']
};

export const DAY_SHORT_NAMES = {
  ku: ['شەم', 'یەک', 'دوو', 'سێش', 'چوا', 'پێن', 'هەی'],
  en: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  ar: ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'],
  fa: ['شنبه', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'جمعه']
};

export const COMMON_DIET_FOODS = [
  // Proteins & Meats
  { en: 'grilled chicken breast', ku: 'سنگی مریشکی برژاو', ar: 'صدر دجاج مشوي', fa: 'سینه مرغ کبابی' },
  { en: 'chicken breast', ku: 'سنگی مریشک', ar: 'صدر دجاج', fa: 'سینه مرغ' },
  { en: 'chicken thighs', ku: 'ڕانی مریشک', ar: 'أفخاذ دجاج', fa: 'ران مرغ' },
  { en: 'chicken', ku: 'مریشک', ar: 'دجاج', fa: 'مرغ' },
  { en: 'boiled eggs', ku: 'هێلکەی کوڵاو', ar: 'بيض مسلوق', fa: 'تخم‌مرغ آب‌پز' },
  { en: 'boiled egg', ku: 'هێلکەی کوڵاو', ar: 'بيضة مسلوقة', fa: 'تخم‌مرغ آب‌پز' },
  { en: 'scrambled eggs', ku: 'هێلکەی تێکدراو (مەقلی)', ar: 'بيض مخفوق', fa: 'تخم‌مرغ نیمرو' },
  { en: 'egg whites', ku: 'سپێنەی هێلکە', ar: 'بياض البيض', fa: 'سفیده تخم‌مرغ' },
  { en: 'egg white', ku: 'سپێنەی هێلکە', ar: 'بياض البيض', fa: 'سفیده تخم‌مرغ' },
  { en: 'eggs', ku: 'هێلکە', ar: 'بيض', fa: 'تخم‌مرغ' },
  { en: 'egg', ku: 'هێلکە', ar: 'بيضة', fa: 'تخم‌مرغ' },
  { en: 'omelet', ku: 'ئۆملێت', ar: 'أومليت بيض', fa: 'املت' },
  { en: 'omelette', ku: 'ئۆملێت', ar: 'أومليت بيض', fa: 'املت' },
  { en: 'canned tuna', ku: 'تۆنەی قوتوو بە ئاو', ar: 'تونة معلبة بالماء', fa: 'کنسرو تن ماهی' },
  { en: 'tuna salad', ku: 'زەڵاتەی تونا', ar: 'سلطة تونة', fa: 'سالاد تن ماهی' },
  { en: 'tuna', ku: 'ماسی تونا', ar: 'سمك تونة', fa: 'ماهی تن' },
  { en: 'grilled salmon', ku: 'ماسی سەلمۆنی برژاو', ar: 'سلمون مشوي', fa: 'ماهی سالمون کبابی' },
  { en: 'salmon', ku: 'ماسی سەلمۆن', ar: 'سمك سلمون', fa: 'ماهی سالمون' },
  { en: 'fish', ku: 'ماسی', ar: 'سمك', fa: 'ماهی' },
  { en: 'ground beef', ku: 'گۆشتی قیمەی مانگا', ar: 'لحم مفروم قليل الدهن', fa: 'گوشت چرخ‌کرده' },
  { en: 'lean beef', ku: 'گۆشتی سووری مانگا', ar: 'لحم بقري خالي من الدهن', fa: 'گوشت لخم گاو' },
  { en: 'beef steak', ku: 'ستەیکی گۆشت', ar: 'ستيك بقري', fa: 'استیک گوشت' },
  { en: 'steak', ku: 'ستەیک', ar: 'ستيك', fa: 'استیک' },
  { en: 'beef', ku: 'گۆشتی سوور', ar: 'لحم بقري', fa: 'گوشت گاو' },
  { en: 'turkey breast', ku: 'سنگی قەلی برژاو', ar: 'صدر رومي مشوي', fa: 'سینه بوقلمون' },
  { en: 'turkey', ku: 'گۆشتی قەل', ar: 'لحم رومي', fa: 'گوشت بوقلمون' },
  { en: 'whey protein', ku: 'وەی پڕۆتین', ar: 'واي بروتين', fa: 'پروتئین وی' },
  { en: 'protein powder', ku: 'پڕۆتین باودەر', ar: 'بودرة بروتين', fa: 'پودر پروتئین' },
  { en: 'protein shake', ku: 'پڕۆتین شێک', ar: 'مخفوق البروتين', fa: 'شیک پروتئین' },
  { en: 'protein bar', ku: 'پڕۆتین باڕ', ar: 'لوح بروتين', fa: 'پروتئین بار' },
  { en: 'greek yogurt', ku: 'ماستی یۆنانی کەم چەوری', ar: 'زبادي يوناني قليل الدسم', fa: 'ماست یونانی کم‌چرب' },
  { en: 'cottage cheese', ku: 'پەنیری کەم چەوری', ar: 'جبن قريش قليل الدسم', fa: 'پنیر کوتاژ کم‌چرب' },
  { en: 'cheese', ku: 'پەنیر', ar: 'جبن', fa: 'پنیر' },
  { en: 'yogurt', ku: 'ماست', ar: 'زبادي', fa: 'ماست' },
  { en: 'milk', ku: 'شیر', ar: 'حليب', fa: 'شیر' },
  { en: 'skim milk', ku: 'شیری بێ چەوری', ar: 'حليب خالي الدسم', fa: 'شیر بدون چربی' },
  { en: 'almond milk', ku: 'شیری بادەم', ar: 'حليب اللوز', fa: 'شیر بادام' },

  // Carbs & Grains
  { en: 'cooked oatmeal', ku: 'شۆڤانی کوڵاو', ar: 'شوفان مطبوخ', fa: 'جو دوسر پخته' },
  { en: 'oatmeal with honey', ku: 'شۆڤان لەگەڵ هەنگوین', ar: 'شوفان بالعسل', fa: 'جو دوسر با عسل' },
  { en: 'oatmeal with berries', ku: 'شۆڤان لەگەڵ میوە', ar: 'شوفان بالتوت', fa: 'جو دوسر با توت' },
  { en: 'oatmeal', ku: 'شۆڤانی کوڵاو', ar: 'شوفان', fa: 'جو دوسر' },
  { en: 'oats', ku: 'شۆڤان', ar: 'شوفان', fa: 'جو دوسر' },
  { en: 'white rice', ku: 'برنجی سپی', ar: 'أرز أبيض', fa: 'برنج سفید' },
  { en: 'brown rice', ku: 'برنجی قاوەیی', ar: 'أرز بني', fa: 'برنج قهوه‌ای' },
  { en: 'basmati rice', ku: 'برنجی بەسمەتی', ar: 'أرز بسمتي', fa: 'برنج باسماتی' },
  { en: 'rice', ku: 'برنج', ar: 'أرز', fa: 'برنج' },
  { en: 'boiled potato', ku: 'پەتاتەی کوڵاو', ar: 'بطاطا مسلوقة', fa: 'سیب‌زمینی آب‌پز' },
  { en: 'baked potato', ku: 'پەتاتەی برژاو', ar: 'بطاطا مشوية', fa: 'سیب‌زمینی تنوری' },
  { en: 'sweet potato', ku: 'پەتاتەی شیرین', ar: 'بطاطا حلوة', fa: 'سیب‌زمینی شیرین' },
  { en: 'potato', ku: 'پەتاتە', ar: 'بطاطا', fa: 'سیب‌زمینی' },
  { en: 'potatoes', ku: 'پەتاتە', ar: 'بطاطا', fa: 'سیب‌زمینی' },
  { en: 'whole wheat bread', ku: 'نانی گەنمی تەواو', ar: 'خبز قمح كامل', fa: 'نان سبوس‌دار' },
  { en: 'whole grain bread', ku: 'نانی گەنم', ar: 'خبز حبوب كاملة', fa: 'نان غلات کامل' },
  { en: 'whole wheat toast', ku: 'تۆستی گەنم', ar: 'توست أسمر', fa: 'نان تست قهوه‌ای' },
  { en: 'toast', ku: 'نانی تۆست', ar: 'خبز توست', fa: 'نان تست' },
  { en: 'pita bread', ku: 'نانی عەرەبی', ar: 'خبز بيتا عربي', fa: 'نان پیتا' },
  { en: 'bread', ku: 'نان', ar: 'خبز', fa: 'نان' },
  { en: 'whole wheat pasta', ku: 'مەعکەرۆنیی گەنم', ar: 'معكرونة قمح كامل', fa: 'ماکارونی سبوس‌دار' },
  { en: 'pasta', ku: 'مەعکەرۆنی', ar: 'معكرونة', fa: 'ماکارونی' },
  { en: 'quinoa', ku: 'کینوا', ar: 'كينوا', fa: 'کینوا' },
  { en: 'bulgur', ku: 'ساوار / ساوەر', ar: 'برغل', fa: 'بلغور' },
  { en: 'lentils', ku: 'نیسک', ar: 'عدس', fa: 'عدس' },
  { en: 'lentil soup', ku: 'شۆربای نیسک (نیسکێنە)', ar: 'شوربة عدس', fa: 'سوپ عدس' },
  { en: 'chickpeas', ku: 'نۆک', ar: 'حمص حب', fa: 'نخود' },
  { en: 'hummus', ku: 'حومس بە تەحین', ar: 'حمص بطحينة', fa: 'حمص' },
  { en: 'black beans', ku: 'فاسۆلیای ڕەش', ar: 'فاصولياء سوداء', fa: 'لوبیا سیاه' },
  { en: 'beans', ku: 'فاسۆلیا', ar: 'فاصولياء', fa: 'لوبیا' },

  // Vegetables & Salads
  { en: 'mixed salad', ku: 'زەڵاتەی سەوزەی تێکەڵ', ar: 'سلطة خضراء مشكلة', fa: 'سالاد فصل مخلوط' },
  { en: 'green salad', ku: 'زەڵاتەی سەوزە', ar: 'سلطة خضراء', fa: 'سالاد سبز' },
  { en: 'salad', ku: 'زەڵاتە', ar: 'سلطة', fa: 'سالاد' },
  { en: 'steamed vegetables', ku: 'سەوزەی هەڵمکراو', ar: 'خضار مطبوخة على البخار', fa: 'سبزیجات بخارپز' },
  { en: 'steamed broccoli', ku: 'برۆکلیی هەڵمکراو', ar: 'بروكلي على البخار', fa: 'بروکلی بخارپز' },
  { en: 'broccoli', ku: 'برۆکلی', ar: 'بروكلي', fa: 'بروکلی' },
  { en: 'spinach', ku: 'سپێناخ', ar: 'سبانخ', fa: 'اسفناج' },
  { en: 'cucumber', ku: 'خەیار', ar: 'خيار', fa: 'خیار' },
  { en: 'tomato', ku: 'تەماتە', ar: 'طماطم', fa: 'گوجه‌فرنگی' },
  { en: 'tomatoes', ku: 'تەماتە', ar: 'طماطم', fa: 'گوجه‌فرنگی' },
  { en: 'lettuce', ku: 'خاس', ar: 'خس', fa: 'کاهو' },
  { en: 'carrots', ku: 'گێزەر', ar: 'جزر', fa: 'هویج' },
  { en: 'carrot', ku: 'گێزەر', ar: 'جزر', fa: 'هویج' },
  { en: 'bell pepper', ku: 'بیبەری شیرین', ar: 'فلفل رومي حلو', fa: 'فلفل دلمه‌ای' },
  { en: 'peppers', ku: 'بیبەر', ar: 'فلفل', fa: 'فلفل' },
  { en: 'mushrooms', ku: 'قارچک', ar: 'فطر / مشروم', fa: 'قارچ' },
  { en: 'asparagus', ku: 'ئەسپاراگۆس', ar: 'هليون', fa: 'مارچوبه' },
  { en: 'green beans', ku: 'فاسۆلیای سەوز', ar: 'فاصولياء خضراء', fa: 'لوبیا سبز' },

  // Fruits
  { en: 'banana', ku: 'مۆز', ar: 'موز', fa: 'موز' },
  { en: 'apple', ku: 'سێو', ar: 'تفاح', fa: 'سیب' },
  { en: 'orange', ku: 'پرتەقاڵ', ar: 'برتقال', fa: 'پرتقال' },
  { en: 'strawberries', ku: 'شلک', ar: 'فراولة', fa: 'توت‌فرنگی' },
  { en: 'blueberries', ku: 'تووی شین (بلوبێری)', ar: 'توت أزرق', fa: 'بلوبری' },
  { en: 'berries', ku: 'توو و شلک', ar: 'توت مشكل', fa: 'انواع توت' },
  { en: 'dates', ku: 'خورما', ar: 'تمر', fa: 'خرما' },
  { en: 'watermelon', ku: 'شووتی', ar: 'بطيخ أحمر', fa: 'هندوانه' },
  { en: 'grapes', ku: 'ترێ', ar: 'عنب', fa: 'انگور' },
  { en: 'pineapple', ku: 'ئاناناس', ar: 'أناناس', fa: 'آناناس' },
  { en: 'grapefruit', ku: 'گرەیپفرووت', ar: 'جريب فروت', fa: 'گریپ‌فروت' },
  { en: 'kiwi', ku: 'کیوی', ar: 'كيوي', fa: 'کیوی' },

  // Fats & Nuts
  { en: 'almonds', ku: 'بادەم', ar: 'لوز نيء', fa: 'بادام خام' },
  { en: 'walnuts', ku: 'گوێز', ar: 'جوز نيء', fa: 'گردو خام' },
  { en: 'cashews', ku: 'کاشیو (گازۆ)', ar: 'كاجو', fa: 'بادام هندی' },
  { en: 'peanuts', ku: 'فستقی عەبید', ar: 'فول سوداني', fa: 'بادام زمینی' },
  { en: 'peanut butter', ku: 'کەرەی فستق', ar: 'زبدة الفول السوداني', fa: 'کره بادام زمینی' },
  { en: 'almond butter', ku: 'کەرەی بادەم', ar: 'زبدة اللوز', fa: 'کره بادام' },
  { en: 'olive oil', ku: 'زەیتی زەیتوون', ar: 'زيت زيتون بكر', fa: 'روغن زیتون فرابکر' },
  { en: 'extra virgin olive oil', ku: 'زەیتی زەیتوونی ئەسڵی', ar: 'زيت زيتون بكر ممتاز', fa: 'روغن زیتون طبیعی' },
  { en: 'avocado', ku: 'ئەڤۆکادۆ', ar: 'أفوكادو', fa: 'آووکادو' },
  { en: 'chia seeds', ku: 'تۆوی چیا', ar: 'بذور الشيا', fa: 'دانه چیا' },
  { en: 'flax seeds', ku: 'تۆوی کەتان', ar: 'بذور الكتان', fa: 'تخم کتان' },
  { en: 'pumpkin seeds', ku: 'تۆوی کولەکە', ar: 'بذور القرع', fa: 'تخم کدو' },
  { en: 'coconut oil', ku: 'ڕۆنی گوێزی هیند', ar: 'زيت جوز الهند', fa: 'روغن نارگیل' },

  // Others & Drinks
  { en: 'honey', ku: 'هەنگوین', ar: 'عسل نحل طبيعي', fa: 'عسل طبیعی' },
  { en: 'green tea', ku: 'چای سەوز', ar: 'شاي أخضر', fa: 'چای سبز' },
  { en: 'black coffee', ku: 'قاوەی ڕەشی بێ شەکر', ar: 'قهوة سوداء سادة', fa: 'قهوه سیاه تلخ' },
  { en: 'coffee', ku: 'قاوە', ar: 'قهوة', fa: 'قهوه' },
  { en: 'tea', ku: 'چا', ar: 'شاي', fa: 'چای' },
  { en: 'water', ku: 'ئاو', ar: 'ماء', fa: 'آب' }
];

// ==================== کەتەلۆگی تەواوی سەپلیمێنت، پڕۆتین، تاقە، ڤیتامین، دەرمان و هۆرمۆن ====================
export const MASTER_SUPPLEMENTS_CATALOG = [
  // ١. پرۆتین و گەینەر (Proteins & Gainers)
  { id: 'supp_whey', category: 'proteins', name: 'وەی پڕۆتین (Whey Protein)', en: 'Whey Protein', icon: '🥤', desc: 'پڕۆتینی خێرا هەرس بۆ گەشە و چاکبوونەوەی ماسولکە' },
  { id: 'supp_iso', category: 'proteins', name: 'وەی ئایزۆلەیت (Whey Isolate)', en: 'Whey Isolate', icon: '⚡', desc: 'پڕۆتینی خاوێن بێ چەوری و شەکر بۆ وشککردنەوە' },
  { id: 'supp_casein', category: 'proteins', name: 'پڕۆتینی کەزین (Casein Protein)', en: 'Casein Protein', icon: '🌙', desc: 'پڕۆتینی خاو هەرس بۆ کاتی خەو و پاراستنی ماسولکە' },
  { id: 'supp_mass', category: 'proteins', name: 'ماس گەینەر (Mass Gainer)', en: 'Mass Gainer', icon: '💪', desc: 'بەرزکردنەوەی کالۆری و کێش و قەبارەی ماسولکە' },
  { id: 'supp_hydro', category: 'proteins', name: 'هایدرۆ وەی (Hydro Whey)', en: 'Hydrolyzed Whey', icon: '🔬', desc: 'خێراترین جۆری پڕۆتین بۆ هەڵمژینی دەستبەجێ' },
  { id: 'supp_beef_pro', category: 'proteins', name: 'پڕۆتینی گۆشتی مانگا (Beef Protein)', en: 'Beef Protein Isolate', icon: '🥩', desc: 'پڕۆتینی بێ لاکتۆز و دەوڵەمەند بە ترشە ئەمینیەکان' },
  { id: 'supp_vegan_pro', category: 'proteins', name: 'پڕۆتینی ڕووەکی (Plant Protein)', en: 'Plant Protein', icon: '🌱', desc: 'پڕۆتینی سروشتی لە نۆک و برنج بۆ هەرسی ئاسان' },
  { id: 'supp_protein_bar', category: 'proteins', name: 'پڕۆتین بار (Protein Bar)', en: 'Protein Bar', icon: '🍫', desc: 'ژەمە سووکی دەوڵەمەند بە پڕۆتین' },

  // ٢. کریاتین و ئەمینۆ و چاکبوونەوە (Creatine, Amino & Recovery)
  { id: 'supp_creatine_mono', category: 'amino', name: 'کریاتین مۆنۆهایدرەیت (Creatine Monohydrate)', en: 'Creatine Monohydrate', icon: '🔋', desc: 'زیادکردنی هێز و قەبارە و وزەی ATP لە ماسولکەدا' },
  { id: 'supp_creatine_hcl', category: 'amino', name: 'کریاتین HCl (Creatine HCl)', en: 'Creatine HCl', icon: '🧪', desc: 'کریاتینی چڕ بەبێ گلدانەوەی ئاوی ژێر پێست' },
  { id: 'supp_bcaa', category: 'amino', name: 'بی سی ئەی ئەی (BCAA)', en: 'BCAA', icon: '🧬', desc: 'کەمکردنەوەی هیلاکی و پاراستنی ماسولکە لە کاتی مەشق' },
  { id: 'supp_eaa', category: 'amino', name: 'ئی ئەی ئەی (EAA - ترشە ئەمینیەکان)', en: 'EAA Essential Amino Acids', icon: '💧', desc: 'تەواوی ٩ ترشە ئەمینیە بنەڕەتییەکان بۆ دروستکردنی ماسولکە' },
  { id: 'supp_glutamine', category: 'amino', name: 'گلوتامین (L-Glutamine)', en: 'L-Glutamine', icon: '🛡️', desc: 'خێراکردنی چاکبوونەوە و کەمکردنەوەی ئازاری ماسولکە' },
  { id: 'supp_hmb', category: 'amino', name: 'ئێچ ئێم بی (HMB)', en: 'HMB', icon: '🧱', desc: 'ڕێگری لە سووتانی ماسولکە لە کاتی ڕێجیمی توند' },
  { id: 'supp_collagen', category: 'amino', name: 'کۆلاجین (Collagen Peptides)', en: 'Collagen Peptides', icon: '🦴', desc: 'بەهێزکردنی جومگەکان و بەستەرەکان و پێست' },
  { id: 'supp_dextrose', category: 'amino', name: 'کاربۆهایدراتی پاش مەشق (Vitargo / Dextrose)', en: 'Post-Workout Carbs (Vitargo)', icon: '⚡', desc: 'پڕکردنەوەی خێرای گلایکۆجینی ماسولکە' },

  // ٣. تاقە و پێش ڕاهێنان (Pre-Workout & Energy / Pump)
  { id: 'supp_preworkout', category: 'energy', name: 'پری-وۆرکاوت / تاقە (Pre-Workout)', en: 'Pre-Workout', icon: '🔥', desc: 'زیادکردنی تاقە و تەرکیز و پەمپی ماسولکە پێش ڕاهێنان' },
  { id: 'supp_citrulline', category: 'energy', name: 'سیترۆلین مالەیت (L-Citrulline Malate)', en: 'Citrulline Malate', icon: '🩸', desc: 'فراوانکردنی دەمارەکان و پەمپی بەهێزی خوێن بۆ ماسولکە' },
  { id: 'supp_beta_alanine', category: 'energy', name: 'بێتا ئەلانین (Beta-Alanine)', en: 'Beta-Alanine', icon: '⚡', desc: 'زیادکردنی بەرگەگرتن و دواخستنی سووتانەوەی ماسولکە' },
  { id: 'supp_arginine', category: 'energy', name: 'ئارجینین (L-Arginine / AAKG)', en: 'L-Arginine', icon: '💥', desc: 'زیادکردنی نایتریک ئۆکساید و دەرکەوتنی دەمارەکان' },
  { id: 'supp_caffeine', category: 'energy', name: 'حەبی کافایین (Caffeine Pills 200mg)', en: 'Caffeine Pills', icon: '☕', desc: 'وریایی مێشک و وزەی خێرا بۆ مەشقی قورس' },
  { id: 'supp_electrolytes', category: 'energy', name: 'ئەلیکترۆلایت و خوێی کانزایی (Electrolytes)', en: 'Electrolytes', icon: '💦', desc: 'ڕێگری لە گرژبوونی ماسولکە و پاراستنی هایدرەیشن' },
  { id: 'supp_taurine', category: 'energy', name: 'تۆرین (Taurine)', en: 'Taurine', icon: '🐂', desc: 'باشترکردنی گرژبوونی ماسولکە و تەرکیزی دەمارەکان' },

  // ٤. ڤیتامین و کانزاکان (Vitamins & Minerals)
  { id: 'supp_multivitamin', category: 'vitamins', name: 'مەڵتی ڤیتامین (Multivitamin)', en: 'Multivitamin', icon: '💊', desc: 'تەواوکەری گشتی ڤیتامین و کانزاکانی جەستە' },
  { id: 'supp_omega3', category: 'vitamins', name: 'ئۆمێگا ٣ / زەیتی ماسی (Omega-3 Fish Oil)', en: 'Omega-3 Fish Oil', icon: '🐟', desc: 'تەندروستی دڵ و کەمکردنەوەی هەوکردنی جومگەکان' },
  { id: 'supp_vit_d3', category: 'vitamins', name: 'ڤیتامین D3 + K2 (Vitamin D3)', en: 'Vitamin D3 + K2', icon: '☀️', desc: 'بەهێزکردنی ئێسک و بەرگری و هۆرمۆنی سروشتی' },
  { id: 'supp_zinc', category: 'vitamins', name: 'زینک (Zinc)', en: 'Zinc', icon: '🛡️', desc: 'پشتگیری هۆرمۆنی تێستۆستیرۆن و کۆئەندامی بەرگری' },
  { id: 'supp_magnesium', category: 'vitamins', name: 'مەگنیسیۆم (Magnesium Glycinate)', en: 'Magnesium', icon: '💤', desc: 'خاوکردنەوەی ماسولکە و باشترکردنی خەوی شەوانە' },
  { id: 'supp_zma', category: 'vitamins', name: 'زێد ئێم ئەی (ZMA)', en: 'ZMA (Zinc, Magnesium, B6)', icon: '🌙', desc: 'چاکبوونەوەی شەوانە و ڕێکخستنی هۆرمۆن' },
  { id: 'supp_vit_c', category: 'vitamins', name: 'ڤیتامین C (Vitamin C 1000mg)', en: 'Vitamin C', icon: '🍊', desc: 'دژە ئۆکسان و کەمکردنەوەی کۆرتیزۆڵ پاش ڕاهێنان' },
  { id: 'supp_vit_b', category: 'vitamins', name: 'ڤیتامین بی کۆمپلێکس (Vitamin B-Complex)', en: 'Vitamin B-Complex', icon: '⚡', desc: 'گۆڕینی خۆراک بۆ وزە و بەهێزکردنی دەمارەکان' },
  { id: 'supp_iron', category: 'vitamins', name: 'ئاسن (Iron Supplement)', en: 'Iron', icon: '🩸', desc: 'گواستنەوەی ئۆکسجین لە خوێندا و نەهێشتنی بێهێزی' },
  { id: 'supp_joint', category: 'vitamins', name: 'پارێزەری جومگە (Glucosamine & MSM)', en: 'Joint Support (Glucosamine)', icon: '🦵', desc: 'پاراستن و نەرمکردنی جومگەکان لە ژێر کێشی قورس' },

  // ٥. چەوری سووتێنەر و دەرمان و گیایی (Fat Burners, Adaptogens & Medications)
  { id: 'supp_carnitine', category: 'medications', name: 'ئێڵ-کارنیتین (L-Carnitine)', en: 'L-Carnitine', icon: '🔥', desc: 'گواستنەوەی ترشە چەورییەکان بۆ سووتاندن وەک وزە' },
  { id: 'supp_cla', category: 'medications', name: 'سی ئێڵ ئەی (CLA)', en: 'CLA', icon: '🌿', desc: 'یارمەتیدانی کەمکردنەوەی چەوری کەمەر و ورگ' },
  { id: 'supp_thermo', category: 'medications', name: 'چەوری سووتێنەر (Thermogenic Fat Burner / Lipo-6)', en: 'Thermogenic Fat Burner', icon: '🌶️', desc: 'بەرزکردنەوەی پلەی گەرمی و خێرایی میتابۆلیزم' },
  { id: 'supp_ashwagandha', category: 'medications', name: 'ئەشواگاندا (Ashwagandha)', en: 'Ashwagandha', icon: '🌱', desc: 'کەمکردنەوەی سترێس و کۆرتیزۆڵ و زیادکردنی هێز' },
  { id: 'supp_tribulus', category: 'medications', name: 'تریبیولەس / تێست بوستەر (Tribulus / Test Booster)', en: 'Tribulus Terrestris', icon: '🦁', desc: 'هانده‌ری سروشتی هۆرمۆنی نێرینە و چالاکی' },
  { id: 'supp_yohimbine', category: 'medications', name: 'یۆهیمبین (Yohimbine HCl)', en: 'Yohimbine HCl', icon: '💊', desc: 'تایبەت بە تواندنەوەی چەورییە سەرسەختەکان' },
  { id: 'supp_clen', category: 'medications', name: 'کلینبوتیرۆڵ (Clenbuterol)', en: 'Clenbuterol', icon: '⚠️', desc: 'سووتێنەری بەهێزی چەوری و پارێزەری ماسولکە' },
  { id: 'supp_t3', category: 'medications', name: 'تی ٣ / غودە (T3 Liothyronine)', en: 'T3 Liothyronine', icon: '🔬', desc: 'خێراکردنی بەرزی زیندەچالاکی لە کاتی وشککردنەوە' },
  { id: 'supp_metformin', category: 'medications', name: 'مێتفۆرمین / ڕێکخەری شەکرە (Metformin / Berberine)', en: 'Metformin / Berberine', icon: '🩺', desc: 'باشترکردنی هەستیاری ئینسۆلین و سوودوەرگرتن لە کاربۆهایدرات' },
  { id: 'supp_liver_support', category: 'medications', name: 'پارێزەری جگەر و گورچیلە (TUDCA / NAC / Milk Thistle)', en: 'Liver & Kidney Support (TUDCA / NAC)', icon: '🛡️', desc: 'پاککردنەوە و پاراستنی ئەندامەکانی ناوەوە' },

  // ٦. هۆرمۆن و سارمس و پێپتاید (Hormones, SARMs & Peptides)
  { id: 'supp_test', category: 'hormones', name: 'تێستۆستیرۆن (Testosterone Enanthate / Cypionate / Prop)', en: 'Testosterone', icon: '💉', desc: 'بنەمای زیادکردنی قەبارەی ماسولکە و هێز و چاکبوونەوەی خێرا' },
  { id: 'supp_sustanon', category: 'hormones', name: 'سۆستانۆن (Sustanon 250)', en: 'Sustanon 250', icon: '💉', desc: 'تێکەڵەی ٤ جۆر تێستۆستیرۆن بۆ گەشەی بەردەوام' },
  { id: 'supp_deca', category: 'hormones', name: 'دیکا دورابۆلین / نادرۆلۆن (Deca / NPP)', en: 'Nandrolone (Deca / NPP)', icon: '💪', desc: 'زیادکردنی قەبارەی ماسولکە و نەرمکردنی جومگەکان' },
  { id: 'supp_primobolan', category: 'hormones', name: 'پریمۆبۆلان (Primobolan)', en: 'Primobolan', icon: '👑', desc: 'گەشەی ماسولکەی زۆر خاوێن بە کەمترین زیانی لاوەکی' },
  { id: 'supp_masteron', category: 'hormones', name: 'ماستیرۆن (Masteron)', en: 'Masteron', icon: '💎', desc: 'ڕەقبوونی ماسولکە و وشککردنەوەی پێش پاڵەوانێتی' },
  { id: 'supp_boldenone', category: 'hormones', name: 'بۆڵدینۆن (Boldenone / Equipoise)', en: 'Boldenone', icon: '🐎', desc: 'زیادکردنی ئیشتیها و خڕۆکە سوورەکان و بەرگەگرتن' },
  { id: 'supp_tren', category: 'hormones', name: 'ترینبۆلۆن (Trenbolone Acetate / Enanthate)', en: 'Trenbolone', icon: '🔥', desc: 'بەهێزترین هۆرمۆن بۆ گۆڕینی خۆراک بۆ ماسولکە و سووتاندنی چەوری' },
  { id: 'supp_anavar', category: 'hormones', name: 'ئەناڤار (Anavar / Oxandrolone)', en: 'Anavar (Oxandrolone)', icon: '💊', desc: 'زیادکردنی هێز و ماسولکەی ساف بەبێ ئاو گلدانەوە' },
  { id: 'supp_dianabol', category: 'hormones', name: 'دایانابۆڵ (Dianabol)', en: 'Dianabol', icon: '💥', desc: 'زیادکردنی خێرای کێش و قەبارە و هێزی تەقینەوەیی' },
  { id: 'supp_winstrol', category: 'hormones', name: 'وینسترۆڵ (Winstrol / Stanozolol)', en: 'Winstrol', icon: '⚡', desc: 'وشککردنەوەی ئاوی ژێر پێست و دەرخستنی وردەکاری ماسولکە' },
  { id: 'supp_anadrol', category: 'hormones', name: 'ئانادرۆڵ (Anadrol / Oxymetholone)', en: 'Anadrol', icon: '🦍', desc: 'بەرزترین قەبارە و پڕبوونی ماسولکە لە کۆرسی قەبارەدا' },
  { id: 'supp_hgh', category: 'hormones', name: 'هۆرمۆنی گەشە / جی ئێچ (HGH Somatropin)', en: 'HGH Growth Hormone', icon: '🧬', desc: 'نوێکردنەوەی خانەکان و سووتاندنی چەوری و گەشەی ڕیشاڵەکان' },
  { id: 'supp_mk677', category: 'hormones', name: 'ئێم کەی ٦٧٧ (MK-677 Ibutamoren)', en: 'MK-677 Ibutamoren', icon: '🌙', desc: 'زیادکردنی هۆرمۆنی گەشە و ئیشتیها و قووڵکردنی خەو' },
  { id: 'supp_rad140', category: 'hormones', name: 'ڕاد ١٤٠ / لیگاندرۆڵ (SARMs: RAD-140 / LGD-4033)', en: 'SARMs (RAD-140 / LGD-4033)', icon: '🧪', desc: 'سارمس بۆ بەئامانجگرتنی وەرگرەکانی ماسولکە و ئێسک' },
  { id: 'supp_bpc157', category: 'hormones', name: 'پێپتایدی چاکبوونەوە (BPC-157 / TB-500)', en: 'Peptides (BPC-157 / TB-500)', icon: '🩹', desc: 'چارەسەری خێرای پێکان و هەوکردنی ژێ و جومگەکان' }
];

// ==================== کەتەلۆگی ڕاهێنانە جێگرەوەکان بەپێی ماسولکە (ID-Verified Alternative Exercises Catalog) ====================
export const ALTERNATIVE_EXERCISES_CATALOG = [
  // سنگ (Chest)
  { name: 'بێنج پرێس بە باربێڵ (Barbell Bench Press)', englishName: 'Barbell Bench Press', muscle: 'سنگ', group: 'chest', sets: 4, reps: '8-10', rest: '150s' },
  { name: 'بێنج پرێس بە دەمبڵ (Dumbbell Bench Press)', englishName: 'Dumbbell Bench Press', muscle: 'سنگ', group: 'chest', sets: 4, reps: '10-12', rest: '120s' },
  { name: 'سەرەوەی سنگ بە دەمبڵ (Incline Dumbbell Press)', englishName: 'Incline Dumbbell Press', muscle: 'سنگ', group: 'chest', sets: 4, reps: '10-12', rest: '150s' },
  { name: 'سەرەوەی سنگ بە باربێڵ (Incline Barbell Press)', englishName: 'Incline Barbell Press', muscle: 'سنگ', group: 'chest', sets: 4, reps: '8-10', rest: '150s' },
  { name: 'فلای سنگ بە کێبڵ (Cable Crossover Fly)', englishName: 'Cable Crossover', muscle: 'سنگ', group: 'chest', sets: 3, reps: '12-15', rest: '75s' },
  { name: 'پێک دێک فلای بە ئامێر (Pec Deck Machine Fly)', englishName: 'Pec Deck Machine Fly', muscle: 'سنگ', group: 'chest', sets: 3, reps: '12-15', rest: '75s' },
  { name: 'سنگ پرێس بە ئامێر (Machine Chest Press)', englishName: 'Machine Chest Press', muscle: 'سنگ', group: 'chest', sets: 4, reps: '10-12', rest: '150s' },
  { name: 'فلای سنگ بە دەمبڵ (Dumbbell Fly)', englishName: 'Dumbbell Fly', muscle: 'سنگ', group: 'chest', sets: 3, reps: '12-15', rest: '75s' },
  { name: 'ئۆرزی سنگ بە بار (Chest Dips)', englishName: 'Chest Dips', muscle: 'سنگ', group: 'chest', sets: 3, reps: '10-12', rest: '120s' },
  { name: 'شناو لەسەر زەوی (Push-ups)', englishName: 'Push-ups', muscle: 'سنگ', group: 'chest', sets: 4, reps: '15-20', rest: '90s' },

  // پشت (Back)
  { name: 'ڕاکێشانی کێبڵ بۆ سنگ (Lat Pulldown)', englishName: 'Lat Pulldown', muscle: 'پشت', group: 'back', sets: 4, reps: '10-12', rest: '150s' },
  { name: 'پاروو بە کێبڵ بە دانیشتنەوە (Seated Cable Row)', englishName: 'Seated Cable Row', muscle: 'پشت', group: 'back', sets: 4, reps: '10-12', rest: '120s' },
  { name: 'بارفیکس / خۆهەڵواسین (Pull-ups)', englishName: 'Pull-ups', muscle: 'پشت', group: 'back', sets: 4, reps: '8-12', rest: '150s' },
  { name: 'پاروو بە باربێڵ بە چەمانەوە (Barbell Bent-Over Row)', englishName: 'Barbell Bent Over Row', muscle: 'پشت', group: 'back', sets: 4, reps: '8-10', rest: '150s' },
  { name: 'مشار بە دەمبڵ تاک دەست (One-Arm Dumbbell Row)', englishName: 'One-Arm Dumbbell Row', muscle: 'پشت', group: 'back', sets: 4, reps: '10-12', rest: '90s' },
  { name: 'تی-بار ڕۆو (T-Bar Row)', englishName: 'T-Bar Row', muscle: 'پشت', group: 'back', sets: 4, reps: '10-12', rest: '120s' },
  { name: 'ڕاکێشانی کێبڵ بە دەستی ڕێک (Straight-Arm Pulldown)', englishName: 'Straight-Arm Pulldown', muscle: 'پشت', group: 'back', sets: 3, reps: '12-15', rest: '60s' },
  { name: 'پشتگیری سنگ بە ئامێر (Chest-Supported Machine Row)', englishName: 'Chest-Supported Machine Row', muscle: 'پشت', group: 'back', sets: 4, reps: '10-12', rest: '150s' },
  { name: 'دێدلیفت بە باربێڵ (Barbell Deadlift)', englishName: 'Barbell Deadlift', muscle: 'پشت', group: 'back', sets: 4, reps: '6-8', rest: '180s' },

  // شان (Shoulders)
  { name: 'شان پرێس بە دەمبڵ (Seated Dumbbell Shoulder Press)', englishName: 'Seated Dumbbell Press', muscle: 'شان', group: 'shoulders', sets: 4, reps: '10-12', rest: '120s' },
  { name: 'شان پرێس بە باربێڵ (Overhead Barbell Press)', englishName: 'Overhead Barbell Press', muscle: 'شان', group: 'shoulders', sets: 4, reps: '8-10', rest: '150s' },
  { name: 'بەرزکردنەوەی تەنیشت بە دەمبڵ (Dumbbell Lateral Raise)', englishName: 'Dumbbell Lateral Raise', muscle: 'شان', group: 'shoulders', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'بەرزکردنەوەی پێشەوەی شان (Dumbbell Front Raise)', englishName: 'Dumbbell Front Raise', muscle: 'شان', group: 'shoulders', sets: 3, reps: '12-15', rest: '60s' },
  { name: 'ڕاکێشانی پەت بۆ دەموچاو (Face Pull)', englishName: 'Cable Face Pull', muscle: 'شان', group: 'shoulders', sets: 4, reps: '15', rest: '60s' },
  { name: 'پشتی شان بە ئامێر (Reverse Pec Deck)', englishName: 'Reverse Pec Deck', muscle: 'شان', group: 'shoulders', sets: 3, reps: '12-15', rest: '75s' },
  { name: 'ئاڕنۆڵد پرێس (Arnold Dumbbell Press)', englishName: 'Arnold Press', muscle: 'شان', group: 'shoulders', sets: 4, reps: '10-12', rest: '120s' },
  { name: 'کۆڵەمە بە دەمبڵ (Dumbbell Shrugs)', englishName: 'Dumbbell Shrugs', muscle: 'شان', group: 'shoulders', sets: 4, reps: '12-15', rest: '60s' },

  // قاچ و سمت (Legs & Glutes)
  { name: 'سکوات بە باربێڵ (Barbell Squat)', englishName: 'Barbell Squat', muscle: 'قاچ', group: 'legs', sets: 4, reps: '8-10', rest: '180s' },
  { name: 'لێگ پرێس بە ئامێر (Leg Press)', englishName: 'Leg Press', muscle: 'قاچ', group: 'legs', sets: 4, reps: '10-12', rest: '180s' },
  { name: 'درێژکردنی پێشەوەی قاچ (Leg Extension)', englishName: 'Leg Extension', muscle: 'قاچ', group: 'legs', sets: 4, reps: '12-15', rest: '75s' },
  { name: 'ڕاکێشانی پشتی قاچ (Seated / Lying Leg Curl)', englishName: 'Seated Leg Curl', muscle: 'پشتی قاچ', group: 'legs', sets: 4, reps: '12-15', rest: '75s' },
  { name: 'دێدلیفتی ڕۆمانی بۆ پشتی قاچ (Romanian Deadlift)', englishName: 'Romanian Deadlift', muscle: 'پشتی قاچ', group: 'legs', sets: 4, reps: '10-12', rest: '180s' },
  { name: 'سکواتی بولگاری بۆ قاچ و سمت (Bulgarian Split Squat)', englishName: 'Bulgarian Split Squat', muscle: 'سمت و قاچ', group: 'legs', sets: 3, reps: '10-12', rest: '120s' },
  { name: 'هیپ ترەست بۆ گەورەکردنی سمت (Barbell Hip Thrust)', englishName: 'Barbell Hip Thrust', muscle: 'سمت', group: 'legs', sets: 4, reps: '10-12', rest: '150s' },
  { name: 'گۆبلێت سکوات بە دەمبڵ (Goblet Squat)', englishName: 'Goblet Squat', muscle: 'قاچ', group: 'legs', sets: 4, reps: '12-15', rest: '90s' },
  { name: 'هەنگاونان بە دەمبڵ (Dumbbell Lunges)', englishName: 'Dumbbell Lunges', muscle: 'قاچ', group: 'legs', sets: 3, reps: '12', rest: '90s' },
  { name: 'بەرزبوونەوە لەسەر پەنجەی پێ بۆ پوز (Standing Calf Raise)', englishName: 'Standing Calf Raise', muscle: 'پوز', group: 'legs', sets: 4, reps: '15-20', rest: '60s' },

  // قۆڵ و باڵ (Arms: Biceps & Triceps)
  { name: 'جەڵەوی بایسێپس بە باربێڵ (Barbell Biceps Curl)', englishName: 'Barbell Biceps Curl', muscle: 'قۆڵ', group: 'arms', sets: 4, reps: '10-12', rest: '75s' },
  { name: 'بایسێپس بە دەمبڵ بە وەستانەوە (Dumbbell Biceps Curl)', englishName: 'Dumbbell Biceps Curl', muscle: 'قۆڵ', group: 'arms', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'چەکوش کێرڵ بە دەمبڵ (Hammer Curl)', englishName: 'Hammer Curl', muscle: 'قۆڵ', group: 'arms', sets: 3, reps: '12', rest: '60s' },
  { name: 'پریچەر کێرڵ لەسەر مێز (Preacher Curl)', englishName: 'EZ-Bar Preacher Curl', muscle: 'قۆڵ', group: 'arms', sets: 3, reps: '10-12', rest: '60s' },
  { name: 'ترایسێپس بە پەت لەسەر کێبڵ (Triceps Rope Pushdown)', englishName: 'Triceps Rope Pushdown', muscle: 'پاشەملە', group: 'arms', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'ترایسێپس لە پشت سەر بە کێبڵ (Overhead Cable Triceps Extension)', englishName: 'Overhead Cable Triceps Extension', muscle: 'پاشەملە', group: 'arms', sets: 3, reps: '12', rest: '75s' },
  { name: 'تێکشکێنەری کەللەسەر بە بار (Skull Crushers)', englishName: 'EZ-Bar Skullcrusher', muscle: 'پاشەملە', group: 'arms', sets: 3, reps: '10-12', rest: '75s' },
  { name: 'پاشەملە لەسەر کورسی (Bench Dips)', englishName: 'Bench Dips', muscle: 'پاشەملە', group: 'arms', sets: 3, reps: '12-15', rest: '90s' },

  // سک و کاردیۆ (Core & Cardio)
  { name: 'کڕانچی سک بە کێبڵ (Cable Rope Crunch)', englishName: 'Cable Rope Crunch', muscle: 'ورگ و کەمەر', group: 'core', sets: 4, reps: '15-20', rest: '60s' },
  { name: 'بەرزکردنەوەی قاچ بە هەڵواسراوی (Hanging Leg Raise)', englishName: 'Hanging Leg Raise', muscle: 'ورگ و کەمەر', group: 'core', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'پڵانکی جێگیر بۆ توندکردنەوەی سک (Plank Hold)', englishName: 'Plank', muscle: 'ورگ و کەمەر', group: 'core', sets: 3, reps: '60s', rest: '60s' },
  { name: 'پێچکردنی ڕووسی بۆ کەمەر (Russian Twists)', englishName: 'Russian Twists', muscle: 'ورگ و کەمەر', group: 'core', sets: 4, reps: '20', rest: '60s' },
  { name: 'چیاڕەوی خێرا (Mountain Climbers)', englishName: 'Mountain Climbers', muscle: 'کاردیۆ و سک', group: 'core', sets: 3, reps: '45s', rest: '60s' },
  { name: 'ڕۆیشتن لەسەر تەرمیلی لێژ (Incline Treadmill Walk)', englishName: 'Walking on Incline Treadmill', muscle: 'کاردیۆ', group: 'core', sets: 1, reps: '20 خولەک', rest: '60s' },
  { name: 'پاسکیلی وەستاو (Stationary Bike)', englishName: 'Stationary Bike', muscle: 'کاردیۆ', group: 'core', sets: 1, reps: '20 خولەک', rest: '60s' }
].map((item) => bindVerifiedExerciseMetadata(item, item.group));

// ==================== سووڕی ژیانی کۆرس، دیڵۆد، مێژووی کۆرس و دۆزینەوەی پلاتۆ (Course Lifecycle, Deload & Plateau Engine) ====================
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MIN_PLAUSIBLE_EPOCH_MS = 1577836800000; // 2020-01-01T00:00:00.000Z

/**
 * Extracts or validates a course startDate ISO string, supporting legacy course.id timestamps.
 */
export function resolveCourseStartDate(course, fallbackIso = null) {
  if (course && typeof course === 'object') {
    const rawDate = course.startDate || course.createdAt;
    if (rawDate) {
      const parsedMs = Date.parse(rawDate);
      if (Number.isFinite(parsedMs) && parsedMs >= MIN_PLAUSIBLE_EPOCH_MS) {
        return new Date(parsedMs).toISOString();
      }
    }
    const idStr = String(course.id || '');
    const idMatch = idStr.match(/(?:ai_course_\d+d_|_)(\d{12,15})(?:$|_)/);
    if (idMatch && idMatch[1]) {
      const ts = Number(idMatch[1]);
      if (Number.isFinite(ts) && ts >= MIN_PLAUSIBLE_EPOCH_MS && ts <= Date.now() + MS_PER_DAY) {
        return new Date(ts).toISOString();
      }
    }
  }
  return fallbackIso || new Date().toISOString();
}

/**
 * Ensures any loaded or generated workoutCourse carries a valid startDate ISO timestamp.
 */
export function ensureCourseStartDate(course, nowIso = null) {
  if (!course || typeof course !== 'object') return course;
  const resolved = resolveCourseStartDate(course, nowIso || new Date().toISOString());
  if (course.startDate === resolved) return course;
  return { ...course, startDate: resolved };
}

/**
 * Computes currentWeek (1+), elapsedDays, Deload/Renewal flags, and goal progress from startDate.
 */
export function getCourseLifecycleMetrics(course, nowMs = Date.now(), targetDays = 45) {
  const safeTargetDays = Math.max(1, Number(targetDays) || Number(course?.durationDays) || 45);
  if (!course || !Array.isArray(course.weeklyPlan)) {
    return {
      hasCourse: false,
      startDate: null,
      elapsedDays: 0,
      currentWeek: 1,
      totalCycleWeeks: 10,
      cycleProgressPercent: 0,
      isScheduledDeloadWeek: false,
      isRenewalWindow: false,
      goalProgressPercent: 0,
      remainingDays: safeTargetDays
    };
  }

  const startDate = resolveCourseStartDate(course, new Date(nowMs).toISOString());
  const startMs = Date.parse(startDate);
  const elapsedMs = Math.max(0, nowMs - startMs);
  const elapsedDays = Math.floor(elapsedMs / MS_PER_DAY);
  const currentWeek = Math.max(1, Math.floor(elapsedMs / MS_PER_WEEK) + 1);
  const totalCycleWeeks = 10;
  const cycleProgressPercent = Math.min(100, Math.round((Math.min(currentWeek, totalCycleWeeks) / totalCycleWeeks) * 100));
  const goalProgressPercent = Math.min(100, Math.round((elapsedDays / safeTargetDays) * 100));
  const remainingDays = Math.max(safeTargetDays - elapsedDays, 0);

  return {
    hasCourse: true,
    startDate,
    elapsedDays,
    currentWeek,
    totalCycleWeeks,
    cycleProgressPercent,
    isScheduledDeloadWeek: currentWeek === 5 || currentWeek === 10,
    isRenewalWindow: currentWeek >= 8,
    goalProgressPercent,
    remainingDays
  };
}

function getCourseHistoryIdentity(course) {
  if (!course || typeof course !== 'object') return '';
  const start = course.startDate || '';
  const archived = course.archivedAt || '';
  const id = course.id || '';
  return `${id}::${start}::${archived}`;
}

/**
 * Filters null/invalid entries and ensures every archived course carries required lifecycle metadata.
 */
export function normalizeCourseHistoryList(historyList = []) {
  if (!Array.isArray(historyList)) return [];
  const seen = new Set();
  const normalized = [];

  for (const item of historyList) {
    if (!item || typeof item !== 'object' || !Array.isArray(item.weeklyPlan) || item.weeklyPlan.length === 0) continue;
    const startDate = resolveCourseStartDate(item);
    const archivedAt = item.archivedAt && Number.isFinite(Date.parse(item.archivedAt))
      ? new Date(item.archivedAt).toISOString()
      : startDate;
    const daysPerWeek = Number(item.daysPerWeek) || item.weeklyPlan.filter(d => d && !d.isRestDay).length || 4;
    const entry = {
      ...item,
      id: item.id || `archived_${Date.parse(startDate)}_${daysPerWeek}d`,
      startDate,
      archivedAt,
      title: item.title || item.englishSubtitle || `${daysPerWeek}-Day Course`,
      splitName: item.splitName || item.englishSubtitle || '',
      daysPerWeek
    };
    const dedupeSig = `${entry.id}::${entry.startDate}`;
    if (seen.has(dedupeSig)) continue;
    seen.add(dedupeSig);
    normalized.push(entry);
  }

  return normalized;
}

/**
 * Archives the previously active workoutCourse into courseHistory (newest first, no duplicates).
 */
export function archiveCourseIntoHistory(historyList = [], previousCourse = null, archivedAtIso = new Date().toISOString()) {
  const cleanHistory = normalizeCourseHistoryList(historyList);
  if (!previousCourse || typeof previousCourse !== 'object' || !Array.isArray(previousCourse.weeklyPlan) || previousCourse.weeklyPlan.length === 0) {
    return cleanHistory;
  }

  const startDate = resolveCourseStartDate(previousCourse, archivedAtIso);
  const daysPerWeek = Number(previousCourse.daysPerWeek) || previousCourse.weeklyPlan.filter(d => d && !d.isRestDay).length || 4;
  const archivedEntry = {
    ...JSON.parse(JSON.stringify(previousCourse)),
    id: previousCourse.id || `course_${daysPerWeek}d_${Date.now()}`,
    startDate,
    archivedAt: archivedAtIso,
    title: previousCourse.title || previousCourse.englishSubtitle || `${daysPerWeek}-Day Program`,
    splitName: previousCourse.splitName || previousCourse.englishSubtitle || previousCourse.title || '',
    daysPerWeek
  };

  const filtered = cleanHistory.filter(item => !(item.id === archivedEntry.id && item.startDate === archivedEntry.startDate));
  return [archivedEntry, ...filtered];
}

/**
 * Removes one specific course from courseHistory.
 */
export function deleteArchivedCourse(historyList = [], targetCourse, targetIndex = -1) {
  const cleanHistory = normalizeCourseHistoryList(historyList);
  if (!targetCourse && targetIndex >= 0 && targetIndex < cleanHistory.length) {
    return cleanHistory.filter((_, idx) => idx !== targetIndex);
  }
  const targetSig = getCourseHistoryIdentity(targetCourse);
  let removed = false;
  return cleanHistory.filter((item, idx) => {
    if (removed) return true;
    if (targetIndex >= 0 && idx === targetIndex) {
      removed = true;
      return false;
    }
    if (targetSig && getCourseHistoryIdentity(item) === targetSig) {
      removed = true;
      return false;
    }
    return true;
  });
}

/**
 * Archives current active course (if present), removes targetCourse from history, and restores it as Week 1.
 */
export function reactivateArchivedCourse({ activeCourse = null, courseHistory = [], targetCourse, targetIndex = -1, nowIso = new Date().toISOString() }) {
  if (!targetCourse || typeof targetCourse !== 'object' || !Array.isArray(targetCourse.weeklyPlan)) {
    return {
      nextActiveCourse: activeCourse,
      nextCourseHistory: normalizeCourseHistoryList(courseHistory)
    };
  }

  const historyWithoutTarget = deleteArchivedCourse(courseHistory, targetCourse, targetIndex);
  const nextCourseHistory = archiveCourseIntoHistory(historyWithoutTarget, activeCourse, nowIso);

  const restoredClone = JSON.parse(JSON.stringify(targetCourse));
  delete restoredClone.archivedAt;
  restoredClone.startDate = nowIso;
  restoredClone.isAiOnlineGenerated = true;

  return {
    nextActiveCourse: restoredClone,
    nextCourseHistory
  };
}

/**
 * Evaluates Deload key and active status for the active course + currentWeek.
 */
export function getEffectiveDeloadState({ course = null, currentWeek = 1, deloadWeeks = {} }) {
  const courseKey = String(course?.id || 'active');
  const weekTag = `${courseKey}_w${currentWeek}`;
  const isScheduledDeloadWeek = currentWeek === 5 || currentWeek === 10;
  const hasExplicitSetting = deloadWeeks && Object.prototype.hasOwnProperty.call(deloadWeeks, weekTag);
  const isDeloadActive = hasExplicitSetting ? Boolean(deloadWeeks[weekTag]) : false;

  return {
    weekTag,
    isScheduledDeloadWeek,
    isDeloadActive,
    hasExplicitSetting
  };
}

/**
 * Returns effective sets and intensity (RIR) for an exercise, applying 40% Deload reduction when active.
 */
export function getEffectiveExercisePrescription(ex, isDeloadActive = false) {
  const baseSets = Math.min(Math.max(1, Number(ex?.sets) || 4), 8);
  const isCardio = classifyExerciseTier(ex) === 'cardio';
  if (!isDeloadActive || isCardio) {
    return {
      sets: baseSets,
      originalSets: baseSets,
      reps: ex?.reps || '8-12',
      rir: ex?.rir || '',
      isDeloadReduced: false
    };
  }

  const reducedSets = Math.max(2, Math.round(baseSets * 0.6));
  return {
    sets: reducedSets,
    originalSets: baseSets,
    reps: ex?.reps || '8-12',
    rir: 'RIR 3-4',
    isDeloadReduced: true
  };
}

/**
 * Archives completed exercises from current exerciseLogs into a weekly performance snapshot.
 */
export function buildWeeklyExerciseSnapshot({ weekKey, exerciseLogs = {}, isDeload = false, archivedAt = new Date().toISOString() }) {
  const exercises = {};
  Object.keys(exerciseLogs || {}).forEach((exKey) => {
    const setsArr = Array.isArray(exerciseLogs[exKey]) ? exerciseLogs[exKey] : [];
    const completedSets = setsArr.filter(s => s && s.completed);
    if (completedSets.length === 0) return;

    let maxWeight = 0;
    let totalReps = 0;
    let bestE1RM = 0;

    completedSets.forEach(s => {
      const w = Math.max(0, parseFloat(s.weight) || 0);
      const r = Math.max(0, parseInt(s.reps, 10) || 0);
      if (w > maxWeight) maxWeight = w;
      totalReps += r;
      if (w > 0 && r > 0) {
        const e1 = r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10;
        if (e1 > bestE1RM) bestE1RM = e1;
      }
    });

    if (maxWeight > 0 || totalReps > 0) {
      exercises[exKey] = {
        maxWeight: Math.round(maxWeight * 10) / 10,
        totalReps,
        e1RM: bestE1RM
      };
    }
  });

  return {
    weekKey: weekKey || '',
    archivedAt,
    isDeload: Boolean(isDeload),
    exercises
  };
}

/**
 * Inserts/updates a weekly snapshot into app_exercise_log_history while retaining the last maxWeeks (12).
 */
export function archiveWeeklyExerciseSnapshot(history = [], snapshot, maxWeeks = 12) {
  const clean = Array.isArray(history)
    ? history.filter(h => h && typeof h === 'object' && h.weekKey && h.exercises)
    : [];
  if (!snapshot || !snapshot.weekKey || !snapshot.exercises || Object.keys(snapshot.exercises).length === 0) {
    return clean.slice(-maxWeeks);
  }
  const withoutSameWeek = clean.filter(h => h.weekKey !== snapshot.weekKey);
  const merged = [...withoutSameWeek, snapshot].sort((a, b) => {
    const wkCmp = String(a.weekKey || '').localeCompare(String(b.weekKey || ''));
    if (wkCmp !== 0) return wkCmp;
    return String(a.archivedAt || '').localeCompare(String(b.archivedAt || ''));
  });
  return merged.slice(-maxWeeks);
}

export function isCardioExerciseKey(exKey, workoutCourse = null) {
  const raw = String(exKey || '').toLowerCase();
  if (!raw) return true;
  if (
    classifyExerciseTier({ englishName: raw, name: raw }) === 'cardio' ||
    raw.includes('cardio') || raw.includes('کاردیۆ') || raw.includes('تەرمیل') ||
    raw.includes('پاسکیل') || raw.includes('ڕۆیشتن') || raw.includes('كارديو')
  ) {
    return true;
  }
  if (workoutCourse && Array.isArray(workoutCourse.weeklyPlan)) {
    for (const day of workoutCourse.weeklyPlan) {
      for (const ex of (day?.exercises || [])) {
        const keyA = String(ex?.englishName || ex?.name || '').toLowerCase();
        const keyB = String(ex?.name || '').toLowerCase();
        if ((keyA === raw || keyB === raw) && classifyExerciseTier(ex) === 'cardio') {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Detects non-cardio exercises with zero progression in maxWeight, totalReps, or e1RM
 * over 2–3 consecutive non-deload weeks.
 */
export function detectExercisePlateaus(exerciseLogHistory = [], options = {}) {
  const workoutCourse = options?.workoutCourse || null;
  const minWeeks = Math.max(2, Number(options?.minWeeks) || 2);

  if (!Array.isArray(exerciseLogHistory) || exerciseLogHistory.length < minWeeks) {
    return {};
  }

  const nonDeloadSnapshots = [...exerciseLogHistory]
    .filter(h => h && typeof h === 'object' && !h.isDeload && h.exercises && typeof h.exercises === 'object')
    .sort((a, b) => {
      const wkCmp = String(a.weekKey || '').localeCompare(String(b.weekKey || ''));
      if (wkCmp !== 0) return wkCmp;
      return String(a.archivedAt || '').localeCompare(String(b.archivedAt || ''));
    });

  if (nonDeloadSnapshots.length < minWeeks) return {};

  const latestExercises = Object.keys(nonDeloadSnapshots[nonDeloadSnapshots.length - 1].exercises || {});
  const plateaus = {};

  for (const exKey of latestExercises) {
    if (isCardioExerciseKey(exKey, workoutCourse)) continue;

    // Gather consecutive trailing non-deload weeks ending at the most recent non-deload snapshot
    const trailingLogs = [];
    for (let i = nonDeloadSnapshots.length - 1; i >= 0; i--) {
      const snap = nonDeloadSnapshots[i];
      const entry = snap.exercises?.[exKey];
      if (!entry || ((Number(entry.maxWeight) || 0) <= 0 && (Number(entry.totalReps) || 0) <= 0 && (Number(entry.e1RM) || 0) <= 0)) {
        break;
      }
      trailingLogs.unshift({
        weekKey: snap.weekKey,
        maxWeight: Number(entry.maxWeight) || 0,
        totalReps: Number(entry.totalReps) || 0,
        e1RM: Number(entry.e1RM) || 0
      });
    }

    if (trailingLogs.length < minWeeks) continue;

    let stallStartIdx = 0;
    for (let i = 1; i < trailingLogs.length; i++) {
      const curr = trailingLogs[i];
      const windowSlice = trailingLogs.slice(stallStartIdx, i);
      const bestPriorW = Math.max(...windowSlice.map(x => x.maxWeight));
      const bestPriorR = Math.max(...windowSlice.map(x => x.totalReps));
      const bestPriorE = Math.max(...windowSlice.map(x => x.e1RM));

      const hasProgressed = (
        curr.maxWeight > bestPriorW + 0.01 ||
        curr.totalReps > bestPriorR + 0.01 ||
        curr.e1RM > bestPriorE + 0.05
      );
      if (hasProgressed) {
        stallStartIdx = i;
      }
    }

    const stalledWeeks = trailingLogs.length - stallStartIdx;
    if (stalledWeeks >= minWeeks) {
      const latest = trailingLogs[trailingLogs.length - 1];
      plateaus[exKey] = {
        exKey,
        stalledWeeks,
        maxWeight: latest.maxWeight,
        totalReps: latest.totalReps,
        e1RM: latest.e1RM,
        weekKeys: trailingLogs.slice(stallStartIdx).map(x => x.weekKey)
      };
    }
  }

  return plateaus;
}

/**
 * Generates dynamic lifecycle & daily status notifications with real unread state tracking.
 */
export function generateLifecycleNotifications({
  workoutCourse = null,
  lifecycle = null,
  isDeloadActive = false,
  plateaus = {},
  readNotificationIds = [],
  waterMl = 0,
  waterGoalMl = 3000,
  totalEatenCalories = 0,
  calorieGoal = 2200,
  lang = 'ku'
} = {}) {
  const readSet = new Set(Array.isArray(readNotificationIds) ? readNotificationIds : []);
  const items = [];
  const isEn = lang === 'en';
  const currentWeek = lifecycle?.currentWeek || 1;
  const courseKey = String(workoutCourse?.id || 'active');

  // ١. ئاگاداری هەفتەی دیڵۆد (Week 5 / Week 10)
  if (lifecycle?.hasCourse && (currentWeek === 5 || currentWeek === 10)) {
    const id = `deload_${courseKey}_w${currentWeek}`;
    items.push({
      id,
      type: 'deload',
      iconName: 'battery',
      time: isEn ? `Week ${currentWeek}` : `هەفتەی ${currentWeek}`,
      title: isEn
        ? `Week ${currentWeek} Scheduled Deload`
        : `هەفتەی ${currentWeek}: کاتی دیڵۆدە (Deload Week)`,
      desc: isDeloadActive
        ? (isEn ? 'Deload Mode is active (-40% sets, RIR 3–4) for full joint & CNS recovery.' : 'دۆخی دیڵۆد چالاکە (سێتەکان ٤٠٪ کەمکراونەتەوە، RIR 3–4) بۆ چاکبوونەوەی جومگە و کۆئەندامی دەمار.')
        : (isEn ? 'After 4 weeks of overload, activate Deload Mode in Workout tab (-40% sets, RIR 3–4).' : 'دوای ٤ هەفتەی چڕ، دۆخی دیڵۆد لە بەشی ڕاهێنان چالاک بکە (کەمکردنەوەی ٤٠٪ ی سێتەکان، RIR 3–4).'),
      actionType: 'OPEN_WORKOUT',
      unread: !readSet.has(id)
    });
  }

  // ٢. ئاگاداری نوێکردنەوەی کۆرس (Week 8-12)
  if (lifecycle?.hasCourse && currentWeek >= 8) {
    const milestone = currentWeek >= 10 ? 10 : 8;
    const id = `renewal_${courseKey}_w${milestone}`;
    items.push({
      id,
      type: 'renewal',
      iconName: 'refresh',
      time: isEn ? `Week ${currentWeek} of 10` : `هەفتەی ${currentWeek} لە ١٠`,
      title: isEn
        ? 'Time to Scan Physique & Renew Course'
        : 'کاتی سکانی نوێی جەستە و گۆڕینی کۆرسە!',
      desc: isEn
        ? `Your workout course reached Week ${currentWeek}. Take new 3-angle physique photos and generate a fresh mesocycle.`
        : `کۆرسەکەت گەیشتووەتە هەفتەی ${currentWeek}. لەشت خۆی گونجاندووە؛ وێنەی نوێی جەستە بگرە و کۆرسێکی تازە دروست بکە.`,
      actionType: 'OPEN_WORKOUT',
      unread: !readSet.has(id)
    });
  }

  // ٣. ئاگاداری وەستانی گەشە (Plateau Alerts)
  const plateauEntries = Object.values(plateaus || {});
  plateauEntries.slice(0, 3).forEach((p) => {
    const id = `plateau_${courseKey}_${p.exKey}_w${p.stalledWeeks}`;
    items.push({
      id,
      type: 'plateau',
      iconName: 'alert',
      time: isEn ? `${p.stalledWeeks} weeks flat` : `${p.stalledWeeks} هەفتە جێگیر`,
      title: isEn
        ? `Plateau Detected: ${p.exKey}`
        : `وەستانی گەشە (Plateau): ${p.exKey}`,
      desc: isEn
        ? `No weight, rep, or e1RM increase across ${p.stalledWeeks} consecutive weeks. Consider swapping this exercise in your workout.`
        : `بۆ ماوەی ${p.stalledWeeks} هەفتەی لەدوای یەک کێش و تەکرارت زیادی نەکردووە. پێشنیار دەکرێت لە لیستی ڕاهێنان بیگۆڕیت.`,
      actionType: 'OPEN_WORKOUT',
      unread: !readSet.has(id)
    });
  });

  // ٤. ئاگاداری ڕاستەقینەی ئاو و کالۆری (تەنها لەسەر داتای زیندووی ئەمڕۆ)
  const safeWaterGoal = Math.max(1000, Number(waterGoalMl) || 3000);
  if (waterMl < safeWaterGoal) {
    const remainingWater = Math.max(0, safeWaterGoal - Number(waterMl || 0));
    const id = `hydration_${Math.floor((waterMl || 0) / 500)}`;
    items.push({
      id,
      type: 'hydration',
      iconName: 'droplet',
      time: isEn ? 'Today' : 'ئەمڕۆ',
      title: isEn ? 'Daily Hydration Reminder' : 'ئاو خواردنەوەی ئەمڕۆ',
      desc: isEn
        ? `Logged ${waterMl} ml out of ${safeWaterGoal} ml goal (${remainingWater} ml left).`
        : `ئامانجی ئەمڕۆ ${safeWaterGoal} مللە، تا ئێستا ${waterMl} مللت خواردووەتەوە (${remainingWater} مل ماوە).`,
      actionType: 'OPEN_HOME',
      unread: !readSet.has(id)
    });
  }

  const safeCalGoal = Math.max(1000, Number(calorieGoal) || 2200);
  if (totalEatenCalories < safeCalGoal) {
    const remainingCals = Math.max(0, safeCalGoal - Number(totalEatenCalories || 0));
    const id = `calories_${new Date().toISOString().slice(0, 10)}`;
    items.push({
      id,
      type: 'calories',
      iconName: 'target',
      time: isEn ? 'Today' : 'ئەمڕۆ',
      title: isEn ? 'Daily Calorie Target' : 'کالۆری و خۆراکی ئەمڕۆ',
      desc: isEn
        ? `${remainingCals} kcal remaining to hit today's ${safeCalGoal} kcal target.`
        : `تەنها ${remainingCals} کالۆری ماوە بۆ گەیشتن بە ئامانجی ${safeCalGoal} کالۆری ئەمڕۆ.`,
      actionType: 'OPEN_HOME',
      unread: !readSet.has(id)
    });
  }

  return items;
}

// ==================== حیسابی دینامیکی کالۆری سووتاو، سکانی خواردن، ریسێتی ڕۆژانە، کوردیی دایت، و تۆماری کێش ====================

/**
 * Dynamically calculates workout session calories burned from athlete weight, working sets, compounds, and cardio minutes.
 */
export function calculateWorkoutBurnedCalories({ day, weight = 75, pace = 'normal', restSeconds = 90 } = {}) {
  const exercises = Array.isArray(day?.exercises) ? day.exercises : [];
  if (day?.isRestDay || exercises.length === 0) return 0;

  const weightKg = Math.max(40, Number(weight) || 75);
  let liftingSets = 0;
  let hasHeavyLower = false;
  let cardioMinutes = 0;

  for (const ex of exercises) {
    if (!ex) continue;
    const tier = classifyExerciseTier(ex);
    if (tier === 'cardio') {
      const parsedMin = parseInt(String(ex.reps || '').match(/\d+/)?.[0] || '20', 10);
      cardioMinutes += Math.min(90, Math.max(5, Number.isFinite(parsedMin) ? parsedMin : 20));
    } else {
      const sets = Math.min(8, Math.max(1, Number(ex.sets) || 4));
      liftingSets += sets;
      const en = String(ex.englishName || ex.canonicalName || ex.name || '').toLowerCase();
      if (en.includes('squat') || en.includes('deadlift') || en.includes('leg press') || en.includes('hip thrust') || en.includes('lunge')) {
        hasHeavyLower = true;
      }
    }
  }

  const paceFactor = pace === 'slow' ? 0.94 : pace === 'fast' ? 1.08 : pace === 'very_fast' ? 1.14 : 1.0;
  const restMinutesAdj = Number(restSeconds) > 120 ? 0.25 : 0;
  const liftingActiveMins = liftingSets > 0 ? (liftingSets * (2.25 + restMinutesAdj) + 5) : 0;
  const liftingMet = hasHeavyLower ? 5.6 : 4.9;
  const liftingBurn = weightKg * (liftingActiveMins / 60) * liftingMet;
  const cardioBurn = cardioMinutes > 0 ? weightKg * (cardioMinutes / 60) * 5.8 : 0;

  return Math.max(110, Math.round((liftingBurn + cardioBurn) * paceFactor));
}

/**
 * Converts energy values between kcal and kJ.
 */
export function convertEnergyValue(kcal, unit = 'kcal') {
  const num = Math.max(0, Number(kcal) || 0);
  if (unit === 'kJ') return Math.round(num * 4.184);
  return Math.round(num);
}

/**
 * Computes exact scaled calories and macros for a given gram weight from per-100g nutritional bases.
 */
export function computeMacrosForGrams(item, grams) {
  const safeGrams = Math.max(0, Number(grams) || 0);
  const ratio = safeGrams / 100;
  const c100 = Number(item?.baseCaloriesPer100g ?? item?.baseCalories) || 0;
  const p100 = Number(item?.baseProteinPer100g ?? item?.baseProtein) || 0;
  const cb100 = Number(item?.baseCarbsPer100g ?? item?.baseCarbs) || 0;
  const f100 = Number(item?.baseFatPer100g ?? item?.baseFat) || 0;

  return {
    grams: Math.round(safeGrams),
    calories: Math.round(c100 * ratio),
    protein: Math.round(p100 * ratio * 10) / 10,
    carbs: Math.round(cb100 * ratio * 10) / 10,
    fat: Math.round(f100 * ratio * 10) / 10
  };
}

/**
 * Normalizes single-item and multi-item AI Camera Food Scanner outputs without dividing per-100g values by 150.
 */
export function normalizeFoodScanResult(rawScan) {
  if (!rawScan || rawScan.isFood === false) {
    return {
      isFood: false,
      message: rawScan?.message || 'ئەم وێنەیە خواردن نییە',
      isMultiItem: false,
      items: [],
      totalWeightGrams: 0,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    };
  }

  const toNum = (v, fallback = 0) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const match = v.match(/[0-9.]+/);
      if (match) {
        const n = parseFloat(match[0]);
        if (Number.isFinite(n)) return n;
      }
    }
    return fallback;
  };

  const rawItems = Array.isArray(rawScan.items) && rawScan.items.length > 0
    ? rawScan.items
    : [{
        name: rawScan.name || 'خواردنی سکانکراو',
        englishName: rawScan.englishName || rawScan.name || 'Scanned Food',
        icon: rawScan.icon || '🍽️',
        isLiquid: Boolean(rawScan.isLiquid),
        portionLabel: rawScan.portionLabel || rawScan.portionDescription || '',
        estimatedWeightGrams: rawScan.estimatedWeightGrams ?? rawScan.standardWeight ?? rawScan.estimatedWeight ?? rawScan.portionWeight ?? rawScan.weight,
        baseCaloriesPer100g: rawScan.baseCaloriesPer100g ?? rawScan.baseCalories,
        baseProteinPer100g: rawScan.baseProteinPer100g ?? rawScan.baseProtein,
        baseCarbsPer100g: rawScan.baseCarbsPer100g ?? rawScan.baseCarbs,
        baseFatPer100g: rawScan.baseFatPer100g ?? rawScan.baseFat,
        totalCalories: rawScan.totalCalories ?? rawScan.scannedCalories ?? rawScan.calories,
        totalProtein: rawScan.totalProtein ?? rawScan.scannedProtein ?? rawScan.proteinNum ?? rawScan.protein,
        totalCarbs: rawScan.totalCarbs ?? rawScan.scannedCarbs ?? rawScan.carbsNum ?? rawScan.carbs,
        totalFat: rawScan.totalFat ?? rawScan.scannedFat ?? rawScan.fatNum ?? rawScan.fat
      }];

  const normalizedItems = rawItems.map((it, idx) => {
    const grams = Math.max(1, Math.round(toNum(it.estimatedWeightGrams ?? it.standardWeight ?? it.weightGrams ?? it.weight, 150)));
    const hasCal100 = (it.baseCaloriesPer100g !== undefined && it.baseCaloriesPer100g !== null) || (it.baseCalories !== undefined && it.baseCalories !== null);
    const hasProt100 = (it.baseProteinPer100g !== undefined && it.baseProteinPer100g !== null) || (it.baseProtein !== undefined && it.baseProtein !== null);
    const hasCarb100 = (it.baseCarbsPer100g !== undefined && it.baseCarbsPer100g !== null) || (it.baseCarbs !== undefined && it.baseCarbs !== null);
    const hasFat100 = (it.baseFatPer100g !== undefined && it.baseFatPer100g !== null) || (it.baseFat !== undefined && it.baseFat !== null);

    const cal100 = hasCal100
      ? toNum(it.baseCaloriesPer100g ?? it.baseCalories, 150)
      : Math.round((toNum(it.totalCalories ?? it.scannedCalories ?? it.calories, 200) / grams) * 100);
    const prot100 = hasProt100
      ? Math.round(toNum(it.baseProteinPer100g ?? it.baseProtein, 10) * 10) / 10
      : Math.round((toNum(it.totalProtein ?? it.scannedProtein ?? it.proteinNum ?? it.protein, 10) / grams) * 1000) / 10;
    const carb100 = hasCarb100
      ? Math.round(toNum(it.baseCarbsPer100g ?? it.baseCarbs, 20) * 10) / 10
      : Math.round((toNum(it.totalCarbs ?? it.scannedCarbs ?? it.carbsNum ?? it.carbs, 20) / grams) * 1000) / 10;
    const fat100 = hasFat100
      ? Math.round(toNum(it.baseFatPer100g ?? it.baseFat, 5) * 10) / 10
      : Math.round((toNum(it.totalFat ?? it.scannedFat ?? it.fatNum ?? it.fat, 5) / grams) * 1000) / 10;

    const scaled = computeMacrosForGrams({
      baseCaloriesPer100g: cal100,
      baseProteinPer100g: prot100,
      baseCarbsPer100g: carb100,
      baseFatPer100g: fat100
    }, grams);

    return {
      id: `scan_item_${Date.now()}_${idx}`,
      name: it.name || 'خواردنی سکانکراو',
      englishName: it.englishName || it.name || 'Scanned Food',
      icon: it.icon || rawScan.icon || '🍽️',
      isLiquid: Boolean(it.isLiquid || rawScan.isLiquid),
      portionLabel: it.portionLabel || `١ پۆرشن (~${grams} ${it.isLiquid ? 'مل' : 'گرام'})`,
      estimatedWeightGrams: grams,
      baseCaloriesPer100g: Math.max(0, cal100),
      baseProteinPer100g: Math.max(0, prot100),
      baseCarbsPer100g: Math.max(0, carb100),
      baseFatPer100g: Math.max(0, fat100),
      totalCalories: scaled.calories,
      totalProtein: scaled.protein,
      totalCarbs: scaled.carbs,
      totalFat: scaled.fat
    };
  });

  const totalWeightGrams = normalizedItems.reduce((acc, i) => acc + i.estimatedWeightGrams, 0);
  const totalCalories = Math.round(normalizedItems.reduce((acc, i) => acc + i.totalCalories, 0));
  const totalProtein = Math.round(normalizedItems.reduce((acc, i) => acc + i.totalProtein, 0) * 10) / 10;
  const totalCarbs = Math.round(normalizedItems.reduce((acc, i) => acc + i.totalCarbs, 0) * 10) / 10;
  const totalFat = Math.round(normalizedItems.reduce((acc, i) => acc + i.totalFat, 0) * 10) / 10;

  return {
    isFood: true,
    isMultiItem: normalizedItems.length > 1,
    mealName: rawScan.mealName || rawScan.name || normalizedItems.map(i => i.name).join(' + '),
    portionLabel: rawScan.portionLabel || normalizedItems[0]?.portionLabel || '',
    items: normalizedItems,
    totalWeightGrams,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat
  };
}

/**
 * Reconciles AI Physique Vision recommended calories and protein under ISSN & Eric Helms safety rules.
 */
export function reconcilePhysiqueNutritionTargets(profile = {}, analysisResult = {}) {
  const weight = Math.max(35, Number(profile?.weight) || 75);
  const targetWeight = Number(profile?.targetWeight) > 0 ? Number(profile.targetWeight) : weight;
  const gender = profile?.gender || 'male';
  const bodyFatPercentage = analysisResult?.bodyFatPercentage ?? profile?.physiqueAnalysis?.bodyFatPercentage ?? null;

  const { bmr, bmrEquation, leanBodyMassKg } = computeScientificBmr({
    weight,
    height: profile?.height || 175,
    age: profile?.age || 23,
    gender,
    bodyFatPercentage
  });

  const baseCalc = calculateScientificGoalByAi({
    ...profile,
    physiqueAnalysis: { ...analysisResult, bodyFatPercentage }
  });

  const rawAiCals = Number(analysisResult?.recommendedCalories);
  const safeCalories = rawAiCals > 0
    ? applyCalorieSafetyFloor(rawAiCals, { bmr, gender })
    : baseCalc.goalCalories;

  const isCut = targetWeight < weight;
  const refKg = leanBodyMassKg || weight;
  const minProt = Math.round(refKg * (isCut ? 2.2 : 1.8));
  const rawAiProt = Number(analysisResult?.recommendedProtein);
  const safeProtein = rawAiProt >= 40
    ? Math.max(minProt, Math.round(rawAiProt))
    : baseCalc.goalProtein;

  const minFatFloor = Math.round(weight * 0.6);
  const targetFatPct = isCut ? 0.23 : 0.25;
  const safeFat = Math.max(minFatFloor, Math.round((safeCalories * targetFatPct) / 9));
  const safeCarbs = Math.max(50, Math.round((safeCalories - (safeProtein * 4) - (safeFat * 9)) / 4));
  const safeFiber = Math.max(20, Math.round((safeCalories / 1000) * 12));

  return {
    goalCalories: safeCalories,
    goalProtein: safeProtein,
    goalFat: safeFat,
    goalCarbs: safeCarbs,
    goalFiber: safeFiber,
    goalWaterMl: baseCalc.goalWaterMl,
    bmr,
    bmrEquation,
    leanBodyMassKg
  };
}

/**
 * Applies a macro formula preset while protecting scientific g/kg Protein & >= 0.6 g/kg Fat floors.
 */
export function applyProtectedMacroSplit(profile = {}, formulaId = 'high_protein') {
  const splits = {
    high_protein: { c: 0.40, p: 0.30, f: 0.30 },
    bulking: { c: 0.50, p: 0.25, f: 0.25 },
    cutting: { c: 0.35, p: 0.40, f: 0.25 },
    balanced: { c: 0.45, p: 0.25, f: 0.30 }
  };
  const ratio = splits[formulaId] || splits.balanced;
  const cals = Math.max(1250, Number(profile?.goalCalories) || 2200);
  const weight = Math.max(35, Number(profile?.weight) || 75);
  const targetWeight = Number(profile?.targetWeight) > 0 ? Number(profile.targetWeight) : weight;
  const isCut = targetWeight < weight;
  const bf = Number(profile?.physiqueAnalysis?.bodyFatPercentage);
  const refWeight = (Number.isFinite(bf) && bf >= 3 && bf <= 60) ? (weight * (1 - bf / 100)) : weight;

  const minProteinFloor = Math.round(refWeight * (isCut ? 2.2 : 1.8));
  const minFatFloor = Math.round(weight * 0.6);

  const rawProtein = Math.round((cals * ratio.p) / 4);
  const rawFat = Math.round((cals * ratio.f) / 9);
  const goalProtein = Math.max(minProteinFloor, rawProtein);
  const goalFat = Math.max(minFatFloor, rawFat);
  const goalCarbs = Math.max(50, Math.round((cals - (goalProtein * 4) - (goalFat * 9)) / 4));
  const goalFiber = Math.max(20, Math.round((cals / 1000) * 12));

  return { goalProtein, goalFat, goalCarbs, goalFiber };
}

/**
 * Returns local calendar date string 'YYYY-MM-DD'.
 */
export function getLocalDateKey(d = new Date()) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Performs Daily Reset on date roll-over: archives consumed calories/macros/water into 30-day history,
 * resets waterMl to 0, and resets isEaten flags on all dietMeals.
 */
export function runDailyNutritionReset({
  savedDateKey,
  todayDateKey,
  dietMeals = [],
  waterMl = 0,
  existingHistory = [],
  targetCalories = 2200,
  maxDays = 30
} = {}) {
  if (!savedDateKey || !todayDateKey || savedDateKey === todayDateKey) {
    return {
      didReset: false,
      nextDateKey: todayDateKey || savedDateKey,
      nextDietMeals: dietMeals,
      nextWaterMl: waterMl,
      nextHistory: Array.isArray(existingHistory) ? existingHistory : []
    };
  }

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  const eatenItemsSummary = [];

  const safeMeals = Array.isArray(dietMeals) && dietMeals.length === 7
    ? dietMeals
    : Array(7).fill(null).map(() => ({ breakfast: [], lunch: [], snack: [], dinner: [] }));

  const nextDietMeals = safeMeals.map((dayObj) => {
    const cleanDay = {};
    ['breakfast', 'lunch', 'snack', 'dinner'].forEach((mType) => {
      const list = Array.isArray(dayObj?.[mType]) ? dayObj[mType] : [];
      cleanDay[mType] = list.map((item) => {
        if (item && item.isEaten) {
          calories += Number(item.calories) || 0;
          protein += Number(item.protein) || 0;
          carbs += Number(item.carbs) || 0;
          fat += Number(item.fat) || 0;
          eatenItemsSummary.push({
            name: item.name,
            englishName: item.englishName || item.name,
            calories: Number(item.calories) || 0,
            mealType: mType
          });
        }
        return { ...item, isEaten: false };
      });
    });
    return cleanDay;
  });

  const cleanHist = Array.isArray(existingHistory)
    ? existingHistory.filter(h => h && typeof h === 'object' && h.date && h.date !== savedDateKey)
    : [];

  let nextHistory = cleanHist;
  if (calories > 0 || (Number(waterMl) || 0) > 0) {
    const archiveEntry = {
      date: savedDateKey,
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      waterMl: Math.max(0, Math.round(Number(waterMl) || 0)),
      targetCalories: Number(targetCalories) || 2200,
      items: eatenItemsSummary
    };
    nextHistory = [archiveEntry, ...cleanHist]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, maxDays);
  }

  return {
    didReset: true,
    nextDateKey: todayDateKey,
    nextDietMeals,
    nextWaterMl: 0,
    nextHistory
  };
}

const ALLERGY_SYNONYM_GROUPS = [
  ['ماسی', 'سلمۆن', 'تۆنە', 'قزل', 'سمك', 'fish', 'salmon', 'tuna', 'trout', 'seafood'],
  ['هێلکە', 'ئۆملێت', 'بيض', 'egg', 'eggs', 'omelet'],
  ['شیر', 'ماست', 'پەنیر', 'دۆ', 'شیرەمەنی', 'لبن', 'حليب', 'جبن', 'dairy', 'milk', 'yogurt', 'cheese', 'lactose'],
  ['گوێز', 'بادەم', 'فستق', 'چەرەزات', 'عەلی بابا', 'مكسرات', 'لوز', 'جوز', 'nut', 'nuts', 'almond', 'walnut', 'peanut'],
  ['شۆڤان', 'oat', 'oats', 'oatmeal'],
  ['نان', 'گەنم', 'گلوتین', 'سەمون', 'خبز', 'قمح', 'gluten', 'wheat', 'bread'],
  ['مریشک', 'سنگی مریشک', 'دجاج', 'chicken'],
  ['گۆشت', 'گۆشتی سوور', 'قیمە', 'کەباب', 'لحم', 'beef', 'lamb', 'red meat']
];

export function doesFoodMatchExcluded(food, excludedTerms = []) {
  if (!food || excludedTerms.length === 0) return false;
  const haystack = `${food.name || ''} ${food.englishName || ''} ${(food.aliases || []).join(' ')}`.toLowerCase();
  for (const term of excludedTerms) {
    if (haystack.includes(term)) return true;
    for (const grp of ALLERGY_SYNONYM_GROUPS) {
      if (grp.some(g => g === term || term.includes(g) || g.includes(term))) {
        if (grp.some(g => haystack.includes(g))) return true;
      }
    }
  }
  return false;
}

export function parseAllergiesList(allergiesOrDislikes = '') {
  if (Array.isArray(allergiesOrDislikes)) {
    return allergiesOrDislikes.map(x => String(x || '').trim().toLowerCase()).filter(Boolean);
  }
  return String(allergiesOrDislikes || '')
    .split(/[,،\n;|/]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

const KURDISH_STAPLE_REPLACEMENTS = {
  breakfast: [
    { id: 'kr_bf_eggs', name: 'هێلکەی کوڵاو', englishName: 'Boiled Eggs', calories: 210, protein: 18, carbs: 2, fat: 15, quantity: 3, unit: 'دانە', isEaten: false },
    { id: 'kr_bf_cheese', name: 'پەنیری سپی کەم خوێ بە سەوزە', englishName: 'Low Salt White Cheese & Veggies', calories: 170, protein: 14, carbs: 6, fat: 9, quantity: 90, unit: 'گرام', isEaten: false },
    { id: 'kr_bf_yogurt', name: 'ماستی ماڵەوەی کوردی بە خەیار', englishName: 'Homemade Kurdish Yogurt', calories: 140, protein: 11, carbs: 10, fat: 6, quantity: 200, unit: 'گرام', isEaten: false },
    { id: 'kr_bf_beans', name: 'باقلاو نۆکی کوڵاو بە لیمۆ', englishName: 'Boiled Chickpeas & Lemon', calories: 210, protein: 11, carbs: 34, fat: 3, quantity: 1, unit: 'قاپ', isEaten: false }
  ],
  lunch: [
    { id: 'kr_ln_chicken', name: 'سنگی مریشکی برژاو', englishName: 'Grilled Chicken Breast', calories: 330, protein: 62, carbs: 0, fat: 7, quantity: 200, unit: 'گرام', isEaten: false },
    { id: 'kr_ln_beef', name: 'گۆشتی سووری نەرمەی برژاو', englishName: 'Lean Grilled Beef', calories: 350, protein: 46, carbs: 0, fat: 16, quantity: 180, unit: 'گرام', isEaten: false },
    { id: 'kr_ln_rice', name: 'برنجی سپی کوردی کەم چەوری', englishName: 'Kurdish White Rice', calories: 280, protein: 5.5, carbs: 60, fat: 2, quantity: 200, unit: 'گرام', isEaten: false },
    { id: 'kr_ln_sawar', name: 'ساواری کوردی بە زەیتی زەیتوون', englishName: 'Kurdish Bulgur Pilaf', calories: 260, protein: 9, carbs: 50, fat: 3.5, quantity: 200, unit: 'گرام', isEaten: false },
    { id: 'kr_ln_fasolia', name: 'فاسۆلیای کوردی بە گۆشت', englishName: 'Kurdish White Bean Stew', calories: 320, protein: 24, carbs: 36, fat: 8, quantity: 250, unit: 'گرام', isEaten: false }
  ],
  snack: [
    { id: 'kr_sn_fruit', name: 'مۆز و سێوی فرێش', englishName: 'Banana & Apple', calories: 160, protein: 2, carbs: 40, fat: 0.5, quantity: 2, unit: 'دانە', isEaten: false },
    { id: 'kr_sn_lentil', name: 'نیسکێنە / شۆربای نیسک', englishName: 'Red Lentil Soup', calories: 210, protein: 16, carbs: 34, fat: 1, quantity: 250, unit: 'گرام', isEaten: false },
    { id: 'kr_sn_eggs', name: 'سپێنەی هێلکەی کوڵاو', englishName: 'Boiled Egg Whites', calories: 110, protein: 22, carbs: 1.5, fat: 0.5, quantity: 4, unit: 'دانە', isEaten: false }
  ],
  dinner: [
    { id: 'kr_dn_chicken', name: 'سنگی مریشکی برژاو بە زەڵاتە', englishName: 'Grilled Chicken & Green Salad', calories: 310, protein: 54, carbs: 8, fat: 6, quantity: 180, unit: 'گرام', isEaten: false },
    { id: 'kr_dn_beef', name: 'تاوەی کوردی گۆشتی سوور و سەوزە', englishName: 'Kurdish Beef Tawa & Veggies', calories: 340, protein: 34, carbs: 16, fat: 14, quantity: 220, unit: 'گرام', isEaten: false },
    { id: 'kr_dn_potato', name: 'پەتاتەی کوڵاو بە مەعدەنووس و لیمۆ', englishName: 'Boiled Potato & Herbs', calories: 190, protein: 4, carbs: 42, fat: 1, quantity: 220, unit: 'گرام', isEaten: false }
  ]
};

function scaleMealItem(item, scaleFactor) {
  const f = Math.max(0.35, Math.min(3.5, Number(scaleFactor) || 1));
  const rawQty = Number(item.quantity) || 1;
  const isGram = item.unit === 'گرام' || item.unit === 'مل' || item.unit === 'g' || item.unit === 'ml' || rawQty >= 30;
  const scaledQty = isGram
    ? Math.max(10, Math.round((rawQty * f) / 5) * 5)
    : Math.max(0.5, Math.round(rawQty * f * 2) / 2);
  const effectiveFactor = rawQty > 0 ? (scaledQty / rawQty) : f;

  return {
    ...item,
    quantity: scaledQty,
    calories: Math.max(10, Math.round((Number(item.calories) || 0) * effectiveFactor)),
    protein: Math.round((Number(item.protein) || 0) * effectiveFactor * 10) / 10,
    carbs: Math.round((Number(item.carbs) || 0) * effectiveFactor * 10) / 10,
    fat: Math.round((Number(item.fat) || 0) * effectiveFactor * 10) / 10,
    isEaten: false
  };
}

/**
 * Offline functional 7-day Kurdish meal plan generator scaled cleanly to goalCalories, goalProtein, dietType & exclusions.
 */
export function buildScaledOfflineKurdishDiet({
  goalCalories = 2200,
  goalProtein = 160,
  dietType = 'balanced',
  allergiesOrDislikes = ''
} = {}) {
  const targetCals = Math.max(1200, Number(goalCalories) || 2200);
  const targetProt = Math.max(70, Number(goalProtein) || 150);
  const excludedTerms = parseAllergiesList(allergiesOrDislikes);
  const isKeto = dietType === 'keto';
  const isHighProtein = dietType === 'high_protein' || (targetProt * 4) / targetCals >= 0.30;

  return DEFAULT_7_DAY_DIET.map((dayTemplate, dIdx) => {
    const dayMeals = {};

    ['breakfast', 'lunch', 'snack', 'dinner'].forEach((mType) => {
      const slotItems = Array.isArray(dayTemplate[mType]) ? dayTemplate[mType] : [];
      const cleanedSlot = [];

      slotItems.forEach((rawItem, idx) => {
        let item = { ...rawItem, isEaten: false };
        const needsKetoSwap = isKeto && (Number(item.carbs) || 0) > 18;
        if (doesFoodMatchExcluded(item, excludedTerms) || needsKetoSwap) {
          const candidates = (KURDISH_STAPLE_REPLACEMENTS[mType] || []).filter(c => {
            if (doesFoodMatchExcluded(c, excludedTerms)) return false;
            if (isKeto && (Number(c.carbs) || 0) > 12) return false;
            return true;
          });
          const pick = candidates[idx % Math.max(1, candidates.length)] || KURDISH_STAPLE_REPLACEMENTS.lunch[0];
          if (pick && !doesFoodMatchExcluded(pick, excludedTerms)) {
            item = { ...pick, id: `off_${dIdx}_${mType}_${idx}_${Date.now() % 10000}`, isEaten: false };
          } else {
            return;
          }
        }
        cleanedSlot.push(item);
      });

      if (cleanedSlot.length === 0) {
        const safeFallback = (KURDISH_STAPLE_REPLACEMENTS[mType] || KURDISH_STAPLE_REPLACEMENTS.lunch)
          .find(c => !doesFoodMatchExcluded(c, excludedTerms) && (!isKeto || (Number(c.carbs) || 0) <= 12));
        if (safeFallback) {
          cleanedSlot.push({ ...safeFallback, id: `off_fb_${dIdx}_${mType}`, isEaten: false });
        }
      }
      dayMeals[mType] = cleanedSlot;
    });

    // قۆناغی یەکەمی پێوانەکردن: گەیشتن بە کالۆری ئامانج
    const calcDayTotals = (dm) => {
      const all = Object.values(dm).flat();
      return {
        cals: all.reduce((acc, it) => acc + (Number(it.calories) || 0), 0),
        prot: all.reduce((acc, it) => acc + (Number(it.protein) || 0), 0)
      };
    };

    let totals = calcDayTotals(dayMeals);
    if (totals.cals > 0) {
      const firstRatio = targetCals / totals.cals;
      ['breakfast', 'lunch', 'snack', 'dinner'].forEach((mType) => {
        dayMeals[mType] = dayMeals[mType].map((it) => {
          const protShare = (Number(it.calories) > 0) ? ((Number(it.protein) || 0) * 4) / Number(it.calories) : 0;
          const extraBoost = (isHighProtein && protShare >= 0.35) ? 1.15 : 1.0;
          return scaleMealItem(it, firstRatio * extraBoost);
        });
      });
    }

    // قۆناغی دووەمی پێوانەکردن: ئەگەر پڕۆتین کەمتر بێت لە goalProtein، بەشە پڕۆتینیەکان زیاد دەکات و کارب/چەوری هاوسەنگ دەکاتەوە
    totals = calcDayTotals(dayMeals);
    if (totals.prot < targetProt * 0.92 && totals.cals > 0) {
      const protDeficit = targetProt - totals.prot;
      const protItems = [];
      ['lunch', 'dinner', 'breakfast', 'snack'].forEach((mType) => {
        dayMeals[mType].forEach((it) => {
          const protShare = (Number(it.calories) > 0) ? ((Number(it.protein) || 0) * 4) / Number(it.calories) : 0;
          if (protShare >= 0.35) protItems.push(it);
        });
      });
      if (protItems.length > 0) {
        const extraProtCals = protDeficit * 4.5;
        const boostFactor = Math.min(1.85, 1 + (protDeficit / Math.max(20, protItems.reduce((a, i) => a + i.protein, 0))));
        ['breakfast', 'lunch', 'snack', 'dinner'].forEach((mType) => {
          dayMeals[mType] = dayMeals[mType].map((it) => {
            const protShare = (Number(it.calories) > 0) ? ((Number(it.protein) || 0) * 4) / Number(it.calories) : 0;
            if (protShare >= 0.35) {
              return scaleMealItem(it, boostFactor);
            }
            const carbFatShrink = Math.max(0.65, 1 - (extraProtCals / Math.max(400, totals.cals)));
            return scaleMealItem(it, carbFatShrink);
          });
        });
      }
    }

    // قۆناغی کۆتایی: ڕێکخستنەوەی ورد بۆ ئەوەی کۆی گشتی کالۆری ڕۆژەکە بە وردی بگونجێت لەگەڵ goalCalories
    totals = calcDayTotals(dayMeals);
    if (totals.cals > 0 && Math.abs(totals.cals - targetCals) / targetCals > 0.04) {
      const finalRatio = targetCals / totals.cals;
      ['breakfast', 'lunch', 'snack', 'dinner'].forEach((mType) => {
        dayMeals[mType] = dayMeals[mType].map(it => scaleMealItem(it, finalRatio));
      });
    }

    return dayMeals;
  });
}

/**
 * Generates calorie- and macro-matched local Kurdish alternative options to swap a single meal slot cleanly.
 */
export function findSingleMealReplacementCandidates({
  mealType = 'lunch',
  targetCalories = 500,
  targetProtein = 35,
  currentItems = [],
  foodCatalog = [],
  allergiesOrDislikes = ''
} = {}) {
  const excludedTerms = parseAllergiesList(allergiesOrDislikes);
  const currentNames = new Set((currentItems || []).map(i => String(i?.englishName || i?.name || '').toLowerCase().trim()));
  const safeCal = Math.max(150, Number(targetCalories) || 450);

  const presetCombosByMeal = {
    breakfast: [
      {
        label: 'ئۆملێتی هێلکە و تەماتە + نانی تیری',
        items: [
          { name: 'ئۆملێتی هێلکە و تەماتە (مەنمەن)', englishName: 'Scrambled Eggs with Tomatoes', calories: 230, protein: 17, carbs: 6, fat: 14, quantity: 3, unit: 'دانە' },
          { name: 'نانی تیری / هەورامی', englishName: 'Thin Kurdish Flatbread', calories: 190, protein: 6, carbs: 40, fat: 1, quantity: 1, unit: 'نان' }
        ]
      },
      {
        label: 'پەنیری سپی کوردی + هێلکەی کوڵاو + سەمون',
        items: [
          { name: 'پەنیری سپی کەم خوێ بە خەیار و تەماتە', englishName: 'Low Salt White Cheese & Veggies', calories: 165, protein: 13, carbs: 6, fat: 9, quantity: 90, unit: 'گرام' },
          { name: 'هێلکەی کوڵاو', englishName: 'Boiled Eggs', calories: 140, protein: 12, carbs: 1, fat: 10, quantity: 2, unit: 'دانە' },
          { name: 'سەمونی حەجەری', englishName: 'Kurdish Diamond Samoon', calories: 210, protein: 7, carbs: 43, fat: 1, quantity: 1, unit: 'دانە' }
        ]
      },
      {
        label: 'شۆڤان بە شیر و مۆز + سپێنەی هێلکە',
        items: [
          { name: 'شۆڤانی کوڵاو بە شیر و مۆز', englishName: 'Oatmeal with Milk & Banana', calories: 310, protein: 14, carbs: 54, fat: 5, quantity: 1, unit: 'قاپ' },
          { name: 'سپێنەی هێلکەی کوڵاو', englishName: 'Boiled Egg Whites', calories: 95, protein: 20, carbs: 1, fat: 0.5, quantity: 4, unit: 'دانە' }
        ]
      }
    ],
    lunch: [
      {
        label: 'سنگی مریشکی برژاو + ساواری کوردی + زەڵاتە',
        items: [
          { name: 'سنگی مریشکی برژاو', englishName: 'Grilled Chicken Breast', calories: 330, protein: 62, carbs: 0, fat: 7, quantity: 200, unit: 'گرام' },
          { name: 'ساواری کوردی بە زەیتی زەیتوون', englishName: 'Kurdish Bulgur Pilaf', calories: 270, protein: 9, carbs: 54, fat: 4, quantity: 200, unit: 'گرام' },
          { name: 'زەڵاتەی سەوزی وەرزی', englishName: 'Fresh Green Salad', calories: 45, protein: 2, carbs: 8, fat: 1, quantity: 1, unit: 'قاپ' }
        ]
      },
      {
        label: 'کەبابی مریشک (تاووک) + برنجی کوردی + ماست',
        items: [
          { name: 'شیشی مریشک (تاووک)', englishName: 'Chicken Shish Kabab', calories: 290, protein: 38, carbs: 3, fat: 12, quantity: 2, unit: 'شیش' },
          { name: 'برنجی سپی کوردی', englishName: 'Kurdish White Rice', calories: 280, protein: 5.5, carbs: 60, fat: 2, quantity: 200, unit: 'گرام' },
          { name: 'ماستی ماڵەوەی کوردی', englishName: 'Homemade Kurdish Yogurt', calories: 95, protein: 7, carbs: 8, fat: 4, quantity: 150, unit: 'گرام' }
        ]
      },
      {
        label: 'فاسۆلیای کوردی بە گۆشتی نەرمە + برنج',
        items: [
          { name: 'فاسۆلیای کوردی بە گۆشت', englishName: 'White Bean Stew with Meat', calories: 340, protein: 26, carbs: 38, fat: 9, quantity: 260, unit: 'گرام' },
          { name: 'برنجی سپی کوردی', englishName: 'Kurdish White Rice', calories: 280, protein: 5.5, carbs: 60, fat: 2, quantity: 200, unit: 'گرام' }
        ]
      },
      {
        label: 'ماسی مەسکووف / برژاو + پەتاتەی فڕن',
        items: [
          { name: 'ماسی مەسکووفی کوردی', englishName: 'Maskouf Grilled Fish', calories: 360, protein: 44, carbs: 0, fat: 18, quantity: 220, unit: 'گرام' },
          { name: 'پەتاتەی برژاو لە فڕن', englishName: 'Baked Potato Wedges', calories: 220, protein: 4, carbs: 46, fat: 3, quantity: 180, unit: 'گرام' }
        ]
      }
    ],
    snack: [
      {
        label: 'ماستی یۆنانی / ماڵەوە + مۆز',
        items: [
          { name: 'ماستی ماڵەوەی کوردی', englishName: 'Homemade Kurdish Yogurt', calories: 140, protein: 12, carbs: 10, fat: 5, quantity: 200, unit: 'گرام' },
          { name: 'مۆزی فرێش', englishName: 'Fresh Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, quantity: 1, unit: 'دانە' }
        ]
      },
      {
        label: 'وەی پڕۆتین شێک + بادەم',
        items: [
          { name: 'وەی پڕۆتین (Whey Protein)', englishName: 'Whey Protein Shake', calories: 120, protein: 24, carbs: 3, fat: 1.5, quantity: 1, unit: 'سکۆپ' },
          { name: 'بادەمی خاو', englishName: 'Raw Almonds', calories: 115, protein: 4, carbs: 4, fat: 10, quantity: 20, unit: 'گرام' }
        ]
      },
      {
        label: 'نیسکێنەی گەرمی کوردی بە لیمۆ',
        items: [
          { name: 'نیسکێنە / شۆربای نیسک', englishName: 'Red Lentil Soup', calories: 220, protein: 16, carbs: 38, fat: 1, quantity: 250, unit: 'گرام' }
        ]
      }
    ],
    dinner: [
      {
        label: 'تاوەی گۆشتی سووری نەرمە و سەوزە',
        items: [
          { name: 'تاوەی کوردی بە گۆشت و سەوزە', englishName: 'Baked Meat & Veggies Tawa', calories: 350, protein: 32, carbs: 22, fat: 14, quantity: 220, unit: 'گرام' },
          { name: 'زەڵاتەی سەوزی وەرزی', englishName: 'Fresh Green Salad', calories: 45, protein: 2, carbs: 8, fat: 1, quantity: 1, unit: 'قاپ' }
        ]
      },
      {
        label: 'ماسی تونە بە ئاو + پەتاتەی کوڵاو + لیمۆ',
        items: [
          { name: 'ماسی تونەی کەم چەوری (بە ئاو)', englishName: 'Tuna in Water', calories: 185, protein: 41, carbs: 0, fat: 1.5, quantity: 160, unit: 'گرام' },
          { name: 'پەتاتەی کوڵاو', englishName: 'Boiled Potato', calories: 155, protein: 3.5, carbs: 36, fat: 0.2, quantity: 180, unit: 'گرام' }
        ]
      },
      {
        label: 'سنگی مریشکی برژاو + شۆربای نیسک',
        items: [
          { name: 'سنگی مریشکی برژاو', englishName: 'Grilled Chicken Breast', calories: 295, protein: 55, carbs: 0, fat: 6, quantity: 180, unit: 'گرام' },
          { name: 'نیسکێنە / شۆربای نیسک', englishName: 'Red Lentil Soup', calories: 145, protein: 11, carbs: 24, fat: 0.6, quantity: 180, unit: 'گرام' }
        ]
      }
    ]
  };

  const rawCombos = presetCombosByMeal[mealType] || presetCombosByMeal.lunch;
  const results = [];

  for (const combo of rawCombos) {
    if (combo.items.some(it => doesFoodMatchExcluded(it, excludedTerms))) continue;
    // خۆبەدوورگرتن لە هەمان خواردنی سەرەکی ژەمی ئێستا
    const firstKey = String(combo.items[0]?.englishName || combo.items[0]?.name || '').toLowerCase().trim();
    if (currentNames.size > 0 && currentNames.has(firstKey) && rawCombos.length > 2) continue;

    const rawComboCals = combo.items.reduce((a, i) => a + i.calories, 0) || 1;
    const scaleFactor = safeCal / rawComboCals;
    const scaledItems = combo.items.map((it, iIdx) => ({
      ...scaleMealItem(it, scaleFactor),
      id: `swap_${mealType}_${Date.now()}_${results.length}_${iIdx}`
    }));
    const totalCalories = scaledItems.reduce((a, i) => a + i.calories, 0);
    const totalProtein = Math.round(scaledItems.reduce((a, i) => a + i.protein, 0) * 10) / 10;
    const totalCarbs = Math.round(scaledItems.reduce((a, i) => a + i.carbs, 0) * 10) / 10;
    const totalFat = Math.round(scaledItems.reduce((a, i) => a + i.fat, 0) * 10) / 10;

    results.push({
      id: `cand_${mealType}_${results.length}`,
      label: combo.label,
      items: scaledItems,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat
    });
  }

  // ئەگەر هەموو پرێسێتەکان فلتەرکران، لە کەتەلۆگی گشتیی خۆراک جێگرەوەی پارێزراو دروست بکە
  if (results.length === 0 && Array.isArray(foodCatalog) && foodCatalog.length > 0) {
    const safeItems = foodCatalog.filter(f => !doesFoodMatchExcluded(f, excludedTerms) && Number(f.baseCalories) > 40).slice(0, 3);
    safeItems.forEach((f, idx) => {
      const targetGrams = Math.max(80, Math.min(450, Math.round((safeCal / Number(f.baseCalories)) * 100 / 5) * 5));
      const m = computeMacrosForGrams(f, targetGrams);
      results.push({
        id: `cand_cat_${idx}`,
        label: f.name,
        items: [{
          id: `swap_cat_${Date.now()}_${idx}`,
          name: f.name,
          englishName: f.englishName || f.name,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          quantity: targetGrams,
          unit: f.isLiquid ? 'مل' : 'گرام',
          isEaten: false
        }],
        totalCalories: m.calories,
        totalProtein: m.protein,
        totalCarbs: m.carbs,
        totalFat: m.fat
      });
    });
  }

  return results;
}

/**
 * Appends or updates today's weight log entry inside app_weight_history (sorted ascending by date).
 */
export function appendWeightLogEntry(history = [], weightKg, dateIso = new Date().toISOString()) {
  const cleanWeight = Math.round((Number(weightKg) || 0) * 10) / 10;
  if (!Number.isFinite(cleanWeight) || cleanWeight < 25 || cleanWeight > 300) {
    return Array.isArray(history) ? history : [];
  }
  const dayKey = String(dateIso).slice(0, 10);
  const cleanHist = (Array.isArray(history) ? history : [])
    .filter(e => e && typeof e === 'object' && e.date && Number.isFinite(Number(e.weight)))
    .filter(e => String(e.date).slice(0, 10) !== dayKey);

  return [...cleanHist, { date: dateIso, weight: cleanWeight }]
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .slice(-90);
}

/**
 * Detects weight-loss or weight-gain plateau across 14+ days of logs (< 0.2 kg movement toward goal)
 * and recommends an adaptive +/- 200 kcal recalculation.
 */
export function detectWeightPlateauAndAdaptiveTdee({
  weightHistory = [],
  goal = '',
  weight = 75,
  targetWeight = 80,
  goalCalories = 2200,
  bmr = 0,
  gender = 'male',
  minDaysSpan = 14
} = {}) {
  const cleanLogs = (Array.isArray(weightHistory) ? weightHistory : [])
    .filter(e => e && typeof e === 'object' && Number.isFinite(Date.parse(e.date)) && Number(e.weight) > 25)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  if (cleanLogs.length < 2) {
    return { isStalled: false, mode: 'none', daysTracked: 0, netChangeKg: 0, suggestedDelta: 0 };
  }

  const firstMs = Date.parse(cleanLogs[0].date);
  const lastMs = Date.parse(cleanLogs[cleanLogs.length - 1].date);
  const daysTracked = Math.floor((lastMs - firstMs) / (24 * 60 * 60 * 1000));

  if (daysTracked < minDaysSpan) {
    return { isStalled: false, mode: 'none', daysTracked, netChangeKg: 0, suggestedDelta: 0 };
  }

  const goalStr = String(goal || '').toLowerCase();
  const isBulk = Number(targetWeight) > Number(weight) || goalStr.includes('bulk') || goalStr.includes('gain') || goalStr.includes('زیادکردن') || goalStr.includes('گەشە');
  const isCut = !isBulk && (Number(targetWeight) < Number(weight) || goalStr.includes('cut') || goalStr.includes('loss') || goalStr.includes('دابەزاندن') || goalStr.includes('سوتاندن'));

  if (!isBulk && !isCut) {
    return { isStalled: false, mode: 'maintain', daysTracked, netChangeKg: 0, suggestedDelta: 0 };
  }

  // تێکڕای سەرەتا بەراورد بە تێکڕای دوایین هەفتە بۆ نەهێشتنی کاریگەری هەڵکشان و داکشانی ئاوی لەش
  const earlySlice = cleanLogs.slice(0, Math.min(3, Math.floor(cleanLogs.length / 2) || 1));
  const recentCutoffMs = lastMs - (7 * 24 * 60 * 60 * 1000);
  let recentSlice = cleanLogs.filter(e => Date.parse(e.date) >= recentCutoffMs);
  if (recentSlice.length === 0) recentSlice = [cleanLogs[cleanLogs.length - 1]];

  const baselineAvg = Math.round((earlySlice.reduce((a, b) => a + Number(b.weight), 0) / earlySlice.length) * 10) / 10;
  const recentAvg = Math.round((recentSlice.reduce((a, b) => a + Number(b.weight), 0) / recentSlice.length) * 10) / 10;
  const netChangeKg = Math.round((recentAvg - baselineAvg) * 10) / 10;

  if (isBulk) {
    const isStalled = netChangeKg < 0.2;
    const suggestedDelta = isStalled ? 200 : 0;
    return {
      isStalled,
      mode: 'bulk',
      daysTracked,
      baselineAvg,
      recentAvg,
      netChangeKg,
      suggestedDelta,
      nextCalories: (Number(goalCalories) || 2500) + suggestedDelta
    };
  }

  // قۆناغی Cut: پێویستە بەلایەنی کەم 0.2 کگ کێش دابەزیبێت
  const lostKg = baselineAvg - recentAvg;
  const isStalled = lostKg < 0.2;
  const suggestedDelta = isStalled ? -200 : 0;
  const rawNextCals = (Number(goalCalories) || 2000) + suggestedDelta;
  const nextCalories = applyCalorieSafetyFloor(rawNextCals, { bmr, gender });

  return {
    isStalled,
    mode: 'cut',
    daysTracked,
    baselineAvg,
    recentAvg,
    netChangeKg,
    suggestedDelta,
    nextCalories
  };
}

/**
 * Recalculates daily calories & macros cleanly when applying an adaptive +/- 200 kcal step.
 */
export function calculateAdaptiveMacrosFromCalories(profile = {}, nextCalories) {
  const weight = Math.max(35, Number(profile?.weight) || 75);
  const bf = Number(profile?.physiqueAnalysis?.bodyFatPercentage);
  const gender = profile?.gender || 'male';
  const { bmr } = computeScientificBmr({
    weight,
    height: profile?.height || 175,
    age: profile?.age || 23,
    gender,
    bodyFatPercentage: bf
  });

  const safeCalories = applyCalorieSafetyFloor(nextCalories, { bmr, gender });
  const isCut = (Number(profile?.targetWeight) || weight) < weight;
  const refWeight = (Number.isFinite(bf) && bf >= 3 && bf <= 60) ? (weight * (1 - bf / 100)) : weight;
  const goalProtein = Math.max(Math.round(refWeight * (isCut ? 2.2 : 1.8)), Number(profile?.goalProtein) || 140);
  const minFatFloor = Math.round(weight * 0.6);
  const goalFat = Math.max(minFatFloor, Math.round((safeCalories * (isCut ? 0.23 : 0.25)) / 9));
  const goalCarbs = Math.max(50, Math.round((safeCalories - (goalProtein * 4) - (goalFat * 9)) / 4));
  const goalFiber = Math.max(20, Math.round((safeCalories / 1000) * 12));

  return {
    goalCalories: safeCalories,
    goalProtein,
    goalFat,
    goalCarbs,
    goalFiber
  };
}

/**
 * Builds the normalized scientific coach context shared by client-side Gemini coach & backend /api/generate-coach-reply.
 */
export function buildCoachScientificProfile(profile = {}, coachContext = {}) {
  const rawWeightHist = coachContext?.weightHistory ?? profile?.weightHistory ?? [];
  const cleanLogs = (Array.isArray(rawWeightHist) ? rawWeightHist : [])
    .filter(e => e && typeof e === 'object' && Number.isFinite(Date.parse(e.date)) && Number(e.weight) > 25)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .slice(-14);

  let weightHistoryTrend = {
    entriesCount: cleanLogs.length,
    daysSpan: 0,
    startWeightKg: null,
    latestWeightKg: null,
    changeKg: 0,
    recentEntries: cleanLogs.slice(-5).map(e => ({ date: String(e.date).slice(0, 10), weight: Number(e.weight) })),
    summary: 'No weight logs recorded yet'
  };

  if (cleanLogs.length >= 2) {
    const first = cleanLogs[0];
    const last = cleanLogs[cleanLogs.length - 1];
    const daysSpan = Math.max(0, Math.floor((Date.parse(last.date) - Date.parse(first.date)) / (24 * 60 * 60 * 1000)));
    const changeKg = Math.round((Number(last.weight) - Number(first.weight)) * 10) / 10;
    const sign = changeKg > 0 ? '+' : '';
    weightHistoryTrend = {
      entriesCount: cleanLogs.length,
      daysSpan,
      startWeightKg: Number(first.weight),
      latestWeightKg: Number(last.weight),
      changeKg,
      recentEntries: cleanLogs.slice(-5).map(e => ({ date: String(e.date).slice(0, 10), weight: Number(e.weight) })),
      summary: `${first.weight} kg -> ${last.weight} kg (${sign}${changeKg} kg over ${daysSpan} day${daysSpan === 1 ? '' : 's'})`
    };
  } else if (cleanLogs.length === 1) {
    const only = cleanLogs[0];
    weightHistoryTrend = {
      entriesCount: 1,
      daysSpan: 0,
      startWeightKg: Number(only.weight),
      latestWeightKg: Number(only.weight),
      changeKg: 0,
      recentEntries: [{ date: String(only.date).slice(0, 10), weight: Number(only.weight) }],
      summary: `Latest logged: ${only.weight} kg (${String(only.date).slice(0, 10)})`
    };
  }

  const goalCalories = Number(coachContext?.goalCalories ?? profile?.goalCalories ?? profile?.dailyCalories) || 2200;
  const weight = Number(profile?.weight) || 75;
  const goalFat = Number(coachContext?.goalFat ?? profile?.goalFat) || Math.max(40, Math.round(weight * 0.7));
  const goalFiber = Number(coachContext?.goalFiber ?? profile?.goalFiber) || Math.max(20, Math.round((goalCalories / 1000) * 12));
  const goalWaterMl = Number(coachContext?.goalWaterMl ?? profile?.goalWaterMl) || 3000;
  const allergiesRaw = String(coachContext?.allergiesOrDislikes ?? profile?.allergiesOrDislikes ?? '').trim();

  return {
    name: profile?.name || 'یاریزان',
    age: Number(profile?.age) || 23,
    gender: profile?.gender || 'male',
    weight,
    targetWeight: Number(profile?.targetWeight) || 80,
    height: Number(profile?.height) || 175,
    goal: profile?.goal || 'Fitness',
    experienceLevel: normalizeExperienceLevel(coachContext?.experienceLevel ?? profile?.experienceLevel ?? 'intermediate'),
    currentWeek: Math.max(1, Number(coachContext?.currentWeek ?? profile?.currentWeek) || 1),
    isDeloadActive: Boolean(coachContext?.isDeloadActive ?? profile?.isDeloadActive),
    allergiesOrDislikes: allergiesRaw || 'None',
    goalCalories,
    goalProtein: Number(coachContext?.goalProtein ?? profile?.goalProtein) || 150,
    goalCarbs: Number(coachContext?.goalCarbs ?? profile?.goalCarbs) || 220,
    goalFat,
    goalFiber,
    goalWaterMl,
    daysPerWeek: Number(profile?.availableDaysPerWeek) || 4,
    location: profile?.trainingLocation || 'gym',
    homeEquipment: Array.isArray(profile?.homeEquipment) ? profile.homeEquipment : (profile?.homeEquipment ? [String(profile.homeEquipment)] : []),
    injuries: Array.isArray(profile?.healthConditions) ? profile.healthConditions : [],
    supplements: Array.isArray(profile?.supplements) ? profile.supplements : [],
    weightHistoryTrend
  };
}
