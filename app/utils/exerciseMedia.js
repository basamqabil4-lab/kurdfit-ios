// Strict ID-Verified Zero-Guessing Exercise Media Engine & Offline Cache
const CACHE_NAME = 'gym-exercise-media-v2';
const RAW_BASE_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

let exerciseIndexCache = null;

// =========================================================================
// نەخشەی گۆڕینی ماسولکەی ورد (target) بۆ بەشی سەرەکیی جەستە (bodyPart)
// هاوتا لەگەڵ ستانداردی داتابەیسی exercises-index.json
// =========================================================================
export const TARGET_TO_BODYPART = {
  pectorals: 'chest',
  lats: 'back',
  'upper back': 'back',
  spine: 'back',
  delts: 'shoulders',
  traps: 'shoulders',
  'levator scapulae': 'shoulders',
  biceps: 'upper arms',
  triceps: 'upper arms',
  forearms: 'lower arms',
  quads: 'upper legs',
  hamstrings: 'upper legs',
  glutes: 'upper legs',
  adductors: 'upper legs',
  abductors: 'upper legs',
  calves: 'lower legs',
  abs: 'waist',
  'serratus anterior': 'waist',
  'cardiovascular system': 'cardio',
};

export function getItemBodyPart(item) {
  if (!item) return '';
  if (item.bodyPart) return String(item.bodyPart).toLowerCase().trim();
  const target = String(item.target || '').toLowerCase().trim();
  return TARGET_TO_BODYPART[target] || '';
}

// =========================================================================
// کەتەلۆگی سەرەکیی پشتڕاستکراوە (Master Verified Catalog)
// هەموو بڕگەکان ڕاستەوخۆ لە public/exercises-index.json دەرهێنراون و لە ڕووی بینینەوە پشکنراون
// =========================================================================
export const VERIFIED_EXERCISES_CATALOG = [
  // Chest
  { exerciseId: '0025', canonicalName: 'barbell bench press', bodyPart: 'chest', target: 'pectorals', equipment: 'barbell', gif: 'videos/0025-EIeI8Vf.gif' },
  { exerciseId: '0289', canonicalName: 'dumbbell bench press', bodyPart: 'chest', target: 'pectorals', equipment: 'dumbbell', gif: 'videos/0289-SpYC0Kp.gif' },
  { exerciseId: '0047', canonicalName: 'barbell incline bench press', bodyPart: 'chest', target: 'pectorals', equipment: 'barbell', gif: 'videos/0047-3TZduzM.gif' },
  { exerciseId: '0314', canonicalName: 'dumbbell incline bench press', bodyPart: 'chest', target: 'pectorals', equipment: 'dumbbell', gif: 'videos/0314-ns0SIbU.gif' },
  { exerciseId: '0301', canonicalName: 'dumbbell decline bench press', bodyPart: 'chest', target: 'pectorals', equipment: 'dumbbell', gif: 'videos/0301-DwhEmmE.gif' },
  { exerciseId: '0577', canonicalName: 'lever chest press', bodyPart: 'chest', target: 'pectorals', equipment: 'leverage machine', gif: 'videos/0577-T0yTjgW.gif' },
  { exerciseId: '0576', canonicalName: 'lever chest press', bodyPart: 'chest', target: 'pectorals', equipment: 'leverage machine', gif: 'videos/0576-DOoWcnA.gif' },
  { exerciseId: '0596', canonicalName: 'lever seated fly', bodyPart: 'chest', target: 'pectorals', equipment: 'leverage machine', gif: 'videos/0596-v3xmPAR.gif' },
  { exerciseId: '1269', canonicalName: 'cable standing up straight crossovers', bodyPart: 'chest', target: 'pectorals', equipment: 'cable', gif: 'videos/1269-UKWTJWR.gif' },
  { exerciseId: '0227', canonicalName: 'cable standing fly', bodyPart: 'chest', target: 'pectorals', equipment: 'cable', gif: 'videos/0227-Pr9Rhf4.gif' },
  { exerciseId: '0308', canonicalName: 'dumbbell fly', bodyPart: 'chest', target: 'pectorals', equipment: 'dumbbell', gif: 'videos/0308-yz9nUhF.gif' },
  { exerciseId: '0251', canonicalName: 'chest dip', bodyPart: 'chest', target: 'pectorals', equipment: 'body weight', gif: 'videos/0251-9WTm7dq.gif' },
  { exerciseId: '0662', canonicalName: 'push-up', bodyPart: 'chest', target: 'pectorals', equipment: 'body weight', gif: 'videos/0662-I4hDWkc.gif' },
  { exerciseId: '1311', canonicalName: 'wide hand push up', bodyPart: 'chest', target: 'pectorals', equipment: 'body weight', gif: 'videos/1311-JmMVpR3.gif' },
  { exerciseId: '0283', canonicalName: 'diamond push-up', bodyPart: 'upper arms', target: 'triceps', equipment: 'body weight', gif: 'videos/0283-soIB2rj.gif' },
  { exerciseId: '1254', canonicalName: 'band bench press', bodyPart: 'chest', target: 'pectorals', equipment: 'band', gif: 'videos/1254-khlHMqs.gif' },
  { exerciseId: '0352', canonicalName: 'dumbbell neutral grip bench press', bodyPart: 'upper arms', target: 'triceps', equipment: 'dumbbell', gif: 'videos/0352-pP8wP2P.gif' },

  // Back & Posterior Chain
  { exerciseId: '0197', canonicalName: 'cable pulldown (pro lat bar)', bodyPart: 'back', target: 'lats', equipment: 'cable', gif: 'videos/0197-qdRxqCj.gif' },
  { exerciseId: '0818', canonicalName: 'twin handle parallel grip lat pulldown', bodyPart: 'back', target: 'lats', equipment: 'cable', gif: 'videos/0818-rkg41Fb.gif' },
  { exerciseId: '0238', canonicalName: 'cable straight arm pulldown', bodyPart: 'back', target: 'lats', equipment: 'cable', gif: 'videos/0238-x69MAlq.gif' },
  { exerciseId: '0652', canonicalName: 'pull-up', bodyPart: 'back', target: 'lats', equipment: 'body weight', gif: 'videos/0652-lBDjFxJ.gif' },
  { exerciseId: '1326', canonicalName: 'chin-up', bodyPart: 'back', target: 'lats', equipment: 'body weight', gif: 'videos/1326-T2mxWqc.gif' },
  { exerciseId: '0239', canonicalName: 'cable straight back seated row', bodyPart: 'back', target: 'upper back', equipment: 'cable', gif: 'videos/0239-Tq6gbK6.gif' },
  { exerciseId: '1350', canonicalName: 'lever seated row', bodyPart: 'back', target: 'upper back', equipment: 'leverage machine', gif: 'videos/1350-7I6LNUG.gif' },
  { exerciseId: '0327', canonicalName: 'dumbbell incline row', bodyPart: 'back', target: 'upper back', equipment: 'dumbbell', gif: 'videos/0327-7vG5o25.gif' },
  { exerciseId: '0027', canonicalName: 'barbell bent over row', bodyPart: 'back', target: 'upper back', equipment: 'barbell', gif: 'videos/0027-eZyBC3j.gif' },
  { exerciseId: '0292', canonicalName: 'dumbbell one arm bent-over row', bodyPart: 'back', target: 'upper back', equipment: 'dumbbell', gif: 'videos/0292-C0MA9bC.gif' },
  { exerciseId: '0606', canonicalName: 'lever t bar row', bodyPart: 'back', target: 'upper back', equipment: 'leverage machine', gif: 'videos/0606-aaXr7ld.gif' },
  { exerciseId: '0032', canonicalName: 'barbell deadlift', bodyPart: 'upper legs', target: 'glutes', equipment: 'barbell', gif: 'videos/0032-ila4NZS.gif' },
  { exerciseId: '0085', canonicalName: 'barbell romanian deadlift', bodyPart: 'upper legs', target: 'glutes', equipment: 'barbell', gif: 'videos/0085-wQ2c4XD.gif' },
  { exerciseId: '1459', canonicalName: 'dumbbell romanian deadlift', bodyPart: 'upper legs', target: 'glutes', equipment: 'dumbbell', gif: 'videos/1459-rR0LJzx.gif' },
  { exerciseId: '1757', canonicalName: 'dumbbell single leg deadlift', bodyPart: 'upper legs', target: 'glutes', equipment: 'dumbbell', gif: 'videos/1757-gKozT8X.gif' },
  { exerciseId: '0044', canonicalName: 'barbell good morning', bodyPart: 'upper legs', target: 'hamstrings', equipment: 'barbell', gif: 'videos/0044-XlZ4lAC.gif' },
  { exerciseId: '0489', canonicalName: 'hyperextension', bodyPart: 'back', target: 'spine', equipment: 'body weight', gif: 'videos/0489-zhMwOwE.gif' },
  { exerciseId: '0499', canonicalName: 'inverted row', bodyPart: 'back', target: 'upper back', equipment: 'body weight', gif: 'videos/0499-bZGHsAZ.gif' },
  { exerciseId: '1773', canonicalName: 'one arm towel row', bodyPart: 'back', target: 'upper back', equipment: 'body weight', gif: 'videos/1773-bKWbrTA.gif' },
  { exerciseId: '1772', canonicalName: 'elbow lift - reverse push-up', bodyPart: 'back', target: 'upper back', equipment: 'body weight', gif: 'videos/1772-wbUYILZ.gif' },
  { exerciseId: '0974', canonicalName: 'band close-grip pulldown', bodyPart: 'back', target: 'lats', equipment: 'band', gif: 'videos/0974-DptumMx.gif' },
  { exerciseId: '0988', canonicalName: 'band one arm standing low row', bodyPart: 'back', target: 'upper back', equipment: 'band', gif: 'videos/0988-km0sQC0.gif' },

  // Shoulders & Traps
  { exerciseId: '0405', canonicalName: 'dumbbell seated shoulder press', bodyPart: 'shoulders', target: 'delts', equipment: 'dumbbell', gif: 'videos/0405-znQUdHY.gif' },
  { exerciseId: '0290', canonicalName: 'dumbbell bench seated press', bodyPart: 'shoulders', target: 'delts', equipment: 'dumbbell', gif: 'videos/0290-3d7wHyd.gif' },
  { exerciseId: '0587', canonicalName: 'lever military press', bodyPart: 'shoulders', target: 'delts', equipment: 'leverage machine', gif: 'videos/0587-CggQhII.gif' },
  { exerciseId: '0091', canonicalName: 'barbell seated overhead press', bodyPart: 'shoulders', target: 'delts', equipment: 'barbell', gif: 'videos/0091-kTbSH9h.gif' },
  { exerciseId: '1456', canonicalName: 'barbell standing close grip military press', bodyPart: 'shoulders', target: 'delts', equipment: 'barbell', gif: 'videos/1456-wdRZISl.gif' },
  { exerciseId: '2137', canonicalName: 'dumbbell arnold press', bodyPart: 'shoulders', target: 'delts', equipment: 'dumbbell', gif: 'videos/2137-Xy4jlWA.gif' },
  { exerciseId: '0334', canonicalName: 'dumbbell lateral raise', bodyPart: 'shoulders', target: 'delts', equipment: 'dumbbell', gif: 'videos/0334-DsgkuIt.gif' },
  { exerciseId: '0178', canonicalName: 'cable lateral raise', bodyPart: 'shoulders', target: 'delts', equipment: 'cable', gif: 'videos/0178-goJ6ezq.gif' },
  { exerciseId: '0310', canonicalName: 'dumbbell front raise', bodyPart: 'shoulders', target: 'delts', equipment: 'dumbbell', gif: 'videos/0310-3eGE2JC.gif' },
  { exerciseId: '0233', canonicalName: 'cable standing rear delt row (with rope)', bodyPart: 'shoulders', target: 'delts', equipment: 'cable', gif: 'videos/0233-ZfyAGhK.gif' },
  { exerciseId: '0602', canonicalName: 'lever seated reverse fly', bodyPart: 'shoulders', target: 'delts', equipment: 'leverage machine', gif: 'videos/0602-myfUsKf.gif' },
  { exerciseId: '0406', canonicalName: 'dumbbell shrug', bodyPart: 'shoulders', target: 'traps', equipment: 'dumbbell', gif: 'videos/0406-NJzBsGJ.gif' },
  { exerciseId: '0095', canonicalName: 'barbell shrug', bodyPart: 'shoulders', target: 'traps', equipment: 'barbell', gif: 'videos/0095-dG7tG5y.gif' },
  { exerciseId: '3662', canonicalName: 'pike-to-cobra push-up', bodyPart: 'upper legs', target: 'glutes', equipment: 'body weight', gif: 'videos/3662-XPUDTt7.gif' },
  { exerciseId: '0977', canonicalName: 'band front lateral raise', bodyPart: 'shoulders', target: 'delts', equipment: 'band', gif: 'videos/0977-sTg7iys.gif' },
  { exerciseId: '0997', canonicalName: 'band shoulder press', bodyPart: 'shoulders', target: 'delts', equipment: 'band', gif: 'videos/0997-peAeMR3.gif' },
  { exerciseId: '1018', canonicalName: 'band shrug', bodyPart: 'shoulders', target: 'traps', equipment: 'band', gif: 'videos/1018-trmte8s.gif' },

  // Legs & Glutes
  { exerciseId: '0043', canonicalName: 'barbell full squat', bodyPart: 'upper legs', target: 'glutes', equipment: 'barbell', gif: 'videos/0043-qXTaZnJ.gif' },
  { exerciseId: '0042', canonicalName: 'barbell front squat', bodyPart: 'upper legs', target: 'glutes', equipment: 'barbell', gif: 'videos/0042-zG0zs85.gif' },
  { exerciseId: '1760', canonicalName: 'dumbbell goblet squat', bodyPart: 'upper legs', target: 'quads', equipment: 'dumbbell', gif: 'videos/1760-yn8yg1r.gif' },
  { exerciseId: '1685', canonicalName: 'squat to overhead reach', bodyPart: 'upper legs', target: 'quads', equipment: 'body weight', gif: 'videos/1685-QChZi3x.gif' },
  { exerciseId: '0410', canonicalName: 'dumbbell single leg split squat', bodyPart: 'upper legs', target: 'quads', equipment: 'dumbbell', gif: 'videos/0410-qx4fgX7.gif' },
  { exerciseId: '2368', canonicalName: 'split squats', bodyPart: 'upper legs', target: 'quads', equipment: 'body weight', gif: 'videos/2368-9E25EOx.gif' },
  { exerciseId: '1463', canonicalName: 'sled 45° leg press (side pov)', bodyPart: 'upper legs', target: 'glutes', equipment: 'sled machine', gif: 'videos/1463-2Qh2J1e.gif' },
  { exerciseId: '2611', canonicalName: 'lever horizontal one leg press', bodyPart: 'upper legs', target: 'glutes', equipment: 'leverage machine', gif: 'videos/2611-9KU9TYF.gif' },
  { exerciseId: '0585', canonicalName: 'lever leg extension', bodyPart: 'upper legs', target: 'quads', equipment: 'leverage machine', gif: 'videos/0585-my33uHU.gif' },
  { exerciseId: '0599', canonicalName: 'lever seated leg curl', bodyPart: 'upper legs', target: 'hamstrings', equipment: 'leverage machine', gif: 'videos/0599-Zg3XY7P.gif' },
  { exerciseId: '0586', canonicalName: 'lever lying leg curl', bodyPart: 'upper legs', target: 'hamstrings', equipment: 'leverage machine', gif: 'videos/0586-17lJ1kr.gif' },
  { exerciseId: '0336', canonicalName: 'dumbbell lunge', bodyPart: 'upper legs', target: 'glutes', equipment: 'dumbbell', gif: 'videos/0336-RRWFUcw.gif' },
  { exerciseId: '3470', canonicalName: 'forward lunge (male)', bodyPart: 'upper legs', target: 'glutes', equipment: 'body weight', gif: 'videos/3470-kMzUs9Y.gif' },
  { exerciseId: '3013', canonicalName: 'low glute bridge on floor', bodyPart: 'upper legs', target: 'glutes', equipment: 'body weight', gif: 'videos/3013-u0cNiij.gif' },
  { exerciseId: '1409', canonicalName: 'barbell glute bridge', bodyPart: 'upper legs', target: 'glutes', equipment: 'barbell', gif: 'videos/1409-qKBpF7I.gif' },
  { exerciseId: '1372', canonicalName: 'barbell standing calf raise', bodyPart: 'lower legs', target: 'calves', equipment: 'barbell', gif: 'videos/1372-8ozhUIZ.gif' },
  { exerciseId: '0594', canonicalName: 'lever seated calf raise', bodyPart: 'lower legs', target: 'calves', equipment: 'leverage machine', gif: 'videos/0594-bOOdeyc.gif' },
  { exerciseId: '0417', canonicalName: 'dumbbell standing calf raise', bodyPart: 'lower legs', target: 'calves', equipment: 'dumbbell', gif: 'videos/0417-dPmaUaU.gif' },
  { exerciseId: '0409', canonicalName: 'dumbbell single leg calf raise', bodyPart: 'lower legs', target: 'calves', equipment: 'dumbbell', gif: 'videos/0409-1kB3Wmk.gif' },
  { exerciseId: '1373', canonicalName: 'bodyweight standing calf raise', bodyPart: 'lower legs', target: 'calves', equipment: 'body weight', gif: 'videos/1373-bJYHBIN.gif' },
  { exerciseId: '1001', canonicalName: 'band single leg split squat', bodyPart: 'upper legs', target: 'quads', equipment: 'band', gif: 'videos/1001-y8bYM8w.gif' },

  // Arms & Forearms
  { exerciseId: '1629', canonicalName: 'barbell standing wide grip biceps curl', bodyPart: 'upper arms', target: 'biceps', equipment: 'barbell', gif: 'videos/1629-faHKVkK.gif' },
  { exerciseId: '0294', canonicalName: 'dumbbell biceps curl', bodyPart: 'upper arms', target: 'biceps', equipment: 'dumbbell', gif: 'videos/0294-NbVPDMW.gif' },
  { exerciseId: '0313', canonicalName: 'dumbbell hammer curl', bodyPart: 'upper arms', target: 'biceps', equipment: 'dumbbell', gif: 'videos/0313-slDvUAU.gif' },
  { exerciseId: '0315', canonicalName: 'dumbbell incline biceps curl', bodyPart: 'upper arms', target: 'biceps', equipment: 'dumbbell', gif: 'videos/0315-F3xgbjF.gif' },
  { exerciseId: '0297', canonicalName: 'dumbbell concentration curl', bodyPart: 'upper arms', target: 'biceps', equipment: 'dumbbell', gif: 'videos/0297-gvsWLQw.gif' },
  { exerciseId: '0070', canonicalName: 'barbell preacher curl', bodyPart: 'upper arms', target: 'biceps', equipment: 'barbell', gif: 'videos/0070-qOgPVf6.gif' },
  { exerciseId: '0868', canonicalName: 'cable curl', bodyPart: 'upper arms', target: 'biceps', equipment: 'cable', gif: 'videos/0868-G08RZcQ.gif' },
  { exerciseId: '1770', canonicalName: 'biceps leg concentration curl', bodyPart: 'upper arms', target: 'biceps', equipment: 'body weight', gif: 'videos/1770-sJFIDIp.gif' },
  { exerciseId: '1769', canonicalName: 'bodyweight side lying biceps curl', bodyPart: 'upper arms', target: 'biceps', equipment: 'body weight', gif: 'videos/1769-gscGLOU.gif' },
  { exerciseId: '0968', canonicalName: 'band alternating biceps curl', bodyPart: 'upper arms', target: 'biceps', equipment: 'band', gif: 'videos/0968-3omWx6P.gif' },
  { exerciseId: '0126', canonicalName: 'barbell wrist curl', bodyPart: 'lower arms', target: 'forearms', equipment: 'barbell', gif: 'videos/0126-82LxxkW.gif' },
  { exerciseId: '0200', canonicalName: 'cable pushdown (with rope attachment)', bodyPart: 'upper arms', target: 'triceps', equipment: 'cable', gif: 'videos/0200-dU605di.gif' },
  { exerciseId: '0201', canonicalName: 'cable pushdown', bodyPart: 'upper arms', target: 'triceps', equipment: 'cable', gif: 'videos/0201-3ZflifB.gif' },
  { exerciseId: '0194', canonicalName: 'cable overhead triceps extension (rope attachment)', bodyPart: 'upper arms', target: 'triceps', equipment: 'cable', gif: 'videos/0194-2IxROQ1.gif' },
  { exerciseId: '2188', canonicalName: 'dumbbell seated triceps extension', bodyPart: 'upper arms', target: 'triceps', equipment: 'dumbbell', gif: 'videos/2188-kont8Ut.gif' },
  { exerciseId: '0060', canonicalName: 'barbell lying triceps extension skull crusher', bodyPart: 'upper arms', target: 'triceps', equipment: 'barbell', gif: 'videos/0060-h8LFzo9.gif' },
  { exerciseId: '1748', canonicalName: 'ez bar lying close grip triceps extension behind head', bodyPart: 'upper arms', target: 'triceps', equipment: 'ez barbell', gif: 'videos/1748-6CKUx7o.gif' },
  { exerciseId: '0129', canonicalName: 'bench dip (knees bent)', bodyPart: 'upper arms', target: 'triceps', equipment: 'body weight', gif: 'videos/0129-RrLske5.gif' },
  { exerciseId: '0030', canonicalName: 'barbell close-grip bench press', bodyPart: 'upper arms', target: 'triceps', equipment: 'barbell', gif: 'videos/0030-J6Dx1Mu.gif' },

  // Core & Cardio
  { exerciseId: '0175', canonicalName: 'cable kneeling crunch', bodyPart: 'waist', target: 'abs', equipment: 'cable', gif: 'videos/0175-WW95auq.gif' },
  { exerciseId: '0243', canonicalName: 'cable twist', bodyPart: 'waist', target: 'abs', equipment: 'cable', gif: 'videos/0243-aVs3BR3.gif' },
  { exerciseId: '0472', canonicalName: 'hanging leg raise', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gif: 'videos/0472-I3tsCnC.gif' },
  { exerciseId: '0620', canonicalName: 'lying leg raise flat bench', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gif: 'videos/0620-WhuFnR7.gif' },
  { exerciseId: '0865', canonicalName: 'lying leg-hip raise', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gif: 'videos/0865-9IxJdtC.gif' },
  { exerciseId: '0872', canonicalName: 'reverse crunch', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gif: 'videos/0872-nCU1Ekp.gif' },
  { exerciseId: '0274', canonicalName: 'crunch floor', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gif: 'videos/0274-TFqbd8t.gif' },
  { exerciseId: '0464', canonicalName: 'front plank with twist', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gif: 'videos/0464-CosupLu.gif' },
  { exerciseId: '0687', canonicalName: 'russian twist', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gif: 'videos/0687-XVDdcoj.gif' },
  { exerciseId: '0630', canonicalName: 'mountain climber', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'body weight', gif: 'videos/0630-RJgzwny.gif' },
  { exerciseId: '3224', canonicalName: 'jack jump (male)', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'body weight', gif: 'videos/3224-1g5bPpA.gif' },
  { exerciseId: '3223', canonicalName: 'star jump (male)', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'body weight', gif: 'videos/3223-HtfCpfi.gif' },
  { exerciseId: '1160', canonicalName: 'burpee', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'body weight', gif: 'videos/1160-dK9394r.gif' },
  { exerciseId: '2612', canonicalName: 'jump rope', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'rope', gif: 'videos/2612-e1e76I2.gif' },
  { exerciseId: '3666', canonicalName: 'walking on incline treadmill', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'leverage machine', gif: 'videos/3666-rjiM4L3.gif' },
  { exerciseId: '0684', canonicalName: 'run (equipment)', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'body weight', gif: 'videos/0684-y5p0H8a.gif' },
  { exerciseId: '0685', canonicalName: 'run', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'body weight', gif: 'videos/0685-oLrKqDH.gif' },
  { exerciseId: '0798', canonicalName: 'stationary bike walk', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'leverage machine', gif: 'videos/0798-a8VDgLw.gif' },
  { exerciseId: '2138', canonicalName: 'stationary bike run v. 3', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'stationary bike', gif: 'videos/2138-H1PESYI.gif' },
  { exerciseId: '2141', canonicalName: 'walk elliptical cross trainer', bodyPart: 'cardio', target: 'cardiovascular system', equipment: 'elliptical machine', gif: 'videos/2141-rjtuP6X.gif' },
];

export const VERIFIED_EXERCISES_BY_ID = Object.fromEntries(
  VERIFIED_EXERCISES_CATALOG.map((item) => [item.exerciseId, item])
);

// =========================================================================
// نەخشەی ورد و پاککراوەی ڕاهێنانە ستانداردەکان (Zero-Guessing Curated Map)
// هەموو نەخشە هەڵەکان (وەک Lat Pulldown 2330، Machine Shoulder Press 0603، و جێگرەوە نا-وردەکان) سڕاونەتەوە یان ڕاستکراونەتەوە
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
  'incline barbell press': '0047',
  'incline dumbbell bench press': '0314',
  'incline dumbbell press': '0314',
  'dumbbell incline bench press': '0314',
  'decline dumbbell bench press': '0301',
  'dumbbell decline bench press': '0301',
  'dumbbell fly': '0308',
  'machine chest press': '0577',
  'lever chest press': '0577',
  'neutral-grip machine press': '0576',
  'neutral grip machine press': '0576',
  'dumbbell neutral grip bench press': '0352',
  'pec deck machine fly': '0596',
  'pec deck fly': '0596',
  'pec deck': '0596',
  'lever seated fly': '0596',
  'cable crossover': '1269',
  'cable crossover fly': '1269',
  'cable standing up straight crossovers': '1269',
  'cable standing fly': '0227',
  'standing cable chest fly': '0227',
  'cable chest fly': '0227',
  'cable fly': '0227',
  'chest dips': '0251',
  'chest dip': '0251',
  dips: '0251',
  'push-up': '0662',
  'push-ups': '0662',
  pushup: '0662',
  pushups: '0662',
  'push ups': '0662',
  'push up': '0662',
  'wide push-ups': '1311',
  'wide push ups': '1311',
  'wide hand push up': '1311',
  'diamond push-ups': '0283',
  'diamond push-up': '0283',
  'band bench press': '1254',

  // --- ٢. پشت و ناوقەد (Back & Posterior Chain) ---
  'lat pulldown': '0197',
  'lat pulldown wide grip': '0197',
  'wide grip lat pulldown': '0197',
  'cable lat pulldown': '0197',
  'cable pulldown (pro lat bar)': '0197',
  'cable pulldown': '0197',
  'close grip lat pulldown': '0818',
  'close-grip pulldown': '0818',
  'twin handle parallel grip lat pulldown': '0818',
  'straight-arm pulldown': '0238',
  'straight arm pulldown': '0238',
  'cable straight arm pulldown': '0238',
  'band close-grip pulldown': '0974',
  'band pulldown': '0974',
  'pull-ups': '0652',
  'pull-up': '0652',
  pullups: '0652',
  'pull up': '0652',
  'chin-ups': '1326',
  'chin-up': '1326',
  chinups: '1326',
  'cable seated row': '0239',
  'seated cable row': '0239',
  'cable row': '0239',
  'cable straight back seated row': '0239',
  'chest-supported machine row': '1350',
  'chest supported machine row': '1350',
  'lever seated row': '1350',
  'chest supported dumbbell row': '0327',
  'chest-supported dumbbell row': '0327',
  'dumbbell incline row': '0327',
  'bent over barbell row': '0027',
  'bent-over barbell row': '0027',
  'barbell bent over row': '0027',
  'barbell bent-over row': '0027',
  'barbell row': '0027',
  'single arm dumbbell row': '0292',
  'bent over dumbbell row': '0292',
  'dumbbell bent over row': '0292',
  'one arm dumbbell row': '0292',
  'one-arm dumbbell row': '0292',
  'dumbbell one arm bent-over row': '0292',
  't-bar row': '0606',
  't bar row': '0606',
  'lever t bar row': '0606',
  'band one arm standing low row': '0988',
  'good mornings': '0044',
  'good morning': '0044',
  'barbell good morning': '0044',
  'inverted row': '0499',
  'inverted rows': '0499',
  'table inverted row': '0499',
  'table inverted rows': '0499',
  'doorway rows': '1773',
  'doorway row': '1773',
  'doorway towel row': '1773',
  'doorway towel rows': '1773',
  'towel row': '1773',
  'towel rows': '1773',
  'one arm towel row': '1773',
  'floor reverse push-up': '1772',
  'floor reverse push up': '1772',
  'reverse push-up': '1772',
  'elbow lift': '1772',
  'elbow lift - reverse push-up': '1772',
  hyperextension: '0489',
  hyperextensions: '0489',
  'cable face pull': '0233',
  'face pull': '0233',
  'cable rear delt row': '0233',
  'cable standing rear delt row (with rope)': '0233',
  'barbell deadlift': '0032',
  deadlift: '0032',
  'romanian deadlift': '0085',
  'barbell romanian deadlift': '0085',
  'dumbbell romanian deadlift': '1459',
  'dumbbell single leg deadlift': '1757',
  'single leg deadlift': '1757',

  // --- ٣. قاچ و ڕان و سمت (Legs, Quads, Hamstrings & Glutes) ---
  'barbell full squat': '0043',
  'barbell squat': '0043',
  'barbell back squat': '0043',
  'back squat': '0043',
  squat: '0043',
  squats: '0043',
  'barbell front squat': '0042',
  'front squat': '0042',
  'dumbbell goblet squat': '1760',
  'goblet squat': '1760',
  'bulgarian split squats': '0410',
  'bulgarian split squat': '0410',
  'dumbbell single leg split squat': '0410',
  'split squats': '2368',
  'split squat': '2368',
  'band single leg split squat': '1001',
  'bodyweight squat': '1685',
  'bodyweight squats': '1685',
  'air squat': '1685',
  'squat to overhead reach': '1685',
  'leg press': '1463',
  'sled 45 leg press': '1463',
  'sled 45 leg press (side pov)': '1463',
  'horizontal leg press': '2611',
  'lever horizontal one leg press': '2611',
  'lever leg extension': '0585',
  'leg extension': '0585',
  'leg extension machine': '0585',
  'seated leg curl': '0599',
  'lever seated leg curl': '0599',
  'leg curl': '0599',
  'lying leg curl': '0586',
  'lever lying leg curl': '0586',
  'dumbbell lunges': '0336',
  'dumbbell lunge': '0336',
  'walking lunges': '3470',
  'walking lunge': '3470',
  'bodyweight lunges': '3470',
  'bodyweight lunge': '3470',
  lunges: '3470',
  lunge: '3470',
  'forward lunge (male)': '3470',
  'glute bridges': '3013',
  'glute bridge': '3013',
  'single leg glute bridge': '3013',
  'low glute bridge on floor': '3013',
  'hip thrust': '1409',
  'barbell hip thrust': '1409',
  'barbell glute bridge': '1409',
  'standing calf raise': '1372',
  'barbell standing calf raise': '1372',
  'seated calf raise': '0594',
  'lever seated calf raise': '0594',
  'bodyweight standing calf raise': '1373',
  'bodyweight calf raises': '1373',
  'bodyweight calf raise': '1373',
  'dumbbell calf raises': '0417',
  'dumbbell calf raise': '0417',
  'dumbbell standing calf raise': '0417',
  'single leg dumbbell calf raise': '0409',
  'dumbbell single leg calf raise': '0409',
  'calf raises': '1373',
  'calf raise': '1373',

  // --- ٤. شان (Shoulders & Traps) ---
  'dumbbell shoulder press': '0405',
  'seated dumbbell shoulder press': '0405',
  'standing dumbbell shoulder press': '0405',
  'dumbbell seated shoulder press': '0405',
  'shoulder press': '0405',
  'seated dumbbell press': '0290',
  'dumbbell bench seated press': '0290',
  'machine shoulder press': '0587',
  'lever military press': '0587',
  'arnold press': '2137',
  'arnold dumbbell press': '2137',
  'dumbbell arnold press': '2137',
  'pike push-ups': '3662',
  'pike push-up': '3662',
  'pike pushups': '3662',
  'pike pushup': '3662',
  'pike-to-cobra push-up': '3662',
  'overhead barbell press': '0091',
  'overhead press': '0091',
  'barbell seated overhead press': '0091',
  'military press': '1456',
  'barbell military press': '1456',
  'barbell standing close grip military press': '1456',
  'band shoulder press': '0997',
  'dumbbell lateral raise': '0334',
  'lateral raise': '0334',
  'cable lateral raise': '0178',
  'band front lateral raise': '0977',
  'dumbbell front raise': '0310',
  'front raise': '0310',
  'reverse pec deck': '0602',
  'lever seated reverse fly': '0602',
  'dumbbell shrugs': '0406',
  'dumbbell shrug': '0406',
  'barbell shrug': '0095',
  'band shrug': '1018',

  // --- ٥. قۆڵ: بایسێپس و باسک (Biceps & Forearms) ---
  'barbell bicep curl': '1629',
  'barbell biceps curl': '1629',
  'barbell curl': '1629',
  'barbell standing wide grip biceps curl': '1629',
  'dumbbell biceps curl': '0294',
  'dumbbell bicep curl': '0294',
  'dumbbell bicep curls': '0294',
  'dumbbell biceps curls': '0294',
  'bicep curl': '0294',
  'biceps curl': '0294',
  'bicep curls': '0294',
  'biceps curls': '0294',
  'bodyweight biceps curl': '1770',
  'bodyweight bicep curl': '1770',
  'bodyweight bicep curls': '1770',
  'biceps leg concentration curl': '1770',
  'bodyweight side lying biceps curl': '1769',
  'dumbbell hammer curl': '0313',
  'hammer curl': '0313',
  'dumbbell concentration curl': '0297',
  'incline dumbbell biceps curl': '0315',
  'incline dumbbell curl': '0315',
  'dumbbell incline biceps curl': '0315',
  'preacher curl': '0070',
  'barbell preacher curl': '0070',
  'ez bar preacher curl': '0070',
  'ez-bar preacher curl': '0070',
  'cable bicep curl': '0868',
  'cable biceps curl': '0868',
  'cable curl': '0868',
  'band alternating biceps curl': '0968',
  'barbell wrist curl': '0126',

  // --- ٦. قۆڵ: ترایسێپس (Triceps) ---
  'triceps rope pushdown': '0200',
  'cable rope pushdown': '0200',
  'rope pushdown': '0200',
  'cable pushdown (with rope attachment)': '0200',
  'cable pushdown': '0201',
  'tricep pushdown': '0201',
  'skull crushers': '0060',
  'skull crusher': '0060',
  'barbell skull crusher': '0060',
  'barbell lying triceps extension skull crusher': '0060',
  'ez-bar skullcrusher': '1748',
  'ez bar skullcrusher': '1748',
  'ez bar lying close grip triceps extension behind head': '1748',
  'overhead dumbbell triceps extension': '2188',
  'overhead dumbbell tricep extension': '2188',
  'dumbbell triceps extension': '2188',
  'dumbbell seated triceps extension': '2188',
  'overhead cable triceps extension': '0194',
  'overhead triceps extension': '0194',
  'cable overhead triceps extension (rope attachment)': '0194',
  'bench dips': '0129',
  'bench dip': '0129',
  'chair dips': '0129',
  'chair dip': '0129',
  'bench dip (knees bent)': '0129',
  'close grip bench press': '0030',
  'barbell close-grip bench press': '0030',

  // --- ٧. سک و ناوقەد (Core & Abs) ---
  plank: '0464',
  'scientific plank hold': '0464',
  'core plank hold': '0464',
  'plank hold': '0464',
  'front plank': '0464',
  'front plank with twist': '0464',
  'cable rope crunch': '0175',
  'cable crunch': '0175',
  'cable kneeling crunch': '0175',
  'cable woodchopper': '0243',
  woodchoppers: '0243',
  'cable twist': '0243',
  crunches: '0274',
  'abdominal crunches': '0274',
  'crunch floor': '0274',
  'lying leg raises': '0620',
  'lying leg raise': '0620',
  'floor leg raises': '0620',
  'floor leg raise': '0620',
  'leg raises': '0620',
  'leg raise': '0620',
  'lying leg raise flat bench': '0620',
  'lying leg-hip raise': '0865',
  'reverse crunch': '0872',
  'hanging leg raises': '0472',
  'hanging leg raise': '0472',
  'russian twists': '0687',
  'russian twist': '0687',

  // --- ٨. کاردیۆ (Cardio) ---
  'treadmill interval running': '0684',
  'treadmill running': '0684',
  'treadmill run': '0684',
  treadmill: '0684',
  'treadmill intervals': '0684',
  'interval running': '0684',
  'interval run': '0684',
  running: '0684',
  run: '0684',
  jogging: '0684',
  jog: '0684',
  'run (equipment)': '0684',
  'outdoor run': '0685',
  'outdoor running': '0685',
  'treadmill walking': '3666',
  'walking on incline treadmill': '3666',
  'incline treadmill': '3666',
  'incline treadmill walk': '3666',
  'incline treadmill walking': '3666',
  'stationary bike': '0798',
  'stationary bike walk': '0798',
  cycling: '0798',
  cycle: '0798',
  'exercise bike': '0798',
  'spin bike': '2138',
  'stationary bike run': '2138',
  'stationary bike run v. 3': '2138',
  'jump rope': '2612',
  'skipping rope': '2612',
  elliptical: '2141',
  'cross trainer': '2141',
  'elliptical cross trainer': '2141',
  'walk elliptical cross trainer': '2141',
  burpee: '1160',
  burpees: '1160',
  'mountain climber': '0630',
  'mountain climbers': '0630',
  'jumping jacks': '3224',
  'jack jump (male)': '3224',
  'star jump': '3223',
  'star jump (male)': '3223',
};

const FORBIDDEN_FALLBACK_PATTERNS = [
  'on knees',
  'kneeling',
  'bosu',
  'stability ball',
  'exercise ball',
  'with twist',
  'yoga pose',
  'wall',
  'throw down',
];

// ٢٣ فایلی پشتڕاستکراوی ناو public/exercises/
const LOCAL_EXERCISE_IDS = new Set([
  '0129', '0274', '0283', '0464', '0489', '0620', '0630', '0662',
  '0687', '0865', '0872', '1160', '1373', '1685', '1769', '1770',
  '1772', '1773', '2368', '3013', '3224', '3470', '3662',
]);

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

function normalizeLookupText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripParentheticalNotes(str) {
  return String(str || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// دیاریکردنی تەنها ١ بەشی سەرەکی جەستە (bodyPart) بە ستانداردی توند
function inferStrictBodyPart(cleanName, muscleHint = '') {
  const hint = String(muscleHint || '').toLowerCase();
  const isReverse = cleanName.includes('reverse');
  const isChestSupported = cleanName.includes('chest supported') || cleanName.includes('chest-supported');
  const isUpright = cleanName.includes('upright');

  if (/\bwrist\s+curl\b|\bforearm\b/.test(cleanName)) return 'lower arms';
  if (/\bcalf\b|\bcalves\b/.test(cleanName) || hint.includes('پوز') || hint.includes('سۆڵە')) return 'lower legs';

  if (/\b(deadlift|good\s+morning|squat|lunge|leg\s+press|leg\s+extension|leg\s+curl|hamstring|quad|glute|hip\s+thrust)\b/.test(cleanName)) {
    return 'upper legs';
  }

  if (/\b(close[- ]?grip\s+bench|neutral\s+grip\s+bench|diamond\s+push|bench\s+dip|tricep|triceps|pushdown|skull\s?crusher|bicep|biceps|hammer\s+curl|preacher\s+curl|concentration\s+curl)\b/.test(cleanName)) {
    return 'upper arms';
  }
  if (/\bcurl\b/.test(cleanName) && !cleanName.includes('leg') && !cleanName.includes('wrist')) {
    return 'upper arms';
  }

  if (/\b(shoulder|delt|lateral\s+raise|front\s+raise|reverse\s+fly|reverse\s+pec|face\s+pull|rear\s+delt|arnold|overhead\s+press|military\s+press|upright\s+row|shrug|trap)\b/.test(cleanName)) {
    return 'shoulders';
  }

  if (
    (/\b(chest|pectoral|bench\s+press|chest\s+press|chest\s+fly|crossover|push-?up)\b/.test(cleanName) || (/\bpec\b/.test(cleanName) && !isReverse)) &&
    !isReverse &&
    !isChestSupported
  ) {
    return 'chest';
  }

  if (
    (/\b(lat|pulldown|pull-?up|chin-?up|row|hyperextension|back\s+extension|reverse\s+push)\b/.test(cleanName) || isChestSupported) &&
    !isUpright &&
    !cleanName.includes('rear delt')
  ) {
    return 'back';
  }

  if (/\b(crunch|plank|leg\s+raise|russian\s+twist|sit-?up|woodchopper|cable\s+twist|ab\s+wheel|abs|oblique|core)\b/.test(cleanName)) {
    return 'waist';
  }

  if (/\b(bike|cycling|treadmill|elliptical|jump\s+rope|skipping|burpee|mountain\s+climber|jumping\s+jack|running|jogging|cardio)\b/.test(cleanName)) {
    return 'cardio';
  }

  // ئەگەر ناوەکە خۆی هیچی دەرنەخست، تەنها ئینگلیزی تەواو بەبێ هینتی سادە ناکەین بە گومان
  if (hint && cleanName.split(' ').length >= 2) {
    if (hint.includes('سنگ') || hint.includes('chest') || hint.includes('صدر')) return 'chest';
    if (hint.includes('پشت') || hint.includes('back') || hint.includes('ظهر')) return 'back';
    if (hint.includes('شان') && !hint.includes('پشتی شان')) return 'shoulders';
    if (hint.includes('ورگ') || hint.includes('سک') || hint.includes('کەمەر')) return 'waist';
    if (hint.includes('کاردیۆ') || hint.includes('cardio')) return 'cardio';
  }

  return '';
}

// دیاریکردنی ئامێری داواکراو (Equipment) بە شێوەی یەکلاکەرەوە
function inferStrictEquipment(cleanName) {
  if (/\bsmith\b/.test(cleanName)) return ['smith machine'];
  if (/\bez[- ]?bar\b/.test(cleanName)) return ['ez barbell', 'barbell'];
  if (/\bbarbell\b/.test(cleanName)) return ['barbell', 'olympic barbell'];
  if (/\bdumbbell\b/.test(cleanName)) return ['dumbbell'];
  if (/\bkettlebell\b/.test(cleanName)) return ['kettlebell'];
  if (/\bcable\b/.test(cleanName)) return ['cable'];
  if (/\bband\b|\bresistance\s+band\b/.test(cleanName)) return ['band', 'resistance band'];
  if (/\belliptical\b/.test(cleanName)) return ['elliptical machine'];
  if (/\bbike\b|\bcycling\b/.test(cleanName)) return ['stationary bike', 'leverage machine'];
  if (/\bjump\s+rope\b|\bskipping\s+rope\b/.test(cleanName)) return ['rope'];
  if (/\bmachine\b|\blever\b|\bsled\b|\bpec\s+deck\b/.test(cleanName)) return ['leverage machine', 'sled machine'];
  if (/\bbody\s?weight\b|\bpush-?up\b|\bpull-?up\b|\bchin-?up\b|\bplank\b|\bhyperextension\b|\bburpee\b|\bmountain\s+climber\b|\bjumping\s+jack\b|\binverted\s+row\b/.test(cleanName)) {
    return ['body weight'];
  }
  return [];
}

// کلیلی جوڵەی سەرەکی (Primary Movement Keyword)
const STRICT_MOVEMENT_RULES = [
  { key: 'pulldown', test: (c) => /\bpulldown\b/.test(c), matchItem: (n) => /\bpulldown\b/.test(n) },
  { key: 'pull-up', test: (c) => /\bpull-?up\b/.test(c), matchItem: (n) => /\bpull-?up\b/.test(n) },
  { key: 'chin-up', test: (c) => /\bchin-?up\b/.test(c), matchItem: (n) => /\bchin-?up\b/.test(n) },
  { key: 'row', test: (c) => /\brow\b/.test(c), matchItem: (n) => /\brow\b/.test(n) },
  { key: 'press', test: (c) => /\bpress\b|\bpush-?up\b/.test(c), matchItem: (n) => /\bpress\b|\bpush-?up\b|\bpush up\b/.test(n) },
  { key: 'fly', test: (c) => /\bfly\b|\bcrossover\b|\bpec\s+deck\b/.test(c), matchItem: (n) => /\bfly\b|\bcrossover\b/.test(n) },
  { key: 'curl', test: (c) => /\bcurl\b/.test(c), matchItem: (n) => /\bcurl\b/.test(n) },
  { key: 'extension', test: (c) => /\bextension\b|\bpushdown\b|\bskull\s?crusher\b|\bhyperextension\b/.test(c), matchItem: (n) => /\bextension\b|\bpushdown\b|\bskull\s?crusher\b|\bhyperextension\b/.test(n) },
  { key: 'squat', test: (c) => /\bsquat\b/.test(c), matchItem: (n) => /\bsquat\b/.test(n) },
  { key: 'lunge', test: (c) => /\blunge\b/.test(c), matchItem: (n) => /\blunge\b/.test(n) },
  { key: 'deadlift', test: (c) => /\bdeadlift\b/.test(c), matchItem: (n) => /\bdeadlift\b/.test(n) },
  { key: 'raise', test: (c) => /\braise\b/.test(c), matchItem: (n) => /\braise\b/.test(n) },
  { key: 'crunch', test: (c) => /\bcrunch\b/.test(c), matchItem: (n) => /\bcrunch\b/.test(n) },
  { key: 'shrug', test: (c) => /\bshrug\b/.test(c), matchItem: (n) => /\bshrug\b/.test(n) },
  { key: 'dip', test: (c) => /\bdip\b/.test(c), matchItem: (n) => /\bdip\b/.test(n) },
  { key: 'plank', test: (c) => /\bplank\b/.test(c), matchItem: (n) => /\bplank\b/.test(n) },
];

// =========================================================================
// دۆزینەوەی وەرزش بە پێوەری توندی سفری گومان (Zero-Guessing 4-Priority Resolver)
// Priority 1: Exact exerciseId lookup
// Priority 2: Verified CURATED_EXERCISE_MAP lookup on canonicalName
// Priority 3: Strict Multi-Factor Match (bodyPart + equipment + primary movement keyword ALL required)
// Priority 4: Return null (Safe Fallback -> UI renders clean anatomical badge/icon)
// =========================================================================
export function matchExerciseInIndex(exerciseOrName, indexList, targetMuscleHint = '', preferredExerciseId = '') {
  if (!indexList || indexList.length === 0) return null;

  const isObj = exerciseOrName && typeof exerciseOrName === 'object';
  const candidateId = String(preferredExerciseId || (isObj ? exerciseOrName.exerciseId : '') || '').trim();
  const muscleHint = targetMuscleHint || (isObj ? (exerciseOrName.muscle || exerciseOrName.target || '') : '');
  const rawName = isObj
    ? (exerciseOrName.canonicalName || exerciseOrName.englishName || exerciseOrName.nameEn || exerciseOrName.name || '')
    : String(exerciseOrName || '');

  // Priority 1: Exact exerciseId lookup in indexList
  if (candidateId) {
    const byId = indexList.find((item) => item.id === candidateId);
    if (byId) return byId;
  }

  const clean = normalizeLookupText(rawName);
  if (!clean) return null;
  const cleanDashedAsSpace = clean.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const strippedBase = normalizeLookupText(stripParentheticalNotes(rawName));
  const strippedBaseSpace = strippedBase.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

  // Priority 2: Exact Verified CURATED_EXERCISE_MAP lookup (or exact canonical name in indexList)
  const exactKeysToTry = [clean, cleanDashedAsSpace, strippedBase, strippedBaseSpace].filter(Boolean);
  for (const key of exactKeysToTry) {
    const mappedId = CURATED_EXERCISE_MAP[key];
    if (mappedId) {
      const byCurated = indexList.find((item) => item.id === mappedId);
      if (byCurated) return byCurated;
    }
    const exactIndexItem = indexList.find((item) => item.name.toLowerCase() === key);
    if (exactIndexItem) return exactIndexItem;
  }

  // Priority 3: Strict Multi-Factor Match requiring ALL THREE simultaneously:
  // (a) Exact bodyPart + (b) Matching equipment + (c) Exact primary movement keyword
  const cleanSpace = cleanDashedAsSpace;
  const expectedBodyPart = inferStrictBodyPart(cleanSpace, muscleHint);
  const expectedEquipments = inferStrictEquipment(cleanSpace);
  const requestedMv = STRICT_MOVEMENT_RULES.find((r) => r.test(cleanSpace));

  if (!expectedBodyPart || expectedEquipments.length === 0 || !requestedMv) {
    return null;
  }

  const isFloorRequested = cleanSpace.includes('floor');
  const isInclineRequested = cleanSpace.includes('incline');
  const isDeclineRequested = cleanSpace.includes('decline');
  const isReverseRequested = cleanSpace.includes('reverse');
  const isUprightRequested = cleanSpace.includes('upright');
  const isLateralRequested = cleanSpace.includes('lateral');
  const isFrontRequested = cleanSpace.includes('front');
  const isSeatedRequested = cleanSpace.includes('seated');
  const isLyingRequested = cleanSpace.includes('lying');
  const isOverheadRequested = cleanSpace.includes('overhead');
  const isBulgarianRequested = cleanSpace.includes('bulgarian');
  const isKneeRequested = cleanSpace.includes('knee');
  const isBallRequested = cleanSpace.includes('ball');
  const isTwistRequested = cleanSpace.includes('twist');

  const stopWords = new Set(['the', 'and', 'with', 'for', 'on', 'in', 'to', 'grip', 'safe', 'range']);
  const tokens = cleanSpace.split(' ').filter((w) => w.length > 2 && !stopWords.has(w));
  if (tokens.length === 0) return null;

  let bestMatch = null;
  let bestScore = -1;

  for (const item of indexList) {
    const itemName = String(item.name || '').toLowerCase();
    const itemBodyPart = getItemBodyPart(item);
    const itemEquip = String(item.equipment || '').toLowerCase().trim();

    // 3a) Exact bodyPart match
    if (itemBodyPart !== expectedBodyPart) continue;

    // 3b) Exact equipment match
    if (!expectedEquipments.includes(itemEquip)) continue;

    // 3c) Exact primary movement keyword match
    if (!requestedMv.matchItem(itemName)) continue;

    // Strict directional / biomechanics guards (zero loose guesses)
    if (isFloorRequested && !itemName.includes('floor')) continue;
    if (isInclineRequested && !itemName.includes('incline')) continue;
    if (isDeclineRequested && !itemName.includes('decline')) continue;
    if (isUprightRequested !== itemName.includes('upright')) continue;
    if (isReverseRequested !== itemName.includes('reverse')) continue;
    if (isLateralRequested && !itemName.includes('lateral')) continue;
    if (isFrontRequested && !itemName.includes('front')) continue;
    if (isSeatedRequested && itemName.includes('standing')) continue;
    if (isLyingRequested && !itemName.includes('lying')) continue;
    if (isOverheadRequested && !itemName.includes('overhead') && !itemName.includes('behind head')) continue;
    if (isBulgarianRequested && !itemName.includes('single leg split') && !itemName.includes('bulgarian')) continue;

    let hasForbiddenNoise = false;
    for (const forbidden of FORBIDDEN_FALLBACK_PATTERNS) {
      if (itemName.includes(forbidden)) {
        if (forbidden === 'kneeling' || forbidden === 'on knees') {
          if (!isKneeRequested) hasForbiddenNoise = true;
        } else if (forbidden.includes('ball')) {
          if (!isBallRequested) hasForbiddenNoise = true;
        } else if (forbidden === 'with twist') {
          if (!isTwistRequested) hasForbiddenNoise = true;
        } else {
          hasForbiddenNoise = true;
        }
      }
    }
    if (hasForbiddenNoise) continue;

    let matchedWords = 0;
    let score = 0;
    if (itemName === cleanSpace) score += 100;
    if (itemName.includes(cleanSpace)) score += 40;

    for (const w of tokens) {
      if (new RegExp(`\\b${w}\\b`).test(itemName)) {
        score += 12;
        matchedWords++;
      }
    }

    const requiredWords = Math.min(3, tokens.length);
    if (matchedWords < requiredWords && !itemName.includes(cleanSpace)) continue;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  // Priority 4: Return null unless confidence is 100% high
  return bestScore >= 24 ? bestMatch : null;
}

// پشکنەری خێرای هاوکات (Synchronous) بۆ ئەوەی مەکینەی زانستی و سێرڤەر بتوانن exerciseId جێگیر بکەن
export function resolveVerifiedExerciseEntry(exerciseOrName, targetMuscleHint = '', preferredExerciseId = '') {
  const match = matchExerciseInIndex(
    exerciseOrName,
    VERIFIED_EXERCISES_CATALOG.map((item) => ({
      id: item.exerciseId,
      name: item.canonicalName,
      bodyPart: item.bodyPart,
      target: item.target,
      equipment: item.equipment,
      gif: item.gif,
    })),
    targetMuscleHint,
    preferredExerciseId
  );
  if (!match) return null;
  return VERIFIED_EXERCISES_BY_ID[match.id] || {
    exerciseId: match.id,
    canonicalName: match.name,
    bodyPart: match.bodyPart,
    target: match.target,
    equipment: match.equipment,
    gif: match.gif,
  };
}

const blobUrlMemoryCache = new Map();

// وەرگرتنی لینکی میدیا (Priority 1: exerciseId -> Local/Remote GIF)
export async function getExerciseMediaUrl(exerciseName, targetMuscle = '', exerciseId = '') {
  const nameStr = typeof exerciseName === 'object' && exerciseName !== null
    ? (exerciseName.canonicalName || exerciseName.englishName || exerciseName.nameEn || exerciseName.name || '')
    : String(exerciseName || '');
  const idStr = String(exerciseId || (typeof exerciseName === 'object' && exerciseName !== null ? exerciseName.exerciseId : '') || '').trim();

  if (!idStr && !nameStr) return null;

  const cacheKey = `${idStr}::${nameStr.toLowerCase().trim()}::${String(targetMuscle || '').toLowerCase().trim()}`;
  if (blobUrlMemoryCache.has(cacheKey)) {
    return blobUrlMemoryCache.get(cacheKey);
  }

  const index = await getExerciseIndex();
  const match = matchExerciseInIndex(nameStr, index, targetMuscle, idStr);
  if (!match) return null;

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

    const entries = new Map();
    for (const day of weeklyPlan) {
      if (day && day.exercises && Array.isArray(day.exercises)) {
        for (const ex of day.exercises) {
          const name = ex.canonicalName || ex.englishName || ex.nameEn || ex.name || '';
          const id = ex.exerciseId || '';
          const key = `${id}::${name}`;
          if ((id || name) && !entries.has(key)) {
            entries.set(key, { id, name, muscle: ex.muscle || ex.target || '' });
          }
        }
      }
    }

    const cache = await caches.open(CACHE_NAME);

    for (const entry of entries.values()) {
      const match = matchExerciseInIndex(entry.name, index, entry.muscle, entry.id);
      if (match && match.gif && !LOCAL_EXERCISE_IDS.has(match.id)) {
        const url = `${RAW_BASE_URL}${match.gif}`;
        const isCached = await cache.match(url);
        if (!isCached) {
          try {
            const resp = await fetch(url, { mode: 'cors' });
            if (resp && resp.ok) {
              await cache.put(url, resp);
            }
          } catch (fetchErr) {}
        }
      }
    }
  } catch (err) {
    console.warn('Failed to cache workout media in background:', err);
  }
}
