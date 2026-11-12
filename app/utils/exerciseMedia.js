// Offline Exercise Media Cache using browser CacheStorage & IndexedDB fallback
const CACHE_NAME = 'gym-exercise-media-v1';
const RAW_BASE_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

let exerciseIndexCache = null;

// =========================================================================
// نەخشەی تەواو و وردی ڕاهێنانە ستانداردەکانی جیهانی لەشجوانی (Curated Map)
// ئەم داتابەیسە ڕێگە لە هەموو جۆرە هەڵەیەک دەگرێت، و ڕێک ئەو GIFە دەهێنێت کە پێویستە
// =========================================================================
export const CURATED_EXERCISE_MAP = {
  // --- ١. سنگ (Chest) ---
  'barbell bench press': '0025',
  'bench press': '0025',
  'flat barbell bench press': '0025',
  'dumbbell bench press': '0289',
  'flat dumbbell press': '0289',
  'flat dumbbell bench press': '0289',
  'barbell incline bench press': '0047',
  'incline barbell bench press': '0047',
  'incline dumbbell bench press': '0314',
  'incline dumbbell press': '0314',
  'decline dumbbell bench press': '0279',
  'cable standing fly': '0227',
  'standing cable chest fly': '0227',
  'cable chest fly': '0227',
  'cable fly': '0227',
  'chest dips': '0251',
  'chest dip': '0251',
  'dips': '0251',
  'push-up': '0662',
  'push-ups': '0662',
  'pushup': '0662',
  'pushups': '0662',
  'push ups': '0662',
  'push up': '0662',
  'diamond push-ups': '0283',
  'diamond push-up': '0283',

  // --- ٢. پشت (Back & Lats) ---
  'lat pulldown': '2330',
  'lat pulldown wide grip': '2330',
  'wide grip lat pulldown': '2330',
  'cable lat pulldown': '2330',
  'pull-ups': '0652',
  'pull-up': '0652',
  'pullups': '0652',
  'pull up': '0652',
  'chin-ups': '1326',
  'chin-up': '1326',
  'chinups': '1326',
  'cable seated row': '0239',
  'seated cable row': '0239',
  'cable row': '0239',
  'bent over barbell row': '0027',
  'barbell bent over row': '0027',
  'barbell row': '0027',
  'single arm dumbbell row': '0292',
  'bent over dumbbell row': '0292',
  'dumbbell bent over row': '0292',
  'one arm dumbbell row': '0292',
  't-bar row': '0802',
  'doorway rows': '1772',
  'doorway row': '1772',
  'doorway towel row': '1772',
  'doorway towel rows': '1772',
  'towel row': '1772',
  'towel rows': '1772',
  'floor reverse push-up': '1772',
  'floor reverse push up': '1772',
  'reverse push-up': '1772',
  'elbow lift': '1772',
  'bodyweight standing row': '1772',
  'table inverted rows': '1772',
  'table inverted row': '1772',
  'inverted rows': '1772',
  'inverted row': '1772',
  'inverted table/door rows': '1772',
  'inverted table door rows': '1772',
  'superman hold': '0489',
  'superman holds': '0489',
  'superman': '0489',
  'hyperextension': '0489',
  'cable face pull': '0233',
  'face pull': '0233',
  'cable rear delt row': '0233',
  'barbell deadlift': '0032',
  'deadlift': '0032',
  'backpack romanian deadlift': '3013',
  'backpack deadlift': '3013',
  'romanian deadlift': '0085',
  'barbell romanian deadlift': '0085',
  'dumbbell romanian deadlift': '1459',
  'single leg romanian deadlift': '3013',
  'single leg deadlift': '3013',

  // --- ٣. قاچ و ڕان و سمت (Legs, Quads, Hamstrings & Glutes) ---
  'barbell full squat': '0043',
  'barbell squat': '0043',
  'barbell back squat': '0043',
  'back squat': '0043',
  'squat': '0043',
  'squats': '0043',
  'barbell front squat': '0042',
  'front squat': '0042',
  'dumbbell goblet squat': '1760',
  'goblet squat': '1760',
  'backpack goblet squats': '1685',
  'backpack goblet squat': '1685',
  'bodyweight squat': '1685',
  'bodyweight squats': '1685',
  'air squat': '1685',
  'leg press': '2287',
  'horizontal leg press': '2611',
  'lever leg extension': '0585',
  'leg extension': '0585',
  'leg extension machine': '0585',
  'seated leg curl': '0599',
  'lying leg curl': '0599',
  'leg curl': '0599',
  'dumbbell lunges': '0336',
  'dumbbell lunge': '0336',
  'walking lunges': '3470',
  'walking lunge': '3470',
  'bodyweight lunges': '3470',
  'bodyweight lunge': '3470',
  'lunges': '3470',
  'lunge': '3470',
  'glute bridges': '3013',
  'glute bridge': '3013',
  'single leg glute bridge': '3013',
  'hip thrust': '3013',
  'standing calf raise': '1373',
  'bodyweight standing calf raise': '1373',
  'bodyweight calf raises': '1373',
  'bodyweight calf raise': '1373',
  'dumbbell calf raises': '0308',
  'calf raises': '1373',
  'calf raise': '1373',

  // --- ٤. شان (Shoulders) ---
  'dumbbell shoulder press': '0405',
  'seated dumbbell shoulder press': '0405',
  'standing dumbbell shoulder press': '0405',
  'dumbbell seated shoulder press': '0405',
  'shoulder press': '0405',
  'pike hold': '3662',
  'pike holds': '3662',
  'pike push-ups': '3662',
  'pike push-up': '3662',
  'pike pushups': '3662',
  'pike pushup': '3662',
  'overhead press': '1456',
  'military press': '1456',
  'barbell military press': '1456',
  'dumbbell lateral raise': '0334',
  'lateral raise': '0334',
  'cable lateral raise': '0178',
  'dumbbell front raise': '0310',
  'front raise': '0310',
  'reverse pec deck': '0676',

  // --- ٥. قۆڵ: بایسێپس (Biceps) ---
  'barbell bicep curl': '1629',
  'barbell biceps curl': '1629',
  'barbell curl': '1629',
  'dumbbell biceps curl': '0294',
  'dumbbell bicep curl': '0294',
  'dumbbell bicep curls': '0294',
  'dumbbell biceps curls': '0294',
  'bicep curl': '0294',
  'biceps curl': '0294',
  'bicep curls': '0294',
  'biceps curls': '0294',
  'backpack bicep curls': '1770',
  'backpack bicep curl': '1770',
  'backpack curls': '1770',
  'backpack curl': '1770',
  'towel bicep curls': '1770',
  'towel bicep curl': '1770',
  'bodyweight biceps curl': '1770',
  'bodyweight bicep curl': '1770',
  'bodyweight bicep curls': '1770',
  'dumbbell hammer curl': '0313',
  'hammer curl': '0313',
  'incline dumbbell biceps curl': '0315',
  'incline dumbbell curl': '0315',
  'preacher curl': '0070',
  'barbell preacher curl': '0070',
  'cable bicep curl': '0160',

  // --- ٦. قۆڵ: ترایسێپس (Triceps) ---
  'triceps rope pushdown': '0200',
  'cable rope pushdown': '0200',
  'rope pushdown': '0200',
  'cable pushdown': '0201',
  'tricep pushdown': '0201',
  'skull crushers': '0060',
  'skull crusher': '0060',
  'barbell skull crusher': '0060',
  'overhead dumbbell triceps extension': '0409',
  'overhead dumbbell tricep extension': '0409',
  'dumbbell triceps extension': '0409',
  'overhead cable triceps extension': '0189',
  'bench dips': '0129',
  'bench dip': '0129',
  'chair dips': '0129',
  'chair dip': '0129',
  'close grip bench press': '0030',

  // --- ٧. سک و ناوقەد (Core & Abs) ---
  'plank': '0464',
  'scientific plank hold': '0464',
  'core plank hold': '0464',
  'plank hold': '0464',
  'front plank': '0464',
  'crunches': '0274',
  'abdominal crunches': '0274',
  'lying leg raises': '0872',
  'lying leg raise': '0872',
  'floor leg raises': '0872',
  'floor leg raise': '0872',
  'leg raises': '0872',
  'leg raise': '0872',
  'lying leg-hip raise': '0872',
  'reverse crunch': '0872',
  'hanging leg raises': '0472',
  'hanging leg raise': '0472',
  'russian twists': '0687',

  // --- ٨. کاردیۆ و ڕاکردن و هیت (Cardio, Treadmill, Running & HIIT) ---
  'treadmill interval running': '0684',
  'treadmill running': '0684',
  'treadmill run': '0684',
  'treadmill': '0684',
  'treadmill intervals': '0684',
  'interval running': '0684',
  'interval run': '0684',
  'running': '0684',
  'run': '0684',
  'jogging': '0684',
  'jog': '0684',
  'outdoor run': '0685',
  'outdoor running': '0685',
  'treadmill walking': '3666',
  'walking on incline treadmill': '3666',
  'incline treadmill': '3666',
  'incline treadmill walk': '3666',
  'incline treadmill walking': '3666',
  'stationary bike': '2138',
  'stationary bike run': '2138',
  'cycling': '2138',
  'cycle': '2138',
  'exercise bike': '2138',
  'spin bike': '2138',
  'jump rope': '2612',
  'skipping rope': '2612',
  'elliptical': '2141',
  'cross trainer': '2141',
  'elliptical cross trainer': '2141',
  'walk elliptical cross trainer': '2141',
  'burpee': '1160',
  'burpees': '1160',
  'mountain climber': '0630',
  'mountain climbers': '0630',
  'jumping jacks': '3224',
  'star jump': '3223',
  'high knees': '3655'
};

// وشە قەدەغەکراوەکان: ئەم وشانە نابێت بە هەڵە هەڵبژێردرێن مەگەر بەکارهێنەر ڕاستەوخۆ ناوی هێنابێت
const FORBIDDEN_FALLBACK_PATTERNS = [
  'on knees',
  'kneeling',
  'bosu',
  'stability ball',
  'exercise ball',
  'with twist',
  'yoga pose',
  'wall',
  'throw down'
];

// بارکردنی ئیندێکسی ناوی ڕاهێنانەکان
export async function getExerciseIndex() {
  if (exerciseIndexCache) return exerciseIndexCache;
  try {
    const res = await fetch('/exercises-index.json');
    if (res.ok) {
      exerciseIndexCache = await res.json();
      return exerciseIndexCache;
    }
  } catch (err) {
    console.warn('Failed to load local exercises-index.json', err);
  }
  return [];
}

// فایلی وێنەی ڕاهێنانە لۆکاڵە دابەزێنراوەکان بۆ دەستگەیشتنی یەکسەر و ئۆفلاین (0ms Latency)
const LOCAL_EXERCISE_IDS = new Set([
  '1685', '3470', '1373', '3013', '0865', '0872', '0620', '0489', '0129', '3166',
  '1770', '1769', '0283', '3662', '0662', '2368', '0687', '0464',
  '0630', '3224', '1160', '0274', '1772', '1773', '3165', '3167'
]);

// دۆزینەوەی باشترین ڕاهێنانی هاوشێوە بە شێوازی زۆر زیرەک و کۆنترۆڵکراو
export function matchExerciseInIndex(exerciseName, indexList) {
  if (!exerciseName || !indexList || indexList.length === 0) return null;
  const clean = exerciseName.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  // فلتەری ٠: پشکنینی تایبەت بۆ ڕاهێنانەکانی ماڵەوە و کێشی لەش بەبێ هیچ کەرەستەیەک (Pure Bodyweight / Zero Equipment)
  const HOME_BODYWEIGHT_PATTERNS = [
    // ١. بەرزکردنەوەی قاچ لەسەر زەوی (Lying / Floor Leg Raises - نەک باڕی هەڵواسین)
    { match: (c) => (c.includes('lying') || c.includes('floor') || c === 'leg raises' || c === 'leg raise' || c.includes('reverse crunch')) && c.includes('leg') && (c.includes('raise') || c.includes('crunch')), id: '0872' },
    
    // ٢. لانجز و هەنگاونانی ماڵەوە بە کێشی لەش (Forward Lunge - نەک بە دەمبڵی قورس)
    { match: (c) => (c.includes('walking') || c.includes('bodyweight') || c === 'lunges' || c === 'lunge') && c.includes('lunge'), id: '3470' },
    
    // ٣. دیپس لەسەر کورسی یان لێوار (Chair Dips / Bench Dips)
    { match: (c) => (c.includes('chair') || c.includes('bench')) && c.includes('dip'), id: '0129' },
    
    // ٤. بەهێزکردنی ماسولکەکانی پشت لەسەر زەوی بەبێ هیچ کەرەستەیەک (Floor Reverse Push-up / Elbow Lift)
    { match: (c) => (c.includes('inverted') || c.includes('table') || c.includes('door') || c.includes('reverse push') || c.includes('elbow')) && (c.includes('row') || c.includes('push') || c.includes('lift')), id: '1772' },
    
    // ٥. بەرزکردنەوەی حەوز / پردی سمت / دیدلیفتی ماڵەوە بە کێشی لەش (Low Glute Bridge - نەک باڕبێڵ و دەمبڵی قورس)
    { match: (c) => (c.includes('deadlift') && (c.includes('single') || c.includes('backpack') || c.includes('romanian') || c.includes('bodyweight'))) || (c.includes('glute') && c.includes('bridge')) || (c.includes('hip') && c.includes('thrust')), id: '3013' },
    
    // ٦. بەرزبوونەوە لەسەر پەنجەی پێ (Standing Calf Raise - نەک ئامێری قورس یان دەمبڵ)
    { match: (c) => c.includes('calf'), id: '1373' },

    // ٧. سوپەرمانی سەر زەوی (Superman Hold)
    { match: (c) => c.includes('superman') || c.includes('hyperextension'), id: '0489' },
    
    // ٨. پشت بە دیوار (Wall Sit)
    { match: (c) => c.includes('wall') && c.includes('sit'), id: '0624' },
    
    // ٩. سکی ڕووسی (Russian Twist)
    { match: (c) => c.includes('russian') && c.includes('twist'), id: '0687' },
    
    // ١٠. سکوات بە کێشی لەش / سکواتی جانتا (Bodyweight Squat / Backpack Goblet Squats - نەک باڕبێڵی قورس)
    { match: (c) => c.includes('squat') && (c.includes('backpack') || c.includes('goblet') || c.includes('bodyweight') || c.includes('air') || c.includes('free')), id: '1685' },
    { match: (c) => c.includes('bulgarian') || (c.includes('split') && c.includes('squat')), id: '2368' },
    
    // ١١. قۆڵی دووسەری ماڵەوە بە کێشی لەش (Bodyweight Biceps Curl / Leg Concentration Curl - نەک دووبارەکردنەوەی دەرگا)
    { match: (c) => (c.includes('backpack') || c.includes('towel') || c.includes('bodyweight') || c.includes('leg')) && (c.includes('curl') || c.includes('bicep')), id: '1770' },
    
    // ١٢. شناوەکان و ڕاهێنانی پایک (Push-ups & Pike for shoulders)
    { match: (c) => c.includes('pike'), id: '3662' },
    { match: (c) => c.includes('diamond') && c.includes('push'), id: '0283' },
    { match: (c) => (c === 'push ups' || c === 'push up' || c === 'pushups' || c === 'pushup' || c.includes('wide push')), id: '0662' },

    // ١٣. کاردیۆ و سک
    { match: (c) => c.includes('plank'), id: '0464' },
    { match: (c) => c.includes('mountain') && c.includes('climber'), id: '0630' },
    { match: (c) => c.includes('burpee'), id: '1160' },
    { match: (c) => c.includes('jumping') && c.includes('jack'), id: '3224' },
    { match: (c) => c.includes('crunch'), id: '0274' }
  ];

  for (const p of HOME_BODYWEIGHT_PATTERNS) {
    if (p.match(clean)) {
      const match = indexList.find(x => x.id === p.id);
      if (match) return match;
    }
  }

  // فلتەری ١: گەڕانی ڕاستەوخۆ بەپێی یەکسانبوونی تەواو لە نەخشەی دەستنیشانکراو
  const cleanNoDash = clean.replace(/\-/g, ' ');
  for (const [alias, id] of Object.entries(CURATED_EXERCISE_MAP)) {
    const aliasClean = alias.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean === aliasClean || cleanNoDash === aliasClean) {
      const matchById = indexList.find(x => x.id === id);
      if (matchById) return matchById;
    }
  }

  // پشکنینی پاشکۆ و پێشگری دیاریکراو (Exact Word Match)
  const sortedAliases = Object.keys(CURATED_EXERCISE_MAP).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    const aliasClean = alias.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (aliasClean.length >= 6) {
      if (clean === aliasClean || clean.startsWith(aliasClean + ' ') || clean.endsWith(' ' + aliasClean) || clean.includes(' ' + aliasClean + ' ')) {
        const targetId = CURATED_EXERCISE_MAP[alias];
        const matchById = indexList.find(x => x.id === targetId);
        if (matchById) return matchById;
      }
    }
  }

  // فلتەری ٢: ناوی تەواو یەکسان لە ئیندێکسدا
  const exact = indexList.find(x => x.name.toLowerCase() === clean);
  if (exact) return exact;

  // فلتەری ٣: گەڕانی هەژمارکراو بە پشکنینی وشە قەدەغەکراوەکان
  const isKneeRequested = clean.includes('knee');
  const isBandRequested = clean.includes('band');
  const isBallRequested = clean.includes('ball');

  const words = clean.split(' ').filter(w => w.length > 2 && w !== 'safe' && w !== 'range' && w !== 'stance' && w !== 'power');

  let bestMatch = null;
  let bestScore = -1000;

  for (const item of indexList) {
    const itemName = item.name.toLowerCase();

    // فلتەری توند بۆ دوورکەوتنەوە لە جووڵەی نامۆ
    let skip = false;
    for (const forbidden of FORBIDDEN_FALLBACK_PATTERNS) {
      if (itemName.includes(forbidden)) {
        if (forbidden === 'kneeling' || forbidden === 'on knees') {
          if (!isKneeRequested) skip = true;
        } else if (forbidden.includes('ball')) {
          if (!isBallRequested) skip = true;
        } else {
          skip = true;
        }
      }
    }
    if (skip) continue;

    // ڕەتکردنەوەی جۆری لاستیک ئەگەر داوای باربێڵ یان دەمبڵ کرابێت
    if (!isBandRequested && itemName.startsWith('band ') && (clean.includes('barbell') || clean.includes('dumbbell') || clean.includes('cable'))) {
      continue;
    }

    let score = 0;
    if (itemName === clean) score += 100;
    if (itemName.includes(clean)) score += 40;

    for (const w of words) {
      if (itemName.includes(w)) {
        score += 8;
      }
    }

    // ئیمتیاز بۆ یەکسانبوونی ئامێرەکە (barbell, dumbbell, cable, machine)
    if (clean.includes('barbell') && item.equipment === 'barbell') score += 15;
    if (clean.includes('dumbbell') && item.equipment === 'dumbbell') score += 15;
    if (clean.includes('cable') && item.equipment === 'cable') score += 15;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (bestScore >= 12) return bestMatch;
  return null;
}

const blobUrlMemoryCache = new Map();

// وەرگرتنی لینکی میدیا (لۆکاڵ کاش یان ریمۆت CDN)
export async function getExerciseMediaUrl(exerciseName) {
  if (!exerciseName) return null;
  const cacheKey = exerciseName.toLowerCase().trim();
  if (blobUrlMemoryCache.has(cacheKey)) {
    return blobUrlMemoryCache.get(cacheKey);
  }

  const index = await getExerciseIndex();
  const match = matchExerciseInIndex(exerciseName, index);
  if (!match) return null;

  // ١. ئەگەر فایلەکە لۆکاڵانە داگیرا بێت، یەکسەر بەبێ دواکەوتن بە خێرایی 0ms پیشانی دەدەین
  if (LOCAL_EXERCISE_IDS.has(match.id)) {
    const localUrl = `/exercises/${match.id}.gif`;
    blobUrlMemoryCache.set(cacheKey, localUrl);
    return localUrl;
  }

  if (!match.gif) return null;

  const remoteUrl = `${RAW_BASE_URL}${match.gif}`;
  if (blobUrlMemoryCache.has(remoteUrl)) {
    const existingBlob = blobUrlMemoryCache.get(remoteUrl);
    blobUrlMemoryCache.set(cacheKey, existingBlob);
    return existingBlob;
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(remoteUrl);
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        const objUrl = URL.createObjectURL(blob);
        blobUrlMemoryCache.set(remoteUrl, objUrl);
        blobUrlMemoryCache.set(cacheKey, objUrl);
        return objUrl;
      }

      // ئەگەر لە کاشدا نەبوو، لە پاشبنەمادا خێرا دەستی پێدەکەین تا بۆ جاری داهاتوو و دۆخی ئۆفلاین ئامادە بێت
      fetch(remoteUrl, { mode: 'cors' })
        .then(async (resp) => {
          if (resp && resp.ok) {
            try {
              const c = await caches.open(CACHE_NAME);
              await c.put(remoteUrl, resp.clone());
            } catch (putErr) {}
          }
        })
        .catch(() => {});
    } catch (e) {
      // fallback
    }
  }

  return remoteUrl;
}

// داگرتنی خۆکار و ئۆفلاینکردنی کۆی ڕاهێنانەکانی کۆرسەکە لە پاشبنەمادا
export async function cacheWorkoutPlanMedia(weeklyPlan) {
  if (!weeklyPlan || !Array.isArray(weeklyPlan) || typeof window === 'undefined' || !('caches' in window)) return;

  try {
    const index = await getExerciseIndex();
    if (!index || index.length === 0) return;

    const exerciseNames = new Set();
    for (const day of weeklyPlan) {
      if (day && day.exercises && Array.isArray(day.exercises)) {
        for (const ex of day.exercises) {
          const name = ex.englishName || ex.name;
          if (name) exerciseNames.add(name);
        }
      }
    }

    const cache = await caches.open(CACHE_NAME);

    for (const exName of exerciseNames) {
      const match = matchExerciseInIndex(exName, index);
      if (match && match.gif) {
        const url = `${RAW_BASE_URL}${match.gif}`;
        const isCached = await cache.match(url);
        if (!isCached) {
          try {
            const resp = await fetch(url, { mode: 'cors' });
            if (resp && resp.ok) {
              await cache.put(url, resp);
            }
          } catch (fetchErr) {
            // silent catch
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to cache workout media in background:', err);
  }
}

// داگرتنی خۆکار و ئۆفلاینکردنی هەموو وێنەکانی فەرهەنگی وێنەیی ماسولکەکان (Muscle Atlas)
export async function cacheMuscleAnatomyMedia(muscleList) {
  if (!muscleList || !Array.isArray(muscleList) || typeof window === 'undefined' || !('caches' in window)) return;

  try {
    const index = await getExerciseIndex();
    if (!index || index.length === 0) return;

    const urlsToCache = new Set();
    for (const m of muscleList) {
      if (m.mainExercise) {
        const match = matchExerciseInIndex(m.mainExercise, index);
        if (match && match.gif) {
          urlsToCache.add(`${RAW_BASE_URL}${match.gif}`);
        }
      }
      if (Array.isArray(m.exercises)) {
        for (const ex of m.exercises) {
          const name = ex.englishName || ex.nameKu;
          if (name) {
            const match = matchExerciseInIndex(name, index);
            if (match && match.gif) {
              urlsToCache.add(`${RAW_BASE_URL}${match.gif}`);
            }
          }
        }
      }
    }

    const cache = await caches.open(CACHE_NAME);
    const urlArray = Array.from(urlsToCache);

    // ئەنجامدان بە کۆنترۆڵکراوی لەسەرخۆ (3 داواکاری هاوکات) بۆ ئەوەی ڕووکار هێواش نەبێت
    const queue = [...urlArray];
    const workers = Array(3).fill(null).map(async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        if (!url) break;
        try {
          const isCached = await cache.match(url);
          if (!isCached) {
            const resp = await fetch(url, { mode: 'cors' });
            if (resp && resp.ok) {
              await cache.put(url, resp);
            }
          }
        } catch (fetchErr) {
          // بێدەنگ لە حاڵەتی ئۆفلاین
        }
      }
    });

    await Promise.all(workers);
    console.log(`[Offline Cache] Muscle Atlas media pre-cached successfully (${urlArray.length} items checked).`);
  } catch (err) {
    console.warn('Failed to pre-cache muscle anatomy media:', err);
  }
}

// وەرگرتنی ئاماری قەبارە و ژمارەی ڕاهێنانە کاشکراوەکان بۆ دۆخی ئۆفلاین
export async function getOfflineMediaCacheStats() {
  if (typeof window === 'undefined' || !('caches' in window)) return { totalCached: 0 };
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    return {
      totalCached: keys.length,
      cacheName: CACHE_NAME
    };
  } catch (e) {
    return { totalCached: 0 };
  }
}
