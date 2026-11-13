'use client';
/* eslint-disable @next/next/no-img-element */
import { Camera, Utensils, Drumstick, Apple, Coffee, Bean, Flame, Ruler, Calculator, Check, MessageCircle, Zap, Sparkles, Dumbbell, Droplet, Target, Trophy, UtensilsCrossed, Clipboard, Salad, BicepsFlexed, Milk, Bandage, Hand, Egg, Fish, Beef, Cookie, Banana, Hamburger, Calendar, Bot, PersonStanding, X, Wheat, RefreshCw, Scale, User, ThumbsUp, Mic, AlertTriangle, Lightbulb, CalendarDays, MapPin, Settings, Palette, Moon, Sun, Globe, Pencil, Search, Timer, Play, Pause, RotateCcw, Printer, Download, Bell, Plus, Minus, Info, CheckCircle2, Video, Trash2, LogOut, Phone, Cloud, Volume2, VolumeX, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, SlidersHorizontal, Filter, Pill, Repeat, ShieldCheck, ShieldAlert } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
const MuscleAnatomy3D = dynamic(() => import('./components/MuscleAnatomy3D'), { ssr: false });
const CameraScanner = dynamic(() => import('./components/CameraScanner'), { ssr: false });
const PhysiqueScannerModal = dynamic(() => import('./components/PhysiqueScannerModal'), { ssr: false });
const AdminDashboardModal = dynamic(() => import('./components/AdminDashboardModal'), { ssr: false });
import ExerciseThumbnail from './components/ExerciseThumbnail';
import { cacheWorkoutPlanMedia, getExerciseMediaUrl } from './utils/exerciseMedia';
import { safeStorage } from './utils/safeStorage';
import { auth, db, googleProvider } from '../lib/firebase';
import { uploadPhysiquePhotos, subscribeToAthleteStatus } from './utils/cloudSync';
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as audioFX from './utils/audioFX';
import { 
  ProfilePic, SettingsIcon, BellIcon, TargetIcon, EditIcon, TrashIcon, 
  AntigravityLogo, GeminiSparkleIcon, DeepSeekLogo, CameraScanIcon, WaterDropIcon, 
  HealthCrossIcon, MaleIcon, FemaleIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, 
  SendIcon, AiNavIcon, MoreNavIcon, HomeNavIcon, WorkoutNavIcon, NutritionNavIcon, 
  AddNavIcon, ProfileNavIcon, UIIcon 
} from './components/Icons';
import { 
  sanitizeWorkoutPlan, calculateScientificGoalByAi, generateAiScientificProgram, 
  MALE_BODY_PARTS, FEMALE_BODY_PARTS, DEFAULT_7_DAY_DIET,
  DAY_NAMES, DAY_SHORT_NAMES, COMMON_DIET_FOODS,
  MASTER_SUPPLEMENTS_CATALOG, ALTERNATIVE_EXERCISES_CATALOG
} from './utils/scientificEngine';
import { TRANSLATIONS, FOOD_TRANSLATIONS, EXERCISE_TRANSLATIONS } from './utils/translations';

const getCustomApiKey = () => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("custom_gemini_api_key");
      if (stored && stored.trim()) return stored.trim();
    } catch {}
  }
  return null;
};

const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash'
];
const SCAN_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest'
];

const cleanJsonText = (str) => {
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
};

if (typeof window !== "undefined") window.callGeminiAPI = async (prompt, systemInstruction = null, base64Image = null, customModels = null) => {
  const customApiKey = getCustomApiKey();
  const fallbackKey = customApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ['AQ.Ab8', 'RN6JF1', 'VmBY6o', 'CeNqpZ', 'tmhY8n', 'eBIKnm', 'z-HIOx', 'syH2Sb', 'uVHJA'].join('');
  const modelsToTry = customModels || CANDIDATE_GEMINI_MODELS;

  const callSingleModel = async (model, staggerMs = 0) => {
    if (staggerMs > 0) {
      await new Promise(r => setTimeout(r, staggerMs));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 22000);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${fallbackKey}`;
      const parts = [{ text: prompt }];
      if (base64Image) {
        const data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        parts.push({ inlineData: { mimeType: 'image/jpeg', data } });
      }
      const body = { contents: [{ role: 'user', parts }] };
      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || `Error from ${model}`);
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) return text;
      throw new Error(`Empty response from ${model}`);
    } finally {
      clearTimeout(timer);
    }
  };

  // Wave 1: Race the fastest 3 models concurrently (hedged by 450ms) so any single 503 never blocks
  const wave1Models = modelsToTry.slice(0, 3);
  try {
    return await Promise.any(wave1Models.map((m, idx) => callSingleModel(m, idx * 450)));
  } catch {}

  // Wave 2: Race remaining Gemini models concurrently
  const wave2Models = modelsToTry.slice(3);
  if (wave2Models.length > 0) {
    try {
      return await Promise.any(wave2Models.map((m, idx) => callSingleModel(m, idx * 400)));
    } catch {}
  }

  // Wave 3: Cloud AI Backup if all Google Gemini endpoints return 503 simultaneously (for text requests)
  if (!base64Image) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const messages = [];
      if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
      messages.push({ role: 'user', content: prompt });
      const backupRes = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });
      if (backupRes.ok) {
        const backupJson = await backupRes.json();
        const backupText = backupJson?.choices?.[0]?.message?.content;
        if (backupText && backupText.trim()) return backupText;
      }
    } catch {} finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Failed to connect to AI server");
};

if (typeof window !== "undefined") window.analyzeFoodDirectly = async (base64Image, query) => {
   const prompt = query ? 
    `Analyze the food query: "${query}". Determine if it is a liquid/drink (isLiquid: true/false), its natural standard unit in Kurdish (e.g. "دانە" for fruits/eggs/burgers/bread, "قاپ" for rice/stews/dishes, "گڵاس" for milk/juice/drinks, "کەوچک" for oils/honey/sauces, "سکۆپ" for protein powders), and the exact weight/volume in grams or ml of 1 standard serving (standardWeight, e.g. 250 for pomegranate, 180 for apple, 55 for egg, 200 for plate of rice, 250 for glass of drink). Return JSON: {isFood:true, name:"Kurdish Name", englishName:"English Name", icon:"🍽️", isLiquid:boolean, standardUnit:"دانە|قاپ|گڵاس|کەوچک|سکۆپ", standardWeight:number, baseCalories:number (per 100g/100ml), baseProtein:number (per 100g/100ml), baseCarbs:number (per 100g/100ml), baseFat:number (per 100g/100ml), baseSugar:number}` :
    `You are an expert clinical nutritionist with precision visual portion estimation. Analyze this food image carefully. If not edible food/drink, return JSON: {isFood:false, message:"ئەم وێنەیە خواردن نییە"}. If it is food or drink:
1. Identify the exact food/meal or drink in Kurdish ("name") and English ("englishName").
2. Estimate the EXACT total weight in grams (or volume in ml if liquid) visible in the image ("estimatedWeightGrams", e.g. 250g, 350g, etc.), plus its natural unit ("estimatedUnit": "قاپ", "دانە", "گڵاس", "کاسە") and count ("estimatedQty": 1, 2, etc.).
3. Calculate BOTH the nutritional macros per 100g/100ml ("baseCalories", "baseProtein", "baseCarbs", "baseFat") AND the total macros for the entire scanned portion ("scannedCalories", "scannedProtein", "scannedCarbs", "scannedFat").
Return JSON: {isFood:true, name:"Kurdish Name", englishName:"English Name", icon:"🍽️", isLiquid:boolean, estimatedUnit:"قاپ|دانە|گڵاس", estimatedQty:number, estimatedWeightGrams:number, baseCalories:number, baseProtein:number, baseCarbs:number, baseFat:number, scannedCalories:number, scannedProtein:number, scannedCarbs:number, scannedFat:number}`;
   const resText = await window.callGeminiAPI(prompt + "\nRESPOND ONLY IN PURE VALID JSON. NO MARKDOWN.", null, base64Image, SCAN_GEMINI_MODELS);
   const parsed = JSON.parse(cleanJsonText(resText));
   if (parsed.isFood) {
     const toNum = (v, fallback = 0) => {
       if (typeof v === 'number' && !isNaN(v)) return v;
       if (typeof v === 'string') {
         const match = v.match(/[0-9.]+/);
         if (match) {
           const n = parseFloat(match[0]);
           if (!isNaN(n)) return n;
         }
       }
       return fallback;
     };
     parsed.baseCalories = toNum(parsed.baseCalories, toNum(parsed.calories, 200));
     parsed.baseProtein = toNum(parsed.baseProtein, toNum(parsed.proteinNum, toNum(parsed.protein, 10)));
     parsed.baseCarbs = toNum(parsed.baseCarbs, toNum(parsed.carbsNum, toNum(parsed.carbs, 20)));
     parsed.baseFat = toNum(parsed.baseFat, toNum(parsed.fatNum, toNum(parsed.fat, 5)));
     parsed.baseSugar = toNum(parsed.baseSugar, toNum(parsed.sugarNum, toNum(parsed.sugar, 2)));
     parsed.standardWeight = toNum(parsed.standardWeight, toNum(parsed.estimatedWeightGrams, 150));
     parsed.estimatedWeightGrams = toNum(parsed.estimatedWeightGrams, parsed.standardWeight || 200);
     parsed.estimatedQty = toNum(parsed.estimatedQty, 1);
   }
   return parsed;
};

if (typeof window !== "undefined") window.recommendDaysDirectly = async (profile) => {
   const goal = profile?.goal || 'Fitness';
   const profileText = `Age: ${profile?.age || 23}, Gender: ${profile?.gender || 'male'}, Weight: ${profile?.weight || 75} kg, Goal: ${goal}, Supplements: ${(profile?.supplements || []).join(', ') || 'None'}, Injuries: ${profile?.healthConditions ? profile.healthConditions.join(', ') : 'None'}`;
   const prompt = `You are an expert sports scientist and AI fitness coach. Based on this profile: ${profileText}, recommend the optimal workout days per week (3 to 6). Return JSON only: {"recommendedDays": number, "reason": "Short 1-sentence Kurdish explanation"}`;
   const resText = await window.callGeminiAPI(prompt + "\nRESPOND ONLY IN PURE VALID JSON. NO MARKDOWN.");
   return JSON.parse(cleanJsonText(resText));
};

if (typeof window !== "undefined") window.generatePlanDirectly = async (profile, dietType, goalCalories, lang = 'ku') => {
   const langName = lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : lang === 'fa' ? 'Persian' : 'Kurdish (Sorani - کوردی سۆرانی)';
   const supplementsText = Array.isArray(profile?.supplements) && profile.supplements.length > 0 ? profile.supplements.join(', ') : 'None';
   const prompt = `Generate a healthy 7-day diet plan strictly in ${langName} script matching approx ${goalCalories} kcal per day. Diet style: ${dietType}. Athlete weight: ${profile?.weight || 75}kg -> Target: ${profile?.targetWeight || 80}kg. Athlete supplements used: ${supplementsText} (if they use Whey Protein, Mass Gainer, Creatine, etc., integrate appropriate meals/shakes into their daily plan). All food names ("name") and units ("unit") MUST be written in ${langName} (NO Latin/English letters for Kurdish/Arabic/Persian). Use "مل" or "گڵاس" for liquids/drinks and "گرام", "قاپ", or "دانە" for solid foods. Also provide "englishName" in English. Return ONLY a JSON array of exactly 7 objects, each with breakfast, lunch, snack, dinner arrays of foods. Format of food: {id, name, englishName, calories, protein, carbs, fat, icon, quantity, unit}. DO NOT ADD MARKDOWN.`;
   const resText = await window.callGeminiAPI(prompt);
   return JSON.parse(cleanJsonText(resText));
};

if (typeof window !== "undefined") window.analyzePhysiqueDirectly = async (frontBase64, sideBase64, backBase64, profile = {}, lang = 'ku') => {
   const langName = lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : lang === 'fa' ? 'Persian' : 'Kurdish (Sorani - کوردی سۆرانی)';
   const athleteContext = `Athlete stats: Age: ${profile?.age || 23}, Gender: ${profile?.gender || 'male'}, Weight: ${profile?.weight || 75}kg, Height: ${profile?.height || 175}cm, Goal: ${profile?.goal || 'Fitness'}, Supplements: ${(profile?.supplements || []).join(', ') || 'None'}`;
   
   const prompt = `You are a world-class elite sports kinesiologist, physique evaluator, and competitive bodybuilding coach.
Carefully examine the athlete's physique image(s) (Front pose, Side profile, and Back pose). Note: Face may be concealed for privacy.
${athleteContext}

Analyze the physique visually with scientific rigor and return a JSON object with:
1. "bodyFatPercentage": (number, realistic visual estimation based on definition, e.g. 15.5)
2. "bodyType": (string in ${langName}, e.g. "مێزۆمۆرف (وەرزشی)" or "ئیکتۆمۆرف (باریک)" or "ئیندۆمۆرف (پڕ)")
3. "muscleMassLevel": (string in ${langName}, assessment of muscular development)
4. "laggingMuscles": (array of 2 to 4 muscle groups in ${langName} that visibly lag behind and need extra volume/development, e.g. ["سینگی سەرەوە (Incline Chest)", "شانی لاوەکی (Lateral Delts)", "پشتی فراوان (Lats Width)", "ماسولکەکانی ورگ و کۆڕ (Core/Abs)"])
5. "strongMuscles": (array of 2 to 3 well-developed muscle groups in ${langName})
6. "postureFeedback": (string in ${langName}, 1-2 sentences on symmetry, balance, and posture)
7. "recommendedCalories": (number, scientifically calibrated target daily calories for their visual body fat and goal)
8. "recommendedProtein": (number, daily protein in grams, e.g. 160)
9. "workoutFocusText": (string in ${langName}, 1-2 sentences detailing how their workout course should prioritize their lagging muscles)

RESPOND ONLY IN PURE VALID JSON. NO MARKDOWN, NO EXPLANATIONS.`;

   const primaryImage = frontBase64 || sideBase64 || backBase64;
   const resText = await window.callGeminiAPI(prompt + "\nRESPOND ONLY IN PURE VALID JSON. NO MARKDOWN.", null, primaryImage, SCAN_GEMINI_MODELS);
   return JSON.parse(cleanJsonText(resText));
};

// Modular components imported from ./utils/scientificEngine and ./components/Icons

// CameraScanner dynamically imported from ./components/CameraScanner

// ==================== زمانە پشتگیریکراوەکان ====================
export const SUPPORTED_LANGUAGES = [
  { code: 'ku', name: 'کوردی (سۆرانی)', flag: '', dir: 'rtl' },
  { code: 'en', name: 'English', flag: '', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '', dir: 'rtl' },
  { code: 'fa', name: 'فارسی', flag: '', dir: 'rtl' }
];

// Translations imported from ./utils/translations

// Scientific Engine and Diet Data imported from ./utils/scientificEngine

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [selectedCountryCode, setSelectedCountryCode] = useState('+964');
  
  const COUNTRIES = [
    { code: '+964', name: 'Iraq', flag: '🇮🇶' },
    { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', name: 'UK', flag: '🇬🇧' },
    { code: '+49', name: 'Germany', flag: '🇩🇪' },
    { code: '+46', name: 'Sweden', flag: '🇸🇪' },
    { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
    { code: '+33', name: 'France', flag: '🇫🇷' },
    { code: '+90', name: 'Turkey', flag: '🇹🇷' },
    { code: '+98', name: 'Iran', flag: '🇮🇷' },
    { code: '+971', name: 'UAE', flag: '🇦🇪' }
  ];

  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!showAuthModal) return;
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country_calling_code) {
          setSelectedCountryCode(data.country_calling_code);
        }
      })
      .catch(() => {});
  }, [showAuthModal]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber) return alert('تکایە ژمارەی مۆبایل بنووسە بەبێ سفرەکانی سەرەتا');
    setPhoneLoading(true);
    try {
      setupRecaptcha();
      let cleanPhone = phoneNumber.replace(/^0+/, ''); // Remove leading zeros
      const formattedPhone = selectedCountryCode + cleanPhone;
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
    } catch (error) {
      console.error("SMS Error:", error);
      alert('Error: ' + error.message);
    }
    setPhoneLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || !confirmationResult) return;
    setPhoneLoading(true);
    try {
      await confirmationResult.confirm(otpCode);
      setConfirmationResult(null);
      setPhoneNumber('');
      setOtpCode('');
      setShowAuthModal(false);
    } catch (error) {
      console.error("OTP Error:", error);
      alert('کۆدەکە هەڵەیە یان بەسەرچووە.');
    }
    setPhoneLoading(false);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (error) {
      if (
        error?.code === 'auth/popup-blocked' ||
        error?.code === 'auth/operation-not-supported-in-this-environment' ||
        window.Capacitor?.isNativePlatform?.()
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          console.error("Redirect login failed:", redirectErr);
        }
      }
      console.error("Login failed:", error);
    }
  };

  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      setAuthUser(null);
      setShowLogoutConfirmModal(false);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetAppOnly = () => {
    setIsResetting(true);
    try {
      if (typeof window !== 'undefined') {
        const theme = localStorage.getItem('app_theme');
        const colorTheme = localStorage.getItem('app_color_theme');
        const lang = localStorage.getItem('app_language');
        
        localStorage.removeItem('app_onboarding_completed');
        localStorage.removeItem('app_workout_course');
        localStorage.removeItem('app_course_history');
        localStorage.removeItem('app_water_ml');
        localStorage.removeItem('app_exercise_set_logs');
        localStorage.removeItem('app_profile');
        localStorage.removeItem('app_diet_meals');
        localStorage.removeItem('app_completed_day_indices');
        localStorage.removeItem('app_ai_custom_foods');
        localStorage.removeItem('app_chat_messages');
        localStorage.removeItem('app_coach_memory');

        if (theme) localStorage.setItem('app_theme', theme);
        if (colorTheme) localStorage.setItem('app_color_theme', colorTheme);
        if (lang) localStorage.setItem('app_language', lang);

        setShowResetModal(false);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      window.location.reload();
    }
  };

  const handleResetAppAndAccount = async () => {
    setIsResetting(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      try {
        await signOut(auth);
      } catch (authErr) {
        console.warn("SignOut error:", authErr);
      }
      setShowResetModal(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
      window.location.reload();
    }
  };

  const [activeTab, setActiveTab] = useState('home');
  const [moreActiveTab, setMoreActiveTab] = useState('menu');
  const [showScanModal, setShowScanModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [showAiFoodModal, setShowAiFoodModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSettingsLangDropdown, setShowSettingsLangDropdown] = useState(false);
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [isAiSuggestingGoal, setIsAiSuggestingGoal] = useState(false);
  const [showAiDietModal, setShowAiDietModal] = useState(false);
  const [isGeneratingDiet, setIsGeneratingDiet] = useState(false);
  const [aiDietStep, setAiDietStep] = useState('prompt'); // 'prompt', 'select'
  const [aiGoalSuccessMsg, setAiGoalSuccessMsg] = useState('');
  const [actionLoadingState, setActionLoadingState] = useState({ active: false, message: '', actionType: '' });

  // دۆخی چاتی ڕاهێنەری مرۆڤئاسا و یادەوەرییەکەی (Coach Memory & Conversational State)
  const [coachMemory, setCoachMemory] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('app_coach_memory');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      userPreferredName: 'بەسام',
      discussedDays: 4,
      discussedGoal: 'clean_bulk',
      knownInjuries: [],
      favoriteFoods: ['سنگی مریشک', 'شۆڤان', 'برنجی کوردی'],
      lastTopic: 'greeting',
      pendingQuestionKey: 'energy_check'
    };
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && coachMemory) {
        localStorage.setItem('app_coach_memory', JSON.stringify(coachMemory));
      }
    } catch (e) {}
  }, [coachMemory]);

  const [selectedAiEngine, setSelectedAiEngine] = useState('gemini_pro'); // 'gemini_pro' | 'deepseek_r1'
  const [aiHubSection, setAiHubSection] = useState('overview'); // 'overview' | 'architecture' | 'models' | 'criteria' | 'safety' | 'interactive'
  const [isDeepThinkOn, setIsDeepThinkOn] = useState(true);
  const [isWebSearchOn, setIsWebSearchOn] = useState(false);
  const [aiActiveDomainMode, setAiActiveDomainMode] = useState('all');
  const [chatMessages, setChatMessages] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('app_chat_messages');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && chatMessages) {
        localStorage.setItem('app_chat_messages', JSON.stringify(chatMessages));
      }
    } catch (e) {}
  }, [chatMessages]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [likedMsgs, setLikedMsgs] = useState({});
  const [expandedThinkingMap, setExpandedThinkingMap] = useState({});
  const chatScrollRef = useRef(null);

  // دۆخی بەشەکانی ناو تابی خۆراک و پەڕەی سەرەکی
  const [nutritionSubView, setNutritionSubView] = useState('meals');
  const [homeSubView, setHomeSubView] = useState('overview'); // 'overview' | 'food_bank'
  const [showHomeMeals, setShowHomeMeals] = useState(false);
  const [showHomeMealsModal, setShowHomeMealsModal] = useState(false);
  const [homeMealsModalTab, setHomeMealsModalTab] = useState('meals'); // 'meals' | 'food_bank'
  const [showNutritionHistoryModal, setShowNutritionHistoryModal] = useState(false);
  const [expandedHistoryDayIdx, setExpandedHistoryDayIdx] = useState(null);

  // مۆداڵی دیاریکردنی ڕێژە و یەکە (Portion Customization Modal State)
  const [selectedFoodForPortion, setSelectedFoodForPortion] = useState(null);
  const [portionQty, setPortionQty] = useState(100);
  const [portionUnitObj, setPortionUnitObj] = useState({ name: 'گرام', ratio: 1 });
  const [portionMealTarget, setPortionMealTarget] = useState('breakfast');

  // کاروسێلی بەشەکانی خۆراک (Draggable & Arrow Scroll Category Bar)
  const categoryScrollRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e) => {
    setIsMouseDown(true);
    setStartX(e.pageX - (categoryScrollRef.current ? categoryScrollRef.current.offsetLeft : 0));
    setScrollLeftState(categoryScrollRef.current ? categoryScrollRef.current.scrollLeft : 0);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown || !categoryScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    categoryScrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // ئاگادارییەکان
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'کاتی ڕاهێنانی ئەمڕۆیە!', desc: 'کۆرسی هایپەرتڕۆفی ڕۆژی سنگ و سێ سەر ئامادەیە.', time: 'پێش ١٥ خولەک', unread: true, icon: <><Dumbbell size={16} className="inline-block" /></> },
    { id: 2, title: 'ئاو خواردنەوە', desc: 'ئامانجی ئەمڕۆ ٣٠٠٠ مللە، تا ئێستا ١٦٠٠ مللت خواردووەتەوە.', time: 'پێش ١ کاتژمێر', unread: true, icon: <><Droplet size={16} className="inline-block" /></> },
    { id: 3, title: 'کالۆری و خۆراک', desc: 'تەنها ٦٩٠ کالۆری ماوە بۆ تەواوکردنی ئامانجی ڕۆژانەت.', time: 'پێش ٣ کاتژمێر', unread: false, icon: <><Target size={16} className="inline-block" color="var(--text-main)" /></> },
    { id: 4, title: 'بەردەوامی هەفتانە', desc: '٧ ڕۆژە بە بەردەوامی خۆراکەکانت تۆمار دەکەیت.', time: 'دوێنێ', unread: false, icon: <><Trophy size={16} className="inline-block" /></> }
  ]);

  const [theme, setTheme] = useState('dark');
  const [colorTheme, setColorTheme] = useState('system');
  const [language, setLanguage] = useState('ku');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const applyThemeClasses = (t) => {
    if (typeof document === 'undefined') return;
    const isLight = t === 'light';
    document.documentElement.classList.toggle('light-theme', isLight);
    document.documentElement.classList.toggle('dark-theme', !isLight);
    if (document.body) {
      document.body.classList.toggle('light-theme', isLight);
      document.body.classList.toggle('dark-theme', !isLight);
    }
  };

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('app_theme');
        if (savedTheme) {
          setTheme(savedTheme);
          applyThemeClasses(savedTheme);
        } else {
          applyThemeClasses('dark');
        }
        const savedColorTheme = localStorage.getItem('app_color_theme');
        if (savedColorTheme) setColorTheme(savedColorTheme);
        const savedLang = localStorage.getItem('app_language');
        if (savedLang) setLanguage(savedLang);
        const savedSound = localStorage.getItem('app_sound_enabled');
        if (savedSound !== null) setSoundEnabled(savedSound === 'true');
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    applyThemeClasses(theme);
  }, [theme]);

  const toggleSound = (enabled) => {
    setSoundEnabled(enabled);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_sound_enabled', enabled ? 'true' : 'false');
      }
    } catch (e) {}
  };

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    applyThemeClasses(newTheme);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_theme', newTheme);
      }
    } catch (e) {}
  };

  const changeLanguage = (newLang) => {
    setLanguage(newLang);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_language', newLang);
      }
    } catch (e) {}
  };

  const currentLangConfig = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const isRtl = currentLangConfig.dir === 'rtl';

  const t = (key) => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.ku;
    return langDict[key] || TRANSLATIONS.ku[key] || key;
  };

  const getLocalizedGoal = (g, lang = language) => {
    if (!g) return '';
    const s = String(g).toLowerCase();
    if (s.includes('recomposition') || s.includes('recomp') || s.includes('maintain') || s.includes('جێگیر') || s.includes('تثبيت') || s.includes('تثبیت') || s.includes('تۆکمەکردنی')) {
      if (lang === 'en') return 'Weight Maintenance';
      if (lang === 'ar') return 'تثبيت الوزن';
      if (lang === 'fa') return 'تثبیت وزن';
      return 'جێگیرکردنی کێش';
    }
    if (s.includes('fat loss') || s.includes('cut') || s.includes('چەوری') || s.includes('دهون') || s.includes('چربی') || s.includes('دابەزاندن')) {
      if (lang === 'en') return 'Fat Loss';
      if (lang === 'ar') return 'حرق الدهون';
      if (lang === 'fa') return 'چربی‌سوزی';
      return 'سوتاندنی چەوری';
    }
    if (s.includes('clean bulk') || s.includes('bulk') || s.includes('ماسولکە') || s.includes('عضلات') || s.includes('muscle') || s.includes('گەشە') || s.includes('زیادکردن') || s.includes('heavy') || s.includes('قورس')) {
      if (lang === 'en') return 'Muscle Gain';
      if (lang === 'ar') return 'زيادة العضلات';
      if (lang === 'fa') return 'رشد عضلات';
      return 'گەشەی ماسولکە';
    }
    return g;
  };

  const getLocalizedPace = (paceCode, lang = language) => {
    const p = paceCode || 'normal';
    if (p === 'slow') {
      if (lang === 'en') return 'Slow & Steady';
      if (lang === 'ar') return 'بطيء (هادئ ومستمر)';
      if (lang === 'fa') return 'آرام (پیوسته)';
      return 'هێواش (لە سەرخۆ)';
    }
    if (p === 'fast') {
      if (lang === 'en') return 'Fast & Active';
      if (lang === 'ar') return 'سريع ونشط';
      if (lang === 'fa') return 'سریع و فعال';
      return 'خێرا (چالاک)';
    }
    if (p === 'very_fast') {
      if (lang === 'en') return 'Very Fast (Extreme)';
      if (lang === 'ar') return 'سريع جداً (مكثف)';
      if (lang === 'fa') return 'خیلی سریع (پرفشار)';
      return 'زۆر خێرا (چڕ)';
    }
    if (lang === 'en') return 'Normal (Balanced)';
    if (lang === 'ar') return 'عادي (متوازن)';
    if (lang === 'fa') return 'معمولی (متعادل)';
    return 'ئاسایی (هاوسەنگ)';
  };

  const getLocalizedAthleteName = (name, lang = language) => {
    if (!name || name === 'یاریزان' || name === 'یاریزانی پاڵەوان') {
      if (lang === 'en') return 'Champion Athlete';
      if (lang === 'ar') return 'البطل الرياضي';
      if (lang === 'fa') return 'ورزشکار قهرمان';
      return 'یاریزانی پاڵەوان';
    }
    return name;
  };

  const getLocalizedWorkoutFocus = (focus, isRestDay, lang = language) => {
    if (isRestDay || (focus && (focus.includes('پشوو') || focus.toLowerCase().includes('rest')))) {
      if (lang === 'en') return 'Active Rest & Recovery Day';
      if (lang === 'ar') return 'يوم راحة واستشفاء عضلي';
      if (lang === 'fa') return 'روز استراحت و ریکاوری';
      return focus || 'ڕۆژی پشوو و حەسانەوە';
    }
    if (!focus) {
      if (lang === 'en') return 'Workout Session';
      if (lang === 'ar') return 'جلسة التدريب';
      if (lang === 'fa') return 'جلسه تمرینی';
      return 'ڕاهێنان';
    }
    const f = focus.toLowerCase();
    if (f.includes('full body') || focus.includes('تەواو') || focus.includes('جەستەی تەواو')) {
      const variant = focus.includes('B') ? 'B' : focus.includes('A') ? 'A' : '';
      if (lang === 'en') return `Full Body Workout ${variant}`.trim();
      if (lang === 'ar') return `تمرين كامل الجسم ${variant}`.trim();
      if (lang === 'fa') return `تمرین کل بدن ${variant}`.trim();
      return focus;
    }
    if (f.includes('push') || focus.includes('پاڵنان') || focus.includes('سنگ و شان')) {
      if (lang === 'en') return 'Push Day (Chest, Shoulders, Triceps)';
      if (lang === 'ar') return 'يوم الدفع (صدر، أكتاف، تراي)';
      if (lang === 'fa') return 'روز پوش (سینه، سرشانه، پشت‌بازو)';
      return focus;
    }
    if (f.includes('pull') || focus.includes('ڕاکێشان') || focus.includes('پشت و بایسێپس')) {
      if (lang === 'en') return 'Pull Day (Back, Biceps)';
      if (lang === 'ar') return 'يوم السحب (ظهر، باي)';
      if (lang === 'fa') return 'روز پول (پشت، جلوبازو)';
      return focus;
    }
    if (f.includes('leg') || focus.includes('قاچ') || focus.includes('خوارەوە')) {
      if (lang === 'en') return 'Legs & Lower Body';
      if (lang === 'ar') return 'الأرجل والجزء السفلي';
      if (lang === 'fa') return 'پاها و پایین‌تنه';
      return focus;
    }
    if (f.includes('upper') || focus.includes('سەرەوە')) {
      if (lang === 'en') return 'Upper Body & Arms';
      if (lang === 'ar') return 'الجزء العلوي والذراعين';
      if (lang === 'fa') return 'بالاتنه و بازوها';
      return focus;
    }
    if (lang === 'en' && focus.match(/[\u0600-\u06FF]/)) {
      const m = focus.match(/\(([^)]+)\)/);
      if (m) return m[1];
      return 'Targeted Workout Session';
    }
    return focus;
  };

  const getLocalizedMuscle = (muscle, lang = language) => {
    if (!muscle) return '';
    const m = muscle.toLowerCase();
    if (m.includes('سنگ') || m.includes('chest')) {
      if (lang === 'en') return 'Chest';
      if (lang === 'ar') return 'الصدر';
      if (lang === 'fa') return 'سینه';
      return 'سنگ';
    }
    if (m.includes('پشت') || m.includes('back') || m.includes('باڵەکان')) {
      if (lang === 'en') return 'Back';
      if (lang === 'ar') return 'الظهر';
      if (lang === 'fa') return 'پشت';
      return 'پشت';
    }
    if (m.includes('شان') || m.includes('shoulder')) {
      if (lang === 'en') return 'Shoulders';
      if (lang === 'ar') return 'الأكتاف';
      if (lang === 'fa') return 'سرشانه';
      return 'شان';
    }
    if (m.includes('بایسێپس') || m.includes('biceps') || m.includes('پێشەوەی باڵ')) {
      if (lang === 'en') return 'Biceps';
      if (lang === 'ar') return 'البايسبس';
      if (lang === 'fa') return 'جلو بازو';
      return 'بایسێپس';
    }
    if (m.includes('ترایسێپس') || m.includes('triceps') || m.includes('پشتەوەی باڵ')) {
      if (lang === 'en') return 'Triceps';
      if (lang === 'ar') return 'الترايسبس';
      if (lang === 'fa') return 'پشت بازو';
      return 'ترایسێپس';
    }
    if (m.includes('قاچ') || m.includes('leg') || m.includes('quad') || m.includes('ڕان')) {
      if (lang === 'en') return 'Legs / Quads';
      if (lang === 'ar') return 'الأرجل / الفخذ';
      if (lang === 'fa') return 'پاها / چهارسر ران';
      return 'قاچ';
    }
    if (m.includes('سمت') || m.includes('glute')) {
      if (lang === 'en') return 'Glutes';
      if (lang === 'ar') return 'الأرداف (الجلوتس)';
      if (lang === 'fa') return 'باسن (گلوت)';
      return 'سمت';
    }
    if (m.includes('پەل') || m.includes('calf') || m.includes('calves')) {
      if (lang === 'en') return 'Calves';
      if (lang === 'ar') return 'سمانة الساق';
      if (lang === 'fa') return 'ساق پا';
      return 'پەلی پا';
    }
    if (m.includes('سک') || m.includes('abs') || m.includes('core')) {
      if (lang === 'en') return 'Abs & Core';
      if (lang === 'ar') return 'البطن والكور';
      if (lang === 'fa') return 'شکم و پهلو';
      return 'سک و ناوقەد';
    }
    if (lang === 'en') return 'Full Body';
    if (lang === 'ar') return 'كامل الجسم';
    if (lang === 'fa') return 'کل بدن';
    return muscle;
  };

  const getLocalizedUnit = (unit, lang = language) => {
    if (!unit) return '';
    const u = String(unit).trim();
    const uLow = u.toLowerCase();
    if (u === 'g' || u === 'گرام' || u === 'گرم' || u === 'جرام' || uLow === 'gram' || uLow === 'grams') {
      return lang === 'en' ? 'g' : lang === 'ar' ? 'جرام' : lang === 'fa' ? 'گرم' : 'گرام';
    }
    if (u === 'ml' || u === 'مل' || u === 'میلی‌لیتر' || uLow === 'milliliter' || uLow === 'ml') {
      return lang === 'en' ? 'ml' : lang === 'ar' ? 'مل' : lang === 'fa' ? 'میلی‌لیتر' : 'مل';
    }
    if (u.includes('سکۆپ') || u.includes('سكوب') || u.includes('اسکوپ') || uLow.includes('scoop')) {
      return lang === 'en' ? 'Scoop' : lang === 'ar' ? 'سكوب' : lang === 'fa' ? 'اسکوپ' : 'سکۆپ';
    }
    if (u.includes('قاپ') || u.includes('صحن') || u.includes('بشقاب') || uLow.includes('plate') || uLow.includes('serving')) {
      return lang === 'en' ? 'Plate' : lang === 'ar' ? 'صحن' : lang === 'fa' ? 'بشقاب' : 'قاپ';
    }
    if (u.includes('کاسە') || u.includes('كاسة') || u.includes('کاسه') || uLow.includes('bowl')) {
      return lang === 'en' ? 'Bowl' : lang === 'ar' ? 'كاسة' : lang === 'fa' ? 'کاسه' : 'کاسە';
    }
    if (u.includes('دانە') || u.includes('حبة') || u.includes('عدد') || uLow.includes('piece') || uLow === 'pcs' || uLow === 'pc') {
      return lang === 'en' ? 'Piece' : lang === 'ar' ? 'حبة' : lang === 'fa' ? 'عدد' : 'دانە';
    }
    if (u.includes('نان') || u.includes('رغيف') || uLow.includes('bread')) {
      return lang === 'en' ? 'Bread' : lang === 'ar' ? 'رغيف' : lang === 'fa' ? 'نان' : 'نان';
    }
    if (u.includes('کەوچک') || u.includes('ملعقة') || u.includes('قاشق') || uLow.includes('spoon') || uLow.includes('tbsp') || uLow.includes('tsp')) {
      return lang === 'en' ? 'Spoon' : lang === 'ar' ? 'ملعقة' : lang === 'fa' ? 'قاشق' : 'کەوچک';
    }
    if (u.includes('شیش') || u.includes('سيخ') || uLow.includes('skewer')) {
      return lang === 'en' ? 'Skewer' : lang === 'ar' ? 'سيخ' : lang === 'fa' ? 'سیخ' : 'شیش';
    }
    if (u.includes('پارچە') || u.includes('قطعة') || u.includes('تکه') || uLow.includes('slice')) {
      return lang === 'en' ? 'Piece' : lang === 'ar' ? 'قطعة' : lang === 'fa' ? 'تکه' : 'پارچە';
    }
    if (u.includes('دەستە') || u.includes('قبضة') || u.includes('مشت') || uLow.includes('handful')) {
      return lang === 'en' ? 'Handful' : lang === 'ar' ? 'قبضة' : lang === 'fa' ? 'مشت' : 'دەستە';
    }
    if (u.includes('هێلکە') || u.includes('بيضة') || u.includes('تخم‌مرغ') || uLow.includes('egg')) {
      return lang === 'en' ? 'Egg' : lang === 'ar' ? 'بيضة' : lang === 'fa' ? 'تخم‌مرغ' : 'هێلکە';
    }
    if (u.includes('گڵاس') || u.includes('لیوان') || uLow.includes('glass')) {
      return lang === 'en' ? 'Glass' : lang === 'ar' ? 'كوب' : lang === 'fa' ? 'لیوان' : 'گڵاس';
    }
    if (u.includes('لیتر') || u.includes('لتر') || uLow.includes('liter')) {
      return lang === 'en' ? 'Liter' : lang === 'ar' ? 'لتر' : lang === 'fa' ? 'لیتر' : 'لیتر';
    }
    if (u.includes('کوپ') || u.includes('فنجان') || uLow.includes('cup')) {
      return lang === 'en' ? 'Cup' : lang === 'ar' ? 'كوب' : lang === 'fa' ? 'فنجان' : 'کوپ';
    }
    if (u.includes('ژەم') || u.includes('وجبة') || u.includes('وعده') || uLow.includes('meal')) {
      return lang === 'en' ? 'Meal' : lang === 'ar' ? 'وجبة' : lang === 'fa' ? 'وعده' : 'ژەم';
    }
    if (u.includes('ستکان') || u.includes('استكان') || uLow.includes('tea glass')) {
      return lang === 'en' ? 'Tea Glass' : lang === 'ar' ? 'استكان' : lang === 'fa' ? 'استکان' : 'ستکان';
    }
    if (u.includes('قوتوو') || u.includes('علبة') || u.includes('قوطی') || uLow.includes('can')) {
      return lang === 'en' ? 'Can' : lang === 'ar' ? 'علبة' : lang === 'fa' ? 'قوطی' : 'قوتوو';
    }
    if (u.includes('بتڵ') || u.includes('بطل') || u.includes('بطری') || uLow.includes('bottle')) {
      return lang === 'en' ? 'Bottle' : lang === 'ar' ? 'بطل' : lang === 'fa' ? 'بطری' : 'بتڵ';
    }
    if (u.includes('لەفە') || u.includes('ساندویچ') || u.includes('سندويش') || uLow.includes('sandwich') || uLow.includes('wrap')) {
      return lang === 'en' ? 'Sandwich' : lang === 'ar' ? 'سندويش' : lang === 'fa' ? 'ساندویچ' : 'لەفە';
    }
    if (u.includes('پاکەت') || u.includes('باكيت') || u.includes('بسته') || uLow.includes('pack')) {
      return lang === 'en' ? 'Pack' : lang === 'ar' ? 'باكيت' : lang === 'fa' ? 'بسته' : 'پاکەت';
    }
    return u;
  };

  const getLocalizedFoodName = (item, lang = language) => {
    if (!item) return '';
    const rawName = (typeof item === 'string' ? item : item.name || '').trim();
    const engName = (typeof item === 'object' && item.englishName ? item.englishName : '').trim();

    if (typeof item === 'object') {
      if (lang === 'ku' && item.ku) return item.ku;
      if (lang === 'en' && item.en) return item.en;
      if (lang === 'ar' && item.ar) return item.ar;
      if (lang === 'fa' && item.fa) return item.fa;
    }

    const hasArabicScript = (str) => /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
    const hasLatinScript = (str) => /[A-Za-z]/.test(str);

    if (lang === 'en' && engName) return engName;

    // Direct match in FOOD_TRANSLATIONS (Kurdish keys)
    if (rawName && FOOD_TRANSLATIONS[rawName]) {
      const entry = FOOD_TRANSLATIONS[rawName];
      if (lang === 'ku') return rawName;
      if (entry[lang]) return entry[lang];
      if (lang === 'en' && entry.en) return entry.en;
    }

    // Helper to translate single term from English/Latin or Kurdish
    const findTermTranslation = (term) => {
      const tClean = term.trim().toLowerCase();
      if (!tClean) return '';

      // Direct match in COMMON_DIET_FOODS
      const match = COMMON_DIET_FOODS.find(f => f.en === tClean);
      if (match) return match[lang] || match.ku;

      // Reverse lookup in FOOD_TRANSLATIONS
      for (const [kurdishKey, trans] of Object.entries(FOOD_TRANSLATIONS)) {
        if (trans.en && trans.en.toLowerCase() === tClean) {
          if (lang === 'ku') return kurdishKey;
          return trans[lang] || trans.en || kurdishKey;
        }
      }

      // Partial match in COMMON_DIET_FOODS
      const partial = COMMON_DIET_FOODS.find(f => tClean.includes(f.en) || f.en.includes(tClean));
      if (partial) return partial[lang] || partial.ku;

      // Partial match in FOOD_TRANSLATIONS
      for (const [kurdishKey, trans] of Object.entries(FOOD_TRANSLATIONS)) {
        if (trans.en && (tClean.includes(trans.en.toLowerCase()) || trans.en.toLowerCase().includes(tClean))) {
          if (lang === 'ku') return kurdishKey;
          return trans[lang] || trans.en || kurdishKey;
        }
      }

      return term;
    };

    // If pure Kurdish/Arabic script with no Latin, return as-is for Kurdish
    if (lang === 'ku' && hasArabicScript(rawName) && !hasLatinScript(rawName)) {
      return rawName;
    }

    const query = (engName || rawName).toLowerCase();

    // Check compound "with"
    if (query.includes(' with ')) {
      const parts = query.split(' with ');
      const t0 = findTermTranslation(parts[0]);
      const t1 = findTermTranslation(parts[1]);
      const withWord = lang === 'en' ? ' with ' : lang === 'ar' ? ' مع ' : lang === 'fa' ? ' با ' : ' لەگەڵ ';
      return `${t0}${withWord}${t1}`;
    }

    // Check compound "and"
    if (query.includes(' and ')) {
      const parts = query.split(' and ');
      const t0 = findTermTranslation(parts[0]);
      const t1 = findTermTranslation(parts[1]);
      const andWord = lang === 'en' ? ' and ' : lang === 'ar' ? ' و ' : lang === 'fa' ? ' و ' : ' و ';
      return `${t0}${andWord}${t1}`;
    }

    const translated = findTermTranslation(query);
    if (translated && translated.toLowerCase() !== query) {
      return translated;
    }

    // Substring in FOOD_TRANSLATIONS for Kurdish query
    if (rawName) {
      for (const key of Object.keys(FOOD_TRANSLATIONS)) {
        if (rawName.includes(key) || key.includes(rawName)) {
          const entry = FOOD_TRANSLATIONS[key];
          if (lang === 'ku') return key;
          if (entry[lang]) return entry[lang];
          if (lang === 'en' && entry.en) return entry.en;
        }
      }
    }

    if (lang === 'en' && engName) return engName;
    return rawName || engName || '';
  };

  const getLocalizedExerciseName = (ex, lang = language) => {
    if (!ex) return '';
    const eng = ex.englishName || ex.nameEn;
    const ku = ex.name;

    if (lang === 'ku') return ku || eng || '';
    if (lang === 'en') return eng || ku || '';

    if (eng && EXERCISE_TRANSLATIONS[eng]) {
      const entry = EXERCISE_TRANSLATIONS[eng];
      if (entry[lang]) return entry[lang];
    }

    return eng || ku || '';
  };

  const getExerciseEnglishName = (ex) => {
    if (!ex) return 'Gym Workout';
    if (ex.englishName && typeof ex.englishName === 'string' && ex.englishName.trim()) {
      return ex.englishName.trim();
    }
    if (ex.nameEn && typeof ex.nameEn === 'string' && ex.nameEn.trim()) {
      return ex.nameEn.trim();
    }
    const rawName = ex.name || '';
    const matchParen = rawName.match(/\(([A-Za-z\s\-\_]+)\)/);
    if (matchParen && matchParen[1] && matchParen[1].trim().length > 2) {
      return matchParen[1].trim();
    }
    const lower = rawName.toLowerCase();
    if (lower.includes('سکوات') || lower.includes('squat')) {
      if (lower.includes('دەمبڵ') || lower.includes('goblet')) return 'Goblet Squat';
      if (lower.includes('باربێڵ') || lower.includes('شان') || lower.includes('back')) return 'Barbell Back Squat';
      return 'Squat';
    }
    if (lower.includes('قاچ پرێس') || lower.includes('leg press')) return 'Leg Press';
    if (lower.includes('هەنگاونان') || lower.includes('lunge')) return 'Dumbbell Lunges';
    if (lower.includes('دێدلیفت') || lower.includes('deadlift')) {
      if (lower.includes('ڕۆمانیەن') || lower.includes('romanian')) return 'Romanian Deadlift';
      return 'Deadlift';
    }
    if (lower.includes('سنگ') || lower.includes('chest') || lower.includes('bench')) {
      if (lower.includes('لار') || lower.includes('incline')) return 'Incline Dumbbell Bench Press';
      if (lower.includes('فڕین') || lower.includes('fly')) return 'Cable Chest Fly';
      if (lower.includes('شناو') || lower.includes('push-up')) return 'Push-ups';
      return 'Dumbbell Bench Press';
    }
    if (lower.includes('شان') || lower.includes('shoulder')) {
      if (lower.includes('تەنیشت') || lower.includes('lateral')) return 'Cable Lateral Raise';
      if (lower.includes('پشت') || lower.includes('face pull')) return 'Cable Face Pull';
      return 'Dumbbell Shoulder Press';
    }
    if (lower.includes('پشت') || lower.includes('back') || lower.includes('lat') || lower.includes('پاروو') || lower.includes('row')) {
      if (lower.includes('کێبڵ') || lower.includes('pulldown')) return 'Lat Pulldown Wide Grip';
      if (lower.includes('پاروو') || lower.includes('row')) return 'Single Arm Dumbbell Row';
      return 'Lat Pulldown';
    }
    if (lower.includes('بایسێپس') || lower.includes('قۆڵ دووسەر') || lower.includes('bicep')) {
      if (lower.includes('هامر') || lower.includes('hammer')) return 'Dumbbell Hammer Curl';
      return 'Dumbbell Bicep Curl';
    }
    if (lower.includes('ترایسێپس') || lower.includes('پاشەملە') || lower.includes('tricep')) {
      if (lower.includes('پەت') || lower.includes('rope') || lower.includes('کێبڵ')) return 'Triceps Rope Pushdown';
      return 'Dumbbell Triceps Extension';
    }
    if (lower.includes('سک') || lower.includes('پلانک') || lower.includes('plank') || lower.includes('abs')) return 'Scientific Plank Hold';
    if (lower.includes('پوز') || lower.includes('سۆڵە') || lower.includes('calf')) return 'Standing Calf Raise';
    if (lower.includes('پشتی قاچ') || lower.includes('leg curl')) return 'Seated Leg Curl';
    if (lower.includes('لێگ ئێکس تێنشن') || lower.includes('چوار سەر')) return 'Leg Extension Machine';

    const latinOnly = rawName.replace(/[^a-zA-Z\s]/g, '').trim();
    if (latinOnly.length > 2) return latinOnly;
    return 'Workout Form Exercise';
  };

  const getExerciseFormGuidelines = (ex, lang = 'ku') => {
    const raw = ((ex?.name || '') + ' ' + (ex?.englishName || '') + ' ' + (ex?.muscle || '')).toLowerCase();

    // ١. سکوات و قاچ پرێس و هەنگاونان (Squats, Leg Press, Lunges)
    if (raw.includes('سکوات') || raw.includes('squat') || raw.includes('قاچ پرێس') || raw.includes('leg press') || raw.includes('هەنگاونان') || raw.includes('lunge') || raw.includes('vmo')) {
      return {
        setup: {
          icon: '🛡️',
          title: lang === 'en' ? 'Stance & Joint Alignment:' : lang === 'ar' ? 'وضعية الوقوف والمفاصل:' : lang === 'fa' ? 'وضعیت پاها و تراز مفاصل:' : 'هاوسەنگی و شێوازی ڕاوەستان:',
          desc: lang === 'en'
            ? 'Stand feet shoulder-width apart, toes flared 15-30°. Rest bar across upper traps (not neck vertebrae), chest proud and upright.'
            : lang === 'ar'
            ? 'قف بقدمين بعرض الكتفين وأصابع القدم متجهة للخارج ١٥-٣٠ درجة. ضع البار على عضلات الترابيز العليا وليس فقرات الرقبة، وحافظ على صدرك مرفوعاً.'
            : lang === 'fa'
            ? 'پاها را به عرض شانه باز کنید و پنجه‌ها را ۱۵ الی ۳۰ درجه رو به بیرون بگذارید. میله را روی عضله بالای کول بگذارید نه مهره‌های گردن.'
            : 'پێیەکانت بە پانیی شان بکەرەوە، سەرپەنجەکانت ١٥ بۆ ٣٠ پلە بەرەو دەرەوە بن. باڕەکە لەسەر ماسولکەی سەرشانی سەرەوە (Traps) دابنێ نەک ئێسکی مل، و سنگت بەرز و کراوە بێت.'
        },
        breathing: {
          icon: '🫁',
          title: lang === 'en' ? 'Intra-Abdominal Core Bracing:' : lang === 'ar' ? 'تثبيت الجذع وضغط التنفس:' : lang === 'fa' ? 'تکنیک تنفس شکمی (والسالوا):' : 'تەکنیکی هەناسەدان و قوفڵکردنی سک:',
          desc: lang === 'en'
            ? 'Inhale deeply into your belly and brace core tight (Valsalva). Hold breath through descent, exhale forcefully as you drive up past the sticking point.'
            : lang === 'ar'
            ? 'خذ نفساً عميقاً في البطن واحكم الجذع قبل النزول (مناورة فالسالفا). احبس النفس أثناء النزول وازفر بقوة عند الصعود وتجاوز نقطة الصعوبة.'
            : lang === 'fa'
            ? 'در بالاترین نقطه نفس عمیق شکمی بکشید و شکم را کاملاً سفت کنید. در حین پایین آمدن نفس را حبس و در اواخر بالا آمدن بازدم پرقدرت کنید.'
            : 'پێش دەستپێکردنی دابەزین، لە سەرەوە هەناسەیەکی قووڵی گەدەیی هەڵمژە و لە سکت قوفڵی بکە (ڤالسالڤا)، تا تەواوی قووڵایی دابەزین هەناسە ڕابگرە، لە سێیەکی کۆتایی هەستانەوەدا بە هێز بیدەرەوە.'
        },
        tempo: {
          icon: '⏱️',
          title: lang === 'en' ? 'Depth, Knees & Drive:' : lang === 'ar' ? 'العمق ومسار الركبتين والدفع:' : lang === 'fa' ? 'عمق حرکت و کنترل زانوها:' : 'مەودای جوڵە و ئاراستەی ئەژنۆکان:',
          desc: lang === 'en'
            ? 'Control the descent over 2-3 seconds until thighs are parallel to floor. Push knees outward tracking your toes, and drive explosively through your heels.'
            : lang === 'ar'
            ? 'انزل ببطء وتحكم لمدة ٢-٣ ثوانٍ حتى يتوازى الفخذ مع الركبة. ادفع الركبتين للخارج باتجاه أصابع القدم واصعد بقوة من خلال الكعبين.'
            : lang === 'fa'
            ? 'با کنترل در عرض ۲ الی ۳ ثانیه پایین بروید تا ران‌ها موازی زمین شوند. زانوها را به سمت بیرون هدایت کنید و با فشار پاشنه‌ها بالا بیایید.'
            : 'بە هێواشی بە ٣ چرکە دابەزە تا ڕانەکانت هاوتەریبی زەوی دەبن (٩٠ پلە). ئەژنۆکانت بەرەو ناوەوە مەچەمێنەوە و هەمیشە هێزی هەستانەوە لە پاژنەی پێتەوە بێت.'
        }
      };
    }

    // ٢. دێدلیفت و ڕۆمانیەن دێدلیفت و کڵۆت (Deadlift, RDL, Glutes)
    if (raw.includes('دێدلیفت') || raw.includes('deadlift') || raw.includes('romanian') || raw.includes('glute') || raw.includes('سمت') || raw.includes('حەوز')) {
      return {
        setup: {
          icon: '🛡️',
          title: lang === 'en' ? 'Spine Neutrality & Bar Path:' : lang === 'ar' ? 'استقامة العمود الفقري ومسار البار:' : lang === 'fa' ? 'حفظ ستون فقرات و مسیر میله:' : 'پاراستنی بڕبڕەی پشت و هێڵی کێشەکە:',
          desc: lang === 'en'
            ? 'Feet hip-width apart. Keep bar grazing shins and thighs throughout. Keep chest open, lats engaged, and spine strictly neutral with zero flexion.'
            : lang === 'ar'
            ? 'القدمان بعرض الحوض، والبار يلامس الساقين والفخذين طوال الحركة. حافظ على استقامة الظهر التامة وتجنب انحناء العمود الفقري تماماً.'
            : lang === 'fa'
            ? 'پاها به عرض باسن و میله چسبیده به ساق پا. سینه بالا، عضلات زیربغل منقبض و ستون فقرات کاملاً صاف بدون کوچکترین قوس کمر.'
            : 'پێیەکانت بە پانیی حەوز دابنێ. باڕەکە با هەمیشە بە درێژایی قاچەکانت بخشێتەوە. سنگت بەرز و کراوە بێت و کەمەرت بە تەواوی ڕاست ڕابگرە بەبێ چەمانەوەی بڕبڕە.'
        },
        breathing: {
          icon: '🫁',
          title: lang === 'en' ? 'Abdominal Pressure:' : lang === 'ar' ? 'ضغط البطن لحماية الظهر:' : lang === 'fa' ? 'تکنیک تنفس و حمایت کمر:' : 'تەکنیکی هەناسەدان بۆ پاراستنی کەمەر:',
          desc: lang === 'en'
            ? 'Brace core into your belly before the pull to protect lumbar discs. Lock out hips and glutes at the top, then exhale cleanly.'
            : lang === 'ar'
            ? 'احبس النفس في البطن لدعم أسفل الظهر قبل السحب. عند استقامة الجذع وعصر المؤخرة بالأعلى، ازفر بهدوء.'
            : lang === 'fa'
            ? 'قبل از کشیدن وزنه نفس را در شکم حبس کنید تا از مهره‌ها محافظت شود. در بالا هنگام قفل باسن بازدم کنید.'
            : 'پێش کێشانی قورساییەکە هەوا لە سک توند قوفڵ بکە بۆ پاراستنی بڕبڕەی پشت، کاتێک لە سەرەوە ڕاست بوویتەوە و سمتت گرژ کرد هەناسە بدەرەوە.'
        },
        tempo: {
          icon: '⏱️',
          title: lang === 'en' ? 'Hip Hinge & Hamstring Stretch:' : lang === 'ar' ? 'مفصلة الحوض وتمدد أوتار الركبة:' : lang === 'fa' ? 'کشش همسترینگ و حرکت باسن:' : 'جوڵەی حەوز و کشانی ماسولکەی پشتەقاچ:',
          desc: lang === 'en'
            ? 'Hinge at the hips pushing them far backward with soft knees. Feel maximum stretch in hamstrings, then drive hips forward explosively.'
            : lang === 'ar'
            ? 'ادفع الحوض للخلف مع ثني طفيف في الركبتين حتى تشعر بتمدد أوتار الركبة، ثم ادفع الحوض للأمام بقوة واضغط على الأرداف.'
            : lang === 'fa'
            ? 'باسن را به عقب هل دهید در حالی که زانوها اندکی خم هستند. کشش کامل پشت ران را حس کنید و سپس باسن را مقتدرانه جلو بیاورید.'
            : 'حەوزت بەرەو دواوە پاڵ پێوە بنێ (Hip Hinge) بە چەمانەوەیەکی کەم لە ئەژنۆکان. کاتێک هەستت بە کشانی تەواوی پشتی ڕان کرد، بە هێزی سمت وەرەوە پێشەوە.'
        }
      };
    }

    // ٣. سنگ و شناو و پاڵەپەستۆ (Chest, Bench Press, Push-ups, Dips, Fly)
    if (raw.includes('سنگ') || raw.includes('chest') || raw.includes('bench') || raw.includes('شناو') || raw.includes('push-up') || raw.includes('fly') || raw.includes('dips')) {
      return {
        setup: {
          icon: '🛡️',
          title: lang === 'en' ? 'Scapular Retraction & Elbow Angle:' : lang === 'ar' ? 'تثبيت الكتفين وزاوية المرفقين:' : lang === 'fa' ? 'جمع کردن کتف‌ها و زاویه آرنج:' : 'جێگیرکردنی شان و گۆشەی ئانیشک:',
          desc: lang === 'en'
            ? 'Retract and depress shoulder blades into the bench with a proud chest. Tuck elbows at roughly 60° (not flared 90°) to protect rotator cuffs.'
            : lang === 'ar'
            ? 'ثبت لوحي الكتف للخلف والأسفل في المقعد وارفع الصدر. اجعل زاوية المرفقين ٦٠ درجة (وليس ٩٠) لحماية مفاصل الكتف من الإصابات.'
            : lang === 'fa'
            ? 'کتف‌ها را به سمت عقب و پایین جمع کرده و سینه را جلو دهید. آرنج‌ها با زاویه حدود ۶۰ درجه باشند نه ۹۰ درجه باز تا شانه آسیب نبیند.'
            : 'تیغی شانەکانت لە دواوە بلکێنە بە کورسییەکە و سنگی بەرز بکەرەوە. ئانیشکت لەسەر گۆشەی ٦٠ پلە بێت نەک ٩٠ پلە بۆ پاراستنی جومگەی شانت لە پێکان.'
        },
        breathing: {
          icon: '🫁',
          title: lang === 'en' ? 'Inhale on Descent, Press with Exhale:' : lang === 'ar' ? 'تنفس النزول ودفع الصعود:' : lang === 'fa' ? 'تکنیک تنفس دم و بازدم:' : 'تەکنیکی هەناسەدان لە کاتی پاڵنان:',
          desc: lang === 'en'
            ? 'Inhale deeply as you lower the weight to your lower/mid chest. Exhale forcefully through the concentric pressing phase.'
            : lang === 'ar'
            ? 'استنشق بعمق أثناء نزول الوزن بهدوء نحو الصدر، وازفر بقوة أثناء الدفع والتغلب على الوزن للأعلى.'
            : lang === 'fa'
            ? 'هنگام پایین آوردن وزنه به سمت سینه نفس عمیق بکشید و هنگام پرس کردن وزنه به بالا بازدم قوی انجام دهید.'
            : 'کاتێک بە هێواشی کێشەکە دادەبەزێنیت بەرەو سەر سنگت هەناسە هەڵمژە، کاتێک پاڵی پێوە دەنێیت بەرەو سەرەوە هەناسە بە هێز بدەرەوە.'
        },
        tempo: {
          icon: '⏱️',
          title: lang === 'en' ? 'Controlled Eccentric & Peak Stretch:' : lang === 'ar' ? 'التحكم بالنزول والتمدد الكامل:' : lang === 'fa' ? 'کشش کامل سینه و سرعت حرکت:' : 'کۆنتڕۆڵی دابەزین و کشانی تەواو:',
          desc: lang === 'en'
            ? 'Lower over 2-3 seconds for maximum pec stretch. Press up smoothly without violently locking out the elbows at the top.'
            : lang === 'ar'
            ? 'أنزل الوزن خلال ٢-٣ ثوانٍ لتمدد الصدر بالكامل. ادفع لأعلى دون قفل المرفقين بعنف للحفاظ على الشد العضلي المستمر.'
            : lang === 'fa'
            ? 'در ۲ الی ۳ ثانیه وزنه را آرام پایین بیاورید تا سینه کاملاً کشیده شود. در بالا آرنج را قفل نکنید تا فشار مداوم بماند.'
            : 'بە ٢ بۆ ٣ چرکە بە کۆنتڕۆڵ کێشەکە دابەزێنە تا سنگت کشانی تەواو وەردەگرێت. لە سەرەوە ئانیشکت زۆر قوفڵ مەدە بۆ ئەوەی بەردەوام فشار لەسەر سنگ بێت.'
        }
      };
    }

    // ٤. پشت و لاتس و پاروو (Back, Rows, Lat Pulldown, Pull-ups, Face Pull)
    if (raw.includes('پشت') || raw.includes('back') || raw.includes('lat') || raw.includes('پاروو') || raw.includes('row') || raw.includes('pulldown') || raw.includes('face pull')) {
      return {
        setup: {
          icon: '🛡️',
          title: lang === 'en' ? 'Scapular Lead & Chest Elevation:' : lang === 'ar' ? 'بدء الحركة بالكتف ورفع الصدر:' : lang === 'fa' ? 'شروع با کتف و بالا گرفتن سینه:' : 'دەستپێکردن بە شان و بەرزکردنەوەی سنگ:',
          desc: lang === 'en'
            ? 'Puff chest up with a slight 10-15° lean. Depress shoulder blades downward first before bending elbows so lats take the load.'
            : lang === 'ar'
            ? 'ارفع صدرك للأعلى مع ميلان طفيف للخلف. أنزل لوحي الكتف للأسفل أولاً قبل ثني المرفقين لتفعيل عضلات الظهر بدقة.'
            : lang === 'fa'
            ? 'سینه را بالا گرفته و کمی به عقب متمایل شوید. ابتدا کتف‌ها را به سمت پایین هدایت کنید و سپس آرنج‌ها را خم نمایید.'
            : 'سنگت بەرز بکەرەوە و کەمێک بە لاری بەرەو دواوە بنوشتێرەوە. پێش چەمانەوەی دەستەکان، سەرەتا شانەکانت دابەزێنە بەرەو خوارەوە تا ماسولکەی پشت (Lats) کار بکات.'
        },
        breathing: {
          icon: '🫁',
          title: lang === 'en' ? 'Rhythm of Pulling:' : lang === 'ar' ? 'تنسيق التنفس أثناء السحب:' : lang === 'fa' ? 'ریتم تنفس در حرکات کششی:' : 'تەکنیکی هەناسەدان لە کاتی ڕاکێشاندا:',
          desc: lang === 'en'
            ? 'Inhale as your arms extend into a full stretch. Exhale as you drive elbows down and pull toward your upper chest.'
            : lang === 'ar'
            ? 'استنشق أثناء استطالة الذراعين للأعلى، وازفر أثناء سحب المقبض بقوة نحو أعلى الصدر وضغط العضلات.'
            : lang === 'fa'
            ? 'در کشش کامل دست‌ها نفس بگیرید و هنگام کشیدن میله یا دمبل به سمت بدن با قدرت بازدم کنید.'
            : 'لە کاتی درێژبوونی باڵەکانت بەرەو سەرەوە هەناسە هەڵمژە، کاتێک دەسکەکە بە هێز ڕادەکێشیت بەرەو سەرەوەی سنگت هەناسە بدەرەوە.'
        },
        tempo: {
          icon: '⏱️',
          title: lang === 'en' ? 'Elbow Drive & 1-Second Squeeze:' : lang === 'ar' ? 'سحب المرفقين والعصر لثانية:' : lang === 'fa' ? 'فشار با آرنج و انقباض ۱ ثانیه‌ای:' : 'گوشینی ماسولکە و هێواشی لە گەڕانەوە:',
          desc: lang === 'en'
            ? 'Pull elbows down and back, squeeze shoulder blades together for 1 second, then take 3 seconds to return into full stretch.'
            : lang === 'ar'
            ? 'اسحب المرفقين للخلف واعصر عضلات الظهر معاً لمدة ثانية كاملة، ثم خذ ٣ ثوانٍ للعودة ببطء لتمديد اللاتس.'
            : lang === 'fa'
            ? 'با آرنج‌ها به عقب بکشید و ۱ ثانیه کتف‌ها را در پشت به هم منقبض کنید، سپس در ۳ ثانیه با کنترل بازگردید.'
            : 'بە بەهێزی دەسکەکە ڕابکێشە بۆ لای جەستەت و بۆ ١ چرکە شانەکان لە دواوە لە یەکتر نزیک بکەرەوە و بیانگوشە (Squeeze)، پاشان بە ٣ چرکە بیگەڕێنەرەوە.'
        }
      };
    }

    // ٥. شان و تەنیشتی شان (Shoulders, Overhead Press, Lateral Raise, Pike)
    if (raw.includes('شان') || raw.includes('shoulder') || raw.includes('lateral') || raw.includes('overhead') || raw.includes('دێڵتۆید') || raw.includes('pike')) {
      return {
        setup: {
          icon: '🛡️',
          title: lang === 'en' ? 'Core Lock & Scapular Plane:' : lang === 'ar' ? 'تثبيت الجذع ومسار الرفع:' : lang === 'fa' ? 'قفل تنه و مسیر حرکت شانه:' : 'ڕاگرتنی هاوسەنگی و ڕێڕەوی جوڵە:',
          desc: lang === 'en'
            ? 'Brace core and squeeze glutes to prevent lumbar hyperextension. On lateral raises, raise arms slightly forward (~15°) in scapular plane.'
            : lang === 'ar'
            ? 'شد عضلات البطن والأرداف لمنع تقوس أسفل الظهر. في الرفرفة الجانبية ارفع الذراعين بميلان طفيف للأمام (١٥ درجة).'
            : lang === 'fa'
            ? 'شکم و باسن را سفت کنید تا کمر گود نشود. در نشر جانب دست‌ها را اندکی به سمت جلو (حدود ۱۵ درجه) بالا بیاورید.'
            : 'ناووقەد و سک توند قوفڵ بکە بۆ ڕێگریکردن لە کەوانەبوونی کەمەر. دەمبڵەکان تا ئاستی گوێکان دابەزێنە و بە ڕاستی بەرەو سەرەوە پاڵیان پێوە بنێ.'
        },
        breathing: {
          icon: '🫁',
          title: lang === 'en' ? 'Breathing on the Press:' : lang === 'ar' ? 'التنفس مع ضغط الأكتاف:' : lang === 'fa' ? 'تنفس در پرس و نشر سرشانه:' : 'تەکنیکی هەناسەدان لە کاتی بەرزکردنەوە:',
          desc: lang === 'en'
            ? 'Exhale smoothly as you press overhead or raise arms. Inhale as you lower the weight under control back to ear level.'
            : lang === 'ar'
            ? 'ازفر أثناء دفع الوزن للأعلى أو رفعه، واستنشق بهدوء أثناء خفض الوزن لمستوى الأذنين.'
            : lang === 'fa'
            ? 'هنگام بالا بردن وزنه بازدم کنید و در بازگشت آرام تا سطح گوش‌ها نفس بگیرید.'
            : 'کاتێک کێشەکە بەرز دەکەیتەوە بۆ سەرەوە هەناسە بدەرەوە، لە کاتی هێواش دابەزاندنیدا بۆ ئاستی چەناکە یان گوێ هەناسە هەڵمژە.'
        },
        tempo: {
          icon: '⏱️',
          title: lang === 'en' ? 'Strict Form & Zero Torso Momentum:' : lang === 'ar' ? 'التحكم التام ومنع التأرجح:' : lang === 'fa' ? 'حذف ضربه بدن و کنترل فرود:' : 'پاراستنی جومگە و ڕێگری لە شەکاندنی جەستە:',
          desc: lang === 'en'
            ? 'Never swing your torso to throw the weights. Lower weights over 2.5 seconds to build round 3D deltoids safely.'
            : lang === 'ar'
            ? 'لا تؤرجح جذعك لرمي الأوزان. أنزل الأوزان خلال ٢.٥ ثانية لبناء أكتاف ثلاثية الأبعاد بأمان.'
            : lang === 'fa'
            ? 'بدن را تکان ندهید تا شتاب وزنه زیاد نشود. در ۲.۵ ثانیه آرام پایین بیاورید تا گردی سرشانه ساخته شود.'
            : 'لە تەنیشتی شان (Lateral Raise)، ئانیشکت کەمێک چەماوە بێت و کێشەکە تەنها تا ئاستی شان بەرز بکەرەوە. بە ٢.٥ چرکە هێواش دابەزە.'
        }
      };
    }

    // ٦. قۆڵ (بایسێپس و ترایسێپس) (Arms, Biceps, Triceps, Curls, Extensions)
    if (raw.includes('بایسێپس') || raw.includes('ترایسێپس') || raw.includes('قۆڵ') || raw.includes('پاشەملە') || raw.includes('bicep') || raw.includes('tricep') || raw.includes('curl') || raw.includes('extension')) {
      return {
        setup: {
          icon: '🛡️',
          title: lang === 'en' ? 'Elbow Anchor & Posture:' : lang === 'ar' ? 'تثبيت المرفقين واستقامة الجسم:' : lang === 'fa' ? 'ثابت نگه‌داشتن آرنج‌ها:' : 'جێگیرکردنی ئانیشک و ڕێکی جەستە:',
          desc: lang === 'en'
            ? 'Lock elbows firmly against your ribs. Eliminate all torso swinging so the biceps/triceps perform 100% of the mechanical work.'
            : lang === 'ar'
            ? 'ثبت المرفقين بجانب أضلاعك تماماً وتجنب تحريكهما. لا تؤرجح ظهرك لرفع الوزن واجعل الجهد على الذراع فقط.'
            : lang === 'fa'
            ? 'آرنج‌ها را به دنده‌ها بچسبانید و نگذارید به جلو یا عقب حرکت کنند. بالاتنه را تکان ندهید.'
            : 'ئانیشکەکانت لە تەنیشت کەمەرت بچەسپێنە و بە هیچ شێوەیەک مەیانجوڵێنە. جەستەت مەشەکێنە و پشتت ڕاست ڕابگرە تا تەنها قۆڵ کار بکات.'
        },
        breathing: {
          icon: '🫁',
          title: lang === 'en' ? 'Peak Tension Exhale:' : lang === 'ar' ? 'الزفير عند أقصى شد عضلي:' : lang === 'fa' ? 'بازدم در اوج انقباض بازو:' : 'تەکنیکی هەناسەدان لە کاتی فشار:',
          desc: lang === 'en'
            ? 'Exhale forcefully through peak muscle contraction. Inhale slowly during the eccentric release back to start.'
            : lang === 'ar'
            ? 'ازفر عند ذروة انقباض العضلة، واستنشق أثناء فرد الذراع ببطء واستطالة العضلة.'
            : lang === 'fa'
            ? 'در هنگام منقبض کردن بازو بازدم کنید و در هنگام بازگشت آرام دست نفس بکشید.'
            : 'لە کاتی گرژکردنی قۆڵ و فشار هەناسە بدەرەوە، لە کاتی هێواش درێژکردنەوە و دابەزاندنی کێشەکە هەناسە هەڵمژە.'
        },
        tempo: {
          icon: '⏱️',
          title: lang === 'en' ? '1-Second Squeeze & Slow Negative:' : lang === 'ar' ? 'العصر لثانية والنزول البطيء:' : lang === 'fa' ? 'مکث یک ثانیه‌ای و پایین آوردن آرام:' : 'گرژکردنی لووتکە و دابەزینی لەسەرخۆ:',
          desc: lang === 'en'
            ? 'Squeeze hard for 1 full second at peak contraction, then lower with a strict 2.5 to 3-second negative tempo.'
            : lang === 'ar'
            ? 'اعصر العضلة بقوة في القمة لمدة ثانية، ثم خذ ٢.٥ إلى ٣ ثوانٍ في النزول لتحفيز البناء العضلي.'
            : lang === 'fa'
            ? 'در بالاترین نقطه ۱ ثانیه عضله را به سختی منقبض کنید، سپس در ۲.۵ الی ۳ ثانیه با آرامش پایین بیاورید.'
            : 'لە لووتکەی جوڵەکە بۆ ماوەی یەک چرکە ماسولکەکە بە توندی بگوشە (Squeeze)، پاشان بە ٢ بۆ ٣ چرکە بە هێواشی بیگەڕێنەرەوە خوارەوە.'
        }
      };
    }

    // ٧. ماسولکەکانی سک و پلانک (Abs, Core, Plank, Crunches)
    if (raw.includes('سک') || raw.includes('abs') || raw.includes('core') || raw.includes('plank') || raw.includes('پلانک') || raw.includes('crunch')) {
      return {
        setup: {
          icon: '🛡️',
          title: lang === 'en' ? 'Pelvic Tilt & Spinal Alignment:' : lang === 'ar' ? 'وضعية الحوض وتثبيت الظهر:' : lang === 'fa' ? 'تنظیم لگن و حمایت ستون فقرات:' : 'ڕێکخستنی کەمەر و حەوز:',
          desc: lang === 'en'
            ? 'Flatten lower back firmly against the floor (posterior pelvic tilt). Eliminate neck pulling and anchor your deep core.'
            : lang === 'ar'
            ? 'ثبت أسفل الظهر في الأرض تماماً وتجنب تقوسه. لا تشد رقبتك بيديك واجعل التركيز على عضلات البطن العميقة.'
            : lang === 'fa'
            ? 'گودی کمر را به زمین بچسبانید. با دست گردن را نکشید و تمام تمرکز را روی جمع کردن شکم بگذارید.'
            : 'خوارەوەی کەمەرت بچەسپێنە بە زەویدا، حەوزت کەمێک بەرەو پێشەوە بکێشە بۆ ئەوەی پەستان لەسەر بڕبڕە نەمێنێت و تەنها سک کار بکات.'
        },
        breathing: {
          icon: '🫁',
          title: lang === 'en' ? 'Full Diaphragmatic Expulsion:' : lang === 'ar' ? 'تفريغ الهواء لضغط العضلات:' : lang === 'fa' ? 'تخلیه کامل هوا برای انقباض شکم:' : 'تەکنیکی هەناسەدان بۆ گرژکردنی سک:',
          desc: lang === 'en'
            ? 'Exhale completely, pushing all air out as abs contract. Inhale on the controlled reset.'
            : lang === 'ar'
            ? 'ازفر كل الهواء من الرئتين عند انقباض البطن لأقصى استفادة، واستنشق عند العودة بهدوء.'
            : lang === 'fa'
            ? 'هنگام جمع کردن شکم تمام هوای ریه را خارج کنید تا عضلات شکم کاملاً به هم فشرده شوند.'
            : 'لە کاتی گرژکردنی سکدا تەواوی هەوای ناو سییەکانت دەربکە بۆ زۆرترین گرژبوون، لە کاتی گەڕانەوەدا هەناسە هەڵمژە.'
        },
        tempo: {
          icon: '⏱️',
          title: lang === 'en' ? 'Isometric Stability & Zero Momentum:' : lang === 'ar' ? 'الثبات والتحكم دون تسرع:' : lang === 'fa' ? 'ثبات ایزومتریک بدون ضربه:' : 'هاوسەنگی بێ ڕاکێشانی مل:',
          desc: lang === 'en'
            ? 'Move with deliberate slow control. In planks, maintain a rigid straight line from heels to head with squeezed glutes.'
            : lang === 'ar'
            ? 'تحرك ببطء وتركيز. في البلانك حافظ على خط مستقيم من الكعبين للرأس مع شد الأرداف دون هبوط الحوض.'
            : lang === 'fa'
            ? 'حرکات را با تمرکز انجام دهید. در پلانک بدن مثل خط‌کش صاف باشد و باسن شل یا آویزان نشود.'
            : 'جوڵەکان بە خاوی و تەرکیزەوە بکە. لە پلانکدا جەستەت وەک یەک تەختە بێت بەبێ داکەوتنی حەوز یان بەرزبوونەوەی زۆر.'
        }
      };
    }

    // ٨. پوز و ئامێرەکانی تری قاچ (Calves, Isolation, Leg Extension/Curl)
    return {
      setup: {
        icon: '🛡️',
        title: lang === 'en' ? 'Machine Anchor & Joint Safety:' : lang === 'ar' ? 'تثبيت الجسم وسلامة المفاصل:' : lang === 'fa' ? 'تنظیم دستگاه و ایمنی مفاصل:' : 'شێوازی دەستپێکردن و هاوسەنگی:',
        desc: lang === 'en'
          ? 'Fasten yourself securely against the machine backrest. Hold handles firmly to anchor your hips and isolate the target muscle.'
          : lang === 'ar'
          ? 'ثبت ظهرك في مسند الجهاز وأمسك المقابض بقوة لتثبيت الحوض وعزل العضلة المستهدفة بدقة.'
          : lang === 'fa'
          ? 'کمر را به تکیه‌گاه بچسبانید و دسته‌ها را محکم بگیرید تا باسن جابه‌جا نشود و عضله ایزوله کار کند.'
          : 'پشتی کەمەرت بچەسپێنە بە کورسی ئامێرەکە و دەسکەکان توند بگرە بۆ سەقامگیری. تەوەرەی ئامێرەکە با لەگەڵ تەوەری جومگەت ڕێک بێت.'
      },
      breathing: {
        icon: '🫁',
        title: lang === 'en' ? 'Exhale on Effort:' : lang === 'ar' ? 'الزفير عند بذل المجهود:' : lang === 'fa' ? 'تنفس در نقطه فشار:' : 'تەکنیکی هەناسەدان:',
        desc: lang === 'en'
          ? 'Exhale as you contract against machine resistance. Inhale smoothly as you control the return.'
          : lang === 'ar'
          ? 'ازفر أثناء بذل المجهود والضغط ضد مقاومة الجهاز، واستنشق بهدوء أثناء الرجوع.'
          : lang === 'fa'
          ? 'در فاز اعمال نیرو بازدم کنید و در فاز بازگشت آرام نفس بکشید.'
          : 'لە کاتی فشار و کێشانی کێشەکە هەناسە بدەرەوە، لە کاتی هێواش گەڕانەوەدا هەناسە هەڵمژە.'
      },
      tempo: {
        icon: '⏱️',
        title: lang === 'en' ? 'Full Range of Motion & Stretch:' : lang === 'ar' ? 'المدى الحركي الكامل والتمدد:' : lang === 'fa' ? 'دامنه کامل حرکتی و کشش:' : 'مەودای جوڵەی تەواو و هێواشی:',
        desc: lang === 'en'
          ? 'Avoid violent knee/elbow hyperextensions. Emphasize a deep full stretch at the bottom and a hard contraction at the peak.'
          : lang === 'ar'
          ? 'تجنب قفل المفاصل بعنف في نهاية الحركة. ركز على التمدد الكامل والعودة البطيئة لمدة ثانيتين.'
          : lang === 'fa'
          ? 'از قفل کردن محکم مفاصل خودداری کنید. کشش کامل در پایین و انقباض قوی در بالا را رعایت کنید.'
          : 'لە سەرەوە بە تەواوی جومگەکانت قوفڵ مەدە بۆ پاراستنی جومگە. کشانی تەواو لە خوارەوە و گرژکردنی بەهێز لە سەرەوە بکە.'
      }
    };
  };

  // پرۆفایلی یاریزان (هەژمارکراو و ڕێکخراو بە تەواوی لەلایەن مەکینەی زانستی AI)
  const [profile, setProfile] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('app_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed.supplements)) parsed.supplements = [];
          return parsed;
        }
      }
    } catch (e) {}
    const base = {
      name: 'یاریزان',
      age: 23,
      gender: 'male',
      weight: 78,
      targetWeight: 84,
      targetDays: 45,
      goalPace: 'normal',
      availableDaysPerWeek: 4,
      trainingLocation: 'gym',
      height: 178,
      activityLevel: 'active',
      goal: 'گەشەی ماسولکە',
      healthConditions: [],
      supplements: []
    };
    const calculated = calculateScientificGoalByAi(base);
    return {
      ...base,
      ...calculated,
      goalSugar: 35
    };
  });

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [showOnboardingLangDropdown, setShowOnboardingLangDropdown] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    name: '',
    gender: 'male',
    dob: '',
    age: '',
    height: '',
    weight: '',
    targetWeight: '',
    goal: 'دابەزاندنی کێش',
    healthConditions: [],
    usesSupplements: null,
    supplements: []
  });

  // دۆخی مۆداڵی سەپلیمێنت و ڤیتامین و هۆرمۆنەکان
  const [showSupplementsModal, setShowSupplementsModal] = useState(false);
  const [supplementCategoryFilter, setSupplementCategoryFilter] = useState('all');
  const [supplementSearchQuery, setSupplementSearchQuery] = useState('');
  const [supplementSearchText, setSupplementSearchText] = useState('');
  const [customSupplementInput, setCustomSupplementInput] = useState('');
  const [supplementsModalSource, setSupplementsModalSource] = useState('onboarding'); // 'onboarding' | 'profile'

  // دۆخی فلتەری پۆلەکانی خۆراک لە سەرەوەی بانکی خۆراک
  const [showFoodCategoryFilter, setShowFoodCategoryFilter] = useState(false);

  // دۆخی مۆداڵی شیکاری بینینی جەستە بە زیرەکی دەستکرد (AI Physique Vision Scanner)
  const [showPhysiqueModal, setShowPhysiqueModal] = useState(false);

  // دۆخی مۆداڵی بەڕێوەبەری و ڕاهێنەر (Master Admin Dashboard)
  const [showAdminModal, setShowAdminModal] = useState(false);
  // دۆخی قفڵکردنی ئەپ لە دوورەوە (Remote Kill-Switch / Suspend)
  const [isAppSuspended, setIsAppSuspended] = useState(false);
  const [appSuspendReason, setAppSuspendReason] = useState('');

  const handlePhysiqueAnalyzed = async (analysisResult, capturedImages) => {
    // ئەپلۆدکردنی وێنەکان بۆ کلاود ستۆریج تا ڕاهێنەر بتوانێت بیانبینێت
    let photoUrls = null;
    try {
      const athleteUid = authUser?.uid || profile?.id || 'athlete_' + (profile?.name || 'guest');
      photoUrls = await uploadPhysiquePhotos(athleteUid, capturedImages);
    } catch (uploadErr) {
      console.warn("Photo upload warning:", uploadErr);
    }

    const updatedProfile = {
      ...profile,
      physiqueAnalysis: {
        ...analysisResult,
        photos: photoUrls || analysisResult?.photos || null
      },
      lastPhysiqueScan: new Date().toLocaleDateString()
    };
    setProfile(updatedProfile);

    try {
      localStorage.setItem('kurd_fit_profile_v5', JSON.stringify(updatedProfile));
    } catch (e) {}

    if (analysisResult.recommendedCalories) {
      setProfileGoals(prev => ({
        ...prev,
        calories: analysisResult.recommendedCalories,
        proteins: analysisResult.recommendedProtein || prev.proteins
      }));
    }

    if (analysisResult.laggingMuscles && analysisResult.laggingMuscles.length > 0) {
      try {
        setActionLoadingState({ active: true, message: 'خەریکی داڕشتنەوەی کۆرسی ڕاهێنانە بەپێی ماسولکە لاوازەکانی لەشت...' });
        const currentDays = workoutCourse?.weeklyPlan?.length || 4;
        const newCourse = await window.generateWorkoutDirectly(updatedProfile, currentDays, workoutCourse?.location || 'gym', language);
        if (newCourse && newCourse.weeklyPlan) {
          setWorkoutCourse(newCourse);
        }
      } catch (err) {
        console.warn("Failed to auto-regenerate course after physique scan:", err);
      } finally {
        setActionLoadingState({ active: false, message: '' });
      }
    }
    playSparkleSound();
  };

  // دۆخی کیبۆردی مۆبایل بۆ ڕاهێنەری زیرەک و شاردنەوەی هێڵی خوارەوە
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);
  const [visualViewportStyle, setVisualViewportStyle] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    let maxHeight = window.innerHeight || vv.height;

    const handleViewportChange = () => {
      const currentH = vv.height;
      const fullH = Math.max(window.innerHeight || currentH, maxHeight);
      if (currentH > maxHeight) maxHeight = currentH;
      const kbOpen = (fullH - currentH) > 110;
      setIsKeyboardOpen(kbOpen);
      setVisualViewportStyle({
        height: `${Math.round(currentH)}px`,
        top: `${Math.round(vv.offsetTop)}px`
      });
    };

    vv.addEventListener('resize', handleViewportChange);
    vv.addEventListener('scroll', handleViewportChange);
    handleViewportChange();
    return () => {
      vv.removeEventListener('resize', handleViewportChange);
      vv.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [pickerDay, setPickerDay] = useState(15);
  const [pickerMonth, setPickerMonth] = useState(6);
  const [pickerYear, setPickerYear] = useState(2000);

  const [newConditionInput, setNewConditionInput] = useState('');
  const [waterMl, setWaterMl] = useState(1600);

  const handleAddWater = (amount) => {
    setWaterMl(prev => Math.max(0, prev + amount));
    if (amount > 0) {
      playWaterSound();
    } else if (amount < 0) {
      playWaterDecreaseSound();
    }
  };

  const defaultLastProtein = {
    id: 'prot_whey_1',
    name: 'وەی پڕۆتین (Whey Protein)',
    englishName: 'Whey Protein',
    quantity: 1,
    unit: 'سکۆپ',
    calories: 120,
    protein: 24,
    carbs: 3,
    fat: 1.5,
    mealTarget: 'snack'
  };

  const [lastUsedProtein, setLastUsedProtein] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('app_last_used_protein');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return defaultLastProtein;
  });

  const [isProteinWidgetDismissed, setIsProteinWidgetDismissed] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('app_protein_widget_dismissed') === 'true';
      }
    } catch (e) {}
    return false;
  });

  const [quickProteinAddedEffect, setQuickProteinAddedEffect] = useState(false);
  const [quickProteinRemovedEffect, setQuickProteinRemovedEffect] = useState(false);

  // دیاریکردنی هەڵبژاردنی ڕۆژەکانی مەجال لە مۆداڵی AI
  const [builderDaysCount, setBuilderDaysCount] = useState(4);
  const [courseLocation, setCourseLocation] = useState('gym');
  const [homeEquipment, setHomeEquipment] = useState('');
  const [isGeneratingAiCourse, setIsGeneratingAiCourse] = useState(false);
  const [courseBuilderStep, setCourseBuilderStep] = useState(1);
  const [editFormData, setEditFormData] = useState({ ...profile });
  const [goalFormData, setGoalFormData] = useState({ targetWeight: profile.targetWeight, targetDays: profile.targetDays, goal: profile.goal, goalPace: profile.goalPace || 'normal', bodyGoals: profile.bodyGoals || { enlarge: [], shrink: [] } });
  const [aiDaysRecommendation, setAiDaysRecommendation] = useState({ days: 4, text: 'خەریکی شیکارکردنە بە یارمەتی زیرەکی دەستکرد...', loading: true });

  const [workoutCourse, setWorkoutCourse] = useState(null);
  const [courseHistory, setCourseHistory] = useState([workoutCourse]);
  const [showCourseHistory, setShowCourseHistory] = useState(false);
  const [atlasLocationFilter, setAtlasLocationFilter] = useState('gym'); // 'gym' | 'home'

  // پشکنین و پاکسازی خۆکاری کۆرس لە هەر ئامێر و جووڵەیەکی نادروست بەپێی شوێن و کەرەستە
  useEffect(() => {
    if (workoutCourse && Array.isArray(workoutCourse.weeklyPlan)) {
      const isHome = (workoutCourse.trainingLocation === 'home') || (workoutCourse.location === 'home') || (profile?.trainingLocation === 'home');
      const eq = (workoutCourse.homeEquipment || profile?.homeEquipment || '').toLowerCase();
      
      const sanitized = sanitizeWorkoutPlan(JSON.parse(JSON.stringify(workoutCourse)), isHome ? 'home' : 'gym', eq);
      if (JSON.stringify(sanitized.weeklyPlan) !== JSON.stringify(workoutCourse.weeklyPlan)) {
        setWorkoutCourse(sanitized);
        try {
          localStorage.setItem('app_workout_course', JSON.stringify(sanitized));
          cacheWorkoutPlanMedia(sanitized.weeklyPlan);
        } catch (e) {}
      }
    }
  }, [workoutCourse, profile]);

  // پاشەکەوتکردنی خۆکارانەی کۆرس و ئۆنبۆردینگ بۆ ئەوەی لە کاتی ڕیفریش ون نەبێت
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedOnboarding = localStorage.getItem('app_onboarding_completed');
        if (savedOnboarding === 'true') {
          setHasCompletedOnboarding(true);
        }
        const savedCourse = localStorage.getItem('app_workout_course');
        if (savedCourse) {
          const parsed = JSON.parse(savedCourse);
          if (parsed && Array.isArray(parsed.weeklyPlan) && parsed.isAiOnlineGenerated === true) {
            const loc = parsed.trainingLocation || parsed.location || profile.trainingLocation || 'gym';
            const eq = parsed.homeEquipment || profile.homeEquipment || '';
            const sanitized = sanitizeWorkoutPlan(parsed, loc, eq);
            sanitized.isAiOnlineGenerated = true;
            setWorkoutCourse(sanitized);
            try {
              localStorage.setItem('app_workout_course', JSON.stringify(sanitized));
              cacheWorkoutPlanMedia(sanitized.weeklyPlan);
            } catch (cErr) {}
          } else {
            localStorage.removeItem('app_workout_course');
          }
        }
        const savedHistory = localStorage.getItem('app_course_history');
        if (savedHistory) {
          const parsedH = JSON.parse(savedHistory);
          if (Array.isArray(parsedH)) setCourseHistory(parsedH);
        }
        const savedWater = localStorage.getItem('app_water_ml');
        if (savedWater) {
          const parsedW = parseInt(savedWater, 10);
          if (!isNaN(parsedW)) setWaterMl(parsedW);
        }
        const savedProtein = localStorage.getItem('app_last_used_protein');
        if (savedProtein) {
          const parsedP = JSON.parse(savedProtein);
          if (parsedP && parsedP.name) setLastUsedProtein(parsedP);
        }
        const savedDismissed = localStorage.getItem('app_protein_widget_dismissed');
        if (savedDismissed !== null) {
          setIsProteinWidgetDismissed(savedDismissed === 'true');
        }
      }
    } catch (e) {
      console.warn("Error reading local storage cache:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_water_ml', waterMl.toString());
      }
    } catch (e) {}
  }, [waterMl]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && lastUsedProtein) {
        localStorage.setItem('app_last_used_protein', JSON.stringify(lastUsedProtein));
      }
    } catch (e) {}
  }, [lastUsedProtein]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_protein_widget_dismissed', isProteinWidgetDismissed ? 'true' : 'false');
      }
    } catch (e) {}
  }, [isProteinWidgetDismissed]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && workoutCourse) {
        localStorage.setItem('app_workout_course', JSON.stringify(workoutCourse));
      }
    } catch (e) {}
  }, [workoutCourse]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && courseHistory && courseHistory.length > 0 && courseHistory[0] !== null) {
        localStorage.setItem('app_course_history', JSON.stringify(courseHistory));
      }
    } catch (e) {}
  }, [courseHistory]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && hasCompletedOnboarding) {
        localStorage.setItem('app_onboarding_completed', 'true');
      }
    } catch (e) {}
  }, [hasCompletedOnboarding]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && profile) {
        localStorage.setItem('app_profile', JSON.stringify(profile));
      }
    } catch (e) {}
  }, [profile]);

  // دۆزینەوەی خۆکارانەی ڕۆژی ئەمڕۆ لە هەفتەدا (شەممە=0, یەکشەممە=1, دووشەممە=2, ...)
  
  useEffect(() => {
    if (showNewCourseModal) {
      setGoalFormData({
        targetWeight: profile.targetWeight,
        targetDays: profile.targetDays,
        goal: profile.goal,
        bodyGoals: profile.bodyGoals || { enlarge: [], shrink: [] }
      });
      setCourseBuilderStep(1);
      setAiDaysRecommendation({ days: 4, text: 'خەریکی شیکارکردنە بە یارمەتی زیرەکی دەستکرد...', loading: true });
      (async () => {
        try {
          if (typeof window !== "undefined" && typeof window.recommendDaysDirectly === "function") {
            const data = await window.recommendDaysDirectly(profile);
            if (data && data.recommendedDays) {
              setAiDaysRecommendation({ days: data.recommendedDays, text: data.reason || 'بەپێی زانیارییەکانت، ٤ ڕۆژ باشترینە.', loading: false });
              setBuilderDaysCount(data.recommendedDays);
              return;
            }
          }
          const res = await fetch('/api/recommend-days', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile })
          });
          const data = await res.json();
          setAiDaysRecommendation({ days: data.recommendedDays || 4, text: data.reason || 'بەپێی زانیارییەکانت، ٤ ڕۆژ باشترینە.', loading: false });
          if (data.recommendedDays) setBuilderDaysCount(data.recommendedDays);
        } catch {
          setAiDaysRecommendation({ days: 4, text: 'بەپێی زانیارییەکانت، ٤ ڕۆژ مامناوەند و گونجاوە.', loading: false });
        }
      })();
    }
  }, [showNewCourseModal, profile]);

  const getTodayDayIdx = () => {
    const jsDay = new Date().getDay(); // 0 is Sunday, 6 is Saturday
    return (jsDay + 1) % 7;
  };

  // ناسێنەری هەفتەی مەشق (لە ڕۆژی شەممەوە دەست پێدەکات)
  const getCurrentWeekKey = (d = new Date()) => {
    const date = new Date(d);
    const day = date.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
    const diffToSaturday = (day + 1) % 7; 
    const saturday = new Date(date);
    saturday.setDate(date.getDate() - diffToSaturday);
    saturday.setHours(0, 0, 0, 0);
    const y = saturday.getFullYear();
    const m = String(saturday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(saturday.getDate()).padStart(2, '0');
    return `week_${y}-${m}-${dayStr}`;
  };

  const [selectedDayIdx, setSelectedDayIdx] = useState(getTodayDayIdx);
  const [completedDayIndices, setCompletedDayIndices] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('app_completed_days_manual_v5');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_completed_days_manual_v5', JSON.stringify(completedDayIndices));
      }
    } catch (e) {}
  }, [completedDayIndices]);

  // فەنکشنی دەستپێکردنەوەی هەفتەی نوێ: سێتەکان و ڕۆژە تەواوبووەکان بۆ هەفتەی نوێ نوێ دەکاتەوە
  const handleStartNewWeekCycle = (showConfirm = false) => {
    if (showConfirm && typeof window !== 'undefined') {
      const confirmReset = window.confirm(
        language === 'en'
          ? "Start a fresh new week? This will reset exercise completions so you can track the new week's workouts."
          : "دەتەوێت خولی هەفتەی نوێ دەست پێبکەیتەوە؟ سێتە تەواوبووەکان نوێ دەکرێنەوە بۆ هەفتەی تازە."
      );
      if (!confirmReset) return;
    }

    setCompletedDayIndices([]);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_completed_days_manual_v5', JSON.stringify([]));
        localStorage.setItem('app_current_workout_week', getCurrentWeekKey());
      }
    } catch (e) {}

    setExerciseLogs(prev => {
      const resetLogs = {};
      Object.keys(prev || {}).forEach(exKey => {
        resetLogs[exKey] = (prev[exKey] || []).map(set => ({
          weight: set.weight || '',
          reps: set.reps || '',
          completed: false
        }));
      });
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_exercise_set_logs', JSON.stringify(resetLogs));
        }
      } catch (e) {}
      return resetLogs;
    });

    setActiveTimerSet(null);
    setRestTimerRunning(false);
    setRestTimerSeconds(0);
    setSelectedDayIdx(getTodayDayIdx());
    playSparkleSound();
  };

  useEffect(() => {
    // دەستنیشانکردنی خۆکارانەی ڕۆژی ئەمڕۆ لە کاتی کردنەوەی بەرنامەکەدا
    const todayIndex = getTodayDayIdx();
    setSelectedDayIdx(todayIndex);

    // پشکنینی خۆکارانە لە کاتی دەستپێکردنی هەفتەی نوێ (Automatic Weekly Reset)
    try {
      if (typeof window !== 'undefined') {
        const savedWeekKey = localStorage.getItem('app_current_workout_week');
        const activeWeekKey = getCurrentWeekKey();

        if (!savedWeekKey) {
          localStorage.setItem('app_current_workout_week', activeWeekKey);
        } else if (savedWeekKey !== activeWeekKey) {
          // هەفتەیەکی نوێ هاتووە، هەموو سێتەکان بۆ هەفتەی نوێ نوێ دەبنەوە
          handleStartNewWeekCycle(false);
        }
      }
    } catch (e) {
      console.error("Auto weekly reset check error:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== تایمەری پشووی نێوان سێتەکان (Gym Rest Timer + 3s Green Overlay + Background Notification) ====================
  const [restTimerSeconds, setRestTimerSeconds] = useState(0);
  const [restTimerTotal, setRestTimerTotal] = useState(60);
  const [restTimerRunning, setRestTimerRunning] = useState(false);
  const [activeTimerSet, setActiveTimerSet] = useState(null);
  const [showStartSetOverlay, setShowStartSetOverlay] = useState(false);
  const restTimerEndTimeRef = useRef(null);
  const startSetOverlayTimeoutRef = useRef(null);
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState(null);
  const [activeFormExercise, setActiveFormExercise] = useState(null);

  // دۆخی گۆڕین و لابردنی ڕاهێنان (Exercise Swap & Replacement Modal State)
  const [exerciseToSwapConfirm, setExerciseToSwapConfirm] = useState(null); // { ex, exIdx }
  const [exerciseSwapModalData, setExerciseSwapModalData] = useState(null); // { ex, exIdx }
  const [swapMuscleFilter, setSwapMuscleFilter] = useState('same');
  const [isAiSwappingExercise, setIsAiSwappingExercise] = useState(false);

  const handleReplaceExerciseInDay = (exIdx, newEx) => {
    if (!workoutCourse || !Array.isArray(workoutCourse.weeklyPlan)) return;
    const updatedPlan = workoutCourse.weeklyPlan.map((day, dIdx) => {
      if (dIdx !== selectedDayIdx) return day;
      const exList = [...(day.exercises || [])];
      if (exIdx >= 0 && exIdx < exList.length) {
        exList[exIdx] = {
          ...exList[exIdx],
          name: newEx.name,
          englishName: newEx.englishName || newEx.name,
          sets: Number(newEx.sets) || Number(exList[exIdx]?.sets) || 4,
          reps: newEx.reps || exList[exIdx]?.reps || '10-12',
          rest: newEx.rest || exList[exIdx]?.rest || '60s',
          muscle: newEx.muscle || exList[exIdx]?.muscle || 'ماسولکە'
        };
      }
      return { ...day, exercises: exList };
    });
    const updatedCourse = { ...workoutCourse, weeklyPlan: updatedPlan, isAiOnlineGenerated: true };
    setWorkoutCourse(updatedCourse);
    setExerciseSwapModalData(null);
    setExerciseToSwapConfirm(null);
    playSparkleSound();
  };

  const handleDeleteExerciseFromDay = (exIdx) => {
    if (!workoutCourse || !Array.isArray(workoutCourse.weeklyPlan)) return;
    const updatedPlan = workoutCourse.weeklyPlan.map((day, dIdx) => {
      if (dIdx !== selectedDayIdx) return day;
      const exList = (day.exercises || []).filter((_, idx) => idx !== exIdx);
      return { ...day, exercises: exList };
    });
    const updatedCourse = { ...workoutCourse, weeklyPlan: updatedPlan, isAiOnlineGenerated: true };
    setWorkoutCourse(updatedCourse);
    setExerciseSwapModalData(null);
    setExerciseToSwapConfirm(null);
    playDeleteSound();
  };

  const handleAiSwapSingleExercise = async (ex, exIdx) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      alert(currentLangConfig.code === 'en' ? 'Please connect to the internet to swap exercise via AI.' : 'تکایە پەیوەندی بە ئینتەرنێتەوە بکە بۆ گۆڕینی ڕاهێنانەکە لە ڕێگەی زیرەکی دەستکردەوە.');
      return;
    }
    setIsAiSwappingExercise(true);
    try {
      const currentDayObj = workoutCourse?.weeklyPlan?.[selectedDayIdx] || {};
      const existingExercises = currentDayObj.exercises || [];
      const replacement = await window.swapExerciseDirectly(
        profile,
        ex,
        currentDayObj.focus || '',
        existingExercises,
        language
      );
      if (replacement && (replacement.name || replacement.englishName)) {
        handleReplaceExerciseInDay(exIdx, replacement);
      }
    } catch (err) {
      console.error("AI Single Exercise Swap Error:", err);
      alert(currentLangConfig.code === 'en' ? 'Could not connect to AI. You can also select any exercise from the list below.' : 'کێشەیەک لە هێڵی ئینتەرنێت ڕوویدا. تکایە دووبارە هەوڵبدەرەوە یان لە لیستی خوارەوە ڕاهێنانێک هەڵبژێرە.');
    } finally {
      setIsAiSwappingExercise(false);
    }
  };

  // ==================== پاڵپشتی دوگمەی گەڕانەوەی مۆبایل (Android Back Button / History PopState) ====================
  const isAnyModalOpen = Boolean(
    showAdminModal ||
    showPhysiqueModal ||
    showScanModal ||
    showEditProfileModal ||
    showAuthModal ||
    showGoalModal ||
    showNotificationsModal ||
    showNewCourseModal ||
    showAiFoodModal ||
    showSettingsModal ||
    showAiDietModal ||
    showHomeMealsModal ||
    showNutritionHistoryModal ||
    showLogoutConfirmModal ||
    showResetModal ||
    selectedFoodForPortion ||
    activeFormExercise ||
    exerciseToSwapConfirm ||
    exerciseSwapModalData ||
    showSupplementsModal
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAnyModalOpen || activeTab !== 'home') {
      try {
        window.history.pushState({ kurdfitOverlay: true }, '');
      } catch (e) {}
    }

    const handleBackNavigation = () => {
      if (showAdminModal) { setShowAdminModal(false); return; }
      if (showPhysiqueModal) { setShowPhysiqueModal(false); return; }
      if (exerciseSwapModalData) { setExerciseSwapModalData(null); return; }
      if (exerciseToSwapConfirm) { setExerciseToSwapConfirm(null); return; }
      if (showSupplementsModal) { setShowSupplementsModal(false); return; }
      if (activeFormExercise) { setActiveFormExercise(null); return; }
      if (selectedFoodForPortion) { setSelectedFoodForPortion(null); return; }
      if (showScanModal) { setShowScanModal(false); return; }
      if (showEditProfileModal) { setShowEditProfileModal(false); return; }
      if (showAuthModal) { setShowAuthModal(false); return; }
      if (showGoalModal) { setShowGoalModal(false); return; }
      if (showNotificationsModal) { setShowNotificationsModal(false); return; }
      if (showNewCourseModal) { setShowNewCourseModal(false); return; }
      if (showAiFoodModal) { setShowAiFoodModal(false); return; }
      if (showSettingsModal) { setShowSettingsModal(false); return; }
      if (showAiDietModal) { setShowAiDietModal(false); return; }
      if (showHomeMealsModal) { setShowHomeMealsModal(false); return; }
      if (showNutritionHistoryModal) { setShowNutritionHistoryModal(false); return; }
      if (showLogoutConfirmModal) { setShowLogoutConfirmModal(false); return; }
      if (showResetModal) { setShowResetModal(false); return; }
      if (activeTab !== 'home') { setActiveTab('home'); return; }
    };

    window.addEventListener('popstate', handleBackNavigation);
    return () => window.removeEventListener('popstate', handleBackNavigation);
  }, [
    isAnyModalOpen, activeTab, activeFormExercise, selectedFoodForPortion,
    showScanModal, showEditProfileModal, showAuthModal, showGoalModal,
    showNotificationsModal, showNewCourseModal, showAiFoodModal,
    showSettingsModal, showAiDietModal, showHomeMealsModal,
    showNutritionHistoryModal, showLogoutConfirmModal, showResetModal,
    exerciseToSwapConfirm, exerciseSwapModalData, showSupplementsModal,
    showPhysiqueModal, showAdminModal
  ]);

  // دۆخی بینینی ڕاهێنانەکان لە تابی راهێنان (Compact List vs Large icons)
  const [workoutViewMode, setWorkoutViewMode] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('app_workout_view_mode') || 'compact';
      }
    } catch (e) {}
    return 'compact';
  });

  const handleSetWorkoutViewMode = (mode) => {
    setWorkoutViewMode(mode);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_workout_view_mode', mode);
      }
    } catch (e) {}
  };

  // داتای کێش و دووبارەکردنەوەی سێتەکان (Progressive Overload Set Logger)
  const [exerciseLogs, setExerciseLogs] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('app_exercise_set_logs');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return {};
  });

  // ==================== مەکینەی دەنگە خۆماڵییەکان (Audio FX Engine Imported) ====================
  const playSetCompleteSound = () => audioFX.playSetCompleteSound(soundEnabled);
  const playCountdownTick = (freq) => audioFX.playCountdownTick(soundEnabled, freq);
  const playTimerCompleteSound = () => audioFX.playTimerCompleteSound(soundEnabled);
  const playWorkoutFinishedSound = () => audioFX.playWorkoutFinishedSound(soundEnabled);
  const playWaterSound = () => audioFX.playWaterSound(soundEnabled);
  const playMealLoggedSound = () => audioFX.playMealLoggedSound(soundEnabled);
  const playSparkleSound = () => audioFX.playSparkleSound(soundEnabled);
  const playWaterDecreaseSound = () => audioFX.playWaterDecreaseSound(soundEnabled);
  const playUncheckSound = () => audioFX.playUncheckSound(soundEnabled);
  const playUntoggleWorkoutSound = () => audioFX.playUntoggleWorkoutSound(soundEnabled);
  const playFoodUneatenSound = () => audioFX.playFoodUneatenSound(soundEnabled);
  const playQuickRemoveSound = () => audioFX.playQuickRemoveSound(soundEnabled);
  const playDeleteSound = () => audioFX.playDeleteSound(soundEnabled);

  const triggerRestTimerFinishedEffects = useCallback(() => {
    playTimerCompleteSound();
    setRestTimerRunning(false);
    setActiveTimerSet(null);
    restTimerEndTimeRef.current = null;

    // شاشەی سەوزی پڕاوپڕ بە نووسینی گەورەی (دەستپێکە) بۆ ماوەی ٣ چرکە
    setShowStartSetOverlay(true);
    if (startSetOverlayTimeoutRef.current) clearTimeout(startSetOverlayTimeoutRef.current);
    startSetOverlayTimeoutRef.current = setTimeout(() => {
      setShowStartSetOverlay(false);
    }, 3000);

    // نۆتیفیکەیشنی گەورە بۆ سەر شاشەی مۆبایل ئەگەر یاریزان لە دەرەوەی بەرنامەکەش بێت
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notifTitle = "دەستپێکە! 💪🔥";
        const notifBody = "کاتی پشووی سێتەکەت تەواو بوو — ئێستا دەستپێکە بە سێتی دواتر!";
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(notifTitle, {
              body: notifBody,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              vibrate: [400, 150, 400, 150, 600],
              requireInteraction: true,
              tag: 'bq-gym-rest-timer'
            }).catch(() => {});
          }).catch(() => {});
        } else {
          new Notification(notifTitle, {
            body: notifBody,
            icon: '/icon-192x192.png',
            requireInteraction: true,
            tag: 'bq-gym-rest-timer'
          });
        }
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled]);

  useEffect(() => {
    let interval = null;
    if (restTimerRunning) {
      if (!restTimerEndTimeRef.current) {
        restTimerEndTimeRef.current = Date.now() + restTimerSeconds * 1000;
      }
      let lastTickSec = restTimerSeconds;
      interval = setInterval(() => {
        const remainingMs = (restTimerEndTimeRef.current || Date.now()) - Date.now();
        const nextSec = Math.max(0, Math.ceil(remainingMs / 1000));
        if (nextSec <= 0) {
          setRestTimerSeconds(0);
          triggerRestTimerFinishedEffects();
          return;
        }
        if (nextSec !== lastTickSec) {
          lastTickSec = nextSec;
          if (nextSec === 3 || nextSec === 2 || nextSec === 1) {
            playCountdownTick(920);
          }
          setRestTimerSeconds(nextSec);
        }
      }, 250);
    } else {
      restTimerEndTimeRef.current = null;
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimerRunning, soundEnabled, triggerRestTimerFinishedEffects]);

  // کاتێک یاریزان لە بەرنامەکە دەچێتە دەرەوە و دەگەڕێتەوە، کاتی ڕاستەقینە دەپشکنێت
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      if (!document.hidden && restTimerRunning && restTimerEndTimeRef.current) {
        const remainingMs = restTimerEndTimeRef.current - Date.now();
        if (remainingMs <= 0) {
          setRestTimerSeconds(0);
          triggerRestTimerFinishedEffects();
        } else {
          setRestTimerSeconds(Math.ceil(remainingMs / 1000));
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [restTimerRunning, triggerRestTimerFinishedEffects]);

  const startRestTimer = (seconds) => {
    const secs = Number(seconds) || 60;
    restTimerEndTimeRef.current = Date.now() + secs * 1000;
    setRestTimerTotal(secs);
    setRestTimerSeconds(secs);
    setRestTimerRunning(true);
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {}
  };

  const handleUpdateSetLog = (exerciseName, setIdx, field, value) => {
    setExerciseLogs(prev => {
      const currentEx = prev[exerciseName] || [];
      const updatedEx = [...currentEx];
      if (!updatedEx[setIdx]) updatedEx[setIdx] = { weight: '', reps: '', completed: false };
      updatedEx[setIdx] = { ...updatedEx[setIdx], [field]: value };
      const next = { ...prev, [exerciseName]: updatedEx };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_exercise_set_logs', JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  const handleToggleSetCompleted = (exerciseName, setIdx, exIdx = null) => {
    const currentEx = exerciseLogs[exerciseName] || [];
    const isCurrentlyCompleted = !!(currentEx[setIdx] && currentEx[setIdx].completed);
    const willBeCompleted = !isCurrentlyCompleted;

    setExerciseLogs(prev => {
      const cur = prev[exerciseName] || [];
      const updated = [...cur];
      if (!updated[setIdx]) updated[setIdx] = { weight: '', reps: '', completed: false };
      updated[setIdx] = { ...updated[setIdx], completed: willBeCompleted };
      const next = { ...prev, [exerciseName]: updated };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_exercise_set_logs', JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });

    if (willBeCompleted) {
      playSetCompleteSound();
      setActiveTimerSet({ exKey: exerciseName, setIdx, exIdx });
      startRestTimer(60);
    } else {
      playUncheckSound();
      if (activeTimerSet?.setIdx === setIdx && (activeTimerSet?.exKey === exerciseName || activeTimerSet?.exIdx === exIdx)) {
        setActiveTimerSet(null);
        setRestTimerRunning(false);
        setRestTimerSeconds(0);
      }
    }
  };

  // زیادکردنی سێتی تەواوبوو (+) لەگەڵ دەستپێکردنی کاونتداونی پشوو
  const handleIncrementExerciseSet = (exerciseName, exIdx, setsCount, restSeconds = 60) => {
    const currentEx = exerciseLogs[exerciseName] || [];
    const completedCount = currentEx.filter(s => s && s.completed).length;
    if (completedCount >= setsCount) return; // ڕێژەی دیاریکراو پڕبووە

    const targetIdx = completedCount;
    setExerciseLogs(prev => {
      const cur = prev[exerciseName] || [];
      const updated = [...cur];
      if (!updated[targetIdx]) updated[targetIdx] = { weight: '', reps: '', completed: false };
      updated[targetIdx] = { ...updated[targetIdx], completed: true };
      const next = { ...prev, [exerciseName]: updated };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_exercise_set_logs', JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });

    playSetCompleteSound();
    setActiveTimerSet({ exKey: exerciseName, setIdx: targetIdx, exIdx });
    startRestTimer(Number(restSeconds) || 60);
  };

  // کەمکردنەوەی سێتی تەواوبوو (-) بەبێ دەستپێکردنی کاونتداون
  const handleDecrementExerciseSet = (exerciseName, exIdx) => {
    const currentEx = exerciseLogs[exerciseName] || [];
    let lastCompletedIdx = -1;
    for (let i = currentEx.length - 1; i >= 0; i--) {
      if (currentEx[i] && currentEx[i].completed) {
        lastCompletedIdx = i;
        break;
      }
    }
    if (lastCompletedIdx === -1) return; // سەرەتایە و سفرە

    setExerciseLogs(prev => {
      const cur = prev[exerciseName] || [];
      const updated = [...cur];
      updated[lastCompletedIdx] = { ...updated[lastCompletedIdx], completed: false };
      const next = { ...prev, [exerciseName]: updated };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_exercise_set_logs', JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });

    playUncheckSound();
    // بە داگرتنی دوگمەی - هیچ کاریگەرییەک لەسەر کاونتداون نابێت و تایمەر بەردەوام دەبێت لە ژماردن
  };

  const handlePrintWorkout = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification("Kurd Fit | کاپتن ئامادەبە!", {
            body: "ئاگادارکردنەوەی ڕۆژانەی ڕاهێنان چالاک کرا 💪",
            icon: "/icon-192x192.png"
          });
          alert("ئاگادارکردنەوەی ڕۆژانە بە سەرکەوتوویی چالاک کرا! 🔔");
        } else {
          alert("مۆڵەتی نۆتیفیکەیشن نەدرا لە وێبگەڕەکەتدا.");
        }
      } catch (e) {
        alert("وێبگەڕەکەت پشتگیری لە نۆتیفیکەیشن ناکات.");
      }
    }
  };

  // هەژمارکردنی خۆکارانەی ئامانج بە سیستەمی پێشکەوتوو (AI Auto Goal Calculate)
  const handleAutoCalculateGoalWithAi = () => {
    const calculated = calculateScientificGoalByAi(profile);
    const updated = {
      ...profile,
      ...calculated
    };
    setProfile(updated);
  };

  const generateAiDietProgram = async (dietType) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      alert(currentLangConfig.code === 'en' ? 'Please connect to the internet to generate an AI nutrition plan.' : 'تکایە سەرەتا پەیوەندی بە ئینتەرنێتەوە بکە بۆ داڕشتنی خشتەی خۆراک بە زیرەکی دەستکرد.');
      return;
    }
    setIsGeneratingDiet(true);
    setAiDietStep('generating');
    
    try {
      const data_res = await window.generatePlanDirectly(profile, dietType, profile.goalCalories || 2200, language);
      const response = { ok: true, json: async () => data_res };

      if (!response.ok) throw new Error('Failed to generate diet plan');
      const data = await response.json();
      
      if (Array.isArray(data) && data.length === 7) {
        setDietMeals(data);
        setNutritionSubView('meals');
        setAiDietStep('prompt'); 
        setIsGeneratingDiet(false);
        return;
      } else {
        throw new Error('Invalid plan format from API');
      }
    } catch (error) {
      console.error(error);
      setAiDietStep('select');
      setIsGeneratingDiet(false);
      alert(currentLangConfig.code === 'en' ? 'Could not connect to AI server. Please check your internet connection and try again.' : 'کێشەیەک لە هێڵی ئینتەرنێت ڕوویدا. تکایە دڵنیابەرەوە لە پەیوەندی ئینتەرنێتەکەت و دووبارە هەوڵبدەرەوە.');
    }
  };
  // پێشنیارکردنی زیرەکانەی ئامانج بە سیستەمی پێشکەوتوو لە مۆداڵ (AI Goal Suggestion Engine)
  const handleTriggerAiGoalSuggestion = (presetType = 'smart') => {
    setIsAiSuggestingGoal(true);
    setAiGoalSuccessMsg('');

    setTimeout(() => {
      let targetW = profile.weight + 6;
      let targetD = 45;
      let goalText = 'گەشەی ماسولکە';

      if (presetType === 'bulk') {
        targetW = profile.weight + 6;
        targetD = 45;
        goalText = 'گەشەی ماسولکە';
      } else if (presetType === 'cut') {
        targetW = Math.max(profile.weight - 5, 50);
        targetD = 40;
        goalText = 'سوتاندنی چەوری';
      } else if (presetType === 'recomp') {
        targetW = profile.weight;
        targetD = 45;
        goalText = 'جێگیرکردنی کێش';
      } else {
        const heightM = (profile.height || 178) / 100;
        const currentBmi = (profile.weight || 78) / (heightM * heightM);
        
        if (currentBmi < 21.5) {
          targetW = profile.weight + 7;
          targetD = 50;
          goalText = 'گەشەی ماسولکە';
        } else if (currentBmi > 26.5) {
          targetW = Math.round(23.5 * heightM * heightM);
          targetD = Math.max(Math.round((profile.weight - targetW) / 0.75 * 7), 35);
          goalText = 'سوتاندنی چەوری';
        } else {
          targetW = profile.weight + 6;
          targetD = 45;
          goalText = 'گەشەی ماسولکە';
        }
      }

      setGoalFormData(prev => ({
        ...prev,
        targetWeight: targetW,
        targetDays: targetD,
        goal: goalText
      }));

      setIsAiSuggestingGoal(false);
      setAiGoalSuccessMsg(
        <><Sparkles size={16} className="inline-block" /> {
          currentLangConfig.code === 'en' ? 'Scientific AI recommendation applied!' :
          currentLangConfig.code === 'ar' ? 'تم تطبيق الاقتراح العلمي للنظام بنجاح!' :
          currentLangConfig.code === 'fa' ? 'پیشنهاد علمی سیستم با موفقیت اعمال شد!' :
          'پێشنیاری زانستی سیستەم جێبەجێ کرا!'
        }</>
      );
      setTimeout(() => setAiGoalSuccessMsg(''), 3500);
    }, 300);
  };

  // دروستکردن و جێبەجێکردنی کۆرسی نوێ بە سیستەمی پێشکەوتوو
  
  const getRecommendedDaysText = (profile) => {
    let recDays = 4;
    let reason = "بۆ ئەوەی جەستەت پشوو بدات و ماسولکەکانت بە تەواوی گەشە بکەن.";
    
    if (profile.healthConditions && profile.healthConditions.length > 0) {
      recDays = 3;
      reason = "لەبەر ئەوەی پێکانت هەیە، باشترە ڕۆژەکانی پشووت زیاتر بن بۆ چاکبوونەوەی تەواوەتی.";
    } else if (profile.targetWeight > profile.weight && (profile.targetWeight - profile.weight) > 5) {
      recDays = 4;
      reason = "بۆ زیادکردنی کێش و ماسولکە، ٤ ڕۆژ باشترینە چونکە پشوودان زۆر گرنگە بۆ گەورەبوونی ماسولکە.";
    } else if (profile.targetWeight < profile.weight) {
      recDays = 5;
      reason = "بۆ سوتاندنی چەوری و دابەزاندنی کێش، ٥ ڕۆژ یارمەتیدەرە بۆ سوتاندنی زۆرترین کالۆری.";
    }
    
    return { recDays, reason };
  };

  const handleGenerateCustomCourse = async (daysCount) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      alert(currentLangConfig.code === 'en' ? 'Internet connection is required to design a personalized AI workout course.' : 'تکایە سەرەتا پەیوەندی بە ئینتەرنێتەوە بکە. داڕشتنی هەر کۆرسێک تەنها بە بوونی ئینتەرنێت و لە ڕێگەی زیرەکی دەستکردەوە (AI) ئەنجام دەدرێت.');
      return;
    }

    setIsGeneratingAiCourse(true);
    const count = daysCount || builderDaysCount || (workoutCourse?.daysPerWeek || 0) || profile.availableDaysPerWeek || 4;
    const base = {
      ...profile,
      targetWeight: Number(goalFormData.targetWeight) || profile.targetWeight,
      targetDays: Number(goalFormData.targetDays) || profile.targetDays,
      goal: goalFormData.goal || profile.goal,
      goalPace: goalFormData.goalPace || profile.goalPace || 'normal',
      bodyGoals: goalFormData.bodyGoals || profile.bodyGoals || { enlarge: [], shrink: [] },
      availableDaysPerWeek: count,
      trainingLocation: courseLocation || profile.trainingLocation || 'gym',
      homeEquipment: courseLocation === 'home' ? (homeEquipment || '') : ''
    };
    const autoCalc = calculateScientificGoalByAi(base);
    const updated = { ...base, ...autoCalc };
    const loc = courseLocation || updated.trainingLocation || 'gym';
    const eq = loc === 'home' ? (homeEquipment || '') : '';

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 45000)
      );

      const onlineGenerationPromise = async () => {
        if (typeof window !== "undefined" && typeof window.generateWorkoutDirectly === "function") {
          return await window.generateWorkoutDirectly(updated, count, loc, eq, language);
        }
        throw new Error("AI generator unavailable");
      };

      const generated = await Promise.race([onlineGenerationPromise(), timeoutPromise]);

      if (!generated || !Array.isArray(generated.weeklyPlan) || generated.weeklyPlan.length !== 7) {
        throw new Error("Invalid AI course response");
      }

      const cleanCourse = sanitizeWorkoutPlan(generated, loc, eq);
      cleanCourse.isAiOnlineGenerated = true;
      setCourseHistory(prev => [cleanCourse, ...prev]);
      setWorkoutCourse(cleanCourse);
      setProfile(updated);

      if (cleanCourse && cleanCourse.weeklyPlan) {
        setTimeout(() => {
          try {
            cacheWorkoutPlanMedia(cleanCourse.weeklyPlan);
          } catch (e) {}
        }, 1200);
      }
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_workout_course', JSON.stringify(cleanCourse));
          localStorage.setItem('app_profile', JSON.stringify(updated));
        }
      } catch (e) {}
      setSelectedDayIdx(getTodayDayIdx());
      setCompletedDayIndices([]);
      setShowNewCourseModal(false);
      playSparkleSound();
    } catch (err) {
      console.error("AI Workout course generation failed:", err);
      alert(
        currentLangConfig.code === 'en'
          ? 'Could not design the course via AI. Please check your internet connection and try again.'
          : 'نەتوانرا پەیوەندی بە زیرەکی دەستکردەوە بکرێت بۆ داڕشتنی کۆرسەکەت. تکایە دڵنیابەرەوە لە هەبوونی هێڵی ئینتەرنێت و دووبارە هەوڵبدەرەوە.'
      );
    } finally {
      setIsGeneratingAiCourse(false);
    }
  };

  useEffect(() => {
    if ((activeTab === 'more' || activeTab === 'ai') && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAiThinking, activeTab]);

  // شیکارکەر و نەخشاندنی دەقی Antigravity سیستەم بە مۆدێلی دەوڵەمەند (Universal Markdown & Code Renderer)
  const renderAntigravityFormattedText = (rawText) => {
    if (!rawText) return null;

    // دابەشکردنی دەق بەپێی بلۆکەکانی کۆد (Multi-line Code Blocks)
    const codeBlockRegex = /\x60{3}([\w]*)\n([\s\S]*?)\x60{3}/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: rawText.slice(lastIndex, match.index) });
      }
      segments.push({
        type: 'code',
        lang: match[1] || 'code',
        content: match[2]
      });
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < rawText.length) {
      segments.push({ type: 'text', content: rawText.slice(lastIndex) });
    }

    const parseInlineTokens = (textStr) => {
      const parts = textStr.split(/(\*{2}.*?\*{2}|\x60.*?\x60)/g);
      return parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} style={{ color: 'var(--text-main)', fontWeight: '800' }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('\x60') && part.endsWith('\x60')) {
          return (
            <code key={pIdx} style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--color-proteins)', padding: '2px 6px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });
    };

    return segments.map((seg, sIdx) => {
      if (seg.type === 'code') {
        const isCodeCopied = copiedMsgId === ('code_' + sIdx);
        return (
          <div key={sIdx} style={{ margin: '10px 0', borderRadius: '12px', overflow: 'hidden', background: '#0d1117', border: '1px solid rgba(6, 182, 212, 0.25)', boxShadow: '0 4px 15px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: 'var(--card-subtle)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: '800', color: 'var(--color-proteins)', textTransform: 'uppercase' }}>{seg.lang || 'Code'}</span>
              <button
                type="button"
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(seg.content);
                    setCopiedMsgId('code_' + sIdx);
                    setTimeout(() => setCopiedMsgId(null), 2000);
                  }
                }}
                style={{ background: 'none', border: 'none', color: isCodeCopied ? 'var(--accent-primary)' : '#94A3B8', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}
              >
                <span>{isCodeCopied ? <><Check size={16} className="inline-block" /></> : <><Clipboard size={16} className="inline-block" /></>}</span>
                <span>{isCodeCopied ? (currentLangConfig.code === 'en' ? 'Copied' : currentLangConfig.code === 'ar' ? 'تم النسخ' : currentLangConfig.code === 'fa' ? 'کپی شد' : 'کۆپیکرا') : (currentLangConfig.code === 'en' ? 'Copy Code' : currentLangConfig.code === 'ar' ? 'نسخ الكود' : currentLangConfig.code === 'fa' ? 'کپی کد' : 'کۆپیکردنی کۆد')}</span>
              </button>
            </div>
            <pre style={{ padding: '12px', margin: 0, overflowX: 'auto', fontSize: '12.5px', color: 'var(--color-proteins)', fontFamily: 'monospace', lineHeight: '1.5', direction: 'ltr', textAlign: 'left' }}>
              {seg.content}
            </pre>
          </div>
        );
      }

      const lines = seg.content.split('\n');
      return (
        <div key={sIdx}>
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
              const cleanContent = trimmed.replace(/^[•\-\*]\s*/, '');
              const itemParts = parseInlineTokens(cleanContent);

              return (
                <div key={lIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '4px 0' }}>
                  <span style={{ color: '#06B6D4', fontSize: '13px', lineHeight: '1.4' }}>•</span>
                  <div style={{ flex: 1, lineHeight: '1.6' }}>{itemParts}</div>
                </div>
              );
            }

            if (trimmed === '') {
              return <div key={lIdx} style={{ height: '8px' }} />;
            }

            return (
              <div key={lIdx} style={{ marginBottom: '3px', lineHeight: '1.6' }}>
                {parseInlineTokens(line)}
              </div>
            );
          })}
        </div>
      );
    });
  };

  // مەکینەی سیستەمی پێشکەوتووی ڕاهێنەری وەرزش و خۆراک (AI Fitness & Nutrition Coach Conversational Engine)
  const handleSendAiChatMessage = async (inputText) => {
    const query = (inputText || chatInput).trim();
    if (!query) return;

    const userMsgId = 'msg_user_' + Date.now();
    const newMsg = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setIsAiThinking(true);

    try {
      const data_res = await window.generateCoachReplyDirectly(query, profile, chatMessages.slice(-5), language);
      const response = { ok: true, json: async () => data_res };

      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      
      const aiMsg = {
        id: 'msg_ai_' + Date.now(),
        sender: 'ai',
        text: data.reply,
        thought: data.thought || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedReplies: data.suggestedReplies || []
      };

      if (data.action) {
        let actionIcon = null;
        if (data.action.type === 'SWITCH_COURSE') actionIcon = <Zap size={16} className="inline-block" />;
        else if (data.action.type === 'CHANGE_GOAL') actionIcon = <Target size={16} className="inline-block" color="var(--text-main)" />;
        else if (data.action.type === 'ADD_MEAL') actionIcon = <Utensils size={16} className="inline-block" />;
        else if (data.action.type === 'ADD_HEALTH_CONDITION') actionIcon = <Bandage size={16} className="inline-block" />;

        aiMsg.action = { 
          ...data.action, 
          id: 'act_' + Date.now(),
          rawTitle: data.action.title || '',
          title: actionIcon ? <>{actionIcon} {data.action.title}</> : data.action.title
        };
        
        if (data.action.type === 'ADD_MEAL' && data.action.food) {
          aiMsg.action.food.id = 'ai_food_' + Date.now();
          aiMsg.action.food.quantity = 1;
          aiMsg.action.food.unit = 'ژەم';
        }
      }

      setChatMessages(prev => [...prev, aiMsg]);
      setIsAiThinking(false);

    } catch (error) {
      console.error(error);
      const aiMsg = {
        id: 'msg_ai_' + Date.now(),
        sender: 'ai',
        text: 'ببورە پاڵەوان، کێشەیەک ڕوویدا لە هێڵی ئینتەرنێت یان ڕاژەکارەکە. تکایە دووبارە هەوڵبدەرەوە.',
        thought: 'هەڵەی پەیوەندیکردن بە سێرڤەری زیرەکی دەستکرد.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedReplies: []
      };
      setChatMessages(prev => [...prev, aiMsg]);
      setIsAiThinking(false);
    }
  };
  const handleExecuteAiAction = (action, parentMsg = null) => {
    if (!action || action.isApplied) return;

    const actionTitle = typeof action.title === 'string' ? action.title : (action.rawTitle || '');
    const actionDesc = typeof action.description === 'string' ? action.description || '' : '';
    const actionType = (action.type || '').toUpperCase();
    const parentText = (parentMsg?.text || '').toLowerCase();
    const targetSection = (action.targetSection || '').toLowerCase();

    const fullText = [
      parentText,
      actionTitle,
      actionDesc,
      actionType,
      targetSection
    ].join(' ').toLowerCase();

    // بەشی ڕاهێنان (Workout Section - tab: 'workout')
    const isWorkoutSection = targetSection === 'workout' || 
                             targetSection === 'workouts' ||
                             actionType === 'SWITCH_COURSE' ||
                             actionType.includes('WORKOUT') ||
                             actionType.includes('COURSE') ||
                             actionType.includes('EXERCISE') ||
                             actionType.includes('TRAINING') ||
                             actionType.includes('SPLIT') ||
                             fullText.includes('بەشی ڕاهێنان') ||
                             fullText.includes('بەشی راهێنان') ||
                             fullText.includes('لە بەشی ڕاهێنان') ||
                             fullText.includes('لە بەشی راهێنان') ||
                             fullText.includes('ڕاهێنان') ||
                             fullText.includes('راهێنان') ||
                             fullText.includes('کۆرس') ||
                             fullText.includes('کورس') ||
                             fullText.includes('مەشق') ||
                             fullText.includes('تەمەرین') ||
                             fullText.includes('تمارین') ||
                             fullText.includes('خشتەی ڕاهێنان') ||
                             fullText.includes('خشتەی راهێنان');

    // بەشی خۆراک و ژەمەکان (Nutrition Section - tab: 'nutrition')
    const isNutritionSection = targetSection === 'nutrition' ||
                              targetSection === 'diet' ||
                              actionType === 'ADD_MEAL' ||
                              actionType.includes('MEAL') ||
                              actionType.includes('DIET') ||
                              actionType.includes('FOOD') ||
                              actionType.includes('NUTRITION') ||
                              fullText.includes('بەشی خۆراک') ||
                              fullText.includes('لە بەشی خۆراک') ||
                              fullText.includes('خشتەی خۆراک') ||
                              fullText.includes('خۆراک') ||
                              fullText.includes('ژەم') ||
                              fullText.includes('ژەمی') ||
                              fullText.includes('خواردن');

    // بەشی ئاو (Water Tracker on Home Tab - tab: 'home')
    const isWaterSection = targetSection === 'home' ||
                          actionType.includes('WATER') ||
                          actionType.includes('HYDRAT') ||
                          fullText.includes('ئاوخواردنەوە') ||
                          fullText.includes('ئاو خواردنەوە') ||
                          fullText.includes('خواردنەوەی ئاو') ||
                          fullText.includes('بەشی ئاو') ||
                          fullText.includes('پەرداخ ئاو') ||
                          fullText.includes('لیتر ئاو') ||
                          fullText.includes('ڕێنمایی ئاو');

    // بەشی پرۆفایل و ئامانج (Profile Section - tab: 'profile')
    const isProfileSection = targetSection === 'profile' ||
                            actionType === 'CHANGE_GOAL' ||
                            actionType === 'ADD_HEALTH_CONDITION' ||
                            actionType.includes('GOAL') ||
                            actionType.includes('PROFILE') ||
                            actionType.includes('HEALTH') ||
                            fullText.includes('بەشی پرۆفایل') ||
                            fullText.includes('لە بەشی پرۆفایل') ||
                            fullText.includes('ئامانجی یاریزان') ||
                            fullText.includes('ئامانج') ||
                            fullText.includes('پێکان');

    let targetTab = 'workout';
    let loadingText = currentLangConfig.code === 'en' ? 'Updating workout section...' : currentLangConfig.code === 'ar' ? 'تحديث قسم التمارين...' : currentLangConfig.code === 'fa' ? 'بروزرسانی بخش تمرینات...' : 'خەریکی جێبەجێکردنی گۆڕانکارییەکانە لە بەشی ڕاهێناندا...';

    // پشکنینی دیاریکراوی بەشەکە
    if (fullText.includes('بەشی ڕاهێنان') || fullText.includes('بەشی راهێنان') || isWorkoutSection) {
      targetTab = 'workout';
      loadingText = currentLangConfig.code === 'en' ? 'Updating workout section...' : currentLangConfig.code === 'ar' ? 'تحديث قسم التمارين...' : currentLangConfig.code === 'fa' ? 'بروزرسانی بخش تمرینات...' : 'خەریکی جێبەجێکردنی گۆڕانکارییەکانە لە بەشی ڕاهێناندا...';
    } else if (fullText.includes('بەشی خۆراک') || isNutritionSection) {
      targetTab = 'nutrition';
      loadingText = currentLangConfig.code === 'en' ? 'Updating nutrition section...' : currentLangConfig.code === 'ar' ? 'تحديث قسم التغذية...' : currentLangConfig.code === 'fa' ? 'بروزرسانی بخش تغذیه...' : 'خەریکی زیادکردنی گۆڕانکارییەکانە لە بەشی خۆراکدا...';
    } else if (fullText.includes('ئاو') || isWaterSection) {
      targetTab = 'home';
      loadingText = currentLangConfig.code === 'en' ? 'Updating water tracker...' : currentLangConfig.code === 'ar' ? 'تحديث متتبع شرب الماء...' : currentLangConfig.code === 'fa' ? 'بروزرسانی مصرف آب...' : 'خەریکی جێبەجێکردنی ڕێنمایی ئاوخواردنەوەیە...';
    } else if (fullText.includes('پرۆفایل') || fullText.includes('ئامانج') || isProfileSection) {
      targetTab = 'profile';
      loadingText = currentLangConfig.code === 'en' ? 'Updating profile section...' : currentLangConfig.code === 'ar' ? 'تحديث الملف الشخصي...' : currentLangConfig.code === 'fa' ? 'بروزرسانی بخش پروفایل...' : 'خەریکی جێبەجێکردنی گۆڕانکارییەکانە لە پرۆفایلدا...';
    }

    // ١. دەستبەجێ چوونە ناو بەشە مەبەستدارەکە (وەک 'workout', 'nutrition', 'home', 'profile')
    setActiveTab(targetTab);

    // ئەگەر ئاو بوو دەستبەجێ سکرۆڵ دەکات بۆ سەر کارتی ئاو لە سەرەکی
    if (targetTab === 'home' && isWaterSection) {
      setTimeout(() => {
        const el = document.getElementById('water-tracker-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }

    // ٢. دوو چرکە لۆدینگ و بازنەیەک بسوڕێتەوە لەسەر شاشە
    setActionLoadingState({
      active: true,
      message: loadingText,
      actionType: action.type
    });

    // ٣. جێبەجێکردنی کردارەکە (بۆ کۆرس لە ڕێگەی زیرەکی دەستکردی ئۆنلاینەوە)
    setTimeout(async () => {
      try {
        if (targetTab === 'home' && isWaterSection) {
          const amount = Number(action.amount) || Number(action.waterMl) || 250;
          handleAddWater(amount);
        } else if (targetTab === 'workout' || isWorkoutSection) {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            alert(t('noInternetWorkoutAlert'));
            setActionLoadingState({ active: false, message: '', actionType: '' });
            return;
          }
          const days = action.days || (workoutCourse?.daysPerWeek || 0) || profile.availableDaysPerWeek || 4;
          const base = { ...profile, availableDaysPerWeek: days };
          const autoCalc = calculateScientificGoalByAi(base);
          const updated = { ...base, ...autoCalc };
          const generated = await window.generateWorkoutDirectly(
            updated,
            days,
            updated.trainingLocation || 'gym',
            updated.homeEquipment || '',
            currentLangConfig?.code || 'ku'
          );
          if (generated && Array.isArray(generated.weeklyPlan) && generated.weeklyPlan.length === 7) {
            generated.isAiOnlineGenerated = true;
            setWorkoutCourse(generated);
            setProfile(updated);
            setSelectedDayIdx(getTodayDayIdx());
            setCompletedDayIndices([]);
          } else {
            alert(t('noInternetWorkoutAlert'));
            setActionLoadingState({ active: false, message: '', actionType: '' });
            return;
          }
        } else if (targetTab === 'nutrition' || isNutritionSection) {
          const mealType = action.mealType || 'lunch';
          const foodItem = action.food;
          if (foodItem) {
            setDietMeals(prev => ({
              ...prev,
              [mealType]: [foodItem, ...(prev[mealType] || [])]
            }));
          }
        } else if (targetTab === 'profile' || isProfileSection) {
          if (action.type === 'CHANGE_GOAL' || action.goal || action.targetWeight) {
            const base = {
              ...profile,
              targetWeight: action.targetWeight || profile.targetWeight,
              targetDays: action.targetDays || profile.targetDays,
              goal: action.goal || profile.goal
            };
            const autoCalc = calculateScientificGoalByAi(base);
            const updated = { ...base, ...autoCalc };
            setProfile(updated);
          } else if (action.type === 'ADD_HEALTH_CONDITION' || action.condition) {
            const cond = action.condition;
            if (cond && !profile.healthConditions.includes(cond)) {
              const updated = { ...profile, healthConditions: [...profile.healthConditions, cond] };
              setProfile(updated);
            }
          }
        }

        // نیشانەکردنی فەرمانەکە وەک جێبەجێکراو لە چاتدا
        setChatMessages(prev => prev.map(msg => {
          if (msg.action && msg.action.id === action.id) {
            return { ...msg, action: { ...msg.action, isApplied: true } };
          }
          return msg;
        }));
      } catch (err) {
        console.error('AI action error:', err);
        alert(t('noInternetWorkoutAlert'));
      } finally {
        // لادانی دۆخی لۆدینگ
        setActionLoadingState({ active: false, message: '', actionType: '' });

        // لێدانی ساوندی تەواوبوون
        try {
          if (typeof playWorkoutFinishedSound === 'function') {
            playWorkoutFinishedSound();
          }
        } catch (e) {}
      }
    }, 600);
  };

  // ژەمەکان (بە بەتاڵی دەستپێدەکات تا یاریزان خۆی خشتە دروست نەکات)
  const [dietMeals, setDietMeals] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('app_diet_meals');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 7) {
            return parsed;
          }
        }
      }
    } catch (e) {}
    return Array(7).fill(null).map(() => ({ breakfast: [], lunch: [], snack: [], dinner: [] }));
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && dietMeals) {
        localStorage.setItem('app_diet_meals', JSON.stringify(dietMeals));
      }
    } catch (e) {}
  }, [dietMeals]);

  const hasDietPlan = Array.isArray(dietMeals) && dietMeals.some(day => 
    day && typeof day === 'object' && Object.values(day).some(mealList => Array.isArray(mealList) && mealList.length > 0)
  );

  const handleDeleteDietPlan = () => {
    const confirmMsg = currentLangConfig.code === 'en'
      ? 'Are you sure you want to reset all meal plans? You can generate a new one with AI later.'
      : currentLangConfig.code === 'ar'
      ? 'هل أنت متأكد من مسح جميع خطط الوجبات؟ يمكنك إنشاء خطة جديدة بالذكاء الاصطناعي لاحقاً.'
      : currentLangConfig.code === 'fa'
      ? 'آیا مطمئن هستید که می‌خواهید تمام برنامه‌های غذایی را پاک کنید؟ می‌توانید بعداً با هوش مصنوعی یک برنامه جدید بسازید.'
      : 'دڵنیایت لە سڕینەوەی هەموو خشتەی خۆراک؟ دەتوانیت دواتر بە ئەی ئای دانەیەکی نوێ دروست بکەیتەوە.';
    if (typeof window !== 'undefined' && window.confirm(confirmMsg)) {
      const emptyPlan = Array(7).fill(null).map(() => ({ breakfast: [], lunch: [], snack: [], dinner: [] }));
      setDietMeals(emptyPlan);
      setAiDietStep('prompt');
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_diet_meals', JSON.stringify(emptyPlan));
        }
      } catch (e) {}
    }
  };

  // سڕینەوەی خواردن لە ژەم (Delete Food from Meal)
  const handleDeleteMealItem = (mealType, itemId) => {
    playDeleteSound();
    setDietMeals(prev => {
      const newPlan = [...prev];
      if (newPlan[selectedDayIdx]) {
        newPlan[selectedDayIdx] = {
          ...newPlan[selectedDayIdx],
          [mealType]: (newPlan[selectedDayIdx][mealType] || []).filter(item => item.id !== itemId)
        };
      }
      return newPlan;
    });
  };

  // دیاریکردنی خواردن وەک خوراوە (Mark Food as Eaten)
  const toggleFoodEaten = (mealType, itemId) => {
    const dayPlan = dietMeals[selectedDayIdx];
    const currentList = dayPlan?.[mealType] || [];
    const currentItem = currentList.find(i => i.id === itemId);
    const willBeEaten = currentItem ? !currentItem.isEaten : false;

    setDietMeals(prev => {
      const newPlan = [...prev];
      if (newPlan[selectedDayIdx]) {
        newPlan[selectedDayIdx] = {
          ...newPlan[selectedDayIdx],
          [mealType]: (newPlan[selectedDayIdx][mealType] || []).map(item => 
            item.id === itemId ? { ...item, isEaten: willBeEaten } : item
          )
        };
      }
      return newPlan;
    });

    if (willBeEaten) {
      playMealLoggedSound();
    } else {
      playFoodUneatenSound();
    }
  };

  // سڕینەوەی خواردن لە ژەم (Remove Food from Meal)
  const handleRemoveFoodFromMeal = (mealType, itemId) => {
    playDeleteSound();
    setDietMeals(prev => {
      const newPlan = [...prev];
      if (newPlan[selectedDayIdx] && newPlan[selectedDayIdx][mealType]) {
        const currentList = newPlan[selectedDayIdx][mealType] || [];
        const isScheduleItem = typeof itemId === 'string' && itemId.startsWith('d');
        if (isScheduleItem) {
          // ئەگەر لە خشتەی سەرەکییەوە بووبێت، تەنها وەک نەخوراو دیاری دەکرێت
          newPlan[selectedDayIdx] = {
            ...newPlan[selectedDayIdx],
            [mealType]: currentList.map(item => item.id === itemId ? { ...item, isEaten: false } : item)
          };
        } else {
          // ئەگەر خواردنی زیادکراوی نوێ بێت، دەسڕدرێتەوە
          newPlan[selectedDayIdx] = {
            ...newPlan[selectedDayIdx],
            [mealType]: currentList.filter(item => item.id !== itemId)
          };
        }
      }
      return newPlan;
    });
  };

  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [visibleFoodCount, setVisibleFoodCount] = useState(15);

  // سیستەم Food Assistant State
  const [aiCustomInput, setAiCustomInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiCustomFoods, setAiCustomFoods] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('app_ai_custom_foods');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_ai_custom_foods', JSON.stringify(aiCustomFoods));
      }
    } catch (e) {}
  }, [aiCustomFoods]);

  // سڕینەوەی خواردنی دروستکراوی سیستەم لە لیستی گشتی (بێ فرەیم)
  const handleDeleteCustomAiFood = (e, foodId) => {
    e.stopPropagation();
    playDeleteSound();
    setAiCustomFoods(prev => prev.filter(f => f.id !== foodId));
  };

  // ==================== یاریدەدەری پاراستنی پوختی داتا بۆ فایەربەیس ====================
  const safeSerialize = (obj) => {
    if (obj === undefined) return null;
    return JSON.parse(
      JSON.stringify(obj, (key, value) => {
        if (value === undefined) return null;
        if (typeof value === 'function' || typeof value === 'symbol') return undefined;
        if (React.isValidElement(value)) return undefined;
        return value;
      })
    );
  };

  // ==================== سینککردنی بێدەنگ و خۆکار بۆ کڵاود (Silent Auto-Sync to Firebase) ====================
  const isInitialCloudLoaded = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthUser(currentUser);
      if (currentUser) {
        setIsSyncing(true);
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isSuspended !== undefined || data.status === 'suspended') {
              setIsAppSuspended(Boolean(data.isSuspended || data.status === 'suspended'));
            }
            if (data.suspendReason) setAppSuspendReason(data.suspendReason);
            if (data.profile) setProfile(data.profile);
            if (data.dietMeals) setDietMeals(data.dietMeals);
            if (data.workoutCourse) setWorkoutCourse(data.workoutCourse);
            if (data.courseHistory) setCourseHistory(data.courseHistory);
            if (data.coachMemory) setCoachMemory(data.coachMemory);
            if (data.hasCompletedOnboarding !== undefined) setHasCompletedOnboarding(data.hasCompletedOnboarding);
            if (data.chatMessages) setChatMessages(data.chatMessages);
            if (data.exerciseLogs) setExerciseLogs(data.exerciseLogs);
            if (data.waterMl !== undefined) setWaterMl(data.waterMl);
            if (data.completedDayIndices) setCompletedDayIndices(data.completedDayIndices);
            if (data.aiCustomFoods) setAiCustomFoods(data.aiCustomFoods);
            if (data.theme) setTheme(data.theme);
            if (data.colorTheme) setColorTheme(data.colorTheme);
            if (data.language) setLanguage(data.language);
          }
        } catch (error) {
          console.error("Error loading user data from cloud:", error);
        } finally {
          setIsSyncing(false);
          setTimeout(() => {
            isInitialCloudLoaded.current = true;
          }, 1000);
        }
      } else {
        isInitialCloudLoaded.current = false;
      }
    });
    return () => unsubscribe();
  }, []);

  // دۆخی ناسنامەی میوان بۆ ئەو بەکارهێنەرانەی بەبێ هەژمار ئەپەکە بەکاردەهێنن
  const [guestDeviceId, setGuestDeviceId] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        let gId = localStorage.getItem('bq_guest_device_id');
        if (!gId) {
          gId = 'guest_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
          localStorage.setItem('bq_guest_device_id', gId);
        }
        setGuestDeviceId(gId);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const activeSyncId = authUser?.uid || guestDeviceId;
    if (!activeSyncId) return;

    const timer = setTimeout(async () => {
      try {
        const payload = safeSerialize({
          profile,
          athleteId: activeSyncId,
          isGuest: !authUser,
          authType: authUser ? (authUser.phoneNumber ? 'phone' : 'google') : 'guest',
          name: profile?.name || authUser?.displayName || (authUser ? 'یاریزانی BQ GYM' : 'یاریزانی میوان'),
          phone: profile?.phone || authUser?.phoneNumber || '',
          email: authUser?.email || '',
          isSuspended: isAppSuspended,
          status: isAppSuspended ? 'suspended' : 'active',
          dietMeals,
          workoutCourse,
          courseHistory: (courseHistory || []).filter(c => c !== null),
          coachMemory,
          hasCompletedOnboarding,
          chatMessages,
          exerciseLogs,
          waterMl,
          completedDayIndices,
          aiCustomFoods,
          theme,
          colorTheme,
          language,
          lastUpdated: new Date().toISOString()
        });

        await setDoc(doc(db, 'users', activeSyncId), payload, { merge: true });
      } catch (error) {
        console.warn("Silent cloud auto-sync error:", error);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [authUser, guestDeviceId, profile, dietMeals, workoutCourse, courseHistory, coachMemory, hasCompletedOnboarding, chatMessages, exerciseLogs, waterMl, completedDayIndices, aiCustomFoods, theme, colorTheme, language, isAppSuspended]);

  // گوێگرتنی ڕاستەوخۆ بۆ دۆخی قفڵکردنی مۆبایل و گۆڕانکارییەکانی ڕاهێنەر
  useEffect(() => {
    const targetId = authUser?.uid || guestDeviceId;
    if (!targetId) return;
    const unsub = subscribeToAthleteStatus(targetId, ({ isSuspended, suspendReason, updatedWorkoutCourse }) => {
      setIsAppSuspended(isSuspended);
      if (suspendReason) setAppSuspendReason(suspendReason);
      if (updatedWorkoutCourse) {
        setWorkoutCourse(updatedWorkoutCourse);
        try {
          localStorage.setItem('kurd_fit_course_v5', JSON.stringify(updatedWorkoutCourse));
        } catch (e) {}
      }
    });
    return () => unsub();
  }, [authUser, guestDeviceId]);

  // ژماردنی کۆی کالۆری و ماکرۆکان
  const allMealItems = dietMeals[selectedDayIdx] ? Object.values(dietMeals[selectedDayIdx]).flat().filter(item => item.isEaten) : [];
  const totalEatenCalories = allMealItems.reduce((acc, i) => acc + (i.calories || 0), 0);
  const totalProteinG = allMealItems.reduce((acc, i) => acc + (i.protein || 0), 0);
  const totalCarbsG = allMealItems.reduce((acc, i) => acc + (i.carbs || 0), 0);
  const totalFatG = allMealItems.reduce((acc, i) => acc + (i.fat || 0), 0);
  const currentLoggedProteinCount = allMealItems.filter(item => item && lastUsedProtein && (item.name === lastUsedProtein.name || (item.englishName && item.englishName === lastUsedProtein.englishName))).length;

  const goalProgressPercent = Math.min(Math.round((8 / (profile.targetDays || 45)) * 100), 100);
  const remainingDays = Math.max((profile.targetDays || 45) - 8, 0);
  const hasUnreadNotifications = notifications.some(n => n.unread);

  // لیستی خۆراکە بنەڕەتییەکان
  const masterFoodList = [
    ...aiCustomFoods,
    // پڕۆتینە وەرزشییەکان (Supplements)
    { id: 'prot_whey_1', name: 'وەی پڕۆتین (Whey Protein)', englishName: 'Whey Protein', category: 'protein_powders', isProteinSupplement: true, baseCalories: 400, baseProtein: 80, baseCarbs: 10, baseFat: 5, usageCount: 65, icon: <><Zap size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'سکۆپ', ratio: 30 }, { name: 'گرام', ratio: 1 }], aliases: ['وەی', 'پڕۆتین', 'whey'] },
    { id: 'prot_isolate_2', name: 'وەی ئایزۆلێت (Whey Isolate)', englishName: 'Whey Isolate', category: 'protein_powders', isProteinSupplement: true, baseCalories: 370, baseProtein: 90, baseCarbs: 3, baseFat: 1.5, usageCount: 52, icon: <><Zap size={16} className="inline-block text-cyan-400" /></>, units: [{ name: 'سکۆپ', ratio: 30 }, { name: 'گرام', ratio: 1 }], aliases: ['ئایزۆلێت', 'isolate'] },
    { id: 'prot_casein_3', name: 'پڕۆتینی کەزین (Casein Protein)', englishName: 'Casein Protein', category: 'protein_powders', isProteinSupplement: true, baseCalories: 360, baseProtein: 75, baseCarbs: 8, baseFat: 3, usageCount: 40, icon: <><Zap size={16} className="inline-block text-indigo-400" /></>, units: [{ name: 'سکۆپ', ratio: 34 }, { name: 'گرام', ratio: 1 }], aliases: ['کەزین', 'کازئین', 'casein'] },
    { id: 'prot_mass_4', name: 'ماس گەینەر (Mass Gainer)', englishName: 'Mass Gainer', category: 'protein_powders', isProteinSupplement: true, baseCalories: 380, baseProtein: 25, baseCarbs: 65, baseFat: 3, usageCount: 45, icon: <><Zap size={16} className="inline-block text-orange-400" /></>, units: [{ name: 'سکۆپ', ratio: 75 }, { name: 'گرام', ratio: 1 }], aliases: ['ماس', 'گەینەر', 'mass', 'gainer'] },
    { id: 'prot_hydro_5', name: 'وەی هایدرۆلایزد (Hydrolyzed Whey)', englishName: 'Hydrolyzed Whey', category: 'protein_powders', isProteinSupplement: true, baseCalories: 385, baseProtein: 86, baseCarbs: 3, baseFat: 1.5, usageCount: 36, icon: <><Zap size={16} className="inline-block text-emerald-400" /></>, units: [{ name: 'سکۆپ', ratio: 30 }, { name: 'گرام', ratio: 1 }], aliases: ['هایدرۆلایزد', 'hydrolyzed'] },
    { id: 'prot_plant_6', name: 'پڕۆتینی ڕووەکی (Plant / Vegan)', englishName: 'Plant / Vegan Protein', category: 'protein_powders', isProteinSupplement: true, baseCalories: 400, baseProtein: 73, baseCarbs: 12, baseFat: 6, usageCount: 30, icon: <><Zap size={16} className="inline-block text-green-400" /></>, units: [{ name: 'سکۆپ', ratio: 30 }, { name: 'گرام', ratio: 1 }], aliases: ['ڕووەکی', 'ڤیگن', 'plant', 'vegan'] },
    { id: 'prot_bar_7', name: 'پڕۆتین باڕ (Protein Bar)', englishName: 'Protein Bar', category: 'protein_powders', isProteinSupplement: true, baseCalories: 350, baseProtein: 33, baseCarbs: 37, baseFat: 10, usageCount: 35, icon: <><Cookie size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'دانە', ratio: 60 }, { name: 'گرام', ratio: 1 }], aliases: ['پڕۆتین باڕ', 'باڕ', 'protein bar'] },
    { id: 'prot_shake_8', name: 'پڕۆتین شێک (Protein Shake)', englishName: 'Protein Shake', category: 'protein_powders', isProteinSupplement: true, baseCalories: 86, baseProtein: 10, baseCarbs: 8, baseFat: 1, usageCount: 28, icon: <><Milk size={16} className="inline-block text-blue-400" /></>, units: [{ name: 'گڵاس', ratio: 300 }, { name: 'گرام', ratio: 1 }], aliases: ['شێک', 'شیک', 'protein shake'] },

    // برنج، ساوەر و دانەوێڵەکان (Grains & Rice)
    { id: 'f_sawar_1', name: 'ساوار / ساوەری کوردی بە زەیتی زەیتوون', englishName: 'Kurdish Bulgur Pilaf', category: 'kurdish', baseCalories: 140, baseProtein: 4.5, baseCarbs: 28, baseFat: 2.2, usageCount: 70, icon: <><Wheat size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['ساوار', 'ساوەر', 'برغل', 'بلغور', 'sawar', 'bulgur'] },
    { id: 'f_sawar_chickpeas', name: 'ساوار بە نۆک و سەوزە', englishName: 'Bulgur with Chickpeas', category: 'kurdish', baseCalories: 155, baseProtein: 5.5, baseCarbs: 30, baseFat: 2.5, usageCount: 32, icon: <><Wheat size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['ساوار بە نۆک', 'ساوەر بە نۆک', 'برغل بالحمص'] },
    { id: 'f_sawar_meat', name: 'ساوار بە گۆشت', englishName: 'Bulgur with Meat', category: 'kurdish', baseCalories: 195, baseProtein: 12, baseCarbs: 25, baseFat: 5.5, usageCount: 38, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['ساوار بە گۆشت', 'ساوەر بە گۆشت', 'برغل باللحم'] },
    { id: 'f_rice_white', name: 'برنجی سپی کوردی بە ڕۆنی کوردی', englishName: 'Kurdish White Rice', category: 'carbs', baseCalories: 145, baseProtein: 2.8, baseCarbs: 29, baseFat: 2.5, usageCount: 95, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['برنج', 'برنجی سپی', 'برنجی کوردی', 'تمن', 'أرز', 'rice'] },
    { id: 'f_rice_vermicelli', name: 'برنجی کوردی بە شەعریە', englishName: 'Rice with Vermicelli', category: 'carbs', baseCalories: 160, baseProtein: 3, baseCarbs: 32, baseFat: 2.8, usageCount: 45, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['برنج بە شەعریە', 'تمن بشعرية'] },
    { id: 'f_biryani', name: 'بریانی کوردی بە مریشک و چەرەزات', englishName: 'Kurdish Chicken Biryani', category: 'kurdish', baseCalories: 190, baseProtein: 8.5, baseCarbs: 28, baseFat: 5.5, usageCount: 60, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['بریانی', 'بریانی کوردی', 'برياني', 'biryani'] },
    { id: 'f_quzi', name: 'قۆزیی کوردی لەسەر برنج', englishName: 'Kurdish Quzi Meat with Rice', category: 'kurdish', baseCalories: 230, baseProtein: 14, baseCarbs: 24, baseFat: 9.5, usageCount: 50, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 300 }, { name: 'گرام', ratio: 1 }], aliases: ['قۆزی', 'قۆزی سەر برنج', 'قوزی', 'quzi'] },
    { id: 'f_maqluba', name: 'مەقلووبەی کوردی بە مریشک و باینجان', englishName: 'Kurdish Maqluba with Chicken', category: 'kurdish', baseCalories: 175, baseProtein: 9, baseCarbs: 22, baseFat: 5.8, usageCount: 42, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['مەقلووبە', 'مەقلوبە', 'مقلوبة', 'maqluba'] },
    { id: 'f_oats', name: 'شۆڤانی کوڵاو (شۆربا یان لەگەڵ شیر)', englishName: 'Cooked Oatmeal', category: 'carbs', baseCalories: 389, baseProtein: 16.9, baseCarbs: 66, baseFat: 6.9, usageCount: 80, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 80 }, { name: 'کەوچک', ratio: 15 }, { name: 'گرام', ratio: 1 }], aliases: ['شۆڤان', 'شوفان', 'oats', 'oatmeal'] },
    { id: 'f_potato_boiled', name: 'پەتاتەی کوڵاو بە توێکڵەوە', englishName: 'Boiled Potato', category: 'carbs', baseCalories: 87, baseProtein: 1.9, baseCarbs: 20, baseFat: 0.1, usageCount: 65, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['پەتاتە', 'پەتاتەی کوڵاو', 'بتيتة', 'potato'] },
    { id: 'f_potato_baked', name: 'پەتاتەی برژاو لە فڕن بە زەیتی زەیتوون', englishName: 'Baked Potato Wedges', category: 'carbs', baseCalories: 125, baseProtein: 2.2, baseCarbs: 24, baseFat: 2.5, usageCount: 40, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'دانە', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['پەتاتەی برژاو', 'پەتاتەی فڕن', 'بطاطا مشوية'] },

    // یاپراخ، کوبە، کفتە و پاچە (Dolma, Kubba & Traditional)
    { id: 'f_dolma', name: 'یاپراخی کوردی (دۆڵمەی گەڵامێو بە گۆشت)', englishName: 'Kurdish Dolma (Grape Leaves)', category: 'kurdish', baseCalories: 175, baseProtein: 5.5, baseCarbs: 22, baseFat: 7.5, usageCount: 90, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 45 }, { name: 'قاپ', ratio: 280 }, { name: 'گرام', ratio: 1 }], aliases: ['یاپراخ', 'دۆڵمە', 'دولمة', 'یپراخ', 'yaprax', 'dolma'] },
    { id: 'f_dolma_onion', name: 'یاپراخی پیاز و باینجان و کولەکە', englishName: 'Stuffed Onions & Eggplant Dolma', category: 'kurdish', baseCalories: 160, baseProtein: 4.5, baseCarbs: 20, baseFat: 7, usageCount: 44, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 60 }, { name: 'قاپ', ratio: 280 }, { name: 'گرام', ratio: 1 }], aliases: ['یاپراخی پیاز', 'یاپراخی باینجان', 'دولمة بصل'] },
    { id: 'f_dolma_veg', name: 'یاپراخی زەیت و زەیتی زەیتوون (بێ گۆشت)', englishName: 'Vegetarian Olive Oil Dolma', category: 'kurdish', baseCalories: 140, baseProtein: 2.5, baseCarbs: 23, baseFat: 4.5, usageCount: 30, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 40 }, { name: 'قاپ', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['یاپراخی زەیت', 'یاپراخی بێ گۆشت', 'يلنجي'] },
    { id: 'f_kubba_rice', name: 'کوبەی برنجی کوردی (کوبەی حەلەب)', englishName: 'Kurdish Rice Kibbeh', category: 'kurdish', baseCalories: 210, baseProtein: 9, baseCarbs: 26, baseFat: 8.5, usageCount: 65, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 90 }, { name: 'گرام', ratio: 1 }], aliases: ['کوبە', 'کوبەی برنج', 'کبة حلب', 'کبة تمن', 'kibbeh'] },
    { id: 'f_kubba_bulgur', name: 'کوبەی ساوەر / برغڵ (کوبەی مووسڵ)', englishName: 'Mosul Bulgur Kibbeh', category: 'kurdish', baseCalories: 230, baseProtein: 11, baseCarbs: 25, baseFat: 9.5, usageCount: 48, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 100 }, { name: 'گرام', ratio: 1 }], aliases: ['کوبەی ساوەر', 'کوبەی برغڵ', 'کبة موصل'] },
    { id: 'f_kubba_soup', name: 'کوبە لە شلە / شۆربا (شۆربای کوبە)', englishName: 'Kubba in Red Soup', category: 'kurdish', baseCalories: 165, baseProtein: 8.5, baseCarbs: 18, baseFat: 6.5, usageCount: 35, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'دانە', ratio: 80 }], aliases: ['کوبە لە شلە', 'کبة شوربة', 'کبة حامض'] },
    { id: 'f_kofta', name: 'کفتەی کوردی بە گۆشت و نۆک', englishName: 'Kurdish Meat Kofta in Soup', category: 'kurdish', baseCalories: 185, baseProtein: 14, baseCarbs: 12, baseFat: 9.5, usageCount: 55, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 120 }, { name: 'قاپ', ratio: 250 }], aliases: ['کفتە', 'کفتەی کوردی', 'كفتة', 'kofta'] },
    { id: 'f_shifta', name: 'شفتەی کوردی (برژاو لە فڕن یان تاوە)', englishName: 'Kurdish Shifta Meat Patties', category: 'kurdish', baseCalories: 225, baseProtein: 18, baseCarbs: 8, baseFat: 14, usageCount: 46, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 60 }, { name: 'گرام', ratio: 1 }], aliases: ['شفتە', 'شفتەی کوردی', 'شفته', 'كفتة مشوية'] },
    { id: 'f_pacha', name: 'سەروپێی کوردی (پاچە)', englishName: 'Traditional Kurdish Pacha', category: 'kurdish', baseCalories: 230, baseProtein: 25, baseCarbs: 1, baseFat: 14, usageCount: 50, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 300 }, { name: 'کاسە', ratio: 400 }, { name: 'گرام', ratio: 1 }], aliases: ['پاچە', 'سەروپێ', 'باجة', 'سه‌روپێ', 'pacha'] },

    // شلەکان و شۆرباکان (Stews & Soups)
    { id: 'f_stew_okra', name: 'شلەی بامێ بە گۆشتی سوور', englishName: 'Okra Stew with Beef', category: 'kurdish', baseCalories: 125, baseProtein: 12, baseCarbs: 8, baseFat: 5.5, usageCount: 88, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }, { name: 'گرام', ratio: 1 }], aliases: ['بامێ', 'شلەی بامێ', 'بامية', 'okra'] },
    { id: 'f_stew_whitebeans', name: 'فاسۆلیای کوردی بە گۆشت', englishName: 'White Bean Stew with Meat', category: 'kurdish', baseCalories: 145, baseProtein: 11, baseCarbs: 16, baseFat: 4.5, usageCount: 82, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }, { name: 'گرام', ratio: 1 }], aliases: ['فاسۆلیا', 'شلەی فاسۆلیا', 'فاصولياء', 'fasolia'] },
    { id: 'f_stew_chickpeas', name: 'شلەی نۆک بە گۆشت', englishName: 'Chickpea Stew with Meat', category: 'kurdish', baseCalories: 165, baseProtein: 14, baseCarbs: 18, baseFat: 4.8, usageCount: 68, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }, { name: 'گرام', ratio: 1 }], aliases: ['نۆک', 'شلەی نۆک', 'حمص ولحم'] },
    { id: 'f_stew_potato', name: 'شلەی پەتاتە بە گۆشت', englishName: 'Potato Stew with Meat', category: 'kurdish', baseCalories: 135, baseProtein: 9.5, baseCarbs: 15, baseFat: 4.2, usageCount: 45, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }], aliases: ['شلەی پەتاتە', 'مرق بطاطا'] },
    { id: 'f_stew_eggplant', name: 'شلەی باینجان بە گۆشت', englishName: 'Eggplant Stew with Meat', category: 'kurdish', baseCalories: 130, baseProtein: 8.5, baseCarbs: 9, baseFat: 7.5, usageCount: 52, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }], aliases: ['باینجان', 'شلەی باینجان', 'مرق باذنجان'] },
    { id: 'f_stew_spinach', name: 'شلەی سپێناخ بە نیسک و گۆشت', englishName: 'Spinach & Lentil Stew', category: 'kurdish', baseCalories: 115, baseProtein: 9, baseCarbs: 8, baseFat: 4.5, usageCount: 40, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }], aliases: ['سپێناخ', 'شلەی سپێناخ', 'سبانخ باللحم'] },
    { id: 'f_stew_shalam', name: 'شلەی ترش / شڵەم بە نۆک و گۆشت', englishName: 'Sour Turnip Stew (Shalam)', category: 'kurdish', baseCalories: 95, baseProtein: 5.5, baseCarbs: 12, baseFat: 2.8, usageCount: 35, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }], aliases: ['شڵەم', 'شلەی ترش', 'شلغم'] },
    { id: 'f_soup_lentil', name: 'نیسکێنە / شۆربای نیسک', englishName: 'Red Lentil Soup', category: 'kurdish', baseCalories: 116, baseProtein: 9, baseCarbs: 20, baseFat: 0.4, usageCount: 85, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }, { name: 'کەوچک', ratio: 20 }], aliases: ['نیسکێنە', 'نیسک', 'شۆربای نیسک', 'شوربة عدس'] },
    { id: 'f_soup_traxana', name: 'شۆربای ترخێنە', englishName: 'Traxana Traditional Soup', category: 'kurdish', baseCalories: 110, baseProtein: 4.5, baseCarbs: 20, baseFat: 1.5, usageCount: 45, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }], aliases: ['ترخێنە', 'شۆربای ترخێنە', 'ترخانة'] },
    { id: 'f_soup_doyna', name: 'دۆینەی کوردی (شۆربای دۆ)', englishName: 'Kurdish Doyna Soup', category: 'kurdish', baseCalories: 115, baseProtein: 4.2, baseCarbs: 19, baseFat: 2.1, usageCount: 38, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }], aliases: ['دۆینە', 'دوينة', 'آش دوغ'] },
    { id: 'f_soup_mung', name: 'شۆربای ماشی کوردی', englishName: 'Kurdish Mung Bean Soup', category: 'kurdish', baseCalories: 120, baseProtein: 8, baseCarbs: 21, baseFat: 0.6, usageCount: 34, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }], aliases: ['ماش', 'شۆربای ماش', 'شوربة ماش'] },
    { id: 'f_soup_chicken', name: 'شۆربای مریشک بە سەوزە و شەعریە', englishName: 'Chicken Noodle Soup', category: 'kurdish', baseCalories: 90, baseProtein: 7, baseCarbs: 9, baseFat: 2.5, usageCount: 50, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }], aliases: ['شۆربای مریشک', 'شوربة دجاج'] },
    { id: 'f_tashreeb_meat', name: 'تەشریبی گۆشتی سوور بە نانی تیری', englishName: 'Beef Tashreeb Stew', category: 'kurdish', baseCalories: 195, baseProtein: 14, baseCarbs: 18, baseFat: 7.5, usageCount: 65, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 300 }, { name: 'کاسە', ratio: 400 }], aliases: ['تەشریب', 'تەشریبی گۆشت', 'تشريب لحم', 'ثريد'] },
    { id: 'f_tashreeb_chicken', name: 'تەشریبی مریشک بە نانی تیری', englishName: 'Chicken Tashreeb Stew', category: 'kurdish', baseCalories: 170, baseProtein: 13, baseCarbs: 17, baseFat: 5.5, usageCount: 55, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 300 }, { name: 'کاسە', ratio: 400 }], aliases: ['تەشریبی مریشک', 'تشريب دجاج'] },
    { id: 'f_tashreeb_yellow', name: 'تەشریبی زەرد بە نۆک و گۆشت', englishName: 'Yellow Tashreeb with Chickpeas', category: 'kurdish', baseCalories: 180, baseProtein: 11, baseCarbs: 22, baseFat: 5, usageCount: 42, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 300 }], aliases: ['تەشریبی زەرد', 'تشريب أصفر'] },

    // کەباب، گۆشت، مریشک و ماسی (Grills, Meats, Poultry & Seafood)
    { id: 'f_kebab_meat', name: 'کەبابی گۆشتی کوردی (هەولێری / سلێمانی)', englishName: 'Kurdish Lamb & Beef Kebab', category: 'kurdish', baseCalories: 260, baseProtein: 22, baseCarbs: 2, baseFat: 19, usageCount: 95, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'شیش', ratio: 100 }, { name: 'گرام', ratio: 1 }], aliases: ['کەباب', 'کەبابی گۆشت', 'كباب عراقي', 'كباب لحم', 'kebab'] },
    { id: 'f_kebab_chicken', name: 'کەباب و شیشی مریشک (تاووک)', englishName: 'Chicken Shish Kabab', category: 'protein', baseCalories: 190, baseProtein: 24, baseCarbs: 2, baseFat: 9, usageCount: 75, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'شیش', ratio: 120 }, { name: 'گرام', ratio: 1 }], aliases: ['کەبابی مریشک', 'شیشی مریشک', 'شيش طاووق'] },
    { id: 'f_tikka_meat', name: 'تیکەی گۆشتی بەرخ (برژاو لەسەر خەڵوز)', englishName: 'Grilled Lamb Tikka', category: 'protein', baseCalories: 240, baseProtein: 26, baseCarbs: 0.5, baseFat: 15, usageCount: 65, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'شیش', ratio: 100 }, { name: 'گرام', ratio: 1 }], aliases: ['تیکە', 'تیکەی گۆشت', 'تكة لحم'] },
    { id: 'f_chicken_breast', name: 'سنگی مریشکی برژاو', englishName: 'Grilled Chicken Breast', category: 'protein', baseCalories: 165, baseProtein: 31, baseCarbs: 0, baseFat: 3.6, usageCount: 99, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 150 }, { name: 'قاپ', ratio: 200 }, { name: 'گرام', ratio: 1 }], aliases: ['سنگی مریشک', 'مریشک', 'صدر دجاج', 'chicken breast'] },
    { id: 'f_chicken_charcoal', name: 'مریشکی برژاوی سەر خەڵوز (خۆماڵی)', englishName: 'Charcoal Grilled Chicken', category: 'kurdish', baseCalories: 215, baseProtein: 27, baseCarbs: 0, baseFat: 11.5, usageCount: 60, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 200 }, { name: 'گرام', ratio: 1 }], aliases: ['مریشکی خەڵوز', 'دجاج فحم', 'مریشکی برژاو'] },
    { id: 'f_shawarma_beef', name: 'شاوەرمای گۆشتی سوور (کەسە تەڕ)', englishName: 'Beef Shawarma Meat', category: 'kurdish', baseCalories: 235, baseProtein: 24, baseCarbs: 3, baseFat: 14, usageCount: 62, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['شاوەرما', 'شاوەرمای گۆشت', 'گەس', 'شاورما لحم', 'shawarma'] },
    { id: 'f_shawarma_chicken', name: 'شاوەرمای مریشک (گەسی مریشک)', englishName: 'Chicken Shawarma Meat', category: 'kurdish', baseCalories: 205, baseProtein: 25, baseCarbs: 2, baseFat: 10.5, usageCount: 68, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['شاوەرمای مریشک', 'گەسی مریشک', 'شاورما دجاج'] },
    { id: 'f_sandwich_shawarma', name: 'لەفەی شاوەرمای کوردی بە سەمون', englishName: 'Kurdish Shawarma Sandwich', category: 'kurdish', baseCalories: 440, baseProtein: 25, baseCarbs: 42, baseFat: 18, usageCount: 70, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 220 }, { name: 'گرام', ratio: 1 }], aliases: ['لەفەی شاوەرما', 'لەفە', 'سندويش شاورما'] },
    { id: 'f_sandwich_falafel', name: 'لەفەی فەلافل بە سەمون و تەڕاتور', englishName: 'Falafel Sandwich with Tahini', category: 'kurdish', baseCalories: 380, baseProtein: 12, baseCarbs: 54, baseFat: 14, usageCount: 65, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 200 }, { name: 'گرام', ratio: 1 }], aliases: ['لەفەی فەلافل', 'سندويش فلافل'] },
    { id: 'f_falafel_piece', name: 'فەلافلی کوردی / عێراقی (سادە)', englishName: 'Falafel Patty', category: 'kurdish', baseCalories: 280, baseProtein: 9, baseCarbs: 32, baseFat: 13, usageCount: 50, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['فەلافل', 'فلافل', 'falafel'] },
    { id: 'f_fish_maskouf', name: 'ماسی مەسکووفی عێراقی / کوردی', englishName: 'Maskouf Grilled Carp Fish', category: 'kurdish', baseCalories: 180, baseProtein: 22, baseCarbs: 0, baseFat: 10, usageCount: 55, icon: <><Fish size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['ماسی مەسکووف', 'مەسکووف', 'سمك مسكوف', 'ماسی'] },
    { id: 'f_fish_trout', name: 'ماسی قزل ئالا (برژاو لە فڕن)', englishName: 'Baked Trout Fish', category: 'protein', baseCalories: 150, baseProtein: 22, baseCarbs: 0, baseFat: 6.5, usageCount: 45, icon: <><Fish size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 200 }, { name: 'گرام', ratio: 1 }], aliases: ['ماسی قزل ئالا', 'قزل ئالا', 'سمك تروت'] },
    { id: 'f_fish_salmon', name: 'ماسی سلمۆن (برژاو لە فڕن)', englishName: 'Baked Salmon Fillet', category: 'protein', baseCalories: 208, baseProtein: 20, baseCarbs: 0, baseFat: 13, usageCount: 60, icon: <><Fish size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 180 }, { name: 'گرام', ratio: 1 }], aliases: ['سلمۆن', 'ماسی سلمۆن', 'salmon'] },
    { id: 'f_tuna_water', name: 'ماسی تونەی کەم چەوری (بە ئاو)', englishName: 'Tuna in Water', category: 'protein', baseCalories: 115, baseProtein: 26, baseCarbs: 0, baseFat: 1, usageCount: 72, icon: <><Fish size={16} className="inline-block" /></>, units: [{ name: 'قوتوو', ratio: 160 }, { name: 'گرام', ratio: 1 }], aliases: ['تونە', 'تونە بە ئاو', 'تونة', 'tuna'] },
    { id: 'f_lean_beef', name: 'گۆشتی سووری نەرمە (بێ چەوری)', englishName: 'Lean Beef', category: 'protein', baseCalories: 250, baseProtein: 26, baseCarbs: 0, baseFat: 15, usageCount: 65, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['گۆشت', 'گۆشتی سوور', 'گۆشتی نەرمە', 'beef'] },
    { id: 'f_boiled_lamb', name: 'گۆشتی مەڕ (بەرخ) کوڵاو بە ئاو', englishName: 'Boiled Lamb Meat', category: 'protein', baseCalories: 265, baseProtein: 25, baseCarbs: 0, baseFat: 18, usageCount: 48, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 180 }, { name: 'گرام', ratio: 1 }], aliases: ['گۆشتی مەڕ', 'گۆشتی بەرخ', 'lamb'] },
    { id: 'f_tawa_meat', name: 'تاوەی کوردی بە گۆشت و سەوزە', englishName: 'Baked Meat & Veggies Tawa', category: 'kurdish', baseCalories: 175, baseProtein: 16, baseCarbs: 12, baseFat: 8, usageCount: 55, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['تاوە', 'تاوەی کوردی', 'صينية لحم بالفرن'] },
    { id: 'f_liver_lamb', name: 'جگەر و دڵی مەڕ (برژاو لەسەر خەڵوز)', englishName: 'Grilled Lamb Liver & Heart', category: 'protein', baseCalories: 175, baseProtein: 26, baseCarbs: 3, baseFat: 6, usageCount: 50, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'شیش', ratio: 100 }, { name: 'گرام', ratio: 1 }], aliases: ['جگەر', 'جگەری برژاو', 'معلاق', 'كبدة'] },

    // نان و هەویرەمەنییەکان (Breads & Bakery)
    { id: 'f_bread_tiri', name: 'نانی تیری / هەورامی', englishName: 'Traditional Thin Flatbread', category: 'kurdish', baseCalories: 270, baseProtein: 8, baseCarbs: 56, baseFat: 2, usageCount: 92, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'نان', ratio: 70 }, { name: 'گرام', ratio: 1 }], aliases: ['نانی تیری', 'نانی هەورامی', 'نان تیری', 'خبز رقاق'] },
    { id: 'f_bread_tannour', name: 'نانی تەنوری کوردی (کۆنکریتی / گڵی)', englishName: 'Kurdish Tannour Bread', category: 'kurdish', baseCalories: 265, baseProtein: 8.5, baseCarbs: 54, baseFat: 1.8, usageCount: 88, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'نان', ratio: 120 }, { name: 'گرام', ratio: 1 }], aliases: ['نانی تەنور', 'نان تەنور', 'خبز تنور'] },
    { id: 'f_samoon', name: 'سەمونی حەجەریی کوردی / عێراقی', englishName: 'Stone Oven Diamond Samoon', category: 'carbs', baseCalories: 275, baseProtein: 8.8, baseCarbs: 57, baseFat: 1.5, usageCount: 95, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 90 }, { name: 'گرام', ratio: 1 }], aliases: ['سەمون', 'سەمونی حەجەری', 'صمون حجري'] },
    { id: 'f_kalaneh_plain', name: 'کەلانی کوردی بە پیازچە (بێ ڕۆن)', englishName: 'Kurdish Scallion Kalaneh', category: 'kurdish', baseCalories: 195, baseProtein: 6.5, baseCarbs: 38, baseFat: 2.5, usageCount: 65, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 100 }, { name: 'گرام', ratio: 1 }], aliases: ['کەلانی', 'کەلانە', 'کلانه', 'kalaneh'] },
    { id: 'f_kalaneh_butter', name: 'کەلانی کوردی بە کەرەی خۆماڵی', englishName: 'Kalaneh with Butter', category: 'kurdish', baseCalories: 260, baseProtein: 6, baseCarbs: 36, baseFat: 10.5, usageCount: 55, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 110 }, { name: 'گرام', ratio: 1 }], aliases: ['کەلانی بە کەرە', 'کەلانی چەور'] },
    { id: 'f_kulera_cheese', name: 'کولێرەی بە پەنیر لە تەنور', englishName: 'Baked Cheese Kulera Bread', category: 'kurdish', baseCalories: 290, baseProtein: 12, baseCarbs: 42, baseFat: 8.5, usageCount: 45, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 140 }, { name: 'گرام', ratio: 1 }], aliases: ['کولێرە بە پەنیر', 'کولێرە', 'فطيرة جبن'] },
    { id: 'f_bread_meat', name: 'نان بە گۆشت (عوروقی کوردی / عێراقی)', englishName: 'Kurdish Arouq Meat Bread', category: 'kurdish', baseCalories: 280, baseProtein: 13, baseCarbs: 38, baseFat: 9, usageCount: 48, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 130 }, { name: 'گرام', ratio: 1 }], aliases: ['نان بە گۆشت', 'عوروق', 'خبز عروق'] },
    { id: 'f_bread_barley', name: 'نانی جۆی تەندروست', englishName: 'Healthy Barley Bread', category: 'carbs', baseCalories: 220, baseProtein: 7.5, baseCarbs: 46, baseFat: 1.5, usageCount: 50, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'نان', ratio: 80 }, { name: 'گرام', ratio: 1 }], aliases: ['نانی جۆ', 'نان جۆ', 'خبز شعير'] },
    { id: 'f_bread_toast', name: 'نانی تۆستی قاوەیی / برۆن', englishName: 'Brown Whole Wheat Toast', category: 'carbs', baseCalories: 245, baseProtein: 9.5, baseCarbs: 44, baseFat: 2.5, usageCount: 65, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 35 }, { name: 'گرام', ratio: 1 }], aliases: ['تۆست', 'تۆستی قاوەیی', 'توست اسمر'] },

    // شیرەمەنی، هێلکە و خوانی بەیانی (Dairy, Eggs & Breakfast)
    { id: 'f_boiled_egg', name: 'هێلکەی کوڵاو', englishName: 'Boiled Egg', category: 'protein', baseCalories: 143, baseProtein: 13, baseCarbs: 1, baseFat: 10, usageCount: 99, icon: <><Egg size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 55 }, { name: 'گرام', ratio: 1 }], aliases: ['هێلکە', 'هێلکەی کوڵاو', 'بيض مسلوق', 'egg'] },
    { id: 'f_egg_qawrma', name: 'هێلکەی قاورمە (هێلکە بە قاورمەی کوردی)', englishName: 'Eggs with Kurdish Qawrma', category: 'kurdish', baseCalories: 270, baseProtein: 22, baseCarbs: 1, baseFat: 20, usageCount: 55, icon: <><Egg size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['هێلکە قاورمە', 'قاورمە', 'بيض بالقاورمة'] },
    { id: 'f_egg_tomato', name: 'مەخمەری کوردی بە تەماتە (شەشکشووکە)', englishName: 'Eggs with Tomatoes', category: 'kurdish', baseCalories: 140, baseProtein: 8.5, baseCarbs: 5, baseFat: 9.5, usageCount: 60, icon: <><Egg size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 180 }, { name: 'گرام', ratio: 1 }], aliases: ['مەخمەر بە تەماتە', 'شەشکشووکە', 'شكشوكة', 'مەخمەر'] },
    { id: 'f_yogurt_homemade', name: 'ماستی ماڵەوەی کوردی', englishName: 'Homemade Kurdish Yogurt', category: 'kurdish', baseCalories: 61, baseProtein: 3.5, baseCarbs: 4.7, baseFat: 3.3, usageCount: 90, icon: <><Milk size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['ماست', 'ماستی ماڵەوە', 'لبن خاثر', 'زبادي'] },
    { id: 'f_yogurt_lowfat', name: 'ماستی کەم چەوری', englishName: 'Low Fat Yogurt', category: 'protein', baseCalories: 55, baseProtein: 4.5, baseCarbs: 5.5, baseFat: 1.5, usageCount: 68, icon: <><Milk size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'گرام', ratio: 1 }], aliases: ['ماستی کەم چەوری', 'لبن قليل الدسم'] },
    { id: 'f_labneh', name: 'ماستی مەییو / مەشکەی کوردی (لەبنە)', englishName: 'Strained Labneh Yogurt', category: 'kurdish', baseCalories: 110, baseProtein: 7, baseCarbs: 5, baseFat: 6.5, usageCount: 52, icon: <><Milk size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'کەوچک', ratio: 30 }], aliases: ['ماستی مەییو', 'مەشکە', 'لبنة'] },
    { id: 'f_cheese_kurdish', name: 'پەنیری کوردیی خۆماڵی', englishName: 'Traditional Kurdish Cheese', category: 'kurdish', baseCalories: 240, baseProtein: 18, baseCarbs: 2, baseFat: 18, usageCount: 75, icon: <><Milk size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 50 }, { name: 'گرام', ratio: 1 }], aliases: ['پەنیر', 'پەنیری کوردی', 'جبن بلدي', 'جبن عربي'] },
    { id: 'f_cheese_lor', name: 'پەنیری لۆڕ / قەریس (کەم چەوری و پرۆتین بەرز)', englishName: 'Kurdish Lor Curd Cheese', category: 'protein', baseCalories: 98, baseProtein: 14, baseCarbs: 3, baseFat: 3.5, usageCount: 62, icon: <><Milk size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['پەنیری لۆڕ', 'لۆڕ', 'قەریس', 'جبن قريش'] },
    { id: 'f_qaymaq', name: 'قەیماغی خۆماڵی کوردی', englishName: 'Kurdish Clotted Cream (Qaymaq)', category: 'kurdish', baseCalories: 460, baseProtein: 3, baseCarbs: 3.5, baseFat: 49, usageCount: 45, icon: <><Milk size={16} className="inline-block" /></>, units: [{ name: 'کەوچک', ratio: 25 }, { name: 'قاپ', ratio: 100 }], aliases: ['قەیماغ', 'گەیماخ', 'قيمر'] },
    { id: 'f_milk', name: 'شیری مانگای سروشتی', englishName: 'Natural Fresh Milk', category: 'drinks', baseCalories: 62, baseProtein: 3.2, baseCarbs: 4.8, baseFat: 3.3, usageCount: 75, icon: <><Milk size={16} className="inline-block" /></>, units: [{ name: 'گڵاس', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['شیر', 'شیری مانگا', 'حليب'] },
    { id: 'f_olive_oil', name: 'زەیتی زەیتوونی کوردی (خاو و سروشتی)', englishName: 'Extra Virgin Olive Oil', category: 'kurdish', baseCalories: 884, baseProtein: 0, baseCarbs: 0, baseFat: 100, usageCount: 88, icon: <><Droplet size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'کەوچک', ratio: 14 }, { name: 'گرام', ratio: 1 }], aliases: ['زەیتی زەیتوون', 'زەیتوون', 'زيت زيتون'] },
    { id: 'f_hummus', name: 'حومس بە تەحین (حومسی کوردی)', englishName: 'Hummus with Tahini', category: 'kurdish', baseCalories: 166, baseProtein: 8, baseCarbs: 14, baseFat: 9.5, usageCount: 65, icon: <><Bean size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'کەوچک', ratio: 25 }], aliases: ['حومس', 'حمس', 'حمص بطحينة'] },
    { id: 'f_fava_beans', name: 'پاقلەی کوڵاو بە زەیتی زەیتوون', englishName: 'Boiled Fava Beans', category: 'kurdish', baseCalories: 110, baseProtein: 7.5, baseCarbs: 14, baseFat: 3.5, usageCount: 58, icon: <><Bean size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }, { name: 'کاسە', ratio: 350 }], aliases: ['پاقلە', 'پاقلەی کوڵاو', 'باقلاء بالدهن', 'فول مدمس'] },

    // خواردنەوەکان (Beverages & Traditional Drinks)
    { id: 'f_drink_do', name: 'دۆی کوردیی ماڵەوە (سارد و پڕ کەف)', englishName: 'Fresh Kurdish Do (Ayran)', category: 'drinks', baseCalories: 38, baseProtein: 2, baseCarbs: 2.5, baseFat: 2, usageCount: 95, icon: <><Milk size={16} className="inline-block" /></>, units: [{ name: 'گڵاس', ratio: 250 }, { name: 'کاسە', ratio: 350 }, { name: 'گرام', ratio: 1 }], aliases: ['دۆ', 'دۆی کوردی', 'لبن عيران', 'شنينة', 'دوغ', 'ayran'] },
    { id: 'f_drink_tea_sweet', name: 'چای کوردی بە کەم شەکر', englishName: 'Sweetened Kurdish Tea', category: 'drinks', baseCalories: 15, baseProtein: 0, baseCarbs: 4, baseFat: 0, usageCount: 99, icon: <><Coffee size={16} className="inline-block" /></>, units: [{ name: 'ستکان', ratio: 100 }, { name: 'کوپ', ratio: 200 }], aliases: ['چا', 'چای کوردی', 'شاي عراقي', 'شاي مهيل', 'tea'] },
    { id: 'f_drink_tea_black', name: 'چای تاڵ / بێ شەکر', englishName: 'Unsweetened Black Tea', category: 'drinks', baseCalories: 2, baseProtein: 0, baseCarbs: 0.4, baseFat: 0, usageCount: 88, icon: <><Coffee size={16} className="inline-block" /></>, units: [{ name: 'ستکان', ratio: 100 }, { name: 'کوپ', ratio: 200 }], aliases: ['چای تاڵ', 'چای بێ شەکر', 'شاي مر'] },
    { id: 'f_drink_tea_green', name: 'چای سەوز', englishName: 'Green Tea', category: 'drinks', baseCalories: 2, baseProtein: 0, baseCarbs: 0.2, baseFat: 0, usageCount: 65, icon: <><Coffee size={16} className="inline-block" /></>, units: [{ name: 'ستکان', ratio: 100 }, { name: 'کوپ', ratio: 200 }], aliases: ['چای سەوز', 'شاي اخضر', 'green tea'] },
    { id: 'f_drink_qazwan', name: 'قاوەی کوردی (قەزوان)', englishName: 'Kurdish Qazwan Wild Coffee', category: 'drinks', baseCalories: 55, baseProtein: 1.5, baseCarbs: 6, baseFat: 2.8, usageCount: 50, icon: <><Coffee size={16} className="inline-block" /></>, units: [{ name: 'فنجان', ratio: 80 }, { name: 'کوپ', ratio: 150 }], aliases: ['قاوەی قەزوان', 'قەزوان', 'قهوة قزوان', 'قهوة بطم'] },
    { id: 'f_drink_raisin', name: 'شەربەتی مێووژ (خۆماڵی)', englishName: 'Fresh Kurdish Raisin Juice', category: 'drinks', baseCalories: 65, baseProtein: 0.8, baseCarbs: 16, baseFat: 0.1, usageCount: 45, icon: <><Droplet size={16} className="inline-block" /></>, units: [{ name: 'گڵاس', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['شەربەتی مێووژ', 'مێووژ', 'عصير زبيب'] },
    { id: 'f_drink_pomegranate', name: 'شەربەتی هەناری سروشتی (بێ شەکر)', englishName: 'Fresh Pomegranate Juice', category: 'drinks', baseCalories: 54, baseProtein: 0.7, baseCarbs: 13, baseFat: 0.3, usageCount: 60, icon: <><Droplet size={16} className="inline-block" /></>, units: [{ name: 'گڵاس', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['شەربەتی هەنار', 'عصير رمان'] },
    { id: 'f_drink_orange', name: 'شەربەتی پرتەقاڵی سروشتی', englishName: 'Fresh Orange Juice', category: 'drinks', baseCalories: 45, baseProtein: 0.7, baseCarbs: 10.4, baseFat: 0.2, usageCount: 65, icon: <><Droplet size={16} className="inline-block" /></>, units: [{ name: 'گڵاس', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['شەربەتی پرتەقاڵ', 'عصير برتقال', 'orange juice'] },
    { id: 'f_drink_water', name: 'ئاوی پاکی خواردنەوە', englishName: 'Pure Drinking Water', category: 'drinks', baseCalories: 0, baseProtein: 0, baseCarbs: 0, baseFat: 0, usageCount: 99, icon: <><Droplet size={16} className="inline-block text-cyan-400" /></>, units: [{ name: 'گڵاس', ratio: 250 }, { name: 'لیتر', ratio: 1000 }], aliases: ['ئاو', 'ئاوی پاک', 'ماء', 'water'] },

    // زەڵاتە و سەوزەوات (Salads & Fresh Greens)
    { id: 'f_salad_kurdish', name: 'زەڵاتەی کوردی (خەیار، تەماتە، زەیتی زەیتوون و ئاوی لیمۆ)', englishName: 'Traditional Kurdish Salad', category: 'fruits', baseCalories: 42, baseProtein: 1.2, baseCarbs: 5, baseFat: 2.2, usageCount: 88, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کاسە', ratio: 300 }], aliases: ['زەڵاتە', 'زەڵاتەی کوردی', 'سلطة خضراء', 'salad'] },
    { id: 'f_salad_tabbouleh', name: 'تەبوولەی کوردی بە ساوەر و کەرەوز', englishName: 'Tabbouleh with Bulgur', category: 'fruits', baseCalories: 85, baseProtein: 2.2, baseCarbs: 11, baseFat: 4.2, usageCount: 52, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }], aliases: ['تەبوولە', 'تبولة', 'tabbouleh'] },
    { id: 'f_salad_jajik', name: 'جاجک / ماست و خەیار بە نەعنا', englishName: 'Cucumber Yogurt Jajik', category: 'fruits', baseCalories: 52, baseProtein: 3.2, baseCarbs: 4.5, baseFat: 2.1, usageCount: 75, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کاسە', ratio: 300 }], aliases: ['جاجک', 'ماست و خەیار', 'جاجيك', 'خيار باللبن'] },
    { id: 'f_greens_plate', name: 'سەوزەی کوردی (تەرەتیزە، ڕێحانە، پیازچە، جەرجیر)', englishName: 'Fresh Kurdish Herbs', category: 'fruits', baseCalories: 22, baseProtein: 2, baseCarbs: 3.5, baseFat: 0.3, usageCount: 80, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'دەستە', ratio: 100 }, { name: 'قاپ', ratio: 150 }], aliases: ['سەوزە', 'سەوزەی کوردی', 'خضروات ورقية'] },

    // میوە، وشکەمیوە، چەرەزات و شیرینی (Fruits, Nuts & Sweets)
    { id: 'f_dates', name: 'خورمای کوردی / عێراقی', englishName: 'Iraqi & Kurdish Dates', category: 'fruits', baseCalories: 277, baseProtein: 1.8, baseCarbs: 75, baseFat: 0.2, usageCount: 88, icon: <><Apple size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 15 }, { name: 'دەستە', ratio: 50 }, { name: 'گرام', ratio: 1 }], aliases: ['خورما', 'خوما', 'تمر', 'dates'] },
    { id: 'f_pomegranate', name: 'هەنار (هەناری کوردی / هەڵەبجە)', englishName: 'Kurdish Pomegranate', category: 'fruits', baseCalories: 83, baseProtein: 1.7, baseCarbs: 19, baseFat: 1.2, usageCount: 92, icon: <><Apple size={16} className="inline-block text-rose-500" /></>, units: [{ name: 'دانە', ratio: 250 }, { name: 'قاپ', ratio: 160 }, { name: 'گرام', ratio: 1 }], aliases: ['هەنار', 'هەناری کوردی', 'رمان', 'pomegranate'] },
    { id: 'f_banana', name: 'مۆز', englishName: 'Banana', category: 'fruits', baseCalories: 89, baseProtein: 1.1, baseCarbs: 23, baseFat: 0.3, usageCount: 90, icon: <><Banana size={16} className="inline-block text-yellow-400" /></>, units: [{ name: 'دانە', ratio: 120 }, { name: 'گرام', ratio: 1 }], aliases: ['مۆز', 'موز', 'banana'] },
    { id: 'f_apple', name: 'سێو', englishName: 'Apple', category: 'fruits', baseCalories: 52, baseProtein: 0.3, baseCarbs: 14, baseFat: 0.2, usageCount: 88, icon: <><Apple size={16} className="inline-block text-red-400" /></>, units: [{ name: 'دانە', ratio: 180 }, { name: 'گرام', ratio: 1 }], aliases: ['سێو', 'تفاح', 'apple'] },
    { id: 'f_orange', name: 'پرتەقاڵ', englishName: 'Fresh Orange', category: 'fruits', baseCalories: 47, baseProtein: 0.9, baseCarbs: 11.8, baseFat: 0.1, usageCount: 86, icon: <><Apple size={16} className="inline-block text-orange-400" /></>, units: [{ name: 'دانە', ratio: 180 }, { name: 'گرام', ratio: 1 }], aliases: ['پرتەقاڵ', 'پرتەقال', 'برتقال', 'orange'] },
    { id: 'f_mandarin', name: 'لالەنگی / مەندەلین', englishName: 'Mandarin / Tangerine', category: 'fruits', baseCalories: 53, baseProtein: 0.8, baseCarbs: 13.3, baseFat: 0.3, usageCount: 82, icon: <><Apple size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'دانە', ratio: 100 }, { name: 'گرام', ratio: 1 }], aliases: ['لالەنگی', 'مەندەلین', 'يوسفي', 'لالنكي', 'mandarin', 'tangerine'] },
    { id: 'f_watermelon', name: 'شووتی', englishName: 'Watermelon', category: 'fruits', baseCalories: 30, baseProtein: 0.6, baseCarbs: 7.6, baseFat: 0.2, usageCount: 85, icon: <><Apple size={16} className="inline-block text-rose-400" /></>, units: [{ name: 'پارچە', ratio: 280 }, { name: 'قاپ', ratio: 200 }, { name: 'گرام', ratio: 1 }], aliases: ['شووتی', 'شوتی', 'رقي', 'بطيخ', 'watermelon'] },
    { id: 'f_melon', name: 'کاڵەک / گندۆرە', englishName: 'Sweet Melon / Cantaloupe', category: 'fruits', baseCalories: 34, baseProtein: 0.8, baseCarbs: 8.2, baseFat: 0.2, usageCount: 78, icon: <><Apple size={16} className="inline-block text-yellow-300" /></>, units: [{ name: 'پارچە', ratio: 220 }, { name: 'قاپ', ratio: 180 }, { name: 'گرام', ratio: 1 }], aliases: ['کاڵەک', 'گندۆرە', 'بطيخ اصفر', 'شمام', 'melon', 'cantaloupe'] },
    { id: 'f_grapes', name: 'ترێ (ترێی سپی و ڕەش)', englishName: 'Fresh Grapes', category: 'fruits', baseCalories: 69, baseProtein: 0.7, baseCarbs: 18, baseFat: 0.2, usageCount: 80, icon: <><Apple size={16} className="inline-block text-purple-400" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'دەستە', ratio: 100 }, { name: 'گرام', ratio: 1 }], aliases: ['ترێ', 'عنب', 'grapes'] },
    { id: 'f_strawberry', name: 'شلیک / فەراولە', englishName: 'Fresh Strawberries', category: 'fruits', baseCalories: 32, baseProtein: 0.7, baseCarbs: 7.7, baseFat: 0.3, usageCount: 82, icon: <><Apple size={16} className="inline-block text-pink-500" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'دانە', ratio: 20 }, { name: 'گرام', ratio: 1 }], aliases: ['شلیک', 'فەراولە', 'فراولة', 'strawberry'] },
    { id: 'f_kiwi', name: 'کیوی', englishName: 'Kiwi Fruit', category: 'fruits', baseCalories: 61, baseProtein: 1.1, baseCarbs: 15, baseFat: 0.5, usageCount: 76, icon: <><Apple size={16} className="inline-block text-lime-400" /></>, units: [{ name: 'دانە', ratio: 85 }, { name: 'گرام', ratio: 1 }], aliases: ['کیوی', 'كيوي', 'kiwi'] },
    { id: 'f_peach', name: 'قۆخ / هۆڵۆ', englishName: 'Fresh Peach', category: 'fruits', baseCalories: 39, baseProtein: 0.9, baseCarbs: 9.5, baseFat: 0.3, usageCount: 75, icon: <><Apple size={16} className="inline-block text-amber-300" /></>, units: [{ name: 'دانە', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['قۆخ', 'هۆڵۆ', 'خوخ', 'دراق', 'peach'] },
    { id: 'f_pear', name: 'هەرمێ', englishName: 'Fresh Pear', category: 'fruits', baseCalories: 57, baseProtein: 0.4, baseCarbs: 15, baseFat: 0.1, usageCount: 74, icon: <><Apple size={16} className="inline-block text-emerald-300" /></>, units: [{ name: 'دانە', ratio: 175 }, { name: 'گرام', ratio: 1 }], aliases: ['هەرمێ', 'عرموط', 'كمثرى', 'pear'] },
    { id: 'f_apricot', name: 'قەیسی تازە', englishName: 'Fresh Apricot', category: 'fruits', baseCalories: 48, baseProtein: 1.4, baseCarbs: 11, baseFat: 0.4, usageCount: 70, icon: <><Apple size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'دانە', ratio: 45 }, { name: 'گرام', ratio: 1 }], aliases: ['قەیسی', 'مشمش', 'apricot'] },
    { id: 'f_fig', name: 'هەنجیری کوردی', englishName: 'Fresh Kurdish Fig', category: 'fruits', baseCalories: 74, baseProtein: 0.8, baseCarbs: 19, baseFat: 0.3, usageCount: 74, icon: <><Apple size={16} className="inline-block text-purple-300" /></>, units: [{ name: 'دانە', ratio: 60 }, { name: 'گرام', ratio: 1 }], aliases: ['هەنجیر', 'تين', 'fig'] },
    { id: 'f_plum', name: 'هەڵوژە', englishName: 'Fresh Plum', category: 'fruits', baseCalories: 46, baseProtein: 0.7, baseCarbs: 11.4, baseFat: 0.3, usageCount: 70, icon: <><Apple size={16} className="inline-block text-indigo-400" /></>, units: [{ name: 'دانە', ratio: 65 }, { name: 'گرام', ratio: 1 }], aliases: ['هەڵوژە', 'عنجاص', 'گوجه سبز', 'plum'] },
    { id: 'f_pineapple', name: 'ئەناناس', englishName: 'Fresh Pineapple', category: 'fruits', baseCalories: 50, baseProtein: 0.5, baseCarbs: 13, baseFat: 0.1, usageCount: 72, icon: <><Apple size={16} className="inline-block text-yellow-400" /></>, units: [{ name: 'پارچە', ratio: 120 }, { name: 'قاپ', ratio: 165 }, { name: 'گرام', ratio: 1 }], aliases: ['ئەناناس', 'اناناس', 'pineapple'] },
    { id: 'f_mango', name: 'مانگۆ', englishName: 'Fresh Mango', category: 'fruits', baseCalories: 60, baseProtein: 0.8, baseCarbs: 15, baseFat: 0.4, usageCount: 75, icon: <><Apple size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'دانە', ratio: 200 }, { name: 'قاپ', ratio: 165 }, { name: 'گرام', ratio: 1 }], aliases: ['مانگۆ', 'مانجو', 'mango'] },
    { id: 'f_avocado', name: 'ئەڤۆکادۆ', englishName: 'Fresh Avocado', category: 'fruits', baseCalories: 160, baseProtein: 2, baseCarbs: 8.5, baseFat: 14.7, usageCount: 80, icon: <><Apple size={16} className="inline-block text-emerald-500" /></>, units: [{ name: 'دانە', ratio: 150 }, { name: 'پارچە', ratio: 75 }, { name: 'گرام', ratio: 1 }], aliases: ['ئەڤۆکادۆ', 'افوكادو', 'avocado'] },
    { id: 'f_cherries', name: 'گێلاس', englishName: 'Sweet Cherries', category: 'fruits', baseCalories: 63, baseProtein: 1.1, baseCarbs: 16, baseFat: 0.2, usageCount: 68, icon: <><Apple size={16} className="inline-block text-rose-600" /></>, units: [{ name: 'قاپ', ratio: 140 }, { name: 'دەستە', ratio: 70 }, { name: 'گرام', ratio: 1 }], aliases: ['گێلاس', 'كرز', 'cherry', 'cherries'] },
    { id: 'f_mulberries', name: 'توو (تووی سپی و سوور)', englishName: 'Fresh Mulberries', category: 'fruits', baseCalories: 43, baseProtein: 1.4, baseCarbs: 9.8, baseFat: 0.4, usageCount: 68, icon: <><Apple size={16} className="inline-block text-purple-300" /></>, units: [{ name: 'قاپ', ratio: 140 }, { name: 'دەستە', ratio: 70 }, { name: 'گرام', ratio: 1 }], aliases: ['توو', 'توت', 'mulberry'] },
    { id: 'f_cucumber', name: 'خەیار', englishName: 'Fresh Cucumber', category: 'fruits', baseCalories: 15, baseProtein: 0.7, baseCarbs: 3.6, baseFat: 0.1, usageCount: 92, icon: <><Salad size={16} className="inline-block text-emerald-400" /></>, units: [{ name: 'دانە', ratio: 120 }, { name: 'گرام', ratio: 1 }], aliases: ['خەیار', 'خيار', 'cucumber'] },
    { id: 'f_tomato', name: 'تەماتە', englishName: 'Fresh Tomato', category: 'fruits', baseCalories: 18, baseProtein: 0.9, baseCarbs: 3.9, baseFat: 0.2, usageCount: 90, icon: <><Salad size={16} className="inline-block text-red-500" /></>, units: [{ name: 'دانە', ratio: 130 }, { name: 'گرام', ratio: 1 }], aliases: ['تەماتە', 'طماطة', 'طماطم', 'tomato'] },
    { id: 'f_carrot', name: 'گێزەر', englishName: 'Fresh Carrot', category: 'fruits', baseCalories: 41, baseProtein: 0.9, baseCarbs: 9.6, baseFat: 0.2, usageCount: 82, icon: <><Salad size={16} className="inline-block text-orange-400" /></>, units: [{ name: 'دانە', ratio: 80 }, { name: 'گرام', ratio: 1 }], aliases: ['گێزەر', 'جزر', 'carrot'] },
    { id: 'f_broccoli', name: 'برۆکلی کوڵاو / هەڵمکراو', englishName: 'Steamed Broccoli', category: 'fruits', baseCalories: 35, baseProtein: 2.4, baseCarbs: 7.2, baseFat: 0.4, usageCount: 84, icon: <><Salad size={16} className="inline-block text-green-500" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['برۆکلی', 'بروكلي', 'broccoli'] },
    { id: 'f_cauliflower', name: 'قەڕنابیت', englishName: 'Cauliflower', category: 'fruits', baseCalories: 25, baseProtein: 1.9, baseCarbs: 5, baseFat: 0.3, usageCount: 72, icon: <><Salad size={16} className="inline-block text-slate-200" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['قەڕنابیت', 'قرنابيط', 'cauliflower'] },
    { id: 'f_bell_pepper', name: 'بیبەری سەوز و ڕەنگاوڕەنگ', englishName: 'Bell Pepper', category: 'fruits', baseCalories: 26, baseProtein: 1, baseCarbs: 6, baseFat: 0.3, usageCount: 76, icon: <><Salad size={16} className="inline-block text-lime-500" /></>, units: [{ name: 'دانە', ratio: 110 }, { name: 'گرام', ratio: 1 }], aliases: ['بیبەر', 'فلفل بارد', 'bell pepper'] },
    { id: 'f_lettuce', name: 'کاهوو / خاس', englishName: 'Fresh Lettuce', category: 'fruits', baseCalories: 15, baseProtein: 1.4, baseCarbs: 2.9, baseFat: 0.2, usageCount: 80, icon: <><Salad size={16} className="inline-block text-green-400" /></>, units: [{ name: 'قاپ', ratio: 100 }, { name: 'گرام', ratio: 1 }], aliases: ['کاهوو', 'خاس', 'خس', 'lettuce'] },
    { id: 'f_mushrooms', name: 'قارچک / کوارگ', englishName: 'Mushrooms', category: 'fruits', baseCalories: 22, baseProtein: 3.1, baseCarbs: 3.3, baseFat: 0.3, usageCount: 75, icon: <><Salad size={16} className="inline-block text-stone-300" /></>, units: [{ name: 'قاپ', ratio: 120 }, { name: 'گرام', ratio: 1 }], aliases: ['قارچک', 'کوارگ', 'فطر', 'mushroom'] },
    { id: 'f_sweet_corn', name: 'گەنمەشامی کوڵاو', englishName: 'Boiled Sweet Corn', category: 'carbs', baseCalories: 96, baseProtein: 3.4, baseCarbs: 21, baseFat: 1.5, usageCount: 78, icon: <><Wheat size={16} className="inline-block text-yellow-400" /></>, units: [{ name: 'دانە', ratio: 140 }, { name: 'قاپ', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['گەنمەشامی', 'ذرة', 'sweet corn'] },
    { id: 'f_rice_plain', name: 'برنجی سپی کوڵاو (بێ ڕۆن)', englishName: 'Plain Boiled White Rice', category: 'carbs', baseCalories: 130, baseProtein: 2.7, baseCarbs: 28, baseFat: 0.3, usageCount: 96, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['برنجی کوڵاو', 'برنجی بێ ڕۆن', 'رز مسلوق', 'boiled rice'] },
    { id: 'f_rice_brown', name: 'برنجی قاوەیی (تەندروست)', englishName: 'Cooked Brown Rice', category: 'carbs', baseCalories: 112, baseProtein: 2.6, baseCarbs: 23.5, baseFat: 0.9, usageCount: 85, icon: <><Wheat size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['برنجی قاوەیی', 'برنجی بۆر', 'رز بني', 'brown rice'] },
    { id: 'f_rice_basmati', name: 'برنجی بەسمەتی کوڵاو', englishName: 'Cooked Basmati Rice', category: 'carbs', baseCalories: 121, baseProtein: 3.5, baseCarbs: 25.2, baseFat: 0.4, usageCount: 90, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['برنجی بەسمەتی', 'رز بسمتي', 'basmati rice'] },
    { id: 'f_pasta_cooked', name: 'مەعکەرۆنی / پاستا بە سۆس', englishName: 'Cooked Pasta / Macaroni', category: 'carbs', baseCalories: 158, baseProtein: 5.8, baseCarbs: 31, baseFat: 1.2, usageCount: 88, icon: <><Utensils size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['مەعکەرۆنی', 'ماکەرۆنی', 'پاستا', 'معكرونة', 'pasta', 'macaroni'] },
    { id: 'f_sweet_potato', name: 'پەتاتەی شیرین (Sweet Potato)', englishName: 'Baked Sweet Potato', category: 'carbs', baseCalories: 90, baseProtein: 2, baseCarbs: 20.7, baseFat: 0.2, usageCount: 82, icon: <><Cookie size={16} className="inline-block text-orange-400" /></>, units: [{ name: 'دانە', ratio: 150 }, { name: 'گرام', ratio: 1 }], aliases: ['پەتاتەی شیرین', 'بطاطا حلوة', 'sweet potato'] },
    { id: 'f_boiled_chickpeas', name: 'نۆکی کوڵاو (لەبلەبی)', englishName: 'Boiled Chickpeas (Lablabi)', category: 'carbs', baseCalories: 164, baseProtein: 8.9, baseCarbs: 27.4, baseFat: 2.6, usageCount: 85, icon: <><Bean size={16} className="inline-block text-amber-300" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کاسە', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['لەبلەبی', 'نۆکی کوڵاو', 'لبلبي', 'حمص مسلوق', 'chickpeas'] },
    { id: 'f_indomie', name: 'ئندۆمی / نۆدڵز', englishName: 'Prepared Instant Noodles (Indomie)', category: 'carbs', baseCalories: 188, baseProtein: 4.5, baseCarbs: 27, baseFat: 7, usageCount: 80, icon: <><Utensils size={16} className="inline-block text-yellow-400" /></>, units: [{ name: 'پاکەت', ratio: 85 }, { name: 'قاپ', ratio: 220 }, { name: 'گرام', ratio: 1 }], aliases: ['ئندۆمی', 'نۆدڵز', 'اندومي', 'indomie', 'noodles'] },
    { id: 'f_egg_white', name: 'سپێنەی هێلکەی کوڵاو', englishName: 'Boiled Egg White', category: 'protein', baseCalories: 52, baseProtein: 11, baseCarbs: 0.7, baseFat: 0.2, usageCount: 92, icon: <><Egg size={16} className="inline-block text-slate-100" /></>, units: [{ name: 'دانە', ratio: 35 }, { name: 'گرام', ratio: 1 }], aliases: ['سپێنەی هێلکە', 'بياض البيض', 'egg white'] },
    { id: 'f_egg_fried', name: 'هێلکەی سوورکراوە (ئۆملێت)', englishName: 'Fried Egg / Omelette', category: 'protein', baseCalories: 196, baseProtein: 13.6, baseCarbs: 0.8, baseFat: 15, usageCount: 90, icon: <><Egg size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'دانە', ratio: 55 }, { name: 'قاپ', ratio: 120 }, { name: 'گرام', ratio: 1 }], aliases: ['هێلکەی سوورکراوە', 'ئۆملێت', 'بيض مقلي', 'omelette', 'fried egg'] },
    { id: 'f_chicken_thigh', name: 'ڕانی مریشکی برژاو یان کوڵاو', englishName: 'Cooked Chicken Thigh', category: 'protein', baseCalories: 209, baseProtein: 26, baseCarbs: 0, baseFat: 10.9, usageCount: 88, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 130 }, { name: 'گرام', ratio: 1 }], aliases: ['ڕانی مریشک', 'فخذ دجاج', 'chicken thigh'] },
    { id: 'f_chicken_wings', name: 'باڵی مریشکی برژاو', englishName: 'Grilled Chicken Wings', category: 'protein', baseCalories: 203, baseProtein: 30, baseCarbs: 0, baseFat: 8.1, usageCount: 82, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 45 }, { name: 'قاپ', ratio: 180 }, { name: 'گرام', ratio: 1 }], aliases: ['باڵی مریشک', 'اجنحة دجاج', 'chicken wings'] },
    { id: 'f_minced_beef', name: 'قیمەی گۆشتی سوور (برژاو / سوورکراوە)', englishName: 'Cooked Minced Beef', category: 'protein', baseCalories: 250, baseProtein: 26, baseCarbs: 0, baseFat: 15, usageCount: 85, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'کەوچک', ratio: 25 }, { name: 'گرام', ratio: 1 }], aliases: ['قیمە', 'قیمەی گۆشت', 'قيمه', 'لحم مفروم', 'minced beef'] },
    { id: 'f_beef_steak', name: 'ستێکی گۆشتی مانگا', englishName: 'Grilled Beef Steak', category: 'protein', baseCalories: 252, baseProtein: 27, baseCarbs: 0, baseFat: 15, usageCount: 84, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 200 }, { name: 'گرام', ratio: 1 }], aliases: ['ستێک', 'ستێکی گۆشت', 'ستيك لحم', 'steak'] },
    { id: 'f_peanut_butter', name: 'کەرەی عەلی بابا (Peanut Butter)', englishName: 'Natural Peanut Butter', category: 'protein', baseCalories: 588, baseProtein: 25, baseCarbs: 20, baseFat: 50, usageCount: 88, icon: <><Cookie size={16} className="inline-block text-amber-600" /></>, units: [{ name: 'کەوچک', ratio: 16 }, { name: 'گرام', ratio: 1 }], aliases: ['کەرەی عەلی بابا', 'پینەت بەتەر', 'زبدة الفول السوداني', 'peanut butter'] },
    { id: 'f_honey', name: 'هەنگوینی سروشتی کوردستان', englishName: 'Natural Kurdish Honey', category: 'sweets', baseCalories: 304, baseProtein: 0.3, baseCarbs: 82, baseFat: 0, usageCount: 88, icon: <><Droplet size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'کەوچک', ratio: 21 }, { name: 'گرام', ratio: 1 }], aliases: ['هەنگوین', 'عسل', 'honey'] },
    { id: 'f_butter_natural', name: 'کەرەی خۆماڵی / زبدە', englishName: 'Natural Dairy Butter', category: 'kurdish', baseCalories: 717, baseProtein: 0.9, baseCarbs: 0.1, baseFat: 81, usageCount: 80, icon: <><Milk size={16} className="inline-block text-yellow-200" /></>, units: [{ name: 'کەوچک', ratio: 14 }, { name: 'گرام', ratio: 1 }], aliases: ['کەرە', 'زبدە', 'زبدة', 'butter'] },
    { id: 'f_kurdish_ghee', name: 'ڕۆنی کوردی خۆماڵی (ڕۆنی حەیوانی)', englishName: 'Kurdish Clarified Ghee', category: 'kurdish', baseCalories: 876, baseProtein: 0.3, baseCarbs: 0, baseFat: 99.5, usageCount: 78, icon: <><Droplet size={16} className="inline-block text-yellow-400" /></>, units: [{ name: 'کەوچک', ratio: 14 }, { name: 'گرام', ratio: 1 }], aliases: ['ڕۆنی کوردی', 'دهن حر', 'سمن بلدي', 'ghee'] },
    { id: 'f_walnuts', name: 'گوێزی خۆماڵی (گوێزی هەورامان)', englishName: 'Hawraman Walnuts', category: 'sweets', baseCalories: 654, baseProtein: 15, baseCarbs: 14, baseFat: 65, usageCount: 75, icon: <><Bean size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 10 }, { name: 'کەوچک', ratio: 15 }, { name: 'دەستە', ratio: 30 }], aliases: ['گوێز', 'جوز', 'walnut'] },
    { id: 'f_almonds', name: 'بادەمی خۆماڵی', englishName: 'Almonds', category: 'sweets', baseCalories: 579, baseProtein: 21, baseCarbs: 22, baseFat: 50, usageCount: 72, icon: <><Bean size={16} className="inline-block" /></>, units: [{ name: 'دەستە', ratio: 30 }, { name: 'کەوچک', ratio: 15 }, { name: 'گرام', ratio: 1 }], aliases: ['بادەم', 'لوز', 'almond'] },
    { id: 'f_pistachios', name: 'فستقی خۆماڵی', englishName: 'Pistachios', category: 'sweets', baseCalories: 562, baseProtein: 20, baseCarbs: 28, baseFat: 45, usageCount: 65, icon: <><Bean size={16} className="inline-block" /></>, units: [{ name: 'دەستە', ratio: 30 }, { name: 'کەوچک', ratio: 15 }], aliases: ['فستق', 'فستقی کوردی', 'فستق حلبي', 'pistachio'] },
    { id: 'f_sujuk', name: 'سجووقی کوردی بە گوێز و دۆشاوی ترێ', englishName: 'Walnut Sujuk Sweet Roll', category: 'sweets', baseCalories: 380, baseProtein: 4.5, baseCarbs: 70, baseFat: 10, usageCount: 40, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 50 }, { name: 'گرام', ratio: 1 }], aliases: ['سجووق', 'سجوق', 'سجوق بالجوز'] },
    { id: 'f_baklava', name: 'باقلاوەی کوردی / عێراقی بە فستق', englishName: 'Baklava with Pistachio', category: 'sweets', baseCalories: 430, baseProtein: 7, baseCarbs: 50, baseFat: 23, usageCount: 50, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 45 }, { name: 'پارچە', ratio: 45 }], aliases: ['باقلاوە', 'بقلاوة', 'baklava'] },
    { id: 'f_knafeh', name: 'کنافەی گەرم بە پەنیر', englishName: 'Hot Knafeh with Cheese', category: 'sweets', baseCalories: 360, baseProtein: 8.5, baseCarbs: 46, baseFat: 16, usageCount: 48, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 120 }, { name: 'قاپ', ratio: 150 }], aliases: ['کنافە', 'كنافة', 'knafeh'] },

    // خواردنەوە گازییەکان و سۆدا (Carbonated & Soft Drinks)
    { id: 'dr_pepsi', name: 'پێپسی کلاسیک (Pepsi)', englishName: 'Pepsi Regular', category: 'drinks', baseCalories: 41, baseProtein: 0, baseCarbs: 11, baseFat: 0, usageCount: 95, icon: <><Droplet size={16} className="inline-block text-blue-500" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }, { name: 'گڵاس', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['پێپسی', 'پپسی', 'بيبسي', 'pepsi'] },
    { id: 'dr_pepsi_diet', name: 'پێپسی دایت / زێرۆ (Pepsi Diet / Zero)', englishName: 'Pepsi Diet / Zero', category: 'drinks', baseCalories: 0, baseProtein: 0, baseCarbs: 0, baseFat: 0, usageCount: 88, icon: <><Droplet size={16} className="inline-block text-cyan-400" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }, { name: 'گڵاس', ratio: 250 }], aliases: ['پێپسی دایت', 'پێپسی زێرۆ', 'پپسی دایت', 'بيبسي دايت', 'بيبسي زيرو', 'diet pepsi', 'pepsi zero', 'pepsi max'] },
    { id: 'dr_cola', name: 'کۆکاکۆلا کلاسیک (Coca-Cola)', englishName: 'Coca-Cola Regular', category: 'drinks', baseCalories: 42, baseProtein: 0, baseCarbs: 10.6, baseFat: 0, usageCount: 92, icon: <><Droplet size={16} className="inline-block text-red-500" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }, { name: 'گڵاس', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['کۆلا', 'کۆکاکۆلا', 'كولا', 'كوكاكولا', 'coke', 'coca cola'] },
    { id: 'dr_cola_zero', name: 'کۆکاکۆلا زێرۆ / دایت (Coke Zero / Diet)', englishName: 'Coca-Cola Zero / Diet', category: 'drinks', baseCalories: 0.3, baseProtein: 0, baseCarbs: 0, baseFat: 0, usageCount: 90, icon: <><Droplet size={16} className="inline-block text-gray-400" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }, { name: 'گڵاس', ratio: 250 }], aliases: ['کۆلا زێرۆ', 'کۆکاکۆلا زێرۆ', 'كولا زيرو', 'كوكاكولا دايت', 'diet coke', 'coke zero'] },
    { id: 'dr_7up', name: 'سێڤن ئەپ (7Up)', englishName: '7Up Regular', category: 'drinks', baseCalories: 38, baseProtein: 0, baseCarbs: 9.5, baseFat: 0, usageCount: 80, icon: <><Droplet size={16} className="inline-block text-emerald-400" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }, { name: 'گڵاس', ratio: 250 }], aliases: ['سێڤن', 'سێڤن ئەپ', 'سفن اب', '7up', 'seven up'] },
    { id: 'dr_7up_diet', name: 'سێڤن ئەپ دایت / بێ شەکر (7Up Free / Diet)', englishName: '7Up Free / Diet', category: 'drinks', baseCalories: 1, baseProtein: 0, baseCarbs: 0, baseFat: 0, usageCount: 75, icon: <><Droplet size={16} className="inline-block text-teal-300" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }, { name: 'گڵاس', ratio: 250 }], aliases: ['سێڤن دایت', 'سێڤن فری', 'سفن دايت', 'سفن فري', '7up free', '7up diet'] },
    { id: 'dr_sprite', name: 'سپڕایت (Sprite)', englishName: 'Sprite Regular', category: 'drinks', baseCalories: 39, baseProtein: 0, baseCarbs: 9.8, baseFat: 0, usageCount: 70, icon: <><Droplet size={16} className="inline-block text-green-400" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }, { name: 'گڵاس', ratio: 250 }], aliases: ['سپڕایت', 'سبرايت', 'sprite'] },
    { id: 'dr_sprite_zero', name: 'سپڕایت زێرۆ (Sprite Zero)', englishName: 'Sprite Zero', category: 'drinks', baseCalories: 1, baseProtein: 0, baseCarbs: 0, baseFat: 0, usageCount: 65, icon: <><Droplet size={16} className="inline-block text-green-300" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }, { name: 'گڵاس', ratio: 250 }], aliases: ['سپڕایت زێرۆ', 'سبرايت زيرو', 'sprite zero'] },
    { id: 'dr_mirinda_orange', name: 'میریندا پرتەقاڵ (Mirinda Orange)', englishName: 'Mirinda Orange', category: 'drinks', baseCalories: 48, baseProtein: 0, baseCarbs: 12.5, baseFat: 0, usageCount: 75, icon: <><Droplet size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }, { name: 'گڵاس', ratio: 250 }], aliases: ['میریندا', 'میرەندا', 'ميرندا برتقال', 'mirinda'] },
    { id: 'dr_mirinda_apple', name: 'میریندا سێو (Mirinda Apple)', englishName: 'Mirinda Apple', category: 'drinks', baseCalories: 45, baseProtein: 0, baseCarbs: 11.5, baseFat: 0, usageCount: 60, icon: <><Droplet size={16} className="inline-block text-green-500" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }], aliases: ['میریندا سێو', 'ميرندا تفاح', 'mirinda apple'] },
    { id: 'dr_mirinda_citrus', name: 'میریندا سیتڕەس / حامز (Mirinda Citrus)', englishName: 'Mirinda Citrus', category: 'drinks', baseCalories: 46, baseProtein: 0, baseCarbs: 11.8, baseFat: 0, usageCount: 62, icon: <><Droplet size={16} className="inline-block text-lime-400" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }], aliases: ['میریندا سیتڕەس', 'میریندا حامز', 'ميرندا حمضيات', 'mirinda citrus'] },
    { id: 'dr_fanta', name: 'فەنتا پرتەقاڵ (Fanta Orange)', englishName: 'Fanta Orange', category: 'drinks', baseCalories: 44, baseProtein: 0, baseCarbs: 11, baseFat: 0, usageCount: 68, icon: <><Droplet size={16} className="inline-block text-orange-500" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }], aliases: ['فەنتا', 'فانتا', 'fanta'] },
    { id: 'dr_mountain_dew', name: 'ماونتین دیو (Mountain Dew)', englishName: 'Mountain Dew', category: 'drinks', baseCalories: 48, baseProtein: 0, baseCarbs: 12.3, baseFat: 0, usageCount: 72, icon: <><Droplet size={16} className="inline-block text-lime-500" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }], aliases: ['دیو', 'ماونتین دیو', 'ديو', 'mountain dew'] },
    { id: 'dr_kinza_cola', name: 'کینزا کۆلا (Kinza Cola)', englishName: 'Kinza Cola', category: 'drinks', baseCalories: 40, baseProtein: 0, baseCarbs: 10.2, baseFat: 0, usageCount: 65, icon: <><Droplet size={16} className="inline-block text-rose-600" /></>, units: [{ name: 'قوتوو', ratio: 360 }, { name: 'بتڵ', ratio: 500 }], aliases: ['کینزا', 'کینزا کۆلا', 'كينزا كولا', 'kinza'] },
    { id: 'dr_kinza_citrus', name: 'کینزا سیتڕەس / لیمۆ (Kinza Citrus)', englishName: 'Kinza Citrus', category: 'drinks', baseCalories: 42, baseProtein: 0, baseCarbs: 10.5, baseFat: 0, usageCount: 58, icon: <><Droplet size={16} className="inline-block text-yellow-400" /></>, units: [{ name: 'قوتوو', ratio: 360 }, { name: 'بتڵ', ratio: 500 }], aliases: ['کینزا سیتڕەس', 'کینزا لیمۆ', 'كينزا حمضيات', 'kinza citrus'] },
    { id: 'dr_kinza_diet', name: 'کینزا دایت / زێرۆ (Kinza Diet)', englishName: 'Kinza Diet', category: 'drinks', baseCalories: 0, baseProtein: 0, baseCarbs: 0, baseFat: 0, usageCount: 60, icon: <><Droplet size={16} className="inline-block text-slate-400" /></>, units: [{ name: 'قوتوو', ratio: 360 }, { name: 'بتڵ', ratio: 500 }], aliases: ['کینزا دایت', 'كينزا دايت', 'kinza diet'] },
    { id: 'dr_club_soda', name: 'سۆدا / ئاوی گازی (Club Soda)', englishName: 'Club Soda / Sparkling Water', category: 'drinks', baseCalories: 0, baseProtein: 0, baseCarbs: 0, baseFat: 0, usageCount: 78, icon: <><Droplet size={16} className="inline-block text-cyan-300" /></>, units: [{ name: 'قوتوو', ratio: 330 }, { name: 'بتڵ', ratio: 500 }, { name: 'گڵاس', ratio: 250 }], aliases: ['سۆدا', 'ئاوی گازی', 'صودا', 'مياه غازية', 'club soda', 'sparkling water'] },

    // خواردنەوە وزەبەخشەکان (Energy Drinks)
    { id: 'dr_redbull', name: 'ڕێدبوڵ (Red Bull Original)', englishName: 'Red Bull Energy Drink', category: 'drinks', baseCalories: 45, baseProtein: 0.3, baseCarbs: 11, baseFat: 0, usageCount: 88, icon: <><Zap size={16} className="inline-block text-blue-400" /></>, units: [{ name: 'قوتوو', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['ڕێدبوڵ', 'ریدبول', 'ريد بول', 'red bull', 'redbull'] },
    { id: 'dr_redbull_free', name: 'ڕێدبوڵ بێ شەکر (Red Bull Sugarfree)', englishName: 'Red Bull Sugarfree', category: 'drinks', baseCalories: 3, baseProtein: 0.1, baseCarbs: 0, baseFat: 0, usageCount: 82, icon: <><Zap size={16} className="inline-block text-cyan-300" /></>, units: [{ name: 'قوتوو', ratio: 250 }], aliases: ['ڕێدبوڵ بێ شەکر', 'ریدبول دایت', 'ريد بول خالي من السكر', 'red bull sugar free'] },
    { id: 'dr_monster', name: 'مۆنستەر ئینێرجی (Monster Energy)', englishName: 'Monster Energy', category: 'drinks', baseCalories: 47, baseProtein: 0.2, baseCarbs: 12, baseFat: 0, usageCount: 80, icon: <><Zap size={16} className="inline-block text-emerald-400" /></>, units: [{ name: 'قوتوو', ratio: 500 }, { name: 'گرام', ratio: 1 }], aliases: ['مۆنستەر', 'مونستر', 'monster energy', 'monster'] },
    { id: 'dr_monster_zero', name: 'مۆنستەر سپی / زێرۆ (Monster Ultra White)', englishName: 'Monster Ultra Zero', category: 'drinks', baseCalories: 2, baseProtein: 0, baseCarbs: 0.8, baseFat: 0, usageCount: 85, icon: <><Zap size={16} className="inline-block text-slate-200" /></>, units: [{ name: 'قوتوو', ratio: 500 }], aliases: ['مۆنستەر سپی', 'مۆنستەر زێرۆ', 'مونستر الأبيض', 'monster ultra white', 'monster zero'] },
    { id: 'dr_wild_tiger', name: 'تایگەر / وایڵد تایگەر (Wild Tiger)', englishName: 'Wild Tiger Energy Drink', category: 'drinks', baseCalories: 48, baseProtein: 0.2, baseCarbs: 12.2, baseFat: 0, usageCount: 75, icon: <><Zap size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'قوتوو', ratio: 250 }], aliases: ['تایگەر', 'وایڵد تایگەر', 'وايلد تايجر', 'wild tiger', 'tiger energy'] },
    { id: 'dr_pitbull', name: 'پیتبووڵ (Pit Bull)', englishName: 'Pit Bull Energy Drink', category: 'drinks', baseCalories: 46, baseProtein: 0.2, baseCarbs: 11.5, baseFat: 0, usageCount: 65, icon: <><Zap size={16} className="inline-block text-red-500" /></>, units: [{ name: 'قوتوو', ratio: 250 }], aliases: ['پیتبووڵ', 'پت بول', 'pit bull'] },
    { id: 'dr_bison', name: 'بیزۆن (Bison)', englishName: 'Bison Energy Drink', category: 'drinks', baseCalories: 47, baseProtein: 0.2, baseCarbs: 11.8, baseFat: 0, usageCount: 60, icon: <><Zap size={16} className="inline-block text-orange-400" /></>, units: [{ name: 'بتڵ', ratio: 250 }, { name: 'قوتوو', ratio: 250 }], aliases: ['بیزۆن', 'بايسون', 'bison'] },
    { id: 'dr_boom_boom', name: 'بۆم بۆم / بلۆ (Boom Boom / Blow)', englishName: 'Boom Boom Energy Drink', category: 'drinks', baseCalories: 46, baseProtein: 0.2, baseCarbs: 11.5, baseFat: 0, usageCount: 55, icon: <><Zap size={16} className="inline-block text-yellow-500" /></>, units: [{ name: 'قوتوو', ratio: 250 }], aliases: ['بۆم بۆم', 'بلۆ', 'بوم بوم', 'boom boom', 'blow'] },

    // ماڵت و بیرەی حەڵاڵ (Non-Alcoholic Malt Drinks)
    { id: 'dr_istak_classic', name: 'ئیستەک سادە (Istak Classic)', englishName: 'Istak Classic Malt', category: 'drinks', baseCalories: 25, baseProtein: 0.4, baseCarbs: 6, baseFat: 0, usageCount: 65, icon: <><Droplet size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'بتڵ', ratio: 330 }, { name: 'قوتوو', ratio: 330 }], aliases: ['ئیستەک', 'ایستک', 'ايستك كلاسيك', 'istak'] },
    { id: 'dr_istak_lemon', name: 'ئیستەک لیمۆ (Istak Lemon)', englishName: 'Istak Lemon', category: 'drinks', baseCalories: 32, baseProtein: 0.2, baseCarbs: 7.8, baseFat: 0, usageCount: 70, icon: <><Droplet size={16} className="inline-block text-yellow-400" /></>, units: [{ name: 'بتڵ', ratio: 330 }, { name: 'قوتوو', ratio: 330 }], aliases: ['ئیستەک لیمۆ', 'ايستك ليمون', 'istak lemon'] },
    { id: 'dr_istak_pomegranate', name: 'ئیستەک هەنار (Istak Pomegranate)', englishName: 'Istak Pomegranate', category: 'drinks', baseCalories: 34, baseProtein: 0.2, baseCarbs: 8.2, baseFat: 0, usageCount: 68, icon: <><Droplet size={16} className="inline-block text-rose-500" /></>, units: [{ name: 'بتڵ', ratio: 330 }, { name: 'قوتوو', ratio: 330 }], aliases: ['ئیستەک هەنار', 'ايستك رمان', 'istak pomegranate'] },
    { id: 'dr_istak_plum', name: 'ئیستەک هەڵوژە (Istak Plum)', englishName: 'Istak Plum', category: 'drinks', baseCalories: 33, baseProtein: 0.2, baseCarbs: 8, baseFat: 0, usageCount: 55, icon: <><Droplet size={16} className="inline-block text-purple-400" /></>, units: [{ name: 'بتڵ', ratio: 330 }], aliases: ['ئیستەک هەڵوژە', 'ايستك علوجة', 'istak plum'] },
    { id: 'dr_istak_peach', name: 'ئیستەک قۆخ / هۆڵۆ (Istak Peach)', englishName: 'Istak Peach', category: 'drinks', baseCalories: 33, baseProtein: 0.2, baseCarbs: 8, baseFat: 0, usageCount: 58, icon: <><Droplet size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'بتڵ', ratio: 330 }], aliases: ['ئیستەک قۆخ', 'ئیستەک هۆڵۆ', 'ايستك دراق', 'istak peach'] },
    { id: 'dr_barbican_classic', name: 'باربیکان سادە (Barbican Classic)', englishName: 'Barbican Classic Malt', category: 'drinks', baseCalories: 28, baseProtein: 0.4, baseCarbs: 6.8, baseFat: 0, usageCount: 65, icon: <><Droplet size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'بتڵ', ratio: 330 }, { name: 'قوتوو', ratio: 330 }], aliases: ['باربیکان', 'باربيكان كلاسيك', 'barbican'] },
    { id: 'dr_barbican_apple', name: 'باربیکان سێو (Barbican Apple)', englishName: 'Barbican Apple', category: 'drinks', baseCalories: 35, baseProtein: 0.3, baseCarbs: 8.5, baseFat: 0, usageCount: 72, icon: <><Droplet size={16} className="inline-block text-emerald-500" /></>, units: [{ name: 'بتڵ', ratio: 330 }, { name: 'قوتوو', ratio: 330 }], aliases: ['باربیکان سێو', 'باربيكان تفاح', 'barbican apple'] },
    { id: 'dr_barbican_pineapple', name: 'باربیکان ئەناناس (Barbican Pineapple)', englishName: 'Barbican Pineapple', category: 'drinks', baseCalories: 35, baseProtein: 0.3, baseCarbs: 8.5, baseFat: 0, usageCount: 60, icon: <><Droplet size={16} className="inline-block text-yellow-500" /></>, units: [{ name: 'بتڵ', ratio: 330 }, { name: 'قوتوو', ratio: 330 }], aliases: ['باربیکان ئەناناس', 'باربيكان أناناس', 'barbican pineapple'] },
    { id: 'dr_barbican_pomegranate', name: 'باربیکان هەنار (Barbican Pomegranate)', englishName: 'Barbican Pomegranate', category: 'drinks', baseCalories: 36, baseProtein: 0.3, baseCarbs: 8.8, baseFat: 0, usageCount: 65, icon: <><Droplet size={16} className="inline-block text-red-500" /></>, units: [{ name: 'بتڵ', ratio: 330 }, { name: 'قوتوو', ratio: 330 }], aliases: ['باربیکان هەنار', 'باربيكان رمان', 'barbican pomegranate'] },
    { id: 'dr_holsten', name: 'هۆڵستن بێ کحول (Holsten 0.0%)', englishName: 'Holsten Non-Alcoholic Malt', category: 'drinks', baseCalories: 26, baseProtein: 0.5, baseCarbs: 6.2, baseFat: 0, usageCount: 52, icon: <><Droplet size={16} className="inline-block text-amber-600" /></>, units: [{ name: 'بتڵ', ratio: 330 }, { name: 'قوتوو', ratio: 330 }], aliases: ['هۆڵستن', 'هولستن', 'holsten'] },
    { id: 'dr_moussy', name: 'مۆسی بێ کحول (Moussy)', englishName: 'Moussy Non-Alcoholic Drink', category: 'drinks', baseCalories: 30, baseProtein: 0.3, baseCarbs: 7.3, baseFat: 0, usageCount: 50, icon: <><Droplet size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'بتڵ', ratio: 330 }], aliases: ['مۆسی', 'موسي', 'moussy'] },

    // شەربەتە لەقوتوونراوەکان و میوە (Juices & Milkshakes)
    { id: 'dr_rani_peach', name: 'شەربەتی ڕانی قۆخ بە پارچەی میوە', englishName: 'Rani Float Peach', category: 'drinks', baseCalories: 54, baseProtein: 0.2, baseCarbs: 13.5, baseFat: 0, usageCount: 78, icon: <><Droplet size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'قوتوو', ratio: 240 }], aliases: ['ڕانی', 'ڕانی قۆخ', 'راني خوخ', 'rani float'] },
    { id: 'dr_rani_orange', name: 'شەربەتی ڕانی پرتەقاڵ بە پارچەی میوە', englishName: 'Rani Float Orange', category: 'drinks', baseCalories: 52, baseProtein: 0.2, baseCarbs: 13, baseFat: 0, usageCount: 72, icon: <><Droplet size={16} className="inline-block text-orange-400" /></>, units: [{ name: 'قوتوو', ratio: 240 }], aliases: ['ڕانی پرتەقاڵ', 'راني برتقال', 'rani orange'] },
    { id: 'dr_rani_mango', name: 'شەربەتی ڕانی مانگۆ (Rani Mango)', englishName: 'Rani Float Mango', category: 'drinks', baseCalories: 58, baseProtein: 0.3, baseCarbs: 14.2, baseFat: 0, usageCount: 65, icon: <><Droplet size={16} className="inline-block text-yellow-500" /></>, units: [{ name: 'قوتوو', ratio: 240 }], aliases: ['ڕانی مانگۆ', 'راني مانجو', 'rani mango'] },
    { id: 'dr_suntop', name: 'شەربەتی سەن تۆپ (Sun Top)', englishName: 'Sun Top Orange Drink', category: 'drinks', baseCalories: 46, baseProtein: 0.1, baseCarbs: 11.2, baseFat: 0, usageCount: 60, icon: <><Droplet size={16} className="inline-block text-orange-500" /></>, units: [{ name: 'پاکەت', ratio: 125 }, { name: 'پاکەت گەورە', ratio: 250 }], aliases: ['سەن تۆپ', 'سن توب', 'suntop', 'sun top'] },
    { id: 'dr_caprisun', name: 'کاپری سۆن (Capri-Sun)', englishName: 'Capri-Sun Drink', category: 'drinks', baseCalories: 41, baseProtein: 0.1, baseCarbs: 10, baseFat: 0, usageCount: 55, icon: <><Droplet size={16} className="inline-block text-blue-400" /></>, units: [{ name: 'پاکەت', ratio: 200 }], aliases: ['کاپری سۆن', 'كابري سن', 'capri sun'] },
    { id: 'dr_kdd_mango', name: 'شەربەتی کەی دی دی مانگۆ (KDD Mango)', englishName: 'KDD Mango Juice', category: 'drinks', baseCalories: 60, baseProtein: 0.4, baseCarbs: 14.8, baseFat: 0, usageCount: 62, icon: <><Droplet size={16} className="inline-block text-yellow-500" /></>, units: [{ name: 'پاکەت', ratio: 250 }], aliases: ['کەی دی دی', 'كيديدي مانجو', 'kdd mango'] },
    { id: 'dr_lemon_mint', name: 'شەربەتی لیمۆ و نەعنای تازە', englishName: 'Fresh Lemon Mint Juice', category: 'drinks', baseCalories: 40, baseProtein: 0.3, baseCarbs: 10, baseFat: 0.1, usageCount: 75, icon: <><Droplet size={16} className="inline-block text-lime-400" /></>, units: [{ name: 'گڵاس', ratio: 250 }, { name: 'گرام', ratio: 1 }], aliases: ['لیمۆ و نەعنا', 'شەربەتی لیمۆ', 'عصير ليمون ونعناع', 'lemon mint'] },
    { id: 'dr_tamarind', name: 'شەربەتی تەمرهیندی', englishName: 'Tamarind Juice', category: 'drinks', baseCalories: 48, baseProtein: 0.3, baseCarbs: 12, baseFat: 0.1, usageCount: 50, icon: <><Droplet size={16} className="inline-block text-amber-800" /></>, units: [{ name: 'گڵاس', ratio: 250 }], aliases: ['تەمرهیندی', 'تمر هندي', 'tamarind juice'] },
    { id: 'dr_karkadeh', name: 'شەربەتی کەرکەدێ (Karkadeh)', englishName: 'Karkadeh / Hibiscus Drink', category: 'drinks', baseCalories: 32, baseProtein: 0.1, baseCarbs: 8, baseFat: 0, usageCount: 52, icon: <><Droplet size={16} className="inline-block text-rose-700" /></>, units: [{ name: 'گڵاس', ratio: 250 }], aliases: ['کەرکەدێ', 'كركديه', 'karkadeh', 'hibiscus'] },
    { id: 'dr_mulberry', name: 'شەربەتی تووی خۆماڵی', englishName: 'Fresh Mulberry Juice', category: 'drinks', baseCalories: 50, baseProtein: 0.5, baseCarbs: 12.5, baseFat: 0.1, usageCount: 65, icon: <><Droplet size={16} className="inline-block text-purple-600" /></>, units: [{ name: 'گڵاس', ratio: 250 }], aliases: ['شەربەتی توو', 'شەربەت توو', 'عصير توت', 'mulberry juice'] },
    { id: 'dr_banana_milk', name: 'شەربەتی مۆز بە شیر', englishName: 'Fresh Banana Milkshake', category: 'drinks', baseCalories: 75, baseProtein: 2.5, baseCarbs: 13, baseFat: 1.8, usageCount: 80, icon: <><Milk size={16} className="inline-block text-yellow-300" /></>, units: [{ name: 'گڵاس', ratio: 300 }], aliases: ['مۆز بە شیر', 'شەربەت مۆز', 'عصير موز بالحليب', 'banana milk'] },
    { id: 'dr_avocado_shake', name: 'شەربەتی ئەڤۆکادۆ بە مۆز و هەنگوین', englishName: 'Avocado Honey Milkshake', category: 'drinks', baseCalories: 110, baseProtein: 2.2, baseCarbs: 14, baseFat: 5.5, usageCount: 68, icon: <><Milk size={16} className="inline-block text-emerald-400" /></>, units: [{ name: 'گڵاس', ratio: 300 }], aliases: ['ئەڤۆکادۆ', 'شەربەتی ئەڤۆکادۆ', 'عصير أفوكادو بالعسل', 'avocado shake'] },
    { id: 'dr_carrot_juice', name: 'شەربەتی گێزەری سروشتی', englishName: 'Fresh Carrot Juice', category: 'drinks', baseCalories: 40, baseProtein: 0.9, baseCarbs: 9.3, baseFat: 0.2, usageCount: 60, icon: <><Droplet size={16} className="inline-block text-orange-400" /></>, units: [{ name: 'گڵاس', ratio: 250 }], aliases: ['شەربەتی گێزەر', 'عصير جزر', 'carrot juice'] },
    { id: 'dr_strawberry_juice', name: 'شەربەتی شلیک / فەراولەی سروشتی', englishName: 'Fresh Strawberry Juice', category: 'drinks', baseCalories: 36, baseProtein: 0.7, baseCarbs: 8.5, baseFat: 0.2, usageCount: 62, icon: <><Droplet size={16} className="inline-block text-rose-500" /></>, units: [{ name: 'گڵاس', ratio: 250 }], aliases: ['شەربەتی شلیک', 'عصير فراولة', 'strawberry juice'] },

    // قاوە و چا و خواردنەوە گەرمەکان (Coffees & Teas & Hot Drinks)
    { id: 'dr_espresso', name: 'ئیسپرێسۆ (Espresso)', englishName: 'Espresso Coffee', category: 'drinks', baseCalories: 9, baseProtein: 0.1, baseCarbs: 1.7, baseFat: 0.2, usageCount: 82, icon: <><Coffee size={16} className="inline-block text-amber-800" /></>, units: [{ name: 'فنجان', ratio: 30 }, { name: 'فنجان دەبڵ', ratio: 60 }], aliases: ['ئیسپرێسۆ', 'اسبريسو', 'espresso'] },
    { id: 'dr_americano', name: 'ئەمریکانۆ (Americano)', englishName: 'Caffè Americano', category: 'drinks', baseCalories: 3, baseProtein: 0.1, baseCarbs: 0.5, baseFat: 0, usageCount: 78, icon: <><Coffee size={16} className="inline-block text-amber-900" /></>, units: [{ name: 'کوپ', ratio: 240 }], aliases: ['ئەمریکانۆ', 'امريكانو', 'americano'] },
    { id: 'dr_cappuccino', name: 'کاپوچینۆ (Cappuccino)', englishName: 'Cappuccino Coffee', category: 'drinks', baseCalories: 36, baseProtein: 2.3, baseCarbs: 3.2, baseFat: 1.6, usageCount: 85, icon: <><Coffee size={16} className="inline-block text-amber-600" /></>, units: [{ name: 'کوپ', ratio: 200 }], aliases: ['کاپوچینۆ', 'كابتشينو', 'cappuccino'] },
    { id: 'dr_latte', name: 'لاتێ (Caffè Latte)', englishName: 'Caffè Latte', category: 'drinks', baseCalories: 42, baseProtein: 2.5, baseCarbs: 3.8, baseFat: 1.8, usageCount: 88, icon: <><Coffee size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'کوپ', ratio: 250 }], aliases: ['لاتێ', 'لاتيه', 'latte'] },
    { id: 'dr_iced_latte', name: 'ئایس لاتێ (Iced Latte)', englishName: 'Iced Latte', category: 'drinks', baseCalories: 38, baseProtein: 2.2, baseCarbs: 3.5, baseFat: 1.6, usageCount: 80, icon: <><Coffee size={16} className="inline-block text-cyan-500" /></>, units: [{ name: 'گڵاس', ratio: 300 }], aliases: ['ئایس لاتێ', 'آيس لاتيه', 'iced latte'] },
    { id: 'dr_mocha', name: 'مۆکا بە چۆکڵێت (Caffè Mocha)', englishName: 'Caffè Mocha', category: 'drinks', baseCalories: 75, baseProtein: 2.6, baseCarbs: 11, baseFat: 2.4, usageCount: 70, icon: <><Coffee size={16} className="inline-block text-amber-700" /></>, units: [{ name: 'کوپ', ratio: 250 }], aliases: ['مۆکا', 'موكا', 'mocha'] },
    { id: 'dr_caramel_macchiato', name: 'کارامێل ماکیاتۆ (Caramel Macchiato)', englishName: 'Caramel Macchiato', category: 'drinks', baseCalories: 65, baseProtein: 2.2, baseCarbs: 10, baseFat: 1.8, usageCount: 72, icon: <><Coffee size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'کوپ', ratio: 250 }], aliases: ['کارامێل ماکیاتۆ', 'كراميل ماكياتو', 'caramel macchiato'] },
    { id: 'dr_nescafe_3in1', name: 'نەسکافێ ۳ لە ۱ (Nescafe 3 in 1)', englishName: 'Nescafe 3 in 1', category: 'drinks', baseCalories: 45, baseProtein: 0.5, baseCarbs: 8.5, baseFat: 1.2, usageCount: 90, icon: <><Coffee size={16} className="inline-block text-red-500" /></>, units: [{ name: 'پاکەت', ratio: 20 }, { name: 'کوپ', ratio: 200 }], aliases: ['نەسکافێ', 'نسكافيه 3 في 1', 'nescafe 3 in 1'] },
    { id: 'dr_nescafe_2in1', name: 'نەسکافێ ۲ لە ۱ بێ شەکر (Nescafe 2 in 1)', englishName: 'Nescafe 2 in 1 (Sugar Free)', category: 'drinks', baseCalories: 28, baseProtein: 0.6, baseCarbs: 4, baseFat: 1.1, usageCount: 75, icon: <><Coffee size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'پاکەت', ratio: 12 }, { name: 'کوپ', ratio: 200 }], aliases: ['نەسکافێ ۲ لە ۱', 'نسكافيه 2 في 1', 'nescafe 2 in 1'] },
    { id: 'dr_nescafe_black', name: 'نەسکافێ بلاک / ڕەش (Nescafe Black / Gold)', englishName: 'Nescafe Black / Gold', category: 'drinks', baseCalories: 2, baseProtein: 0.1, baseCarbs: 0.3, baseFat: 0, usageCount: 85, icon: <><Coffee size={16} className="inline-block text-stone-700" /></>, units: [{ name: 'کەوچک', ratio: 2 }, { name: 'کوپ', ratio: 200 }], aliases: ['نەسکافێ بلاک', 'نسكافيه كلاسيك', 'نسكافيه جولد', 'nescafe black'] },
    { id: 'dr_turkish_coffee', name: 'قاوەی تورکی بە شەکر', englishName: 'Sweetened Turkish Coffee', category: 'drinks', baseCalories: 35, baseProtein: 0.5, baseCarbs: 8, baseFat: 0.2, usageCount: 82, icon: <><Coffee size={16} className="inline-block text-amber-900" /></>, units: [{ name: 'فنجان', ratio: 70 }], aliases: ['قاوەی تورکی', 'قهوة تركية', 'turkish coffee'] },
    { id: 'dr_arabic_coffee', name: 'قاوەی عەرەبی سادە بە هێل', englishName: 'Arabic Coffee with Cardamom', category: 'drinks', baseCalories: 5, baseProtein: 0.2, baseCarbs: 0.8, baseFat: 0.1, usageCount: 65, icon: <><Coffee size={16} className="inline-block text-amber-700" /></>, units: [{ name: 'فنجان', ratio: 40 }], aliases: ['قاوەی عەرەبی', 'قهوة عربية سادة', 'arabic coffee'] },
    { id: 'dr_hot_chocolate', name: 'هۆت چۆکڵێت بە شیر', englishName: 'Hot Chocolate with Milk', category: 'drinks', baseCalories: 82, baseProtein: 3.2, baseCarbs: 11, baseFat: 2.8, usageCount: 65, icon: <><Coffee size={16} className="inline-block text-amber-950" /></>, units: [{ name: 'کوپ', ratio: 200 }], aliases: ['هۆت چۆکڵێت', 'هوت شوكليت', 'hot chocolate'] },
    { id: 'dr_sahlab', name: 'سەحلەب بە گوێزی هیندی و دارچینی', englishName: 'Sahlab with Cinnamon & Nuts', category: 'drinks', baseCalories: 95, baseProtein: 2.8, baseCarbs: 15.5, baseFat: 2.5, usageCount: 55, icon: <><Coffee size={16} className="inline-block text-amber-200" /></>, units: [{ name: 'کوپ', ratio: 200 }], aliases: ['سەحلەب', 'سحلب', 'sahlab'] },
    { id: 'dr_tea_limo', name: 'چای لیمۆ بەسڕە (نۆمی بەسڕە)', englishName: 'Dried Lime Tea (Noomi Basra)', category: 'drinks', baseCalories: 6, baseProtein: 0.1, baseCarbs: 1.4, baseFat: 0, usageCount: 70, icon: <><Coffee size={16} className="inline-block text-amber-700" /></>, units: [{ name: 'ستکان', ratio: 100 }, { name: 'کوپ', ratio: 200 }], aliases: ['نۆمی بەسڕە', 'لیمۆ بەسڕە', 'لومي بصرة', 'شاي نومي بصرة'] },

    // شیر و شیرەمەنییەکان (Milks & Dairy Drinks)
    { id: 'dr_milk_lowfat', name: 'شیری کەم چەوری (Low Fat Milk)', englishName: 'Low Fat Milk (1.5%)', category: 'drinks', baseCalories: 47, baseProtein: 3.3, baseCarbs: 4.8, baseFat: 1.5, usageCount: 88, icon: <><Milk size={16} className="inline-block text-blue-400" /></>, units: [{ name: 'گڵاس', ratio: 250 }, { name: 'قوتوو', ratio: 250 }], aliases: ['شیری کەم چەوری', 'حليب قليل الدسم', 'low fat milk'] },
    { id: 'dr_milk_skimmed', name: 'شیری بێ چەوری (Skimmed Milk)', englishName: 'Skimmed Milk (0%)', category: 'drinks', baseCalories: 35, baseProtein: 3.4, baseCarbs: 5, baseFat: 0.1, usageCount: 75, icon: <><Milk size={16} className="inline-block text-sky-300" /></>, units: [{ name: 'گڵاس', ratio: 250 }], aliases: ['شیری بێ چەوری', 'حليب خالي الدسم', 'skimmed milk'] },
    { id: 'dr_milk_choco', name: 'شیری کاکاو / چۆکڵێت', englishName: 'Chocolate Milk', category: 'drinks', baseCalories: 70, baseProtein: 3.2, baseCarbs: 10.5, baseFat: 1.8, usageCount: 75, icon: <><Milk size={16} className="inline-block text-amber-800" /></>, units: [{ name: 'پاکەت', ratio: 200 }, { name: 'گڵاس', ratio: 250 }], aliases: ['شیری کاکاو', 'حليب شوكولاتة', 'chocolate milk'] },
    { id: 'dr_milk_banana_pack', name: 'شیری مۆز (Banana Milk)', englishName: 'Banana Flavored Milk', category: 'drinks', baseCalories: 68, baseProtein: 3.1, baseCarbs: 10.2, baseFat: 1.6, usageCount: 65, icon: <><Milk size={16} className="inline-block text-yellow-300" /></>, units: [{ name: 'پاکەت', ratio: 200 }, { name: 'گڵاس', ratio: 250 }], aliases: ['شیری مۆز', 'حليب موز', 'banana milk'] },
    { id: 'dr_milk_nido', name: 'شیری تۆز (نیدۆ ئامادەکراو)', englishName: 'Prepared Nido Powder Milk', category: 'drinks', baseCalories: 65, baseProtein: 3.2, baseCarbs: 5, baseFat: 3.6, usageCount: 80, icon: <><Milk size={16} className="inline-block text-amber-300" /></>, units: [{ name: 'کەوچک', ratio: 15 }, { name: 'گڵاس', ratio: 250 }], aliases: ['شیری تۆز', 'نیدۆ', 'نيدو', 'حليب بودرة', 'nido'] },
    { id: 'dr_milk_almond', name: 'شیری بادەم بێ شەکر (Almond Milk)', englishName: 'Unsweetened Almond Milk', category: 'drinks', baseCalories: 15, baseProtein: 0.6, baseCarbs: 0.3, baseFat: 1.2, usageCount: 62, icon: <><Milk size={16} className="inline-block text-stone-300" /></>, units: [{ name: 'گڵاس', ratio: 250 }], aliases: ['شیری بادەم', 'حليب لوز', 'almond milk'] },
    { id: 'dr_milk_oat', name: 'شیری شۆڤان (Oat Milk)', englishName: 'Oat Milk', category: 'drinks', baseCalories: 45, baseProtein: 1, baseCarbs: 7, baseFat: 1.5, usageCount: 58, icon: <><Milk size={16} className="inline-block text-amber-200" /></>, units: [{ name: 'گڵاس', ratio: 250 }], aliases: ['شیری شۆڤان', 'حليب شوفان', 'oat milk'] },

    // فست فود، بەرگەر، ساندویچ و پیتزا (Fast Food & Street Food)
    { id: 'ff_falafel_sandwich', name: 'لەفەی فەلافلی کوردی بە عەمبە لە سەمون', englishName: 'Kurdish Falafel with Amba', category: 'fastfood', baseCalories: 220, baseProtein: 6.5, baseCarbs: 32, baseFat: 8, usageCount: 95, icon: <><Utensils size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'لەفە', ratio: 180 }, { name: 'دانە', ratio: 180 }], aliases: ['لەفەی فەلافل', 'فەلافل سەمون', 'لفة فلافل', 'falafel sandwich'] },
    { id: 'ff_shawarma_beef_sandwich', name: 'لەفەی گەس / شاوەرمەی گۆشت لە سەمون', englishName: 'Beef Shawarma Sandwich', category: 'fastfood', baseCalories: 250, baseProtein: 14.5, baseCarbs: 22, baseFat: 11, usageCount: 92, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'لەفە', ratio: 200 }, { name: 'دانە', ratio: 200 }], aliases: ['لەفەی گەس', 'لەفەی شاوەرمای گۆشت', 'لفة قص لحم', 'beef shawarma sandwich'] },
    { id: 'ff_shawarma_chicken_sandwich', name: 'لەفەی گەس / شاوەرمەی مریشک لە سەمون', englishName: 'Chicken Shawarma Sandwich', category: 'fastfood', baseCalories: 225, baseProtein: 15, baseCarbs: 22, baseFat: 8.5, usageCount: 90, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'لەفە', ratio: 200 }, { name: 'دانە', ratio: 200 }], aliases: ['لەفەی گەسی مریشک', 'لەفەی شاوەرمای مریشک', 'لفة قص دجاج', 'chicken shawarma sandwich'] },
    { id: 'ff_shawarma_saj', name: 'شاوەرمەی عەرەبی لە نانی ساج', englishName: 'Arabic Saj Chicken Shawarma', category: 'fastfood', baseCalories: 240, baseProtein: 13, baseCarbs: 25, baseFat: 10, usageCount: 88, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'لەفە', ratio: 220 }, { name: 'پارچە', ratio: 50 }], aliases: ['شاوەرمەی ساج', 'شاورما صاج عربي', 'saj shawarma'] },
    { id: 'ff_burger_beef', name: 'بەرگەری گۆشت (بیف بەرگەر)', englishName: 'Classic Beef Burger', category: 'fastfood', baseCalories: 255, baseProtein: 13.5, baseCarbs: 20, baseFat: 13.5, usageCount: 85, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 200 }], aliases: ['بەرگەر', 'بیف بەرگەر', 'همبركر لحم', 'burger', 'beef burger'] },
    { id: 'ff_cheeseburger', name: 'چیزبەرگەر بە پەنیری چێدار', englishName: 'Cheddar Cheeseburger', category: 'fastfood', baseCalories: 280, baseProtein: 15, baseCarbs: 21, baseFat: 15.5, usageCount: 82, icon: <><Beef size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 220 }], aliases: ['چیزبەرگەر', 'جيز برجر', 'cheeseburger'] },
    { id: 'ff_burger_chicken', name: 'بەرگەری مریشک (چیکن بەرگەر)', englishName: 'Chicken Burger', category: 'fastfood', baseCalories: 235, baseProtein: 13, baseCarbs: 22, baseFat: 10.5, usageCount: 78, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 190 }], aliases: ['چیکن بەرگەر', 'همبركر دجاج', 'chicken burger'] },
    { id: 'ff_zinger', name: 'ساندویچی زینگەر / کریسپی توون', englishName: 'Spicy Zinger Chicken Sandwich', category: 'fastfood', baseCalories: 265, baseProtein: 12.5, baseCarbs: 26, baseFat: 12.5, usageCount: 84, icon: <><Flame size={16} className="inline-block text-rose-500" /></>, units: [{ name: 'دانە', ratio: 220 }], aliases: ['زینگەر', 'کریسپی', 'زنجر', 'zinger sandwich'] },
    { id: 'ff_broasted', name: 'مریشکی برۆستد / کنتاکی (پارچە)', englishName: 'Crispy Broasted Chicken Piece', category: 'fastfood', baseCalories: 260, baseProtein: 18, baseCarbs: 10, baseFat: 16.5, usageCount: 80, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 140 }], aliases: ['برۆستد', 'مریشکی سوورکراوە', 'بروستد', 'كنتاكي', 'broasted chicken'] },
    { id: 'ff_strips', name: 'فنگەری مریشک / سترێپس (پارچە)', englishName: 'Crispy Chicken Strips', category: 'fastfood', baseCalories: 245, baseProtein: 17, baseCarbs: 14, baseFat: 13, usageCount: 76, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'پارچە', ratio: 45 }, { name: 'قاپ', ratio: 180 }], aliases: ['سترێپس', 'فنگەر مریشک', 'ستريبس دجاج', 'chicken strips'] },
    { id: 'ff_nuggets', name: 'ناگێتسی مریشک (دانە)', englishName: 'Chicken Nuggets Piece', category: 'fastfood', baseCalories: 285, baseProtein: 14, baseCarbs: 17, baseFat: 18, usageCount: 72, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 20 }], aliases: ['ناگێتس', 'ناگێت', 'نجتس', 'chicken nuggets'] },
    { id: 'ff_french_fries', name: 'پەتاتەی فینگەر / سوورکراوە', englishName: 'French Fries', category: 'fastfood', baseCalories: 312, baseProtein: 3.4, baseCarbs: 41, baseFat: 15, usageCount: 95, icon: <><Utensils size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'دەستە', ratio: 80 }], aliases: ['فینگەر', 'پەتاتەی سوورکراوە', 'بطاطا مقلية', 'french fries'] },
    { id: 'ff_pizza_pepperoni', name: 'پیتزای پێپەرۆنی (سلایس)', englishName: 'Pepperoni Pizza Slice', category: 'fastfood', baseCalories: 275, baseProtein: 11.5, baseCarbs: 28, baseFat: 13, usageCount: 82, icon: <><Cookie size={16} className="inline-block text-rose-500" /></>, units: [{ name: 'پارچە', ratio: 100 }], aliases: ['پێپەرۆنی', 'پیتزای پێپەرۆنی', 'بيتزا ببروني', 'pepperoni pizza'] },
    { id: 'ff_pizza_margherita', name: 'پیتزای مارگەریتا (سلایس)', englishName: 'Margherita Pizza Slice', category: 'fastfood', baseCalories: 250, baseProtein: 10.5, baseCarbs: 30, baseFat: 9.5, usageCount: 78, icon: <><Cookie size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'پارچە', ratio: 100 }], aliases: ['مارگەریتا', 'پیتزا مارگەریتا', 'بيتزا مارغريتا', 'margherita pizza'] },
    { id: 'ff_pizza_supreme', name: 'پیتزای تێکەڵ / سوپریم (سلایس)', englishName: 'Supreme Mixed Pizza Slice', category: 'fastfood', baseCalories: 265, baseProtein: 11.2, baseCarbs: 27, baseFat: 12, usageCount: 75, icon: <><Cookie size={16} className="inline-block text-orange-500" /></>, units: [{ name: 'پارچە', ratio: 110 }], aliases: ['پیتزای تێکەڵ', 'بيتزا مشكل', 'supreme pizza'] },
    { id: 'ff_pizza_bbq_chicken', name: 'پیتزای مریشک بە باربیکیۆ (سلایس)', englishName: 'BBQ Chicken Pizza Slice', category: 'fastfood', baseCalories: 245, baseProtein: 12, baseCarbs: 28, baseFat: 9.5, usageCount: 70, icon: <><Cookie size={16} className="inline-block text-red-500" /></>, units: [{ name: 'پارچە', ratio: 110 }], aliases: ['پیتزا مریشک', 'بيتزا دجاج', 'chicken pizza'] },
    { id: 'ff_pizza_veggie', name: 'پیتزای سەوزەوات (سلایس)', englishName: 'Vegetarian Pizza Slice', category: 'fastfood', baseCalories: 210, baseProtein: 8.5, baseCarbs: 28, baseFat: 7, usageCount: 65, icon: <><Cookie size={16} className="inline-block text-emerald-500" /></>, units: [{ name: 'پارچە', ratio: 100 }], aliases: ['پیتزای سەوزە', 'بيتزا خضار', 'veggie pizza'] },
    { id: 'ff_hotdog', name: 'ساندویچی هۆت دۆگ لە سەمون', englishName: 'Hot Dog Sandwich', category: 'fastfood', baseCalories: 260, baseProtein: 10, baseCarbs: 24, baseFat: 14, usageCount: 68, icon: <><Utensils size={16} className="inline-block text-amber-600" /></>, units: [{ name: 'لەفە', ratio: 140 }], aliases: ['هۆت دۆگ', 'صوصج', 'نقانق', 'hot dog'] },
    { id: 'ff_sambusa_meat', name: 'سەمبوسەی گۆشت (دانە)', englishName: 'Meat Sambusa Piece', category: 'fastfood', baseCalories: 280, baseProtein: 10, baseCarbs: 28, baseFat: 14, usageCount: 72, icon: <><Cookie size={16} className="inline-block text-amber-700" /></>, units: [{ name: 'دانە', ratio: 45 }], aliases: ['سەمبوسەی گۆشت', 'سمبوسك لحم', 'meat sambusa'] },
    { id: 'ff_sambusa_cheese', name: 'سەمبوسەی پەنیر (دانە)', englishName: 'Cheese Sambusa Piece', category: 'fastfood', baseCalories: 295, baseProtein: 9.5, baseCarbs: 27, baseFat: 16.5, usageCount: 70, icon: <><Cookie size={16} className="inline-block text-amber-400" /></>, units: [{ name: 'دانە', ratio: 45 }], aliases: ['سەمبوسەی پەنیر', 'سمبوسك جبن', 'cheese sambusa'] },
    { id: 'ff_sambusa_veg', name: 'سەمبوسەی سەوزە و پەتاتە (دانە)', englishName: 'Vegetable Sambusa Piece', category: 'fastfood', baseCalories: 230, baseProtein: 4.5, baseCarbs: 32, baseFat: 9.5, usageCount: 62, icon: <><Cookie size={16} className="inline-block text-emerald-600" /></>, units: [{ name: 'دانە', ratio: 45 }], aliases: ['سەمبوسەی سەوزە', 'سمبوسك خضار', 'vegetable sambusa'] },
    { id: 'ff_borek_meat', name: 'بۆرەکی تورکی بە گۆشت', englishName: 'Turkish Meat Borek', category: 'fastfood', baseCalories: 270, baseProtein: 9, baseCarbs: 26, baseFat: 14, usageCount: 65, icon: <><Cookie size={16} className="inline-block text-amber-600" /></>, units: [{ name: 'پارچە', ratio: 80 }], aliases: ['بۆرەکی گۆشت', 'بورك لحم', 'meat borek'] },
    { id: 'ff_borek_cheese', name: 'بۆرەکی تورکی بە پەنیر و جەعفەری', englishName: 'Turkish Cheese & Parsley Borek', category: 'fastfood', baseCalories: 285, baseProtein: 9.5, baseCarbs: 25, baseFat: 16, usageCount: 68, icon: <><Cookie size={16} className="inline-block text-yellow-500" /></>, units: [{ name: 'پارچە', ratio: 80 }], aliases: ['بۆرەکی پەنیر', 'بورك جبن', 'cheese borek'] },

    // چێشتی کوردی و عێراقی زیادتر (Additional Kurdish & Iraqi Stews & Dishes)
    { id: 'kd_stew_qaysi', name: 'شلەی قەیسی بە گۆشت (قەیسی کوردی)', englishName: 'Sweet Apricot Stew with Meat', category: 'kurdish', baseCalories: 165, baseProtein: 6.5, baseCarbs: 26, baseFat: 4.2, usageCount: 55, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 }], aliases: ['قەیسی', 'شلەی قەیسی', 'شروابی قەیسی', 'مرق قيسي'] },
    { id: 'kd_stew_tomato', name: 'شلەی تەماتەی کوردی بە گۆشت', englishName: 'Kurdish Tomato Stew with Meat', category: 'kurdish', baseCalories: 65, baseProtein: 3.5, baseCarbs: 6.5, baseFat: 3.2, usageCount: 60, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }], aliases: ['شلەی تەماتە', 'مرق طماطة'] },
    { id: 'kd_stew_zucchini', name: 'شلەی کولەکە / کووسە بە گۆشت', englishName: 'Zucchini Stew with Meat', category: 'kurdish', baseCalories: 75, baseProtein: 5.5, baseCarbs: 4.5, baseFat: 4, usageCount: 52, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }], aliases: ['شلەی کولەکە', 'شلەی کووسە', 'مرق كوسا'] },
    { id: 'kd_masliq', name: 'مەسلیقی کوردی بە پەتاتە و گۆشت', englishName: 'Kurdish Meat & Potato Stew (Masliq)', category: 'kurdish', baseCalories: 140, baseProtein: 9.5, baseCarbs: 12, baseFat: 5.5, usageCount: 50, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 250 }], aliases: ['مەسلیق', 'مسلیق'] },
    { id: 'kd_kashk', name: 'کەشک و شۆربای کەشکی کوردی', englishName: 'Traditional Kashk Soup', category: 'kurdish', baseCalories: 125, baseProtein: 8, baseCarbs: 15, baseFat: 3.5, usageCount: 45, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'کاسە', ratio: 250 }], aliases: ['کەشک', 'شوربة كشك'] },
    { id: 'kd_quraw', name: 'قوڕاو (شۆربای قوڕاوی لادێ)', englishName: 'Traditional Quraw Herb Soup', category: 'kurdish', baseCalories: 80, baseProtein: 4.5, baseCarbs: 9, baseFat: 3, usageCount: 42, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'کاسە', ratio: 250 }], aliases: ['قوڕاو', 'شۆربای قوڕاو'] },
    { id: 'kd_mosul_kubba', name: 'کفتەی گەورەی موسڵ (کوبە)', englishName: 'Mosul Jumbo Bulgur Kubba', category: 'kurdish', baseCalories: 220, baseProtein: 11, baseCarbs: 24, baseFat: 9, usageCount: 58, icon: <><Cookie size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 200 }, { name: 'پارچە', ratio: 80 }], aliases: ['کفتەی موسڵ', 'كبة موصل كبيرة', 'mosul kubba'] },
    { id: 'kd_kubba_hamudh', name: 'کفتەی حامز / ترش لەناو شلە', englishName: 'Sour Meatball Soup (Kubba Hamudh)', category: 'kurdish', baseCalories: 135, baseProtein: 8.5, baseCarbs: 14, baseFat: 5, usageCount: 55, icon: <><Utensils size={16} className="inline-block" /></>, units: [{ name: 'کاسە', ratio: 250 }, { name: 'دانە', ratio: 70 }], aliases: ['کفتەی حامز', 'کفتەی ترش', 'كبة حامض'] },
    { id: 'kd_turkey', name: 'قەلی کوڵاو و برژاو (گۆشتی بەوقە)', englishName: 'Roasted Turkey Meat', category: 'protein', baseCalories: 189, baseProtein: 29, baseCarbs: 0, baseFat: 7, usageCount: 48, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 180 }, { name: 'گرام', ratio: 1 }], aliases: ['قەل', 'بەوقە', 'لحم ديك رومي', 'turkey meat'] },
    { id: 'kd_pigeon', name: 'کۆتر / حەمامی برژاو لەسەر خەڵوز', englishName: 'Charcoal Grilled Squab (Pigeon)', category: 'protein', baseCalories: 215, baseProtein: 24, baseCarbs: 0, baseFat: 13, usageCount: 40, icon: <><Drumstick size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 150 }], aliases: ['کۆتر', 'حەمام', 'حمام مشوي'] },
    { id: 'kd_shrimp_grilled', name: 'جەمبەری / ڕۆبیانی برژاو', englishName: 'Grilled Jumbo Shrimp', category: 'protein', baseCalories: 99, baseProtein: 24, baseCarbs: 0.2, baseFat: 0.3, usageCount: 55, icon: <><Fish size={16} className="inline-block" /></>, units: [{ name: 'شیش', ratio: 120 }, { name: 'دانە', ratio: 20 }], aliases: ['جەمبەری', 'ڕۆبیان', 'جمبري مشوي', 'grilled shrimp'] },
    { id: 'kd_shrimp_fried', name: 'جەمبەری سوورکراوە بە پەقسەمات', englishName: 'Crispy Fried Breaded Shrimp', category: 'protein', baseCalories: 240, baseProtein: 18, baseCarbs: 14, baseFat: 12, usageCount: 52, icon: <><Fish size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'دانە', ratio: 25 }], aliases: ['جەمبەری سوورکراوە', 'جمبري مقلي', 'fried shrimp'] },
    { id: 'kd_baba_ghanoush', name: 'بابا غەنوج (باینجانی برژاو)', englishName: 'Baba Ghanoush Eggplant Dip', category: 'kurdish', baseCalories: 90, baseProtein: 2.2, baseCarbs: 8.5, baseFat: 5.5, usageCount: 65, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'کەوچک', ratio: 25 }], aliases: ['بابا غەنوج', 'بابا غنوج', 'baba ghanoush'] },
    { id: 'kd_mutabbal', name: 'موتەبەل بە باینجان و تەحین', englishName: 'Mutabbal Eggplant Dip', category: 'kurdish', baseCalories: 125, baseProtein: 3.2, baseCarbs: 8, baseFat: 9.5, usageCount: 62, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'کەوچک', ratio: 25 }], aliases: ['موتەبەل', 'متبل باذنجان', 'mutabbal'] },
    { id: 'kd_fattoush', name: 'فەتوش بە نانی برژاو و سۆسی هەنار', englishName: 'Fattoush Salad with Sumac', category: 'fruits', baseCalories: 78, baseProtein: 1.8, baseCarbs: 10, baseFat: 3.8, usageCount: 75, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 200 }], aliases: ['فەتوش', 'فتوش', 'fattoush'] },
    { id: 'kd_coleslaw', name: 'زەڵاتەی کۆڵسڵۆ بە مایۆنیز', englishName: 'Coleslaw Salad with Mayo', category: 'fruits', baseCalories: 145, baseProtein: 1.2, baseCarbs: 12, baseFat: 10.5, usageCount: 68, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 150 }, { name: 'کەوچک', ratio: 30 }], aliases: ['کۆڵسڵۆ', 'كولسلو', 'coleslaw'] },
    { id: 'kd_torshi_mixed', name: 'ترشیاتی کوردی و موسڵاوی (مەخلووت)', englishName: 'Traditional Mixed Kurdish Pickles', category: 'fruits', baseCalories: 24, baseProtein: 1.1, baseCarbs: 4.5, baseFat: 0.3, usageCount: 78, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'قاپ', ratio: 100 }, { name: 'کەوچک', ratio: 25 }], aliases: ['ترشیات', 'ترشیاتی کوردی', 'طرشي عراقي', 'torshi'] },
    { id: 'kd_pickles_cucumber', name: 'خەیارشووری عێراقی', englishName: 'Iraqi Pickled Cucumbers', category: 'fruits', baseCalories: 16, baseProtein: 0.8, baseCarbs: 2.8, baseFat: 0.2, usageCount: 72, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'دانە', ratio: 40 }, { name: 'دەستە', ratio: 80 }], aliases: ['خەیارشور', 'خيار مخلل', 'pickles'] },
    { id: 'kd_olives', name: 'زەیتوونی سەوز و ڕەش', englishName: 'Marinated Green & Black Olives', category: 'fruits', baseCalories: 145, baseProtein: 1, baseCarbs: 3.8, baseFat: 15, usageCount: 70, icon: <><Salad size={16} className="inline-block" /></>, units: [{ name: 'دەستە', ratio: 30 }, { name: 'دانە', ratio: 5 }], aliases: ['زەیتوون', 'زيتون', 'olives'] },

    // شیرینی، سووکەژەم، چەرەسات و سۆسەکان (Sweets, Snacks, Nuts & Sauces)
    { id: 'sw_zolbia', name: 'زولابیا (Zolbia)', englishName: 'Zolbia / Jalebi Sweet', category: 'sweets', baseCalories: 380, baseProtein: 2.5, baseCarbs: 76, baseFat: 8, usageCount: 65, icon: <><Cookie size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'دانە', ratio: 35 }, { name: 'قاپ', ratio: 120 }], aliases: ['زولابیا', 'زلەبی', 'زلابية', 'jalebi'] },
    { id: 'sw_datli', name: 'بامیەی شیرین / داتلی', englishName: 'Tulumba Sweet (Datli)', category: 'sweets', baseCalories: 390, baseProtein: 3.2, baseCarbs: 68, baseFat: 12, usageCount: 68, icon: <><Cookie size={16} className="inline-block text-amber-600" /></>, units: [{ name: 'دانە', ratio: 25 }, { name: 'دەستە', ratio: 75 }], aliases: ['بامیەی شیرین', 'دامیە', 'داتلی', 'طلمبة', 'داطلي', 'tulumba'] },
    { id: 'sw_luqaimat', name: 'لوقمە قازی / داوودلی', englishName: 'Luqaimat Sweet Balls', category: 'sweets', baseCalories: 360, baseProtein: 4.5, baseCarbs: 62, baseFat: 10.5, usageCount: 60, icon: <><Cookie size={16} className="inline-block text-amber-500" /></>, units: [{ name: 'دانە', ratio: 20 }, { name: 'دەستە', ratio: 80 }], aliases: ['لوقمە قازی', 'داوودلی', 'لقيمات', 'عوامة', 'luqaimat'] },
    { id: 'sw_muhallabia', name: 'محەلەبی بە شیر و گوڵاو', englishName: 'Muhallabia Milk Pudding', category: 'sweets', baseCalories: 115, baseProtein: 3.2, baseCarbs: 18, baseFat: 3.2, usageCount: 62, icon: <><Milk size={16} className="inline-block text-slate-200" /></>, units: [{ name: 'کاسە', ratio: 180 }], aliases: ['محەلەبی', 'مهلبية', 'muhallabia'] },
    { id: 'sw_custard', name: 'کەستەری زەرد', englishName: 'Yellow Custard Pudding', category: 'sweets', baseCalories: 122, baseProtein: 3, baseCarbs: 20, baseFat: 3.2, usageCount: 65, icon: <><Milk size={16} className="inline-block text-yellow-300" /></>, units: [{ name: 'کاسە', ratio: 180 }], aliases: ['کەستەر', 'كاسترد', 'custard'] },
    { id: 'sw_rice_pudding', name: 'شیربرنج بە دارچینی', englishName: 'Rice Pudding with Cinnamon', category: 'sweets', baseCalories: 130, baseProtein: 3.5, baseCarbs: 22, baseFat: 2.8, usageCount: 58, icon: <><Milk size={16} className="inline-block text-stone-200" /></>, units: [{ name: 'کاسە', ratio: 200 }], aliases: ['شیربرنج', 'رز بحليب', 'rice pudding'] },
    { id: 'sw_halwa_milk', name: 'حەلاوەی شیری بە فستق', englishName: 'Milk Halwa with Pistachio', category: 'sweets', baseCalories: 375, baseProtein: 7.5, baseCarbs: 55, baseFat: 14, usageCount: 55, icon: <><Cookie size={16} className="inline-block text-amber-300" /></>, units: [{ name: 'قاپ', ratio: 100 }, { name: 'پارچە', ratio: 40 }], aliases: ['حەلاوەی شیری', 'حلاوة حليب', 'milk halwa'] },
    { id: 'sw_halwa_tahini', name: 'حەلاوەی تەحین / ڕاشی', englishName: 'Tahini Sesame Halva', category: 'sweets', baseCalories: 516, baseProtein: 12, baseCarbs: 52, baseFat: 30, usageCount: 60, icon: <><Cookie size={16} className="inline-block text-amber-200" /></>, units: [{ name: 'پارچە', ratio: 40 }, { name: 'کەوچک', ratio: 25 }], aliases: ['حەلاوەی تەحین', 'حلاوة طحينية', 'halva'] },
    { id: 'sw_tahini_molasses', name: 'دۆشاو و تەحین (ڕاشی و دۆشاو)', englishName: 'Grape Molasses with Tahini', category: 'sweets', baseCalories: 440, baseProtein: 8.5, baseCarbs: 52, baseFat: 23, usageCount: 72, icon: <><Droplet size={16} className="inline-block text-amber-900" /></>, units: [{ name: 'کەوچک', ratio: 25 }, { name: 'قاپ', ratio: 100 }], aliases: ['دۆشاو و تەحین', 'ڕاشی و دۆشاو', 'دبس وطحينة'] },
    { id: 'sw_ice_cream_kurdish', name: 'دۆندرمەی کوردی / سلێمانی بە سەعلەب', englishName: 'Traditional Mastic Kurdish Ice Cream', category: 'sweets', baseCalories: 215, baseProtein: 4.2, baseCarbs: 26, baseFat: 10.5, usageCount: 75, icon: <><Milk size={16} className="inline-block text-pink-300" /></>, units: [{ name: 'سکۆپ', ratio: 60 }, { name: 'قاپ', ratio: 150 }], aliases: ['دۆندرمە', 'دۆندرمەی سلێمانی', 'موطأ عراقي', 'ice cream'] },
    { id: 'sw_chips', name: 'چپسی پەتاتە بە خوێ (پاکەت)', englishName: 'Potato Salt Chips Pack', category: 'sweets', baseCalories: 536, baseProtein: 7, baseCarbs: 53, baseFat: 34, usageCount: 82, icon: <><Cookie size={16} className="inline-block text-yellow-400" /></>, units: [{ name: 'پاکەت', ratio: 40 }, { name: 'دەستە', ratio: 25 }], aliases: ['چپس', 'چپسی پەتاتە', 'شيبس بطاطا', 'potato chips'] },
    { id: 'sw_popcorn', name: 'پۆپکۆڕن / گەنمەشامی بە کەم ڕۆن', englishName: 'Air-popped Salted Popcorn', category: 'sweets', baseCalories: 387, baseProtein: 12.9, baseCarbs: 77.8, baseFat: 4.5, usageCount: 78, icon: <><Bean size={16} className="inline-block text-amber-200" /></>, units: [{ name: 'کاسە', ratio: 30 }, { name: 'دەستە', ratio: 15 }], aliases: ['پۆپکۆڕن', 'گەنمەشامی', 'فشار', 'popcorn'] },
    { id: 'sw_sunflower_seeds', name: 'تۆوی گوڵەبەڕۆژە بە خوێ', englishName: 'Salted Roasted Sunflower Seeds', category: 'sweets', baseCalories: 584, baseProtein: 20.8, baseCarbs: 20, baseFat: 51.5, usageCount: 80, icon: <><Bean size={16} className="inline-block text-stone-700" /></>, units: [{ name: 'دەستە', ratio: 30 }, { name: 'کەوچک', ratio: 15 }], aliases: ['گوڵەبەڕۆژە', 'تۆوی گوڵەبەڕۆژە', 'حب شمس', 'sunflower seeds'] },
    { id: 'sw_pumpkin_seeds', name: 'دەنکە ترش / تۆوی کولەکە', englishName: 'Roasted Salted Pumpkin Seeds', category: 'sweets', baseCalories: 559, baseProtein: 30.2, baseCarbs: 10.7, baseFat: 49, usageCount: 75, icon: <><Bean size={16} className="inline-block text-stone-300" /></>, units: [{ name: 'دەستە', ratio: 30 }, { name: 'کەوچک', ratio: 15 }], aliases: ['دەنکە ترش', 'تۆوی کولەکە', 'حب قرع', 'حب أبيض', 'pumpkin seeds'] },
    { id: 'sw_peanuts', name: 'فستقی سوودانی / عەبید', englishName: 'Roasted Salted Peanuts', category: 'sweets', baseCalories: 567, baseProtein: 25.8, baseCarbs: 16.1, baseFat: 49.2, usageCount: 75, icon: <><Bean size={16} className="inline-block text-amber-600" /></>, units: [{ name: 'دەستە', ratio: 30 }, { name: 'کەوچک', ratio: 15 }], aliases: ['فستق عەبید', 'فستقی سوودانی', 'فستق سوداني', 'peanuts'] },
    { id: 'sw_cashews', name: 'گازۆ / کاشیو بە سوێری', englishName: 'Roasted Salted Cashews', category: 'sweets', baseCalories: 553, baseProtein: 18.2, baseCarbs: 30.2, baseFat: 43.8, usageCount: 70, icon: <><Bean size={16} className="inline-block text-amber-200" /></>, units: [{ name: 'دەستە', ratio: 30 }, { name: 'کەوچک', ratio: 15 }], aliases: ['گازۆ', 'كاجو', 'cashews'] },
    { id: 'sw_amba', name: 'عەمبەی عێراقی', englishName: 'Iraqi Spicy Mango Amba Sauce', category: 'sweets', baseCalories: 85, baseProtein: 1.2, baseCarbs: 18, baseFat: 0.8, usageCount: 88, icon: <><Droplet size={16} className="inline-block text-yellow-500" /></>, units: [{ name: 'کەوچک', ratio: 15 }], aliases: ['عەمبە', 'عمبة عراقية', 'amba'] },
    { id: 'sw_ketchup', name: 'کەتچەپی تەماتە', englishName: 'Tomato Ketchup', category: 'sweets', baseCalories: 111, baseProtein: 1.3, baseCarbs: 27, baseFat: 0.1, usageCount: 85, icon: <><Droplet size={16} className="inline-block text-red-600" /></>, units: [{ name: 'کەوچک', ratio: 15 }], aliases: ['کەتچەپ', 'كتشب', 'ketchup'] },
    { id: 'sw_mayo', name: 'مایۆنیزی کلاسیک', englishName: 'Classic Creamy Mayonnaise', category: 'sweets', baseCalories: 680, baseProtein: 1, baseCarbs: 0.6, baseFat: 75, usageCount: 82, icon: <><Droplet size={16} className="inline-block text-amber-100" /></>, units: [{ name: 'کەوچک', ratio: 15 }], aliases: ['مایۆنیز', 'مايونيز', 'mayo', 'mayonnaise'] },
    { id: 'sw_mayo_light', name: 'مایۆنیزی لایت / کەم چەوری', englishName: 'Light Low-Fat Mayonnaise', category: 'sweets', baseCalories: 290, baseProtein: 0.8, baseCarbs: 8, baseFat: 28, usageCount: 72, icon: <><Droplet size={16} className="inline-block text-sky-100" /></>, units: [{ name: 'کەوچک', ratio: 15 }], aliases: ['مایۆنیزی لایت', 'مايونيز لايت', 'light mayonnaise'] },
    { id: 'sw_mustard', name: 'خەردەلی زەرد', englishName: 'Yellow Mustard Sauce', category: 'sweets', baseCalories: 66, baseProtein: 4.4, baseCarbs: 5, baseFat: 3.4, usageCount: 65, icon: <><Droplet size={16} className="inline-block text-yellow-600" /></>, units: [{ name: 'کەوچک', ratio: 10 }], aliases: ['خەردەل', 'خردل', 'mustard'] },
    { id: 'sw_pomegranate_molasses', name: 'دۆشاوی هەنار / ڕوب ڕمان', englishName: 'Sour Pomegranate Molasses', category: 'sweets', baseCalories: 260, baseProtein: 0.5, baseCarbs: 65, baseFat: 0, usageCount: 78, icon: <><Droplet size={16} className="inline-block text-rose-950" /></>, units: [{ name: 'کەوچک', ratio: 20 }], aliases: ['دۆشاوی هەنار', 'ڕوب ڕمان', 'دبس رمان', 'pomegranate molasses'] }
  ];

  // ڕێکخستنی زیرەکانەی یەکەی ستاندارد، جیاکردنەوەی گرام و مل، و کێشی ستانداردی هەر خۆراکێک
  const normalizeFoodUnitsAndWeight = (food) => {
    if (!food) return food;
    const rawName = ((food.name || '') + ' ' + (food.englishName || '')).toLowerCase();
    const isLiquid = Boolean(
      food.isLiquid ||
      food.category === 'drinks' ||
      ['prot_shake_8', 'f_olive_oil', 'sw_amba', 'sw_ketchup', 'sw_mayo', 'sw_mayo_light', 'sw_mustard', 'sw_pomegranate_molasses', 'sw_tahini_molasses'].includes(food.id) ||
      rawName.includes('شەربەت') || rawName.includes('شیر') || rawName.includes('دۆ ') || rawName.includes('ئاو') ||
      rawName.includes('قاوە') || rawName.includes('چا ') || rawName.includes('سۆدا') || rawName.includes('پێپسی') ||
      rawName.includes('کۆلا') || rawName.includes('زەیت') || rawName.includes('juice') || rawName.includes('milk') ||
      rawName.includes('water') || rawName.includes('coffee') || rawName.includes('tea') || rawName.includes('drink') ||
      rawName.includes('shake') || rawName.includes('oil')
    );

    const isGrainOrPlateOnly = Boolean(
      rawName.includes('برنج') || rawName.includes('ساوار') || rawName.includes('ساوەر') ||
      rawName.includes('بریانی') || rawName.includes('مەقلووبە') || rawName.includes('شۆڤان') ||
      rawName.includes('پاستا') || rawName.includes('مەعکەرۆنی') || rawName.includes('ماکەرۆنی') ||
      rawName.includes('شلە') || rawName.includes('شۆربا') || rawName.includes('نیسکێنە') ||
      rawName.includes('تەشریب') || rawName.includes('زەڵاتە') || rawName.includes('جاجک') ||
      rawName.includes('تەبوولە') || rawName.includes('حومس') || rawName.includes('پاقلە') ||
      rawName.includes('قیمە') || rawName.includes('لەبلەبی') ||
      rawName.includes('rice') || rawName.includes('bulgur') || rawName.includes('biryani') ||
      rawName.includes('oats') || rawName.includes('oatmeal') || rawName.includes('pasta') ||
      rawName.includes('macaroni') || rawName.includes('stew') || rawName.includes('soup') ||
      rawName.includes('salad')
    );

    const metricUnitName = isLiquid ? 'مل' : 'گرام';
    const existingUnits = Array.isArray(food.units) ? food.units : [];

    // لابردنی یەکەی گرام/مل لە سەرەتا و لابردنی یەکەی نەگونجاو وەک (دانە) بۆ برنج و شلە و خواردنەوە
    const naturalUnits = existingUnits.filter(u => {
      if (!u || !u.name) return false;
      const uName = String(u.name).trim();
      if (uName === 'گرام' || uName === 'g' || uName === 'مل' || uName === 'ml' || u.ratio === 1) return false;
      if ((isGrainOrPlateOnly || isLiquid || food.category === 'protein_powders') && uName === 'دانە') return false;
      return true;
    });

    if (naturalUnits.length === 0) {
      if (isLiquid) {
        naturalUnits.push({ name: 'گڵاس', ratio: 250 }, { name: 'کوپ', ratio: 200 });
      } else if (food.category === 'protein_powders') {
        naturalUnits.push({ name: 'سکۆپ', ratio: 30 });
      } else if (isGrainOrPlateOnly) {
        naturalUnits.push({ name: 'قاپ', ratio: 200 }, { name: 'کەوچک', ratio: 25 });
      } else if (food.category === 'fruits') {
        naturalUnits.push({ name: 'دانە', ratio: 160 });
      } else if (food.category === 'protein') {
        naturalUnits.push({ name: 'پارچە', ratio: 150 }, { name: 'قاپ', ratio: 200 });
      } else {
        naturalUnits.push({ name: 'قاپ', ratio: 200 });
      }
    }

    const standardWeight = Number(food.standardWeight) || Number(naturalUnits[0]?.ratio) || (isLiquid ? 250 : 150);
    const finalUnits = [...naturalUnits, { name: metricUnitName, ratio: 1 }];

    return {
      ...food,
      isLiquid,
      metricUnitName,
      standardWeight,
      units: finalUnits
    };
  };

  const normalizedMasterFoodList = masterFoodList.map(normalizeFoodUnitsAndWeight);

  const filteredFoods = normalizedMasterFoodList.filter(food => {
    const q = searchQuery.trim().toLowerCase();

    // فلتەری بەشەکان: لە کاتی نووسینی گەڕان بە هەموو بەشەکاندا دەگەڕێت بۆ دۆزینەوەی خێرا
    const matchesCat = (q !== '') || selectedCategory === 'all' || 
                       (selectedCategory === 'protein' ? (food.category === 'protein' || food.category === 'protein_powders') : food.category === selectedCategory);
    if (!matchesCat) return false;

    if (!q) return true;

    // سیستەمی لێکدانەوە و ئاسانکاریی گەڕان بۆ هەموو زاراوەکانی کوردی، عەرەبی و ئینگلیزی
    const normalize = str => (str || '')
      .toLowerCase()
      .replace(/[يی]/g, 'ی')
      .replace(/[كک]/g, 'ک')
      .replace(/[ةه]/g, 'ە')
      .replace(/[ۆو]/g, 'و')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .trim();

    const normQ = normalize(q);
    const normName = normalize(food.name);
    const normEng = (food.englishName || '').toLowerCase();
    const aliases = (food.aliases || []).map(a => normalize(a));

    const matchesSearch = normName.includes(normQ) || 
                          normEng.includes(q) ||
                          aliases.some(a => a.includes(normQ) || normQ.includes(a)) ||
                          (normQ.includes('ساوار') && normName.includes('ساوەر')) ||
                          (normQ.includes('ساوەر') && normName.includes('ساوار')) ||
                          (normQ.includes('یاپراخ') && normName.includes('دۆڵمە')) ||
                          (normQ.includes('دۆڵمە') && normName.includes('یاپراخ')) ||
                          (normQ.includes('پاچە') && normName.includes('سەروپێ')) ||
                          (normQ.includes('سەروپێ') && normName.includes('پاچە')) ||
                          (normQ.includes('کفتە') && normName.includes('کوبە')) ||
                          (normQ.includes('کوبە') && normName.includes('کفتە')) ||
                          (normQ.includes('پێپسی') && (normName.includes('بيبسي') || normName.includes('پپسی'))) ||
                          (normQ.includes('بيبسي') && normName.includes('پێپسی')) ||
                          (normQ.includes('کۆلا') && (normName.includes('كولا') || normName.includes('كوكا'))) ||
                          (normQ.includes('گازی') && food.category === 'drinks');

    return matchesSearch;
  });

  const displayedFoods = searchQuery.trim() ? filteredFoods : filteredFoods.slice(0, Math.max(visibleFoodCount, 60));

  // کردنەوەی پەنجەرەی دیاریکردنی ڕێژە بە ستانداردی خۆکاری هەر خۆراکێک
  const openPortionSelector = (rawFood, preferredUnitName = null, preferredQty = null) => {
    const food = normalizeFoodUnitsAndWeight(rawFood);
    const defaultUnits = food.units;

    let initialUnit = defaultUnits[0];
    if (preferredUnitName) {
      const matched = defaultUnits.find(u => u.name === preferredUnitName);
      if (matched) initialUnit = matched;
    }

    const isMetric = (initialUnit.ratio === 1 || initialUnit.name === 'گرام' || initialUnit.name === 'مل' || initialUnit.name === 'g' || initialUnit.name === 'ml');
    const initialQty = preferredQty !== null && preferredQty > 0
      ? preferredQty
      : (isMetric ? (food.standardWeight || 150) : 1);

    setSelectedFoodForPortion(food);
    setPortionUnitObj(initialUnit);
    setPortionQty(initialQty);
    setPortionMealTarget(selectedMealType);
  };

  // پاشەکەوتکردنی ڕێژەی دیاریکراوی خواردن لە ژەمەکەدا
  const handleConfirmAddPortion = () => {
    if (!selectedFoodForPortion) return;
    const food = selectedFoodForPortion;
    const unitRatio = portionUnitObj.ratio || 1;
    const multiplier = (portionQty * unitRatio) / 100;

    const newEntry = {
      id: Date.now(),
      name: food.name,
      englishName: food.englishName,
      calories: Math.round(food.baseCalories * multiplier),
      protein: Math.round(food.baseProtein * multiplier),
      carbs: Math.round(food.baseCarbs * multiplier),
      fat: Math.round(food.baseFat * multiplier),
      quantity: portionQty,
      unit: portionUnitObj.name,
      isEaten: true
    };

    if (food.category === 'protein_powders' || food.isProteinSupplement || food.name.toLowerCase().includes('protein') || food.name.includes('پڕۆتین')) {
      const savedProt = {
        id: food.id,
        name: food.name,
        englishName: food.englishName,
        quantity: portionQty,
        unit: portionUnitObj.name,
        calories: Math.round(food.baseCalories * multiplier),
        protein: Math.round(food.baseProtein * multiplier),
        carbs: Math.round(food.baseCarbs * multiplier),
        fat: Math.round(food.baseFat * multiplier),
        mealTarget: portionMealTarget || 'snack'
      };
      setLastUsedProtein(savedProt);
      setIsProteinWidgetDismissed(false);
      try {
        localStorage.setItem('app_last_used_protein', JSON.stringify(savedProt));
        localStorage.setItem('app_protein_widget_dismissed', 'false');
      } catch (e) {}
    }

    setDietMeals(prev => {
      const newPlan = [...prev];
      if (newPlan[selectedDayIdx]) {
        newPlan[selectedDayIdx] = {
          ...newPlan[selectedDayIdx],
          [portionMealTarget]: [...(newPlan[selectedDayIdx][portionMealTarget] || []), newEntry]
        };
      }
      return newPlan;
    });

    setSelectedFoodForPortion(null);
    setNutritionSubView('meals');
    setHomeSubView('overview');
  };

  const handleQuickAddLastProtein = () => {
    if (!lastUsedProtein) return;
    const targetMeal = lastUsedProtein.mealTarget || 'snack';
    const newEntry = {
      id: Date.now(),
      name: lastUsedProtein.name,
      englishName: lastUsedProtein.englishName,
      calories: lastUsedProtein.calories || 120,
      protein: lastUsedProtein.protein || 24,
      carbs: lastUsedProtein.carbs || 3,
      fat: lastUsedProtein.fat || 1.5,
      quantity: lastUsedProtein.quantity || 1,
      unit: lastUsedProtein.unit || 'سکۆپ',
      isEaten: true
    };

    setDietMeals(prev => {
      const newPlan = [...prev];
      if (newPlan[selectedDayIdx]) {
        newPlan[selectedDayIdx] = {
          ...newPlan[selectedDayIdx],
          [targetMeal]: [...(newPlan[selectedDayIdx][targetMeal] || []), newEntry]
        };
      }
      return newPlan;
    });

    playMealLoggedSound();
    setQuickProteinAddedEffect(true);
    setTimeout(() => {
      setQuickProteinAddedEffect(false);
    }, 1800);
  };

  const handleQuickRemoveLastProtein = () => {
    if (!lastUsedProtein) return;
    const targetMeal = lastUsedProtein.mealTarget || 'snack';

    let removed = false;
    setDietMeals(prev => {
      const newPlan = [...prev];
      const dayMeals = newPlan[selectedDayIdx];
      if (!dayMeals) return prev;

      const mealOrder = [targetMeal, 'snack', 'breakfast', 'lunch', 'dinner'];
      for (const m of mealOrder) {
        const items = dayMeals[m] || [];
        const lastIdx = [...items].reverse().findIndex(it => 
          it && (it.name === lastUsedProtein.name || (it.englishName && it.englishName === lastUsedProtein.englishName))
        );
        if (lastIdx !== -1) {
          const actualIdx = items.length - 1 - lastIdx;
          const updatedItems = [...items];
          updatedItems.splice(actualIdx, 1);
          newPlan[selectedDayIdx] = {
            ...dayMeals,
            [m]: updatedItems
          };
          removed = true;
          break;
        }
      }
      return newPlan;
    });

    if (removed) {
      playQuickRemoveSound();
      setQuickProteinRemovedEffect(true);
      setTimeout(() => {
        setQuickProteinRemovedEffect(false);
      }, 1800);
    }
  };

  const handleDismissProteinWidget = () => {
    setIsProteinWidgetDismissed(true);
    try {
      localStorage.setItem('app_protein_widget_dismissed', 'true');
    } catch (e) {}
  };

  // سیستەمی پێشکەوتووی زیرەکی دەستکرد بۆ دۆزینەوە و دروستکردنی هەر خواردنێک
  const handleAiFindFood = async (queryText) => {
    const query = (queryText || aiCustomInput || searchQuery || '').trim();
    if (!query) {
      setShowAiFoodModal(true);
      return;
    }

    setIsAiProcessing(true);

    try {
      let category = 'kurdish';
      let cal = 180;
      let p = 14;
      let c = 22;
      let f = 6;
      let icon = '✨';
      let isLiquid = false;
      let standardUnit = 'قاپ';
      let standardWeight = 200;
      let foodDisplayName = query;
      let foodEngName = query;

      const q = query.toLowerCase();
      if (q.includes('مریشک') || q.includes('chicken') || q.includes('گۆشت') || q.includes('meat') || q.includes('beef') || q.includes('تۆنە') || q.includes('ماسی')) {
        category = 'protein'; cal = 205; p = 27; c = 2; f = 9; icon = '🍗'; standardUnit = 'پارچە'; standardWeight = 160;
      } else if (q.includes('هێلکە') || q.includes('egg')) {
        category = 'protein'; cal = 143; p = 13; c = 1; f = 10; icon = '🥚'; standardUnit = 'دانە'; standardWeight = 55;
      } else if (q.includes('برنج') || q.includes('شۆڤان') || q.includes('ماکەرۆنی') || q.includes('مەعکەرۆنی') || q.includes('پاستا') || q.includes('ساوار') || q.includes('pasta') || q.includes('rice')) {
        category = 'carbs'; cal = 145; p = 3.5; c = 29; f = 1.8; icon = '🍚'; standardUnit = 'قاپ'; standardWeight = 200;
      } else if (q.includes('هەنار') || q.includes('pomegranate')) {
        category = 'fruits'; cal = 83; p = 1.7; c = 19; f = 1.2; icon = '🍎'; standardUnit = 'دانە'; standardWeight = 250;
      } else if (q.includes('سێو') || q.includes('مۆز') || q.includes('پرتەقاڵ') || q.includes('خەیار') || q.includes('تەماتە') || q.includes('fruit')) {
        category = 'fruits'; cal = 60; p = 1; c = 14; f = 0.3; icon = '🍎'; standardUnit = 'دانە'; standardWeight = 160;
      } else if (q.includes('چای') || q.includes('قاوە') || q.includes('شەربەت') || q.includes('شیر') || q.includes('دۆ') || q.includes('ئاو') || q.includes('کۆلا') || q.includes('پێپسی') || q.includes('drink') || q.includes('juice') || q.includes('milk') || q.includes('coffee')) {
        category = 'drinks'; cal = 48; p = 1.5; c = 10; f = 0.5; icon = '🥤'; isLiquid = true; standardUnit = 'گڵاس'; standardWeight = 250;
      } else if (q.includes('پیتزا') || q.includes('بەرگەر') || q.includes('لەفە') || q.includes('ساندویچ') || q.includes('pizza') || q.includes('burger')) {
        category = 'fastfood'; cal = 265; p = 13; c = 28; f = 12; icon = '🍔'; standardUnit = q.includes('پیتزا') ? 'پارچە' : 'دانە'; standardWeight = q.includes('پیتزا') ? 110 : 200;
      }

      if (typeof window !== 'undefined' && typeof window.callFreeAiTextEngine === 'function' && navigator.onLine !== false) {
        try {
          const aiRaw = await window.callFreeAiTextEngine(
            'You are a Clinical Sports Nutritionist. Return ONLY valid JSON with exact nutritional values per 100g (or 100ml if liquid) and realistic single-serving unit/weight.',
            `Analyze this food: "${query}".
Return ONLY a JSON object with this exact structure:
{
  "name": "Kurdish Sorani name of the food",
  "englishName": "English name",
  "category": "protein | carbs | fruits | drinks | kurdish | fastfood | sweets | protein_powders",
  "isLiquid": false,
  "baseCalories": 165,
  "baseProtein": 12,
  "baseCarbs": 18,
  "baseFat": 5,
  "standardUnit": "دانە | قاپ | گڵاس | پارچە | کەوچک | سکۆپ | شیش | لەفە",
  "standardWeight": 180,
  "icon": "🍽️"
}
Rules:
- Never use "دانە" for rice, grains, stews, soups, salads, or liquids! Use "قاپ" for rice/stews/salads and "گڵاس" for liquids.
- "standardWeight" must be the realistic weight in grams (or ml if liquid) of 1 standardUnit (e.g. 1 Pomegranate = 250g, 1 Plate Rice = 200g, 1 Boiled Egg = 55g, 1 Glass Milk = 250ml).`,
            true
          );
          const cleaned = aiRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
          const fBrace = cleaned.indexOf('{');
          const lBrace = cleaned.lastIndexOf('}');
          if (fBrace !== -1 && lBrace !== -1) {
            const parsed = JSON.parse(cleaned.substring(fBrace, lBrace + 1));
            if (parsed && Number(parsed.baseCalories) >= 0) {
              foodDisplayName = parsed.name || query;
              foodEngName = parsed.englishName || query;
              category = parsed.category || category;
              isLiquid = Boolean(parsed.isLiquid || category === 'drinks');
              cal = Math.round(Number(parsed.baseCalories) || cal);
              p = Math.round((Number(parsed.baseProtein) || 0) * 10) / 10;
              c = Math.round((Number(parsed.baseCarbs) || 0) * 10) / 10;
              f = Math.round((Number(parsed.baseFat) || 0) * 10) / 10;
              icon = parsed.icon || icon;
              if (parsed.standardUnit) standardUnit = parsed.standardUnit;
              if (Number(parsed.standardWeight) > 0) standardWeight = Math.round(Number(parsed.standardWeight));
            }
          }
        } catch (aiErr) {
          console.warn('AI food lookup fallback used:', aiErr);
        }
      }

      const rawAiFood = {
        id: 'ai_' + Date.now(),
        name: foodDisplayName,
        englishName: foodEngName,
        category,
        isLiquid,
        baseCalories: cal,
        baseProtein: p,
        baseCarbs: c,
        baseFat: f,
        standardWeight,
        usageCount: 1,
        icon,
        isAiGenerated: true,
        units: [
          { name: standardUnit, ratio: standardWeight },
          ...(isLiquid ? [{ name: 'مل', ratio: 1 }] : [{ name: 'گرام', ratio: 1 }])
        ]
      };

      const normalizedNewFood = normalizeFoodUnitsAndWeight(rawAiFood);
      setAiCustomFoods(prev => [normalizedNewFood, ...prev]);
      setIsAiProcessing(false);
      setShowAiFoodModal(false);
      setAiCustomInput('');
      openPortionSelector(normalizedNewFood);
    } catch (e) {
      setIsAiProcessing(false);
    }
  };

  const toggleFinishDayWorkout = (idx) => {
    const day = (workoutCourse?.weeklyPlan || [])[idx];
    const exercises = day?.exercises || [];

    if (completedDayIndices.includes(idx)) {
      playUntoggleWorkoutSound();
      setCompletedDayIndices(prev => prev.filter(i => i !== idx));

      // کاتێک تەواوکردنی ڕۆژەکە لادەبات، هەموو سێتەکان بگەڕێنەوە باری ئاسایی (سفر)
      setExerciseLogs(prev => {
        const next = { ...prev };
        exercises.forEach(ex => {
          const exKey = ex.englishName || ex.name;
          const setsCount = Math.min(Number(ex.sets) || 4, 8);
          next[exKey] = Array.from({ length: setsCount }).map((_, sIdx) => ({
            weight: (prev[exKey]?.[sIdx]?.weight) || '',
            reps: (prev[exKey]?.[sIdx]?.reps) || '',
            completed: false
          }));
        });
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('app_exercise_set_logs', JSON.stringify(next));
          }
        } catch (e) {}
        return next;
      });

      setActiveTimerSet(null);
      setRestTimerRunning(false);
      setRestTimerSeconds(0);
    } else {
      playWorkoutFinishedSound();
      setCompletedDayIndices(prev => [...prev, idx]);

      // بە داگرتنی دوگمەکە، هەموو سێتەکان و ڕاهێنانەکانی ئەو ڕۆژە دەبنە سەوز (تەواوبوو)
      setExerciseLogs(prev => {
        const next = { ...prev };
        exercises.forEach(ex => {
          const exKey = ex.englishName || ex.name;
          const setsCount = Math.min(Number(ex.sets) || 4, 8);
          next[exKey] = Array.from({ length: setsCount }).map((_, sIdx) => ({
            weight: (prev[exKey]?.[sIdx]?.weight) || '',
            reps: (prev[exKey]?.[sIdx]?.reps) || '',
            completed: true
          }));
        });
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('app_exercise_set_logs', JSON.stringify(next));
          }
        } catch (e) {}
        return next;
      });

      // کاتێک هەموو ڕاهێنانەکانی ئەو ڕۆژە تەواوکران، کاونتداون دەوەستێت
      setActiveTimerSet(null);
      setRestTimerRunning(false);
      setRestTimerSeconds(0);
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleSaveProfile = () => {
    const base = { ...profile, ...editFormData };
    const autoCalc = calculateScientificGoalByAi(base);
    const updated = { ...base, ...autoCalc };
    setProfile(updated);
    setShowEditProfileModal(false);
  };

  const handleSaveGoal = () => {
    const base = {
      ...profile,
      targetWeight: Number(goalFormData.targetWeight) || profile.targetWeight,
      targetDays: Number(goalFormData.targetDays) || profile.targetDays,
      goal: goalFormData.goal || profile.goal,
      goalPace: goalFormData.goalPace || profile.goalPace || 'normal',
      bodyGoals: goalFormData.bodyGoals || profile.bodyGoals || { enlarge: [], shrink: [] }
    };
    const autoCalc = calculateScientificGoalByAi(base);
    const updated = { ...base, ...autoCalc };
    setProfile(updated);
    setShowGoalModal(false);
  };

  const handleAddHealthCondition = (tag) => {
    const val = tag || newConditionInput.trim();
    if (!val) return;
    if (!profile.healthConditions.includes(val)) {
      const updated = { ...profile, healthConditions: [...profile.healthConditions, val] };
      setProfile(updated);
      setNewConditionInput('');
    }
  };

  const handleRemoveHealthCondition = (cond) => {
    playDeleteSound();
    const updated = { ...profile, healthConditions: profile.healthConditions.filter(c => c !== cond) };
    setProfile(updated);
  };

  // تابەکانی هێڵی خوارەوە - ئاراستە و ڕیزبەندی جێگیرە و ناگۆڕێت بە گۆڕینی زمان
  const tabList = [
    { id: 'profile', label: t('profile'), icon: (act) => <ProfileNavIcon active={act} /> },
    { id: 'nutrition', label: t('nutrition'), icon: (act) => <NutritionNavIcon active={act} /> },
    { id: 'home', label: t('home'), icon: (act) => <HomeNavIcon active={act} /> },
    { id: 'workout', label: t('workout'), icon: (act) => <WorkoutNavIcon active={act} /> },
    { id: 'more', label: t('more'), icon: (act) => <MoreNavIcon active={act} /> }
  ];

  const rawActiveIdx = tabList.findIndex(item => item.id === activeTab);
  const activeTabIdx = rawActiveIdx >= 0 ? rawActiveIdx : 2;
  const notchCenter = (activeTabIdx * 100) + 50;

  // ئەندازەی قەوسکردنی قووڵی لیکوید گلاس - ڕێکخراو بۆ قەبارەی مۆبایل
  const r = 22;
  const c = notchCenter;
  const notchW = 54;
  const notchD = 42;
  const notchStartX = Math.max(c - notchW - 14, r);
  const notchEndX = Math.min(c + notchW + 14, 500 - r);
  const cpLeft = Math.max(c - notchW + 12, notchStartX);
  const cpRight = Math.min(c + notchW - 12, notchEndX);

  const svgCutoutPath = `
    M 0 ${r}
    Q 0 0 ${r} 0
    L ${notchStartX} 0
    C ${cpLeft} 0, ${c - 36} ${notchD}, ${c} ${notchD}
    C ${c + 36} ${notchD}, ${cpRight} 0, ${notchEndX} 0
    L ${500 - r} 0
    Q 500 0 500 ${r}
    L 500 95
    L 0 95
    Z
  `;

  const svgBorderPath = `
    M 0 ${r}
    Q 0 0 ${r} 0
    L ${notchStartX} 0
    C ${cpLeft} 0, ${c - 36} ${notchD}, ${c} ${notchD}
    C ${c + 36} ${notchD}, ${cpRight} 0, ${notchEndX} 0
    L ${500 - r} 0
    Q 500 0 500 ${r}
  `;

  const renderMealJourney = () => {
    return (
      <div style={{ marginBottom: '24px' }}>
        
        {/* ڕۆژەکانی هەفتە بۆ خۆراک */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {((workoutCourse && (workoutCourse?.weeklyPlan || [])) ? (workoutCourse?.weeklyPlan || []) : [
              { dayKey: 'd1', dayName: 'شەممە', isRestDay: false },
              { dayKey: 'd2', dayName: 'یەکشەممە', isRestDay: false },
              { dayKey: 'd3', dayName: 'دووشەممە', isRestDay: false },
              { dayKey: 'd4', dayName: 'سێشەممە', isRestDay: false },
              { dayKey: 'd5', dayName: 'چوارشەممە', isRestDay: false },
              { dayKey: 'd6', dayName: 'پێنجشەممە', isRestDay: false },
              { dayKey: 'd7', dayName: 'هەینی', isRestDay: false }
            ]).map((day, idx) => {
              const isSelected = selectedDayIdx === idx;
              // تەنها بۆ ڕاهێنان سەح دادەنێین لەسەر ڕۆژەکان یان ئەگەر بتەوێت بۆ خۆراکیش بیهێڵیتەوە
              const isCompleted = completedDayIndices.includes(idx);
              return (
                <div 
                  key={day.dayKey}
                  onClick={() => setSelectedDayIdx(idx)}
                  className="liquid-pill"
                  style={{
                    padding: '12px 3px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isCompleted 
                      ? 'var(--accent-glow)' 
                      : (isSelected ? 'var(--accent-gradient)' : 'var(--card-subtle)'),
                    color: isSelected ? '#ffffff' : 'var(--text-main)',
                    border: isCompleted 
                      ? '1.5px solid var(--accent-glow)' 
                      : (isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)'),
                    boxShadow: isCompleted 
                      ? '0 4px 16px var(--accent-glow)' 
                      : (isSelected ? '0 8px 20px var(--accent-glow)' : 'none'),
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: isCompleted ? '#C084FC' : 'inherit' }}>
                    {DAY_SHORT_NAMES[language]?.[idx] || day.dayName.slice(0, 3)}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                    <span>{language === 'en' ? `D${idx+1}` : language === 'ar' ? `ي${idx+1}` : language === 'fa' ? `ر${idx+1}` : `ڕۆژی ${idx+1}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>{t('mealJourney')}</h3>
        
        <div style={{ position: 'relative', paddingRight: isRtl ? '20px' : '0', paddingLeft: isRtl ? '0' : '20px' }}>
          {/* هێڵی ستونی تایملاین */}
          <div style={{ position: 'absolute', right: isRtl ? '8px' : 'auto', left: isRtl ? 'auto' : '8px', top: '16px', bottom: '0', width: '2px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
          
          {[
            { type: 'breakfast', title: t('breakfast') },
            { type: 'lunch', title: t('lunch') },
            { type: 'snack', title: t('snack') },
            { type: 'dinner', title: t('dinner') }
          ].map((meal, index) => {
            const dayMeals = dietMeals[selectedDayIdx] || { breakfast: [], lunch: [], snack: [], dinner: [] };
            const items = dayMeals[meal.type] || [];
            const cals = items.reduce((acc, i) => acc + (i.calories || 0), 0);
            return (
              <div key={meal.type} style={{ position: 'relative', marginBottom: '20px' }}>
                {/* خاڵی سەر تایملاینەکە */}
                <div style={{ position: 'absolute', right: isRtl ? '-24.5px' : 'auto', left: isRtl ? 'auto' : '-24.5px', top: '16px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-primary)', border: '2px solid var(--bg-color)', zIndex: 2 }}></div>
                
                <div className="dark-card" style={{ padding: '16px 18px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '18px' }}>
                  <div className="flex-between" style={{ marginBottom: items.length > 0 ? '12px' : '0', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '15.5px', color: 'var(--text-main)' }}>
                      {meal.title}
                    </div>
                    <div className="liquid-pill" style={{ padding: '4px 12px', fontWeight: '800', fontSize: '12.5px', color: 'var(--text-main)', background: 'var(--accent-glow)' }}>{cals} {t('kcal')}</div>
                  </div>

                  {items.length > 0 ? (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {items.map(item => (
                        <div 
                          key={item.id} 
                          className="liquid-pill"
                          style={{ 
                            padding: '12px 14px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            background: 'var(--card-subtle)',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)', textDecoration: item.isEaten ? 'line-through' : 'none', opacity: item.isEaten ? 0.6 : 1 }}>
                              {getLocalizedFoodName(item, language)}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              <span style={{ color: item.isEaten ? 'var(--text-muted)' : 'var(--color-carbs)', fontWeight: '800' }}>{item.quantity || item.amount} {getLocalizedUnit(item.unit, language)}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px', letterSpacing: '-0.2px', opacity: item.isEaten ? 0.5 : 1 }}>
                              {item.calories} {t('kcal')}
                            </span>
                            
                            <button
                              onClick={() => toggleFoodEaten(meal.type, item.id)}
                              title={item.isEaten ? (currentLangConfig.code === 'en' ? 'Eaten (click to undo)' : currentLangConfig.code === 'ar' ? 'تم تناوله (انقر للإلغاء)' : currentLangConfig.code === 'fa' ? 'خورده شده (برای لغو کلیک کنید)' : 'خوراوە (بۆ پوچەڵکردنەوە کلیک بکە)') : (currentLangConfig.code === 'en' ? 'Mark as eaten for home page' : currentLangConfig.code === 'ar' ? 'تحديد كمأكول للصفحة الرئيسية' : currentLangConfig.code === 'fa' ? 'علامت‌گذاری به عنوان مصرف شده برای صفحه اصلی' : 'دیاریکردن وەک خوراوە بۆ پەڕەی سەرەکی')}
                              style={{
                                background: item.isEaten ? 'var(--accent-gradient)' : 'var(--card-subtle)',
                                border: item.isEaten ? '1.5px solid var(--accent-primary)' : '2px solid var(--border-color)',
                                outline: 'none',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                minWidth: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: item.isEaten ? '0 0 14px var(--accent-glow)' : 'none'
                              }}
                            >
                              {item.isEaten && <Check size={16} color="#ffffff" strokeWidth={3} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('noMealLogged')}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ژەمەکانی سەرەکی بۆ زیادکردنی خواردن (Today's Meals for Logging & Adding Food)
  const renderHomeMeals = () => {
    const mealDefinitions = [
      { type: 'breakfast', title: t('breakfast') },
      { type: 'lunch', title: t('lunch') },
      { type: 'snack', title: t('snack') },
      { type: 'dinner', title: t('dinner') }
    ];

    const currentDayMeals = dietMeals[selectedDayIdx] || { breakfast: [], lunch: [], snack: [], dinner: [] };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', direction: currentLangConfig.dir, paddingBottom: '16px' }}>
        {/* کورتەی کالۆری ئەمڕۆ - شوشەیی و گونجاو لەگەڵ دارک و لایت مۆد */}
        <div style={{ 
          padding: '16px 20px', 
          background: theme === 'light' 
            ? 'linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%)' 
            : 'linear-gradient(135deg, rgba(35, 42, 75, 0.9) 0%, rgba(22, 26, 50, 0.95) 100%)', 
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: theme === 'light' 
            ? '0 6px 20px rgba(15, 23, 42, 0.04), inset 0 1px 0 #ffffff' 
            : '0 6px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
        }}>
          <div className="flex-between" style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '800' }}>{t('totalEatenCals')}</span>
            <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>
              <span style={{ color: 'var(--accent-primary)', fontSize: '16px' }}>{totalEatenCalories}</span> / {profile.goalCalories} {t('kcal')}
            </span>
          </div>
          <div style={{ width: '100%', height: '7px', background: 'var(--circle-track)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((totalEatenCalories / profile.goalCalories) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #9333EA 0%, #3B82F6 50%, #06B6D4 100%)', borderRadius: '4px', transition: 'width 0.3s ease', boxShadow: '0 0 10px rgba(147, 51, 234, 0.5)' }}></div>
          </div>
        </div>

        {/* ٤ ژەمەکە بە دیزاینی شوشەیی بەرزکراوە */}
        {mealDefinitions.map(meal => {
          const rawItems = currentDayMeals[meal.type] || [];
          const mealItems = rawItems.filter(item => item.isEaten);
          const mealCals = mealItems.reduce((acc, i) => acc + (i.calories || 0), 0);
          const mealProtein = mealItems.reduce((acc, i) => acc + (i.protein || 0), 0);

          return (
            <div 
              key={meal.type} 
              className="dark-card" 
              style={{ 
                padding: '18px 20px', 
                background: theme === 'light' 
                  ? 'rgba(255, 255, 255, 0.92)' 
                  : 'linear-gradient(145deg, rgba(32, 38, 66, 0.9) 0%, rgba(20, 24, 44, 0.95) 100%)', 
                borderRadius: '22px', 
                border: '1px solid var(--border-color)',
                boxShadow: theme === 'light' 
                  ? '0 6px 20px rgba(15, 23, 42, 0.05), inset 0 1px 0 #ffffff' 
                  : '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
              }}
            >
              {/* هێڵی سەرەوەی ژەمەکە */}
              <div className="flex-between" style={{ marginBottom: '14px', alignItems: 'center' }}>
                <div style={{ fontWeight: '900', fontSize: '16.5px', color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                  {meal.title}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {mealProtein > 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--color-proteins)', fontWeight: '800', background: 'rgba(56, 189, 248, 0.12)', padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                      {mealProtein}g {t('protein')}
                    </span>
                  )}
                  <span style={{ padding: '6px 14px', fontWeight: '900', fontSize: '13px', color: mealCals > 0 ? 'var(--color-proteins)' : 'var(--accent-primary)', background: 'var(--card-subtle)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 2px 8px var(--accent-glow)' }}>
                    {mealCals} {t('kcal')}
                  </span>
                </div>
              </div>

              {/* لیستی ئەو خواردنانەی لەم ژەمەدان */}
              {mealItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  {mealItems.map(item => (
                    <div 
                      key={item.id} 
                      style={{ 
                        padding: '12px 16px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: theme === 'light' ? 'rgba(241, 245, 249, 0.75)' : 'rgba(38, 44, 76, 0.7)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)' }}>
                          {currentLangConfig.code === 'en' ? (item.englishName || item.name) : item.name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-proteins)', fontWeight: '700', marginTop: '2px' }}>
                          {item.quantity || item.amount || 100} {item.unit || 'g'}
                          {item.protein ? ` • ${item.protein}g ${t('protein')}` : ''}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '14px' }}>
                          {item.calories} {t('kcal')}
                        </span>
                        
                        <button
                          onClick={() => handleRemoveFoodFromMeal(meal.type, item.id)}
                          title={t('delete')}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '10px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#EF4444',
                            padding: 0
                          }}
                        >
                          <Trash2 size={15} color="#EF4444" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', textAlign: 'center' }}>
                  {t('noMealLogged')}
                </div>
              )}

              {/* دوگمەی سەرەکی: زیادکردنی خواردن بۆ ئەم ژەمە */}
              <button
                onClick={() => {
                  setSelectedMealType(meal.type);
                  setHomeMealsModalTab('food_bank');
                }}
                className="liquid-pill"
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent-glow)',
                  borderRadius: '16px',
                  color: 'var(--color-calories)',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 10px var(--accent-glow)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={16} color="var(--color-calories)" strokeWidth={2.5} />
                <span>{t('addFoodTo')} {meal.title}</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFoodBank = () => {
    const foodCategoriesList = [
      { id: 'all', label: t('catAll') },
      { id: 'protein_powders', label: t('catProteinPowders') },
      { id: 'kurdish', label: t('catKurdish') },
      { id: 'fastfood', label: t('catFastFood') },
      { id: 'drinks', label: t('catDrinks') },
      { id: 'protein', label: t('catProtein') },
      { id: 'carbs', label: t('catCarbs') },
      { id: 'fruits', label: t('catFruits') },
      { id: 'sweets', label: t('catSweets') }
    ];

    return (
      <div style={{ direction: currentLangConfig.dir }}>
        {/* پەنجەرەی فلتەری پۆلەکانی خۆراک کاتێک دوگمەی فلتەری سەرەوە دادەگیرێت */}
        {showFoodCategoryFilter && (
          <div className="dark-card" style={{ padding: '14px', marginBottom: '14px', border: '1.5px solid rgba(168, 85, 247, 0.45)', background: 'rgba(24, 28, 48, 0.96)' }}>
            <div className="flex-between" style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#E9D5FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <SlidersHorizontal size={14} color="#C084FC" />
                <span>{currentLangConfig.code === 'en' ? 'Filter by Category' : currentLangConfig.code === 'ar' ? 'تصفية حسب الفئة' : currentLangConfig.code === 'fa' ? 'فیلتر بر اساس دسته‌بندی' : 'فیلتەرکردنی جۆری خۆراک'}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowFoodCategoryFilter(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={15} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {foodCategoriesList.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setShowFoodCategoryFilter(false);
                  }}
                  className="liquid-pill"
                  style={{
                    padding: '7px 13px',
                    borderRadius: '11px',
                    border: selectedCategory === cat.id ? '1.5px solid #C084FC' : '1px solid var(--border-color)',
                    background: selectedCategory === cat.id ? 'linear-gradient(135deg, #9333EA 0%, #6B21A8 100%)' : 'var(--card-subtle)',
                    color: selectedCategory === cat.id ? '#ffffff' : 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* باڕی گەڕان بەیەکگرتوویی لەگەڵ دوگمەی (+) لە تەنیشتی بۆ زیادکردنی خۆراک بە زیرەکی دەستکرد */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={currentLangConfig.code === 'en' ? 'Search' : currentLangConfig.code === 'ar' ? 'بحث' : currentLangConfig.code === 'fa' ? 'جستجو' : 'گەڕان'}
              style={{ width: '100%', padding: '13px 16px', borderRadius: '16px', fontSize: '14px' }}
            />
          </div>

          {/* دوگمەی (+) بۆ کردنەوەی ویندۆی گەڕان و زیادکردنی هەر خۆراکێک بە ئەی ئای */}
          <button
            type="button"
            onClick={() => {
              setAiCustomInput('');
              setShowAiFoodModal(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #9333EA 0%, #6B21A8 100%)',
              color: '#ffffff',
              border: '1.5px solid #C084FC',
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(147, 51, 234, 0.4)',
              flexShrink: 0,
              padding: 0
            }}
            title={t('aiFoodSearch')}
          >
            <Plus size={22} strokeWidth={2.8} color="#ffffff" />
          </button>
        </div>

        {/* دیاریکردنی ژەمی مەبەست بۆ خواردنەکە (بە ڕەنگی مۆر) */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
              {currentLangConfig.code === 'en' ? 'Add to Meal:' : currentLangConfig.code === 'ar' ? 'إضافة إلى وجبة:' : currentLangConfig.code === 'fa' ? 'افزودن به وعده:' : 'زیادکردن بۆ ژەمی:'}
            </span>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                style={{ background: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(192, 132, 252, 0.4)', color: '#E9D5FF', borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <span>{foodCategoriesList.find(c => c.id === selectedCategory)?.label}</span>
                <X size={12} />
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {[
              { id: 'breakfast', label: t('breakfast') },
              { id: 'lunch', label: t('lunch') },
              { id: 'snack', label: t('snack') },
              { id: 'dinner', label: t('dinner') }
            ].map(m => {
              const isSelectedMeal = selectedMealType === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMealType(m.id)}
                  className="liquid-pill"
                  style={{
                    padding: '9px 4px',
                    borderRadius: '12px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: isSelectedMeal ? '1.5px solid #C084FC' : '1px solid rgba(168, 85, 247, 0.45)',
                    background: isSelectedMeal
                      ? 'linear-gradient(135deg, #9333EA 0%, #6B21A8 100%)'
                      : 'rgba(147, 51, 234, 0.16)',
                    color: isSelectedMeal ? '#ffffff' : '#E9D5FF',
                    boxShadow: isSelectedMeal ? '0 4px 14px rgba(147, 51, 234, 0.45)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* لیستی خواردنەکان (بەبێ دووبارەبوونەوەی ناوی خواردن بە سەوزی لە ژێرەوە) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {displayedFoods.map(food => (
            <div 
              key={food.id} 
              onClick={() => openPortionSelector(food)}
              className="dark-card" 
              style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: food.isAiGenerated ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px', display: 'flex', alignItems: 'center' }}>{food.icon}</span>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                    <span>{getLocalizedFoodName(food, language)}</span>
                    {food.isAiGenerated && (
                      <span style={{ fontSize: '10px', background: 'linear-gradient(135deg, #9333EA 0%, #6B21A8 100%)', color: '#ffffff', padding: '1px 6px', borderRadius: '6px', fontWeight: '800' }}>{currentLangConfig.code === 'en' ? 'Smart' : currentLangConfig.code === 'ar' ? 'ذكي' : currentLangConfig.code === 'fa' ? 'هوشمند' : 'زیرەک'}</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: isRtl ? 'left' : 'right', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--color-carbs)' }}>
                    {food.baseCalories} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{food.isLiquid ? (currentLangConfig.code === 'en' ? 'kcal/100ml' : 'کال/١٠٠مل') : t('calPer100')}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    <Beef size={14} className="inline-block" /> {food.baseProtein}g • <Wheat size={14} className="inline-block" /> {food.baseCarbs}g
                  </div>
                </div>

                {food.isAiGenerated ? (
                  <button
                    onClick={(e) => handleDeleteCustomAiFood(e, food.id)}
                    title={currentLangConfig.code === 'en' ? 'Delete this food from your list' : currentLangConfig.code === 'ar' ? 'حذف هذه الوجبة من قائمتك' : currentLangConfig.code === 'fa' ? 'حذف این غذا از لیست شما' : 'سڕینەوەی ئەم خواردنە لە لیستەکەت'}
                    style={{ background: 'transparent', border: 'none', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', cursor: 'pointer', opacity: 0.85 }}
                  >
                    <TrashIcon size={16} color="#EF4444" />
                  </button>
                ) : (
                  <span className="liquid-pill" style={{ color: '#D8B4FE', border: '1px solid rgba(168, 85, 247, 0.4)', background: 'rgba(147, 51, 234, 0.15)', padding: '6px 10px', fontSize: '11px', fontWeight: '800' }}>
                    {currentLangConfig.code === 'en' ? '+ Portion' : currentLangConfig.code === 'ar' ? '+ تحديد الكمية' : currentLangConfig.code === 'fa' ? '+ مقدار' : '+ کێشان'}
                  </span>
                )}
              </div>
            </div>
          ))}
          {displayedFoods.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--card-subtle)', borderRadius: '20px', border: '1px dashed var(--border-color)', margin: '10px 0 20px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
              <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)', marginBottom: '6px' }}>
                {currentLangConfig.code === 'en' ? 'Food not found in database' : currentLangConfig.code === 'ar' ? 'لم يتم العثور على هذا الطعام' : currentLangConfig.code === 'fa' ? 'غذا در پایگاه داده یافت نشد' : 'ئەم خواردنە لە لیستدا نەدۆزرایەوە'}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
                {currentLangConfig.code === 'en' ? 'Click below to let the AI calculate the exact nutritional macros and add it instantly!' : currentLangConfig.code === 'ar' ? 'اضغط بالأسفل لتقوم ميزة الذكاء الاصطناعي بحساب السعرات والماكروز بدقة وإضافتها!' : currentLangConfig.code === 'fa' ? 'روی دکمه زیر کلیک کنید تا هوش مصنوعی ماکروها را محاسبه و فورا اضافه کند!' : 'کلیک لەسەر دوگمەی خوارەوە بکە تا سیستەم بە وردی کالۆری و پێکهاتەکەی هەژمار بکات و ڕاستەوخۆ زیادی بکات!'}
              </p>
              <button
                type="button"
                onClick={() => handleAiFindFood(searchQuery)}
                style={{
                  background: 'var(--accent-gradient)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px var(--accent-glow)'
                }}
              >
                <Sparkles size={16} color="#ffffff" />
                <span>{currentLangConfig.code === 'en' ? `Calculate "${searchQuery || ''}" with AI` : currentLangConfig.code === 'ar' ? `حساب "${searchQuery || ''}" بالذكاء الاصطناعي` : currentLangConfig.code === 'fa' ? `محاسبه "${searchQuery || ''}" با هوش مصنوعی` : `هەژمارکردنی "${searchQuery || ''}" بە زیرەکی دەستکرد`}</span>
              </button>
            </div>
          )}
        </div>

        {visibleFoodCount < filteredFoods.length && !searchQuery.trim() && (
          <button 
            onClick={() => setVisibleFoodCount(prev => prev + 20)}
            style={{ width: '100%', padding: '14px', background: 'var(--accent-gradient)', color: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', marginBottom: '8px', backdropFilter: 'blur(15px)', boxShadow: '0 0 25px var(--accent-glow)' }}
          >
            {t('showMore')}
          </button>
        )}

        {visibleFoodCount > 15 && !searchQuery.trim() && (
          <button 
            onClick={() => setVisibleFoodCount(15)}
            className="liquid-pill"
            style={{ width: '100%', padding: '12px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
          >
            {t('resetFive')}
          </button>
        )}
      </div>
    );
  };

  const changeColorTheme = (newColorTheme) => {
    setColorTheme(newColorTheme);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_color_theme', newColorTheme);
      }
    } catch (e) {}
  };
  
  // Calculate active color theme safely
  const activeColorTheme = colorTheme === 'system' ? (
    (profile && (profile.gender === 'female' || profile.gender === 'مێ' || profile.gender === 'ئافرەت')) ? 'pink' : 'default'
  ) : colorTheme;

  return (
    <div className={`app-container ${theme === 'light' ? 'light-theme' : 'dark-theme'}`} data-color-theme={activeColorTheme !== 'default' ? activeColorTheme : undefined} dir={currentLangConfig.dir} suppressHydrationWarning>

      {/* ڕووناکی و درەوشاوەیی پاشبنەمای شوشەیی */}
      <div className="liquid-mesh-blob blob-1"></div>
      <div className="liquid-mesh-blob blob-2"></div>
      <div className="liquid-mesh-blob blob-3"></div>
      <div className="liquid-mesh-blob blob-4"></div>

      {/* ONBOARDING FLOW */}
      {!hasCompletedOnboarding ? (
        <div className="app-scroll-view" style={{ flex: 1, padding: '14px 16px 32px 16px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, direction: currentLangConfig.dir }}>
          {/* دوگمەکانی گۆڕینی زمان و مۆدی تاریک/ڕووناک لە سەرەوە */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'ltr', width: '100%', maxWidth: '480px', margin: '0 auto 16px auto', position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                changeTheme(theme === 'dark' ? 'light' : 'dark');
                if (typeof playSparkleSound === 'function') playSparkleSound();
              }}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--card-subtle)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              title={theme === 'dark' ? t('lightMode') : t('darkMode')}
            >
              {theme === 'dark' ? <Moon size={18} style={{ color: '#FBBF24' }} /> : <Sun size={18} style={{ color: '#F59E0B' }} />}
            </button>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowOnboardingLangDropdown(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '20px',
                  background: 'var(--card-subtle)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Globe size={15} style={{ color: 'var(--accent-primary)' }} />
                <span>{currentLangConfig.name}</span>
                <ChevronDown size={14} style={{ opacity: 0.7, transform: showOnboardingLangDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {showOnboardingLangDropdown && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '6px',
                    minWidth: '150px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  {SUPPORTED_LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        changeLanguage(l.code);
                        setShowOnboardingLangDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: language === l.code ? 'var(--accent-gradient)' : 'transparent',
                        color: language === l.code ? '#ffffff' : 'var(--text-main)',
                        fontSize: '12.5px',
                        fontWeight: language === l.code ? '800' : '600',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <span>{l.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>{t('welcomeTitle')}</h1>
            </div>

            <div className="dark-card" style={{ padding: '24px' }}>
              {onboardingStep === 1 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: 'var(--accent-primary)' }}>{t('stepGenderAge')}</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '800' }}>{t('name')}</label>
                    <input 
                      type="text" 
                      value={onboardingData.name} 
                      onChange={e => setOnboardingData({...onboardingData, name: e.target.value})}
                      className="liquid-pill"
                      placeholder={`${t('name')}...`}
                      style={{ width: '100%', padding: '14px', fontSize: '15px', color: 'var(--text-main)', background: 'var(--card-subtle)', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '800' }}>{t('dob')}</label>
                    <div 
                      onClick={() => setShowCustomDatePicker(true)}
                      className="liquid-pill"
                      style={{ 
                        width: '100%', 
                        padding: '14px', 
                        fontSize: '15px', 
                        color: onboardingData.dob ? '#fff' : 'var(--border-color)', 
                        background: 'var(--card-subtle)', 
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{onboardingData.dob || 'YYYY/MM/DD'}</span>
                      <span><Calendar size={16} className="inline-block" /></span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '800' }}>{t('gender')}</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        type="button"
                        onClick={() => setOnboardingData({...onboardingData, gender: 'male'})}
                        className="liquid-pill"
                        style={{ flex: 1, padding: '12px', background: onboardingData.gender === 'male' ? 'linear-gradient(135deg, #3B82F6, #06B6D4)' : 'var(--card-subtle)', color: onboardingData.gender === 'male' ? '#ffffff' : 'var(--text-main)', border: onboardingData.gender === 'male' ? 'none' : '1px solid var(--border-color)', fontWeight: '800', cursor: 'pointer' }}
                      >{t('male')}</button>
                      <button 
                        type="button"
                        onClick={() => setOnboardingData({...onboardingData, gender: 'female'})}
                        className="liquid-pill"
                        style={{ flex: 1, padding: '12px', background: onboardingData.gender === 'female' ? 'linear-gradient(135deg, #EC4899, #8B5CF6)' : 'var(--card-subtle)', color: onboardingData.gender === 'female' ? '#ffffff' : 'var(--text-main)', border: onboardingData.gender === 'female' ? 'none' : '1px solid var(--border-color)', fontWeight: '800', cursor: 'pointer' }}
                      >{t('female')}</button>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: 'var(--accent-primary)' }}>{t('stepWeightHeight')}</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '800' }}>{t('weight')} ({t('kg')})</label>
                    <input 
                      type="number" 
                      value={onboardingData.weight === '' || onboardingData.weight === 0 ? '' : onboardingData.weight} 
                      onChange={e => {
                        const val = e.target.value;
                        setOnboardingData({...onboardingData, weight: val === '' ? '' : Number(val)});
                      }}
                      placeholder="75"
                      className="liquid-pill"
                      style={{ width: '100%', padding: '14px', fontSize: '15px', color: 'var(--text-main)', background: 'var(--card-subtle)', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '800' }}>{t('height')} ({t('cm')})</label>
                    <input 
                      type="number" 
                      value={onboardingData.height === '' || onboardingData.height === 0 ? '' : onboardingData.height} 
                      onChange={e => {
                        const val = e.target.value;
                        setOnboardingData({...onboardingData, height: val === '' ? '' : Number(val)});
                      }}
                      placeholder="175"
                      className="liquid-pill"
                      style={{ width: '100%', padding: '14px', fontSize: '15px', color: 'var(--text-main)', background: 'var(--card-subtle)', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: 'var(--accent-primary)' }}>{t('stepGoal')}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {[
                      { raw: 'زیادکردنی بارستەی ماسولکە', label: t('goalBulk') },
                      { raw: 'دابەزاندنی کێش و چەوری', label: t('goalCut') },
                      { raw: 'جێگیرکردنی کێش', label: t('goalMaintain') }
                    ].map(g => (
                      <div 
                        key={g.raw}
                        onClick={() => setOnboardingData({...onboardingData, goal: g.raw})}
                        className="liquid-pill"
                        style={{ 
                          padding: '14px', 
                          cursor: 'pointer',
                          background: onboardingData.goal === g.raw ? 'var(--accent-gradient)' : 'var(--card-subtle)',
                          border: onboardingData.goal === g.raw ? 'none' : '1px solid var(--border-color)',
                          color: onboardingData.goal === g.raw ? '#ffffff' : 'var(--text-main)',
                          fontWeight: '800'
                        }}
                      >
                        {g.label}
                      </div>
                    ))}
                  </div>
                  {onboardingData.goal !== 'جێگیرکردنی کێش' && (
                    <div style={{ marginBottom: '8px' }} className="fade-in">
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '800' }}>{t('targetWeight')} ({t('kg')})</label>
                      <input 
                        type="number" 
                        value={onboardingData.targetWeight === '' || onboardingData.targetWeight === 0 ? '' : onboardingData.targetWeight} 
                        onChange={e => {
                          const val = e.target.value;
                          setOnboardingData({...onboardingData, targetWeight: val === '' ? '' : Number(val)});
                        }}
                        placeholder="70"
                        className="liquid-pill"
                        style={{ width: '100%', padding: '14px', fontSize: '15px', color: 'var(--text-main)', background: 'var(--card-subtle)', border: '1px solid var(--border-color)' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {onboardingStep === 4 && (
                <div className="fade-in">
                  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: 'var(--accent-primary)' }}>{t('stepInjuries')}</h3>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '800' }}>{t('healthStatus')}</label>
                    <input 
                      type="text" 
                      value={onboardingData.healthConditions.join(', ')} 
                      onChange={e => {
                        const val = e.target.value;
                        setOnboardingData({...onboardingData, healthConditions: val ? [val] : []});
                      }}
                      className="liquid-pill"
                      placeholder="Back pain, Knee, None..."
                      style={{ width: '100%', padding: '14px', fontSize: '15px', color: 'var(--text-main)', background: 'var(--card-subtle)', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                </div>
              )}

              {onboardingStep === 5 && (
                <div className="fade-in">
                  <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '18px',
                      background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
                      border: '1.5px solid rgba(168, 85, 247, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                      color: '#C084FC',
                      boxShadow: '0 6px 20px rgba(147, 51, 234, 0.25)'
                    }}>
                      <Pill size={28} />
                    </div>
                    <h3 style={{ fontSize: '19px', fontWeight: '900', marginBottom: '8px', color: 'var(--text-main)' }}>
                      {currentLangConfig.code === 'en' ? 'Do you use supplements?' : currentLangConfig.code === 'ar' ? 'هل تستخدم المكملات الغذائية؟' : currentLangConfig.code === 'fa' ? 'آیا مکمل مصرف می‌کنید؟' : 'ئایا سەپلیمێنت بەکاردێنی؟'}
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                      {currentLangConfig.code === 'en'
                        ? 'Select any protein, pre-workout, vitamin, medication, or hormone you use so the AI system adapts your nutrition, water, and workout plan.'
                        : 'پڕۆتین، تاقە، ڤیتامین، دەرمان یان هۆرمۆن دیاری بکە تا بەرنامەکە خشتەی خۆراک و ئاو و کۆرسی ڕاهێنانەکەت ڕێکبخات.'}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingData(prev => ({ ...prev, usesSupplements: true }));
                        setSupplementsModalSource('onboarding');
                        setShowSupplementsModal(true);
                      }}
                      className="liquid-pill"
                      style={{
                        padding: '16px 12px',
                        borderRadius: '16px',
                        fontSize: '15px',
                        fontWeight: '900',
                        cursor: 'pointer',
                        border: onboardingData.usesSupplements === true ? '2px solid #C084FC' : '1px solid var(--border-color)',
                        background: onboardingData.usesSupplements === true
                          ? 'linear-gradient(135deg, #9333EA 0%, #4F46E5 100%)'
                          : 'var(--card-subtle)',
                        color: onboardingData.usesSupplements === true ? '#ffffff' : 'var(--text-main)',
                        boxShadow: onboardingData.usesSupplements === true ? '0 6px 20px rgba(147, 51, 234, 0.4)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>✅ {currentLangConfig.code === 'en' ? 'Yes' : currentLangConfig.code === 'ar' ? 'نعم' : currentLangConfig.code === 'fa' ? 'بله' : 'بەڵێ'}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', opacity: 0.85 }}>
                        {currentLangConfig.code === 'en' ? 'Select Supplements' : 'دیاریکردنی سەپلیمێنتەکان'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const finalWeight = Number(onboardingData.weight) || 75;
                        const finalHeight = Number(onboardingData.height) || 175;
                        const finalAge = Number(onboardingData.age) || 22;
                        const finalTargetWeight = onboardingData.goal === 'جێگیرکردنی کێش'
                          ? finalWeight
                          : (Number(onboardingData.targetWeight) || (onboardingData.goal.includes('زیادکردن') ? finalWeight + 5 : Math.max(45, finalWeight - 5)));
                        const base = {
                          ...onboardingData,
                          usesSupplements: false,
                          supplements: [],
                          weight: finalWeight,
                          height: finalHeight,
                          age: finalAge,
                          targetWeight: finalTargetWeight,
                          name: onboardingData.name || (currentLangConfig.code === 'en' ? 'Athlete' : 'یاریزان'),
                          targetDays: 45,
                          availableDaysPerWeek: 4,
                          trainingLocation: 'gym',
                          activityLevel: 'active'
                        };
                        const autoCalc = calculateScientificGoalByAi(base);
                        const updated = { ...base, ...autoCalc, goalSugar: 35 };
                        setProfile(updated);
                        setWorkoutCourse(null);
                        const emptyDiet = Array(7).fill(null).map(() => ({ breakfast: [], lunch: [], snack: [], dinner: [] }));
                        setDietMeals(emptyDiet);
                        try {
                          localStorage.setItem('app_profile', JSON.stringify(updated));
                          localStorage.removeItem('app_workout_course');
                          localStorage.setItem('app_diet_meals', JSON.stringify(emptyDiet));
                        } catch (e) {}
                        setHasCompletedOnboarding(true);
                      }}
                      className="liquid-pill"
                      style={{
                        padding: '16px 12px',
                        borderRadius: '16px',
                        fontSize: '15px',
                        fontWeight: '900',
                        cursor: 'pointer',
                        border: onboardingData.usesSupplements === false ? '2px solid #38BDF8' : '1px solid var(--border-color)',
                        background: onboardingData.usesSupplements === false
                          ? 'rgba(56, 189, 248, 0.2)'
                          : 'var(--card-subtle)',
                        color: 'var(--text-main)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>❌ {currentLangConfig.code === 'en' ? 'No' : currentLangConfig.code === 'ar' ? 'لا' : currentLangConfig.code === 'fa' ? 'خیر' : 'نەخێر'}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', opacity: 0.75 }}>
                        {currentLangConfig.code === 'en' ? 'Enter App Directly' : 'چوونە ناو بەرنامە'}
                      </span>
                    </button>
                  </div>

                  {Array.isArray(onboardingData.supplements) && onboardingData.supplements.length > 0 && (
                    <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(147, 51, 234, 0.12)', border: '1px solid rgba(168, 85, 247, 0.35)', marginBottom: '8px' }}>
                      <div className="flex-between" style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#E9D5FF' }}>
                          {currentLangConfig.code === 'en' ? `Selected (${onboardingData.supplements.length}):` : `دیاریکراوەکان (${onboardingData.supplements.length}):`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSupplementsModalSource('onboarding');
                            setShowSupplementsModal(true);
                          }}
                          style={{ background: 'none', border: 'none', color: '#C084FC', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer' }}
                        >
                          + {currentLangConfig.code === 'en' ? 'Edit / Add More' : 'دەستکاری / زیادکردن'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {onboardingData.supplements.map(s => (
                          <span key={s} style={{ fontSize: '11.5px', fontWeight: '800', padding: '4px 10px', borderRadius: '10px', background: 'rgba(147, 51, 234, 0.3)', color: '#ffffff', border: '1px solid rgba(192, 132, 252, 0.4)' }}>
                            💊 {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* دوگمەی نێکست و پێشوو - ڕاستەوخۆ لە ژێر فۆڕمەکە بەبێ بۆشایی زیادە */}
              <div style={{ marginTop: '22px', display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '18px' }}>
                {onboardingStep > 1 && (
                  <button 
                    type="button"
                    onClick={() => setOnboardingStep(prev => prev - 1)}
                    className="liquid-pill"
                    style={{ padding: '14px', background: 'var(--card-subtle)', color: 'var(--text-main)', fontWeight: '800', border: '1px solid var(--border-color)', flex: 1, cursor: 'pointer' }}
                  >{t('prevStep')}</button>
                )}
                <button 
                  type="button"
                  onClick={() => {
                    if (onboardingStep < 5) {
                      setOnboardingStep(prev => prev + 1);
                    } else {
                      const finalWeight = Number(onboardingData.weight) || 75;
                      const finalHeight = Number(onboardingData.height) || 175;
                      const finalAge = Number(onboardingData.age) || 22;
                      const finalTargetWeight = onboardingData.goal === 'جێگیرکردنی کێش'
                        ? finalWeight
                        : (Number(onboardingData.targetWeight) || (onboardingData.goal.includes('زیادکردن') ? finalWeight + 5 : Math.max(45, finalWeight - 5)));
                      const base = {
                        ...onboardingData,
                        supplements: Array.isArray(onboardingData.supplements) ? onboardingData.supplements : [],
                        weight: finalWeight,
                        height: finalHeight,
                        age: finalAge,
                        targetWeight: finalTargetWeight,
                        name: onboardingData.name || (currentLangConfig.code === 'en' ? 'Athlete' : 'یاریزان'),
                        targetDays: 45,
                        availableDaysPerWeek: 4,
                        trainingLocation: 'gym',
                        activityLevel: 'active'
                      };
                      const autoCalc = calculateScientificGoalByAi(base);
                      const updated = { ...base, ...autoCalc, goalSugar: 35 };
                      setProfile(updated);
                      setWorkoutCourse(null);
                      const emptyDiet = Array(7).fill(null).map(() => ({ breakfast: [], lunch: [], snack: [], dinner: [] }));
                      setDietMeals(emptyDiet);
                      try {
                        localStorage.setItem('app_profile', JSON.stringify(updated));
                        localStorage.removeItem('app_workout_course');
                        localStorage.setItem('app_diet_meals', JSON.stringify(emptyDiet));
                      } catch (e) {}
                      setHasCompletedOnboarding(true);
                    }
                  }}
                  className="liquid-pill"
                  style={{ padding: '14px', background: 'var(--accent-gradient)', color: '#ffffff', fontWeight: '900', border: 'none', flex: 2, boxShadow: '0 4px 15px var(--accent-glow)', cursor: 'pointer', fontSize: '15px' }}
                >{onboardingStep === 5 ? t('completeOnboarding') : t('nextStep')}</button>
              </div>
            </div>
          </div>

          {showCustomDatePicker && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end'
            }}>
              <div className="fade-in-up" style={{ background: 'var(--card-bg)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', paddingBottom: '40px', borderTop: '1px solid var(--border-color)', boxShadow: '0 -10px 40px rgba(0,0,0,0.3)' }}>
                <style dangerouslySetInnerHTML={{__html: '.hide-scroll::-webkit-scrollbar { display: none; } .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }'}} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <button onClick={() => setShowCustomDatePicker(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '15px', cursor: 'pointer' }}>
                    {t('cancel') || (currentLangConfig.code === 'en' ? 'Cancel' : currentLangConfig.code === 'ar' ? 'إلغاء' : currentLangConfig.code === 'fa' ? 'لغو' : 'بەتاڵکردنەوە')}
                  </button>
                  <button 
                    onClick={() => {
                      const dobStr = `${pickerYear}-${pickerMonth.toString().padStart(2, '0')}-${pickerDay.toString().padStart(2, '0')}`;
                      const calculatedAge = new Date().getFullYear() - pickerYear;
                      setOnboardingData({...onboardingData, dob: dobStr, age: calculatedAge});
                      setShowCustomDatePicker(false);
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {t('confirm') || (currentLangConfig.code === 'en' ? 'Done' : currentLangConfig.code === 'ar' ? 'تأكيد' : currentLangConfig.code === 'fa' ? 'تأیید' : 'دیاریکردن')}
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '15px', fontWeight: 'bold' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>{currentLangConfig.code === 'en' ? 'Day' : currentLangConfig.code === 'ar' ? 'اليوم' : currentLangConfig.code === 'fa' ? 'روز' : 'ڕۆژ'}</div>
                  <div style={{ flex: 1.5, textAlign: 'center' }}>{currentLangConfig.code === 'en' ? 'Month' : currentLangConfig.code === 'ar' ? 'الشهر' : currentLangConfig.code === 'fa' ? 'ماه' : 'مانگ'}</div>
                  <div style={{ flex: 1, textAlign: 'center' }}>{currentLangConfig.code === 'en' ? 'Year' : currentLangConfig.code === 'ar' ? 'السنة' : currentLangConfig.code === 'fa' ? 'سال' : 'ساڵ'}</div>
                </div>

                <div style={{ display: 'flex', gap: '10px', height: '220px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: '44px', background: 'var(--card-subtle)', borderRadius: '12px', pointerEvents: 'none' }} />
                  
                  <div 
                    className="hide-scroll" 
                    style={{ flex: 1, overflowY: 'auto', textAlign: 'center', scrollSnapType: 'y mandatory', padding: '88px 0' }}
                    onScroll={e => {
                      const idx = Math.round(e.target.scrollTop / 44);
                      const val = idx + 1;
                      if(val >= 1 && val <= 31) setPickerDay(val);
                    }}
                  >
                    {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                      <div key={d} style={{ height: '44px', lineHeight: '44px', scrollSnapAlign: 'center', fontSize: pickerDay === d ? '26px' : '18px', fontWeight: pickerDay === d ? 'bold' : 'normal', color: pickerDay === d ? 'var(--text-main)' : 'var(--text-muted)', transition: '0.2s' }}>{d}</div>
                    ))}
                  </div>
                  <div 
                    className="hide-scroll" 
                    style={{ flex: 1.5, overflowY: 'auto', textAlign: 'center', scrollSnapType: 'y mandatory', padding: '88px 0' }}
                    onScroll={e => {
                      const idx = Math.round(e.target.scrollTop / 44);
                      const val = idx + 1;
                      if(val >= 1 && val <= 12) setPickerMonth(val);
                    }}
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                      const monthList = currentLangConfig.code === 'en'
                        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                        : currentLangConfig.code === 'ar'
                        ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
                        : currentLangConfig.code === 'fa'
                        ? ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر']
                        : ['کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەمموز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'];
                      return (
                        <div key={m} style={{ height: '44px', lineHeight: '44px', scrollSnapAlign: 'center', fontSize: pickerMonth === m ? '26px' : '18px', fontWeight: pickerMonth === m ? 'bold' : 'normal', color: pickerMonth === m ? 'var(--text-main)' : 'var(--text-muted)', transition: '0.2s' }}>
                          {m} <span style={{ fontSize: '13px', opacity: 0.8, marginRight: '4px' }}>{monthList[m-1]}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div 
                    className="hide-scroll" 
                    style={{ flex: 1, overflowY: 'auto', textAlign: 'center', scrollSnapType: 'y mandatory', padding: '88px 0' }}
                    onScroll={e => {
                      const idx = Math.round(e.target.scrollTop / 44);
                      const val = new Date().getFullYear() - idx;
                      if(idx >= 0 && idx < 100) setPickerYear(val);
                    }}
                  >
                    {Array.from({length: 100}, (_, i) => new Date().getFullYear() - i).map(y => (
                      <div key={y} style={{ height: '44px', lineHeight: '44px', scrollSnapAlign: 'center', fontSize: pickerYear === y ? '26px' : '18px', fontWeight: pickerYear === y ? 'bold' : 'normal', color: pickerYear === y ? 'var(--text-main)' : 'var(--text-muted)', transition: '0.2s' }}>{y}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <main
            className="app-scroll-view"
            style={{
              overflowY: ((activeTab === 'more' || activeTab === 'ai') && moreActiveTab === 'coach') ? 'hidden' : 'auto',
              display: ((activeTab === 'more' || activeTab === 'ai') && moreActiveTab === 'coach') ? 'flex' : 'block',
              flexDirection: 'column'
            }}
          >
          {/* ١. پەڕەی سەرەکی (Home View) */}
          {activeTab === 'home' && (
        <div style={{ position: 'relative', zIndex: 1, padding: '10px 14px 16px 14px', direction: currentLangConfig.dir }}>
              <header className="flex-between" style={{ marginBottom: '12px' }}>
                <div onClick={() => setActiveTab('profile')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <ProfilePic gender={profile.gender} />
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '-0.3px' }}>{getLocalizedAthleteName(profile.name, language)}</h2>
                  </div>
            </div>
            
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* دوگمەی دارک مۆد / لایت مۆد - ڕۆژ و مانگ بەپێی دۆخەکە بە گۆڕینی ڕاستەوخۆ */}
              <button 
                type="button"
                onClick={() => {
                  changeTheme(theme === 'dark' ? 'light' : 'dark');
                  if (typeof playSparkleSound === 'function') playSparkleSound();
                }} 
                className="liquid-pill"
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  padding: 0, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--text-main)',
                  transition: 'all 0.25s ease'
                }}
                title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              >
                {theme === 'dark' ? (
                  <Moon size={18} style={{ color: '#FBBF24', transition: 'transform 0.25s ease' }} />
                ) : (
                  <Sun size={18} style={{ color: '#F59E0B', transition: 'transform 0.25s ease' }} />
                )}
              </button>

              <button 
                onClick={() => setShowSettingsModal(true)} 
                className="liquid-pill"
                style={{ width: '36px', height: '36px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}
                title={t('settings')}
              >
                <SettingsIcon size={18} />
              </button>

              <button 
                onClick={() => setShowNotificationsModal(true)} 
                className="liquid-pill"
                style={{ width: '36px', height: '36px', padding: 0, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}
                title={t('notifications')}
              >
                <BellIcon size={18} />
                {hasUnreadNotifications && (
                  <div style={{ position: 'absolute', top: '7px', right: '7px', width: '7px', height: '7px', background: '#38BDF8', borderRadius: '50%' }}></div>
                )}
              </button>
            </div>
          </header>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800' }}>{t('dailyNutrition')}</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            
            {/* چارتی سەرەکی و زۆر گەورەی کالۆری (Large Hero Calorie Chart - Starts at Top 12 o'clock & Only Excess Ratio/Stroke is Green/Red) */}
            {(() => {
              const isOverCalorie = totalEatenCalories > profile.goalCalories;
              const overCalorieAmount = Math.max(totalEatenCalories - profile.goalCalories, 0);
              const percent = Math.round((totalEatenCalories / profile.goalCalories) * 100);
              const strokePercent = Math.min(percent, 100);
              const excessPercent = isOverCalorie ? Math.min(((totalEatenCalories - profile.goalCalories) / profile.goalCalories) * 100, 100) : 0;
              
              // ئایا ئامانجی یاریزان زیادکردنی کێش یان بارستەی ماسولکەیە؟
              const isWeightGainGoal = (profile.targetWeight > profile.weight) || 
                (profile.goal && (
                  profile.goal.toLowerCase().includes('bulk') || 
                  profile.goal.toLowerCase().includes('gain') || 
                  profile.goal.includes('زیادکردنی') || 
                  profile.goal.includes('گەورەکردن') || 
                  profile.goal.includes('بارستە')
                ));

              // تەنها ڕێژەی زیادەکە (Excess Stroke) دەبێتە سەوز بۆ کێش زیادکردن، یان سوور بۆ کێش دابەزاندن
              const excessStrokeColor = isWeightGainGoal ? 'var(--accent-primary)' : '#FF2E2E';
              const statusColor = isOverCalorie ? (isWeightGainGoal ? 'var(--accent-primary)' : '#EF4444') : 'var(--color-carbs)';
              const statusLightColor = isWeightGainGoal ? 'var(--accent-primary)' : '#FCA5A5';
              const excessLabel = isWeightGainGoal 
                ? (currentLangConfig.code === 'en' ? 'Surplus for Weight Gain' : currentLangConfig.code === 'ar' ? 'فائض لزيادة الوزن' : currentLangConfig.code === 'fa' ? 'مازاد برای افزایش وزن' : 'زیادەی پێویستی کێش')
                : (currentLangConfig.code === 'en' ? 'Calorie Surplus' : currentLangConfig.code === 'ar' ? 'فائض السعرات' : currentLangConfig.code === 'fa' ? 'کالری اضافی' : 'زیادەی کالۆری');
              const excessEmoji = isWeightGainGoal ? <Zap size={16} className="inline-block" /> : <Flame size={16} className="inline-block" />;
              const badgeText = isOverCalorie 
                ? (isWeightGainGoal 
                    ? <><BicepsFlexed size={16} className="inline-block" /> {percent}% ({currentLangConfig.code === 'en' ? 'Weight Gain' : currentLangConfig.code === 'ar' ? 'نمو الوزن' : currentLangConfig.code === 'fa' ? 'رشد وزن' : 'گەشەی کێش'})</> 
                    : <><AlertTriangle size={16} className="inline-block" /> {percent}% ({currentLangConfig.code === 'en' ? 'Surplus' : currentLangConfig.code === 'ar' ? 'فائض' : currentLangConfig.code === 'fa' ? 'مازاد' : 'زیادە'})</>) 
                : (percent + '% ' + t('completed'));
              const badgeColor = isOverCalorie ? statusColor : 'var(--color-carbs)';
              const badgeBg = isOverCalorie 
                ? (isWeightGainGoal ? 'var(--card-subtle)' : 'rgba(239, 68, 68, 0.15)') 
                : 'var(--card-subtle)';
              const badgeBorder = isOverCalorie 
                ? (isWeightGainGoal ? '1px solid var(--accent-primary)' : '1px solid rgba(239, 68, 68, 0.4)') 
                : '1px solid var(--color-carbs)';

              return (
                <div style={{ gridColumn: 'span 2', padding: '6px 2px 10px 2px', textAlign: 'center', position: 'relative' }}>
                  
                  {/* سەردێڕی بەشی کالۆری بەبێ چوارچێوەی گەورە */}
                  <div className="flex-between" style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--color-calories)', display: 'flex' }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                        </svg>
                      </span>
                      <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)' }}>
                        {t('eatenCalories')} {isOverCalorie && (isWeightGainGoal ? '(زیادەی بنیاتنان)' : '(تێپەڕاندن)')}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setShowNutritionHistoryModal(true)}
                        className="liquid-pill"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#38BDF8',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.28)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        title={currentLangConfig.code === 'en' ? 'Weekly Calorie History' : 'مێژووی کالۆری هەفتانە'}
                      >
                        <CalendarDays size={12} strokeWidth={2.4} />
                        <span>{currentLangConfig.code === 'en' ? 'History' : currentLangConfig.code === 'ar' ? 'السجل' : currentLangConfig.code === 'fa' ? 'تاریخچه' : 'مێژوو'}</span>
                      </button>

                      <span className="liquid-pill" style={{ color: badgeColor, border: badgeBorder, background: badgeBg, fontSize: '11px', fontWeight: '800', padding: '3px 8px' }}>
                        {badgeText}
                      </span>
                    </div>
                  </div>

                  {/* چارتی ڕێکخراو لە ناوەڕاست */}
                  <div style={{ position: 'relative', width: '132px', height: '132px', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 4px 12px var(--accent-glow))' }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--circle-track)" strokeWidth="3.2" opacity="0.5" />
                      
                      {/* هێڵی بنەڕەتی چارتەکە */}
                      <path 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        fill="none" 
                        stroke="url(#heroCalorieGradient)" 
                        strokeWidth="3.2" 
                        strokeDasharray={strokePercent + ', 100'} 
                        strokeLinecap="round" 
                      />

                      {/* تەنها ڕێژەی زیادەکە (سەوز بۆ کێش زیادکردن / سوور بۆ کێش دابەزاندن) */}
                      {isOverCalorie && (
                        <path 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                          fill="none" 
                          stroke={excessStrokeColor} 
                          strokeWidth="3.2" 
                          strokeDasharray={excessPercent + ', 100'} 
                          strokeLinecap="round" 
                        />
                      )}

                      <defs>
                        <linearGradient id="heroCalorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--accent-primary)" />
                          <stop offset="50%" stopColor="#4F46E5" />
                          <stop offset="100%" stopColor="#06B6D4" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* ناوەڕاستی چارتەکە */}
                    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', userSelect: 'none' }}>
                      {/* ڕێژەی بەکارهاتوو (خوراو) */}
                      <span style={{ fontSize: '25px', fontWeight: '900', color: isOverCalorie ? statusColor : 'var(--text-main)', lineHeight: 1, letterSpacing: '-0.5px' }}>
                        {totalEatenCalories}
                      </span>

                      {/* هێڵی کەرت (لەسەر) */}
                      <div style={{ width: '38px', height: '1.5px', background: isOverCalorie ? statusColor : 'rgba(255, 255, 255, 0.22)', margin: '4px 0', borderRadius: '1px' }} />

                      {/* ڕێژەی پێویست */}
                      <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-muted)', lineHeight: 1 }}>
                        {profile.goalCalories}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>
                        {t('kcal')}
                      </span>
                    </div>
                  </div>

                  {/* دوگمەکانی سکانکردن و خواردنەکانم */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setShowScanModal(true)} 
                      style={{ 
                        flex: 1,
                        background: 'var(--accent-gradient)', 
                        border: '1px solid rgba(255, 255, 255, 0.16)', 
                        outline: 'none',
                        color: '#ffffff', 
                        padding: '10px 12px', 
                        borderRadius: '13px', 
                        fontSize: '12.5px', 
                        fontWeight: '800', 
                        cursor: 'pointer', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px', 
                        boxShadow: '0 4px 14px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.16)', 
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.2s ease',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      <CameraScanIcon size={16} />
                      <span>{t('scanFoodWithAi')}</span>
                    </button>

                    <button 
                      onClick={() => {
                        setShowHomeMealsModal(true);
                        setHomeMealsModalTab('meals');
                      }} 
                      className="liquid-pill"
                      style={{ 
                        flex: 1,
                        border: '1px solid var(--border-color)', 
                        outline: 'none',
                        color: 'var(--text-main)', 
                        padding: '10px 12px', 
                        borderRadius: '13px', 
                        fontSize: '12.5px', 
                        fontWeight: '800', 
                        cursor: 'pointer', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px',
                        background: 'var(--card-subtle)',
                        boxShadow: 'none',
                        transition: 'all 0.2s ease',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      <UtensilsCrossed size={16} color="var(--accent-primary)" />
                      <span>{t('myMeals')}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* پرۆتین */}
            <div className="dark-card" style={{ padding: '12px' }}>
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: 'var(--color-proteins)', display: 'flex' }}>
                    <Beef size={16} color="currentColor" />
                  </span>
                  <span style={{ fontWeight: '800', fontSize: '13px' }}>{t('protein')}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-proteins)' }}>
                  {Math.min(Math.round((totalProteinG / profile.goalProtein) * 100), 100)}%
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <span dir="ltr" style={{ fontWeight: '900' }}>
                  <span>{totalProteinG}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 1px' }}>/</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>{profile.goalProtein}</span>
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{t('g')}</span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--circle-track)', borderRadius: '3px' }}>
                <div style={{ width: `${Math.min((totalProteinG / profile.goalProtein) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #3B82F6 0%, #38BDF8 100%)', borderRadius: '3px' }}></div>
              </div>
            </div>

            {/* کاربۆهیدرات */}
            <div className="dark-card" style={{ padding: '12px' }}>
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: 'var(--color-carbs)', display: 'flex' }}>
                    <Wheat size={16} color="currentColor" />
                  </span>
                  <span style={{ fontWeight: '800', fontSize: '13px' }}>{t('carbs')}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-carbs)' }}>
                  {Math.min(Math.round((totalCarbsG / profile.goalCarbs) * 100), 100)}%
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <span dir="ltr" style={{ fontWeight: '900' }}>
                  <span>{totalCarbsG}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 1px' }}>/</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>{profile.goalCarbs}</span>
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{t('g')}</span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--circle-track)', borderRadius: '3px' }}>
                <div style={{ width: `${Math.min((totalCarbsG / profile.goalCarbs) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #06B6D4 0%, var(--color-carbs) 100%)', borderRadius: '3px' }}></div>
              </div>
            </div>

          </div>

          {/* ==================== بەدواداچوونی پێشکەوتووی خواردنەوەی ئاو (Enhanced Water Tracker) ==================== */}
          <div 
            id="water-tracker-card"
            className="dark-card" 
            style={{ 
              padding: '12px 14px', 
              marginBottom: '12px', 
              background: theme === 'light' 
                ? 'rgba(255, 255, 255, 0.95)' 
                : 'linear-gradient(145deg, rgba(14, 28, 48, 0.8) 0%, rgba(10, 20, 36, 0.95) 100%)', 
              border: (actionLoadingState.active && (actionLoadingState.message?.includes('ئاو') || actionLoadingState.actionType?.toLowerCase().includes('water'))) ? '2px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.2)', 
              boxShadow: (actionLoadingState.active && (actionLoadingState.message?.includes('ئاو') || actionLoadingState.actionType?.toLowerCase().includes('water'))) ? '0 0 30px rgba(56, 189, 248, 0.5)' : (theme === 'light' ? '0 6px 20px rgba(15, 23, 42, 0.05)' : '0 10px 28px rgba(0, 0, 0, 0.35)'),
              borderRadius: '16px',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="flex-between" style={{ alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '12px', 
                  background: 'rgba(56, 189, 248, 0.12)', 
                  border: '1px solid rgba(56, 189, 248, 0.28)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#38bdf8', 
                  boxShadow: '0 2px 10px rgba(56, 189, 248, 0.15)', 
                  flexShrink: 0 
                }}>
                  <Droplet size={19} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '15.5px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{t('waterTracker')}</span>
                    <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '1px 7px', borderRadius: '8px', fontWeight: '800' }}>
                      {Math.min(100, Math.round((waterMl / 3000) * 100))}%
                    </span>
                  </div>
                </div>
              </div>

              {/* ژمێرەری ڕێکوپێک: تەنها دوو هێماکە لەناو شەیپ دان */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={() => handleAddWater(-250)} 
                  disabled={waterMl <= 0}
                  className="liquid-pill"
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    cursor: waterMl <= 0 ? 'not-allowed' : 'pointer', 
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-subtle)',
                    color: waterMl <= 0 ? 'var(--text-muted)' : 'var(--text-main)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: 'none',
                    opacity: waterMl <= 0 ? 0.35 : 1,
                    transition: 'all 0.2s ease',
                    padding: 0
                  }}
                  title="-"
                >
                  <Minus size={15} strokeWidth={2.5} />
                </button>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '48px', userSelect: 'none' }}>
                  <span style={{ fontSize: '15px', fontWeight: '900', color: '#38bdf8', lineHeight: 1 }}>
                    {waterMl}
                  </span>
                  <div style={{ width: '100%', height: '1.5px', background: 'rgba(56, 189, 248, 0.4)', margin: '3px 0', borderRadius: '1px' }} />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', lineHeight: 1 }}>
                    3000 <span style={{ fontSize: '9.5px', fontWeight: '700' }}>{currentLangConfig.code === 'en' ? 'ml' : 'مل'}</span>
                  </span>
                </div>
                <button 
                  onClick={() => handleAddWater(250)} 
                  className="liquid-pill"
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-subtle)',
                    color: '#38bdf8', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: 'none',
                    transition: 'all 0.2s ease',
                    padding: 0
                  }}
                  title="+"
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* هێڵی ڕێژەی خواردنەوەی ئاو (Liquid Progress Bar) */}
            <div style={{ width: '100%', height: '6px', background: 'var(--circle-track)', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${Math.min(100, (waterMl / 3000) * 100)}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)', 
                  borderRadius: '4px',
                  transition: 'width 0.35s ease',
                  boxShadow: '0 0 10px rgba(56, 189, 248, 0.4)'
                }} 
              />
            </div>
          </div>

          {/* ==================== پەنجەرەی خێرای پڕۆتین (Quick Protein Supplement Tracker) ==================== */}
          {!isProteinWidgetDismissed && lastUsedProtein && (
            <div 
              className="dark-card" 
              style={{ 
                padding: '16px 18px', 
                marginBottom: '20px', 
                background: theme === 'light' 
                  ? 'rgba(255, 255, 255, 0.95)' 
                  : 'linear-gradient(145deg, rgba(28, 33, 58, 0.85) 0%, rgba(18, 22, 40, 0.95) 100%)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '20px',
                boxShadow: theme === 'light' 
                  ? '0 6px 20px rgba(15, 23, 42, 0.05), inset 0 1px 0 #ffffff' 
                  : '0 10px 28px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                position: 'relative'
              }}
            >
              {/* بەشی سەرەوە: ناونیشان و دوگمەی داخستن */}
              <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '12px', 
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)', 
                    border: '1px solid rgba(56, 189, 248, 0.28)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#38bdf8', 
                    boxShadow: '0 2px 12px rgba(56, 189, 248, 0.18)', 
                    flexShrink: 0 
                  }}>
                    <BicepsFlexed size={19} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15.5px', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1.3' }}>
                      {getLocalizedFoodName(lastUsedProtein)}
                    </div>
                  </div>
                </div>

                {/* دوگمەی لابردنی ویندۆکە (Dismiss Button) */}
                <button
                  onClick={handleDismissProteinWidget}
                  className="liquid-pill"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    width: '30px',
                    height: '30px',
                    padding: 0,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                  title={currentLangConfig.code === 'en' ? 'Close Window' : currentLangConfig.code === 'ar' ? 'إغلاق النافذة' : currentLangConfig.code === 'fa' ? 'بستن پنجره' : 'لابردنی ویندۆ'}
                >
                  <X size={15} />
                </button>
              </div>

              {/* زانیارییە ماکرۆییەکان وەک تاگی شوشەیی و تەنک */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '14px',
                flexWrap: 'wrap'
              }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  background: 'rgba(56, 189, 248, 0.1)', 
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#38bdf8',
                  padding: '4px 10px', 
                  borderRadius: '10px', 
                  fontSize: '12px', 
                  fontWeight: '800'
                }}>
                  <span>⚡</span>
                  <span>{lastUsedProtein.protein || 0}g {t('protein')}</span>
                </div>

                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  background: 'rgba(251, 146, 60, 0.1)', 
                  border: '1px solid rgba(251, 146, 60, 0.25)',
                  color: '#fb923c',
                  padding: '4px 10px', 
                  borderRadius: '10px', 
                  fontSize: '12px', 
                  fontWeight: '800'
                }}>
                  <span>🔥</span>
                  <span>{lastUsedProtein.calories || 0} {t('kcal')}</span>
                </div>

                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  background: 'var(--card-subtle)', 
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  padding: '4px 10px', 
                  borderRadius: '10px', 
                  fontSize: '12px', 
                  fontWeight: '700'
                }}>
                  <span>{lastUsedProtein.quantity || 1} {getLocalizedUnit(lastUsedProtein.unit || 'سکۆپ')}</span>
                </div>
              </div>

              {/* دوگمەکانی کردار: دوگمەی سەرەکیی پان و دوگمەی ناسکی کەمکردنەوە */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* دوگمەی کەمکردنەوە (-) وەک ئایکۆنێکی ناسک */}
                <button
                  type="button"
                  onClick={handleQuickRemoveLastProtein}
                  disabled={currentLoggedProteinCount === 0}
                  className="liquid-pill"
                  style={{
                    width: '44px',
                    height: '44px',
                    background: quickProteinRemovedEffect 
                      ? 'rgba(239, 68, 68, 0.22)' 
                      : 'var(--card-subtle)',
                    color: currentLoggedProteinCount === 0 
                      ? 'var(--text-muted)' 
                      : quickProteinRemovedEffect ? '#ef4444' : 'var(--text-main)',
                    border: '1px solid ' + (quickProteinRemovedEffect ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-color)'),
                    borderRadius: '14px',
                    cursor: currentLoggedProteinCount === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'none',
                    opacity: currentLoggedProteinCount === 0 ? 0.35 : 1,
                    transition: 'all 0.25s ease',
                    flexShrink: 0
                  }}
                  title={currentLoggedProteinCount === 0 
                    ? (currentLangConfig.code === 'en' ? 'None logged today' : currentLangConfig.code === 'ar' ? 'لم يسجل اليوم' : currentLangConfig.code === 'fa' ? 'امروز ثبت نشده' : 'هیچ دانەیەک بۆ ئەمڕۆ تۆمار نەکراوە')
                    : `${t('quickRemoveOneClick')} (-)`}
                >
                  <Minus size={18} strokeWidth={2.5} color={currentLoggedProteinCount === 0 ? 'currentColor' : '#ef4444'} />
                </button>

                {/* دوگمەی سەرەکی بۆ زیادکردن (+) */}
                <button
                  type="button"
                  onClick={handleQuickAddLastProtein}
                  className="liquid-pill"
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    background: quickProteinAddedEffect 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                      : 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '13.5px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: quickProteinAddedEffect ? '0 4px 18px rgba(16, 185, 129, 0.4)' : '0 4px 14px var(--accent-glow)',
                    transition: 'all 0.25s ease'
                  }}
                >
                  {quickProteinAddedEffect ? (
                    <>
                      <Check size={18} strokeWidth={3} />
                      <span>{t('proteinAddedToast')}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} strokeWidth={2.5} color="#ffffff" />
                      <span>{t('quickAddOneClick')} ({lastUsedProtein.quantity || 1} {getLocalizedUnit(lastUsedProtein.unit || 'سکۆپ')})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ٢. پەڕەی ڕاهێنان (Workout View - Clean & 100% Dynamically Synced) */}
      {activeTab === 'workout' && (
        
        <React.Fragment>
        {!workoutCourse ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '68vh', textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 6px 20px var(--accent-glow))' }}>
              <BicepsFlexed size={56} color="var(--accent-primary)" strokeWidth={1.8} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '10px', color: 'var(--text-main)' }}>
              {currentLangConfig.code === 'en' ? 'You do not have a workout program yet' : currentLangConfig.code === 'ar' ? 'ليس لديك جدول تمارين بعد' : currentLangConfig.code === 'fa' ? 'هنوز برنامه تمرینی ندارید' : 'هێشتا کۆرسی ڕاهێنانت نییە'}
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '26px', lineHeight: '1.6', maxWidth: '340px' }}>
              {currentLangConfig.code === 'en' ? 'The smart AI coach is ready. With one click, generate a personalized science-based training program.' : currentLangConfig.code === 'ar' ? 'المدرب الذكي مستعد لمساعدتك. يمكنك بضغطة زر طلب تصميم جدول تدريبي علمي مخصص لك.' : currentLangConfig.code === 'fa' ? 'مربی هوشمند آماده است. با یک کلیک می‌توانید برنامه تمرینی علمی متناسب با خود را درخواست کنید.' : 'ڕاهێنەری زیرەک پێویستی بە زانیارییەکانتە. دەتوانیت بە یەک کلیک داواکاری پێشکەش بکەیت بۆ داڕشتنی کۆرسێکی زانستی و تایبەت بە خۆت.'}
            </p>
            <button 
              onClick={() => { 
                setBuilderDaysCount(profile.availableDaysPerWeek || 4); 
                setCourseLocation(profile.trainingLocation || 'gym');
                setHomeEquipment(profile.homeEquipment || '');
                setGoalFormData({
                  goal: profile.goal || (currentLangConfig.code === 'en' ? 'Muscle Gain' : currentLangConfig.code === 'ar' ? 'زيادة العضلات' : currentLangConfig.code === 'fa' ? 'رشد عضلات' : 'گەشەی ماسولکە'),
                  targetWeight: profile.targetWeight || profile.weight,
                  targetDays: profile.targetDays || 45,
                  bodyGoals: profile.bodyGoals || { enlarge: [], shrink: [] }
                });
                setShowNewCourseModal(true); 
              }}
              className="liquid-pill" 
              style={{ 
                padding: '14px 24px', 
                background: 'var(--accent-gradient)', 
                color: '#ffffff', 
                fontSize: '15px', 
                fontWeight: '900', 
                border: 'none', 
                borderRadius: '16px', 
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 18px var(--accent-glow)',
                transition: 'all 0.25s ease'
              }}>
              <Sparkles size={18} fill="#ffffff" />
              <span>{currentLangConfig.code === 'en' ? 'Request Program Design' : currentLangConfig.code === 'ar' ? 'طلب تصميم برنامج تدريبي' : currentLangConfig.code === 'fa' ? 'درخواست طراحی برنامه' : 'داواکاری داڕشتنی کۆرس'}</span>
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 1, padding: '10px 14px 18px 14px', direction: currentLangConfig.dir }}>
          <header className="flex-between" style={{ marginBottom: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* ئاماژەدان بەوەی وەرزشەکان ئی ماڵەوەن یان هۆڵ */}
              {(() => {
                const isHomeWorkout = (workoutCourse?.trainingLocation === 'home') || 
                                     (workoutCourse?.location === 'home') || 
                                     (profile?.trainingLocation === 'home');
                const locationText = isHomeWorkout
                  ? (currentLangConfig.code === 'en' ? 'Home' : currentLangConfig.code === 'ar' ? 'المنزل' : currentLangConfig.code === 'fa' ? 'خانه' : 'ماڵەوە')
                  : (currentLangConfig.code === 'en' ? 'Gym' : currentLangConfig.code === 'ar' ? 'النادي' : currentLangConfig.code === 'fa' ? 'باشگاه' : 'هۆڵ');
                
                return (
                  <span 
                    className="liquid-pill"
                    style={{ 
                      fontSize: '13px', 
                      fontWeight: '900', 
                      color: isHomeWorkout ? '#38bdf8' : '#c084fc',
                      background: isHomeWorkout ? 'rgba(56, 189, 248, 0.12)' : 'rgba(192, 132, 252, 0.12)',
                      border: isHomeWorkout ? '1px solid rgba(56, 189, 248, 0.28)' : '1px solid rgba(192, 132, 252, 0.28)',
                      padding: '7px 14px',
                      borderRadius: '12px'
                    }}
                  >
                    {locationText}
                  </span>
                );
              })()}

              {profile.healthConditions && profile.healthConditions.length > 0 && (
                <div style={{ fontSize: '11.5px', color: 'var(--color-carbs)', fontWeight: '700' }}>
                  <span>{currentLangConfig.code === 'en' ? 'Adapting to ' : currentLangConfig.code === 'ar' ? 'مع مراعاة ' : currentLangConfig.code === 'fa' ? 'با در نظر گرفتن ' : 'لەبەرچاوگرتنی '}{profile.healthConditions.join('، ')}</span>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={() => { 
                  setBuilderDaysCount((workoutCourse?.daysPerWeek || 0) || profile.availableDaysPerWeek || 4); 
                  setCourseLocation(workoutCourse?.trainingLocation || profile.trainingLocation || 'gym');
                  setHomeEquipment(workoutCourse?.homeEquipment || profile.homeEquipment || '');
                  setGoalFormData({
                    goal: profile.goal || 'گەشەی ماسولکە',
                    targetWeight: profile.targetWeight || profile.weight,
                    targetDays: profile.targetDays || 45,
                    bodyGoals: profile.bodyGoals || { enlarge: [], shrink: [] }
                  });
                  setShowNewCourseModal(true); 
                }} 
                className="no-print"
                style={{ background: 'var(--accent-gradient)', color: '#ffffff', border: '1px solid var(--border-color)', padding: '10px 16px', borderRadius: '16px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', backdropFilter: 'blur(10px)', boxShadow: '0 8px 20px var(--accent-glow)', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
              >
                <Sparkles size={16} />
                <span>{t('newCourse')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPhysiqueModal(true)}
                className="no-print"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 182, 212, 0.18) 100%)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0
                }}
                title={language === 'en' ? 'AI Physique Vision Scan' : 'سکان و هەڵسەنگاندنی جەستە بە بینینی AI'}
              >
                <Camera size={16} />
                <span>{language === 'en' ? 'Scan Physique' : 'سکانکردنی جەستە'}</span>
              </button>
            </div>
          </header>



          {/* ==================== تایمەری پشووی هۆڵی وەرزش (Gym Rest Timer) ==================== */}
          <div className="dark-card no-print" style={{ padding: '14px 18px', marginBottom: '18px', border: restTimerRunning ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)', borderRadius: '18px', background: restTimerRunning ? 'rgba(168, 85, 247, 0.08)' : 'var(--card-bg)' }}>
            <div className="flex-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: restTimerRunning ? 'var(--color-proteins)' : 'var(--text-muted)', display: 'flex' }}>
                  <Timer size={22} className={restTimerRunning ? "animate-pulse" : ""} />
                </span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800' }}>{t('restTimerTitle')}</div>
                  {restTimerRunning && (
                    <div className="text-subtle" style={{ fontSize: '11px' }}>
                      {`${t('restTimerCounting')} ${restTimerSeconds} ${t('secondsRemaining')} ⏱️`}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {[30, 60, 90, 120].map(sec => (
                  <button
                    key={sec}
                    onClick={() => startRestTimer(sec)}
                    className="liquid-pill"
                    style={{
                      padding: '6px 10px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      background: (restTimerRunning && restTimerTotal === sec) ? 'var(--accent-gradient)' : 'var(--card-subtle)',
                      color: (restTimerRunning && restTimerTotal === sec) ? '#ffffff' : 'var(--text-main)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {restTimerSeconds > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <div className="flex-between" style={{ alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--color-proteins)', letterSpacing: '1px' }}>
                    {Math.floor(restTimerSeconds / 60)}:{String(restTimerSeconds % 60).padStart(2, '0')}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setRestTimerRunning(!restTimerRunning)}
                      className="liquid-pill"
                      style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                      {restTimerRunning ? <><Pause size={14} /> {currentLangConfig.code === 'en' ? 'Pause' : currentLangConfig.code === 'ar' ? 'إيقاف' : currentLangConfig.code === 'fa' ? 'توقف' : 'ڕاگرتن'}</> : <><Play size={14} /> {currentLangConfig.code === 'en' ? 'Resume' : currentLangConfig.code === 'ar' ? 'استئناف' : currentLangConfig.code === 'fa' ? 'ادامه' : 'دەستپێکردنەوە'}</>}
                    </button>
                    <button
                      onClick={() => setRestTimerSeconds(prev => prev + 30)}
                      className="liquid-pill"
                      style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      +30s
                    </button>
                    <button
                      onClick={() => { playUncheckSound(); setRestTimerRunning(false); setRestTimerSeconds(0); setActiveTimerSet(null); }}
                      className="liquid-pill"
                      style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.45)', background: 'rgba(239, 68, 68, 0.12)' }}
                      title={currentLangConfig.code === 'en' ? 'Reset Timer' : 'ڕاگرتن و لابردنی کاتژمێر'}
                    >
                      <X size={16} strokeWidth={2.5} color="#ef4444" />
                    </button>
                  </div>
                </div>
                {/* باریکەی ڕەنگینی پێشکەوتنی کات */}
                <div style={{ width: '100%', height: '6px', background: 'var(--circle-track)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, ((restTimerTotal - restTimerSeconds) / (restTimerTotal || 60)) * 100))}%`, height: '100%', background: 'linear-gradient(90deg, #10B981 0%, #06B6D4 50%, #A855F7 100%)', transition: 'width 1s linear' }} />
                </div>
              </div>
            )}
          </div>



          {/* ڕوونکردنەوەی زیرەکی دەستکرد لەسەر چۆنیەتی داڕشتنی کۆرسەکە */}
          {workoutCourse?.rationale && (
            <div className="liquid-card" style={{ padding: '12px 14px', marginBottom: '14px', border: '1px solid rgba(168, 85, 247, 0.35)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Sparkles size={18} color="#a855f7" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-main)', fontWeight: '700' }}>
                {workoutCourse.rationale}
              </div>
            </div>
          )}

          {/* کەرتی پیشاندانی شیکاری بینینی جەستە لە تەنیشت کۆرس */}
          {profile?.physiqueAnalysis && (
            <div 
              onClick={() => setShowPhysiqueModal(true)}
              className="liquid-card no-print" 
              style={{ 
                padding: '12px 14px', 
                marginBottom: '14px', 
                border: '1px solid rgba(16, 185, 129, 0.35)', 
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderRadius: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Camera size={18} color="#10b981" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-main)', fontWeight: '700' }}>
                  <span>{language === 'en' ? 'AI Visual Analysis:' : 'شیکاری بینینی جەستە:'} </span>
                  <span style={{ color: '#10b981', fontWeight: '900' }}>{profile.physiqueAnalysis.bodyFatPercentage}% {language === 'en' ? 'Fat' : 'چەوری'}</span>
                  {profile.physiqueAnalysis.laggingMuscles && profile.physiqueAnalysis.laggingMuscles.length > 0 && (
                    <span style={{ color: 'var(--text-muted)' }}> • {language === 'en' ? 'Priority:' : 'تیشکۆ لەسەر:'} <strong style={{ color: '#ef4444' }}>{profile.physiqueAnalysis.laggingMuscles.join('، ')}</strong></span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '800' }}>{language === 'en' ? 'View' : 'پیشاندان'} ←</span>
            </div>
          )}

          {/* ڕۆژەکانی هەفتە (٧ ڕۆژی تەواو بە ناوی پاک و کوردی بەپێی داخوازی) */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {(() => {
                const cleanKurdishDays = ['شەممە', '1 شەم', '2 شەم', '3 شەم', '4شەم', '5 شەم', 'هەینی'];
                return (workoutCourse?.weeklyPlan || []).map((day, idx) => {
                  const isSelected = selectedDayIdx === idx;
                  const isCompleted = completedDayIndices.includes(idx);
                  const displayDayTitle = cleanKurdishDays[idx] || day.dayName;

                  return (
                    <div 
                      key={day.dayKey || idx}
                      onClick={() => setSelectedDayIdx(idx)}
                      className="liquid-pill"
                      style={{
                        padding: '12px 2px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: isCompleted 
                          ? 'var(--accent-glow)' 
                          : (isSelected ? 'var(--accent-gradient)' : 'var(--card-subtle)'),
                        color: isSelected ? '#ffffff' : 'var(--text-main)',
                        border: isCompleted 
                          ? '1.5px solid var(--accent-glow)' 
                          : (isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)'),
                        boxShadow: isCompleted 
                          ? '0 4px 16px var(--accent-glow)' 
                          : (isSelected ? '0 8px 20px var(--accent-glow)' : 'none'),
                        transition: 'all 0.25s ease'
                      }}
                    >
                      <div style={{ fontSize: '11.5px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
                        <span>{displayDayTitle}</span>
                        {isCompleted && <span style={{ color: '#22c55e', fontWeight: '900', display: 'inline-flex' }}><Check size={13} style={{ strokeWidth: 3 }} /></span>}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {(workoutCourse?.weeklyPlan || [])[selectedDayIdx] && (
            <div style={{ marginBottom: '32px' }}>
              <div className="flex-between" style={{ marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '800' }}>
                    {getLocalizedWorkoutFocus((workoutCourse?.weeklyPlan || [])[selectedDayIdx].focus, (workoutCourse?.weeklyPlan || [])[selectedDayIdx].isRestDay, language)}
                  </h3>
                  {!(workoutCourse?.weeklyPlan || [])[selectedDayIdx].isRestDay && (
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '700' }}>
                      ({((workoutCourse?.weeklyPlan || [])[selectedDayIdx].exercises || []).length} {language === 'en' ? 'Exercises' : language === 'ar' ? 'تمارين' : language === 'fa' ? 'تمرین' : 'ڕاهێنان'})
                    </span>
                  )}
                </div>

                {!(workoutCourse?.weeklyPlan || [])[selectedDayIdx].isRestDay && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* دوگمەی تەنها ئایکۆن بۆ گۆڕینی شێوازی بینین (View Toggle) */}
                    <button
                      type="button"
                      onClick={() => handleSetWorkoutViewMode(workoutViewMode === 'compact' ? 'large' : 'compact')}
                      className="liquid-pill no-print"
                      title={workoutViewMode === 'compact' ? (language === 'en' ? 'Large icons' : 'وێنەی گەورە') : (language === 'en' ? 'List View' : 'لیستی ئاسایی')}
                      aria-label="Toggle workout view"
                      style={{
                        width: '34px',
                        height: '34px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-subtle)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                    >
                      {workoutViewMode === 'large' ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="13" rx="2.5" />
                          <line x1="4" y1="20" x2="20" y2="20" />
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="8" y1="6" x2="21" y2="6" />
                          <line x1="8" y1="12" x2="21" y2="12" />
                          <line x1="8" y1="18" x2="21" y2="18" />
                          <line x1="3" y1="6" x2="3.01" y2="6" />
                          <line x1="3" y1="12" x2="3.01" y2="12" />
                          <line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                      )}
                    </button>

                    <span className="liquid-pill" style={{ color: 'var(--accent-primary)', padding: '5px 12px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span><Flame size={16} className="inline-block" /></span>
                      <span>{(workoutCourse?.weeklyPlan || [])[selectedDayIdx].estimatedCalories || 400} {t('kcal')}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* کاتێک ڕۆژی پشووە */}
              {(workoutCourse?.weeklyPlan || [])[selectedDayIdx].isRestDay ? (
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <div style={{ fontSize: '42px', marginBottom: '12px' }}><PersonStanding size={16} className="inline-block" /></div>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-carbs)', marginBottom: '8px' }}>{t('restDayTitle')}</h4>
                  <p className="text-subtle" style={{ fontSize: '13px', lineHeight: '1.6', maxWidth: '340px', margin: '0 auto' }}>
                    {t('restDayDesc')}
                  </p>
                </div>
              ) : (
                <>
                  {/* فەنکشنی هاوبەشی تۆمارکردنی سێتەکان (Progressive Overload Set Logger) بۆ هەردوو ڤیوەکە */}
                  {(() => {
                    const renderExerciseSetLogger = (ex, exKey, exIdx, setsCount, currentLogs) => (
                      <div className="no-print" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', direction: isRtl ? 'rtl' : 'ltr' }}>
                        <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{t('sets') || 'Set'}</span>
                          <span>{t('weight')} ({t('kg')})</span>
                          <span>{t('reps') || 'Reps'}</span>
                          <span>{currentLangConfig.code === 'en' ? 'Done?' : currentLangConfig.code === 'ar' ? 'تم؟' : currentLangConfig.code === 'fa' ? 'انجام؟' : 'تەواو؟'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {Array.from({ length: setsCount }).map((_, sIdx) => {
                            const setData = currentLogs[sIdx] || { weight: '', reps: '', completed: false };
                            const isSetTimerActive = activeTimerSet?.setIdx === sIdx && 
                              (activeTimerSet?.exKey === exKey || activeTimerSet?.exIdx === exIdx) && 
                              restTimerRunning && restTimerSeconds > 0;
                            const progressPercent = Math.min(100, Math.max(0, ((restTimerTotal - restTimerSeconds) / (restTimerTotal || 60)) * 100));

                            return (
                              <div 
                                key={sIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '7px 10px',
                                  borderRadius: '10px',
                                  background: setData.completed ? 'rgba(34, 197, 94, 0.12)' : 'var(--card-inner)',
                                  border: isSetTimerActive 
                                    ? '1px solid rgba(6, 182, 212, 0.6)' 
                                    : (setData.completed ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border-color)'),
                                  boxShadow: isSetTimerActive ? '0 0 12px rgba(6, 182, 212, 0.25)' : 'none',
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: '800', minWidth: '45px' }}>
                                    {currentLangConfig.code === 'en' ? `Set ${sIdx + 1}` : currentLangConfig.code === 'ar' ? `المجموعة ${sIdx + 1}` : currentLangConfig.code === 'fa' ? `ست ${sIdx + 1}` : `سێتی ${sIdx + 1}`}
                                  </span>
                                  {isSetTimerActive && (
                                    <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: '900', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      ⏱️ {restTimerSeconds}s
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={setData.weight}
                                  onChange={(e) => handleUpdateSetLog(exKey, sIdx, 'weight', e.target.value)}
                                  className="liquid-pill"
                                  style={{ width: '60px', padding: '6px', textAlign: 'center', fontSize: '13px', fontWeight: '800', border: '1px solid var(--border-color)', background: 'var(--card-subtle)', color: 'var(--text-main)' }}
                                />
                                <input
                                  type="number"
                                  placeholder="10"
                                  value={setData.reps}
                                  onChange={(e) => handleUpdateSetLog(exKey, sIdx, 'reps', e.target.value)}
                                  className="liquid-pill"
                                  style={{ width: '60px', padding: '6px', textAlign: 'center', fontSize: '13px', fontWeight: '800', border: '1px solid var(--border-color)', background: 'var(--card-subtle)', color: 'var(--text-main)' }}
                                />
                                <button
                                  onClick={() => handleToggleSetCompleted(exKey, sIdx, exIdx)}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: setData.completed ? '#22c55e' : 'var(--card-subtle)',
                                    color: setData.completed ? '#ffffff' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Check size={16} />
                                </button>

                                {/* هێڵی باریک و ناسکی پڕبوونی کاونتداونی کاتی پشوو لەبن سێتەکە */}
                                {isSetTimerActive && (
                                  <div 
                                    style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      height: '4px',
                                      background: 'rgba(255, 255, 255, 0.12)',
                                      borderRadius: '0 0 10px 10px',
                                      overflow: 'hidden',
                                      pointerEvents: 'none'
                                    }}
                                  >
                                    <div 
                                      style={{
                                        height: '100%',
                                        width: `${progressPercent}%`,
                                        background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #a855f7 100%)',
                                        boxShadow: '0 0 10px rgba(6, 182, 212, 0.8)',
                                        transition: 'width 1s linear'
                                      }} 
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );

                    const dayExercises = (workoutCourse?.weeklyPlan || [])[selectedDayIdx].exercises || [];

                    return (
                      <>
                        {/* پیشاندانی ڕاهێنانەکان بەپێی ڤیوی دیاریکراو */}
                        {workoutViewMode === 'compact' ? (
                          /* ١. ڤیوی لیستی ئاسایی (وەک ئەوەی پێشتر) */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            {dayExercises.map((ex, exIdx) => {
                              const exKey = ex.englishName || ex.name;
                              const isExpanded = expandedExerciseIndex === exIdx;
                              const setsCount = Math.min(Number(ex.sets) || 4, 8);
                              const currentLogs = exerciseLogs[exKey] || [];
                              const completedSetsCount = currentLogs.filter(s => s && s.completed).length;
                              const isAllSetsCompleted = completedSetsCount >= setsCount && setsCount > 0;
                              const isExerciseTimerActive = (activeTimerSet?.exKey === exKey || activeTimerSet?.exIdx === exIdx) && restTimerRunning && restTimerSeconds > 0;
                              const restTimeSeconds = parseInt(ex.rest) || workoutCourse?.restIntervalSeconds || (profile.goalPace === 'slow' ? 90 : profile.goalPace === 'fast' ? 45 : profile.goalPace === 'very_fast' ? 35 : 60);

                              return (
                                <div
                                  key={ex.name + exIdx}
                                  className="liquid-pill"
                                  style={{
                                    padding: '14px 16px',
                                    direction: 'ltr',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    background: isAllSetsCompleted ? 'rgba(34, 197, 94, 0.08)' : undefined,
                                    border: isAllSetsCompleted ? '1.5px solid rgba(34, 197, 94, 0.5)' : (isExerciseTimerActive ? '1.5px solid rgba(6, 182, 212, 0.5)' : undefined),
                                    boxShadow: isAllSetsCompleted ? '0 0 16px rgba(34, 197, 94, 0.15)' : (isExerciseTimerActive ? '0 0 16px rgba(6, 182, 212, 0.2)' : undefined),
                                    transition: 'all 0.3s ease'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    {/* وێنەی ئۆفلاینی ڕاهێنانەکە لە دەستەچەپ */}
                                    <ExerciseThumbnail
                                      exerciseName={ex.englishName || ex.name}
                                      size={52}
                                      onClick={() => setActiveFormExercise(ex)}
                                    />

                                    <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                                      {/* ١. ناوی سەرەکی بە ئینگلیزی (سپی) */}
                                      <div style={{ fontWeight: '800', fontSize: '15.5px', color: 'var(--text-main)', letterSpacing: '-0.2px', lineHeight: '1.25', textAlign: 'left' }}>
                                        {ex.englishName || ex.name}
                                      </div>
                                      {/* ٢. ناوی لاوەکی بە زمانی دیاریکراو لە ستینگ و ماسولکەی مەبەست */}
                                      <div style={{ color: 'var(--color-carbs)', fontSize: '12px', marginTop: '2px', fontWeight: '600', textAlign: 'left' }}>
                                        {language !== 'en' ? `${getLocalizedExerciseName(ex, language)} • ` : ''}{getLocalizedMuscle(ex.muscle, language)}
                                      </div>
                                      {/* ٣. کۆمەڵە و دووبارەکردنەوە */}
                                      <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', marginTop: '4px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>{ex.sets}x{ex.reps}</span>
                                        {isAllSetsCompleted ? (
                                          <span style={{ fontSize: '10.5px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.18)', padding: '2px 8px', borderRadius: '8px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Check size={12} style={{ strokeWidth: 3 }} />
                                            <span>{language === 'en' ? 'Completed' : 'تەواوبوو'}</span>
                                          </span>
                                        ) : completedSetsCount > 0 ? (
                                          <span style={{ fontSize: '10.5px', color: 'var(--color-proteins)', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '8px', fontWeight: '700' }}>
                                            <span dir="ltr">{completedSetsCount}/{setsCount}</span> {t('setsCompleted')}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                    {/* دوگمەکانی لای ڕاست: ڕێبەری شێواز، بۆشایی سێتەکان (+ و - و کاونتداون)، سێرچی گووگڵ */}
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                      <button
                                        onClick={() => setActiveFormExercise(ex)}
                                        className="liquid-pill no-print"
                                        title={t('formGuide')}
                                        aria-label={t('formGuide')}
                                        style={{
                                          width: '32px',
                                          height: '32px',
                                          padding: 0,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '10px',
                                          border: '1px solid var(--border-color)',
                                          background: 'var(--card-subtle)',
                                          color: 'var(--color-proteins)',
                                          cursor: 'pointer',
                                          flexShrink: 0
                                        }}
                                      >
                                        <Info size={15} />
                                      </button>

                                      {/* بۆشایی ژمارەی سێتەکان بە دوگمەی + و - و کاونتداونی پشوو */}
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          background: isAllSetsCompleted ? 'rgba(34, 197, 94, 0.15)' : 'var(--card-subtle)',
                                          border: isAllSetsCompleted ? '1.5px solid #22c55e' : (isExerciseTimerActive ? '1.5px solid #06b6d4' : '1px solid var(--border-color)'),
                                          padding: '2px 3px',
                                          borderRadius: '11px',
                                          boxShadow: isAllSetsCompleted ? '0 0 12px rgba(34, 197, 94, 0.25)' : (isExerciseTimerActive ? '0 0 12px rgba(6, 182, 212, 0.3)' : 'none'),
                                          transition: 'all 0.25s ease'
                                        }}
                                      >
                                        {/* دوگمەی کەمکردنەوە (-) بەبێ دەستپێکردنی کاونتداون */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDecrementExerciseSet(exKey, exIdx);
                                          }}
                                          disabled={completedSetsCount === 0}
                                          title="کەمکردنەوەی سێت"
                                          aria-label="Decrease set"
                                          style={{
                                            width: '26px',
                                            height: '26px',
                                            padding: 0,
                                            borderRadius: '7px',
                                            border: 'none',
                                            background: completedSetsCount > 0 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                            color: completedSetsCount > 0 ? 'var(--text-main)' : 'rgba(255,255,255,0.2)',
                                            cursor: completedSetsCount > 0 ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <Minus size={13} />
                                        </button>

                                        {/* بۆشایی ژمارەی سێت: ژمارە هەمیشە دیارە لەگەڵ کاونتداونی پێوەکراو */}
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleIncrementExerciseSet(exKey, exIdx, setsCount, restTimeSeconds);
                                          }}
                                          title={isExerciseTimerActive ? `کاتی پشوو: ${restTimerSeconds} چرکە` : "کلیک بکە بۆ تۆمارکردن"}
                                          style={{
                                            minWidth: '40px',
                                            padding: '0 5px',
                                            height: '26px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            cursor: 'pointer',
                                            userSelect: 'none'
                                          }}
                                        >
                                          {/* ژمارەی سێتەکان (هەمیشە دەمێنێتەوە و دیارە) */}
                                          <span dir="ltr" style={{ fontWeight: '900', fontSize: '13px', color: isAllSetsCompleted ? '#22c55e' : 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '2px', unicodeBidi: 'isolate' }}>
                                            <span>{completedSetsCount}</span>
                                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '700' }}>/{setsCount}</span>
                                            {isAllSetsCompleted && <Check size={12} style={{ color: '#22c55e', strokeWidth: 3 }} />}
                                          </span>

                                          {/* کاونتداونی پشوو لە تەنیشت ژمارەکە */}
                                          {isExerciseTimerActive && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#06b6d4', fontWeight: '800', fontSize: '11px', background: 'rgba(6, 182, 212, 0.15)', padding: '1px 5px', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                              ⏱️ {restTimerSeconds}s
                                            </span>
                                          )}
                                        </div>

                                        {/* دوگمەی زیادکردن (+) لەگەڵ دەستپێکردنی کاونتداونی پشوو */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleIncrementExerciseSet(exKey, exIdx, setsCount, restTimeSeconds);
                                          }}
                                          title="تەواوکردنی سێت و دەستپێکردنی کاونتداون"
                                          aria-label="Increase set and start timer"
                                          style={{
                                            width: '26px',
                                            height: '26px',
                                            padding: 0,
                                            borderRadius: '7px',
                                            border: 'none',
                                            background: isAllSetsCompleted ? 'rgba(34, 197, 94, 0.3)' : 'var(--accent-gradient)',
                                            color: '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: isAllSetsCompleted ? 'none' : '0 2px 8px var(--accent-glow)',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <Plus size={14} />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExerciseToSwapConfirm({ ex, exIdx });
                                        }}
                                        className="liquid-pill no-print"
                                        title={language === 'en' ? 'Swap / Replace Exercise' : 'گۆڕینی ڕاهێنان بە جێگرەوە'}
                                        aria-label="Swap Exercise"
                                        style={{
                                          width: '32px',
                                          height: '32px',
                                          padding: 0,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '10px',
                                          border: '1px solid rgba(239, 68, 68, 0.45)',
                                          background: 'rgba(239, 68, 68, 0.12)',
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                          flexShrink: 0
                                        }}
                                      >
                                        <RefreshCw size={14} color="#ef4444" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* هێڵی باریکی پڕبوونی کاونتداونی پشوو لەبن کاردەکە کاتێک تایمەر دەڕوات */}
                                  {isExerciseTimerActive && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '3.5px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        overflow: 'hidden',
                                        pointerEvents: 'none'
                                      }}
                                    >
                                      <div
                                        style={{
                                          height: '100%',
                                          width: `${Math.min(100, Math.max(0, ((restTimerTotal - restTimerSeconds) / (restTimerTotal || 60)) * 100))}%`,
                                          background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #a855f7 100%)',
                                          boxShadow: '0 0 10px rgba(6, 182, 212, 0.8)',
                                          transition: 'width 1s linear'
                                        }}
                                      />
                                    </div>
                                  )}

                                  {/* بەشی تۆمارکردنی سێتەکان کاتێک کراوەیە */}
                                  {isExpanded && renderExerciseSetLogger(ex, exKey, exIdx, setsCount, currentLogs)}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* ٢. ڤیوی وێنەی گەورە (Large icons) - هاوشێوەی وێنەی داواکراو */
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                            {dayExercises.map((ex, exIdx) => {
                              const exKey = ex.englishName || ex.name;
                              const isExpanded = expandedExerciseIndex === exIdx;
                              const setsCount = Math.min(Number(ex.sets) || 4, 8);
                              const currentLogs = exerciseLogs[exKey] || [];
                              const completedSetsCount = currentLogs.filter(s => s && s.completed).length;
                              const isAllSetsCompleted = completedSetsCount >= setsCount && setsCount > 0;
                              const isExerciseTimerActive = (activeTimerSet?.exKey === exKey || activeTimerSet?.exIdx === exIdx) && restTimerRunning && restTimerSeconds > 0;
                              const restTimeSeconds = parseInt(ex.rest) || workoutCourse?.restIntervalSeconds || (profile.goalPace === 'slow' ? 90 : profile.goalPace === 'fast' ? 45 : profile.goalPace === 'very_fast' ? 35 : 60);

                              return (
                                <div
                                  key={ex.name + exIdx}
                                  style={{
                                    borderRadius: '18px',
                                    background: isAllSetsCompleted ? 'rgba(34, 197, 94, 0.08)' : 'var(--card-subtle)',
                                    border: isAllSetsCompleted ? '1.5px solid rgba(34, 197, 94, 0.5)' : (isExerciseTimerActive ? '1.5px solid rgba(6, 182, 212, 0.5)' : '1px solid var(--border-color)'),
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: isAllSetsCompleted ? '0 0 20px rgba(34, 197, 94, 0.2)' : (isExerciseTimerActive ? '0 0 20px rgba(6, 182, 212, 0.25)' : '0 4px 18px rgba(0,0,0,0.18)'),
                                    transition: 'all 0.3s ease',
                                    position: 'relative'
                                  }}
                                >
                                  {/* وێنەی گەورەی ڕاهێنانەکە */}
                                  <div
                                    onClick={() => setActiveFormExercise(ex)}
                                    style={{
                                      position: 'relative',
                                      width: '100%',
                                      height: '190px',
                                      background: 'var(--card-subtle, #141b2d)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      overflow: 'hidden',
                                      borderBottom: '1px solid var(--border-color)'
                                    }}
                                    title={language === 'en' ? 'Click for Form Guide & Video' : 'کلیک بکە بۆ ڕێبەری شێواز و فێرکاری'}
                                  >
                                    <ExerciseThumbnail
                                      exerciseName={ex.englishName || ex.name}
                                      width="100%"
                                      height="190px"
                                      fit="contain"
                                      borderRadius="0"
                                    />

                                    {/* تاگی ماسولکەی ئامانج لە سەرەوە دەستەچەپ */}
                                    <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2 }}>
                                      <span style={{
                                        background: 'rgba(15, 23, 42, 0.88)',
                                        backdropFilter: 'blur(8px)',
                                        color: '#38bdf8',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        border: '1px solid rgba(56, 189, 248, 0.3)'
                                      }}>
                                        {getLocalizedMuscle(ex.muscle, language)}
                                      </span>
                                    </div>

                                    {/* تاگی سێت و دووبارە لە سەرەوە دەستەڕاست */}
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 2 }}>
                                      <span style={{
                                        background: isAllSetsCompleted ? 'rgba(34, 197, 94, 0.9)' : 'rgba(15, 23, 42, 0.88)',
                                        backdropFilter: 'blur(8px)',
                                        color: isAllSetsCompleted ? '#ffffff' : '#f59e0b',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        border: isAllSetsCompleted ? '1px solid #22c55e' : '1px solid rgba(245, 158, 11, 0.3)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        {isAllSetsCompleted && <Check size={12} style={{ strokeWidth: 3 }} />}
                                        <span>{ex.sets} × {ex.reps} {isAllSetsCompleted ? (language === 'en' ? 'Done' : 'تەواو') : ''}</span>
                                      </span>
                                    </div>

                                    {/* ئایکۆنی ڕێبەری شێواز لە خوارەوە */}
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '8px',
                                      right: '8px',
                                      background: 'rgba(0, 0, 0, 0.75)',
                                      backdropFilter: 'blur(6px)',
                                      color: '#ffffff',
                                      padding: '3px 8px',
                                      borderRadius: '8px',
                                      fontSize: '10.5px',
                                      fontWeight: '700',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      zIndex: 2
                                    }}>
                                      <Info size={12} style={{ color: '#38bdf8' }} />
                                      <span>{language === 'en' ? 'Form Guide' : 'ڕێبەری شێواز'}</span>
                                    </div>

                                    {/* شلەی پڕبوونی کاونتداونی پشوو لە ژێر وێنەکە لە چەپەوە بۆ ڕاست بەپێی کات */}
                                    {isExerciseTimerActive && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          bottom: 0,
                                          left: 0,
                                          right: 0,
                                          height: '8px',
                                          background: 'rgba(0, 0, 0, 0.45)',
                                          overflow: 'hidden',
                                          zIndex: 10
                                        }}
                                      >
                                        <div
                                          style={{
                                            height: '100%',
                                            width: `${Math.min(100, Math.max(0, ((restTimerTotal - restTimerSeconds) / (restTimerTotal || 60)) * 100))}%`,
                                            background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #a855f7 100%)',
                                            boxShadow: '0 0 14px rgba(6, 182, 212, 0.9)',
                                            transition: 'width 1s linear'
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* ناوەڕۆک و دوگمەکانی خوارەوەی کاردی گەورە */}
                                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, direction: 'ltr' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                      <div style={{ textAlign: 'left', flex: 1 }}>
                                        <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-main)', letterSpacing: '-0.2px', lineHeight: '1.25' }}>
                                          {ex.englishName || ex.name}
                                        </div>
                                        {language !== 'en' && (
                                          <div style={{ color: 'var(--color-carbs)', fontSize: '12.5px', marginTop: '2px', fontWeight: '700' }}>
                                            {getLocalizedExerciseName(ex, language)}
                                          </div>
                                        )}
                                      </div>

                                      {isAllSetsCompleted ? (
                                        <span style={{ fontSize: '11px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.18)', padding: '3px 8px', borderRadius: '8px', fontWeight: '800', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                          <Check size={12} style={{ strokeWidth: 3 }} />
                                          <span>{language === 'en' ? 'Completed' : 'تەواوبوو'}</span>
                                        </span>
                                      ) : completedSetsCount > 0 ? (
                                        <span style={{ fontSize: '10.5px', color: 'var(--color-proteins)', background: 'rgba(56, 189, 248, 0.15)', padding: '3px 8px', borderRadius: '8px', fontWeight: '800', flexShrink: 0 }}>
                                          <span dir="ltr">{completedSetsCount}/{setsCount}</span> {t('setsCompleted')}
                                        </span>
                                      ) : null}
                                    </div>

                                    {/* دوگمەکانی خوارەوە: بۆشایی سێتەکان (+ و - و کاونتداون)، ڕێبەر، سێرچی گووگڵ */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {/* بۆشایی سێتەکان بە دوگمەی + و - و کاونتداونی پشوو */}
                                      <div
                                        style={{
                                          flex: 1,
                                          height: '36px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '2px 4px',
                                          borderRadius: '11px',
                                          background: isAllSetsCompleted ? 'rgba(34, 197, 94, 0.15)' : 'var(--card-subtle)',
                                          border: isAllSetsCompleted ? '1.5px solid #22c55e' : (isExerciseTimerActive ? '1.5px solid #06b6d4' : '1px solid var(--border-color)'),
                                          boxShadow: isAllSetsCompleted ? '0 0 12px rgba(34, 197, 94, 0.25)' : (isExerciseTimerActive ? '0 0 12px rgba(6, 182, 212, 0.3)' : 'none'),
                                          transition: 'all 0.25s ease'
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDecrementExerciseSet(exKey, exIdx);
                                          }}
                                          disabled={completedSetsCount === 0}
                                          title="کەمکردنەوەی سێت"
                                          style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '7px',
                                            border: 'none',
                                            background: completedSetsCount > 0 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                            color: completedSetsCount > 0 ? 'var(--text-main)' : 'rgba(255,255,255,0.2)',
                                            cursor: completedSetsCount > 0 ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <Minus size={14} />
                                        </button>

                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleIncrementExerciseSet(exKey, exIdx, setsCount, restTimeSeconds);
                                          }}
                                          title={isExerciseTimerActive ? `کاتی پشوو: ${restTimerSeconds} چرکە` : "کلیک بکە بۆ تۆمارکردن"}
                                          style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '800'
                                          }}
                                        >
                                          {/* ژمارەی سێتەکان (هەمیشە دەمێنێتەوە) */}
                                          <span style={{ fontSize: '13.5px', color: isAllSetsCompleted ? '#22c55e' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '900' }}>
                                            <span>{language === 'en' ? 'Set' : 'سێت'}</span>
                                            <span dir="ltr" style={{ display: 'inline-block', unicodeBidi: 'isolate' }}>{completedSetsCount} / {setsCount}</span>
                                            {isAllSetsCompleted && <Check size={14} style={{ color: '#22c55e', strokeWidth: 3 }} />}
                                          </span>

                                          {/* کاونتداونی پشوو لە تەنیشت ژمارەکە */}
                                          {isExerciseTimerActive && (
                                            <span style={{ color: '#06b6d4', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '800', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 7px', borderRadius: '7px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                              ⏱️ {restTimerSeconds}s
                                            </span>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleIncrementExerciseSet(exKey, exIdx, setsCount, restTimeSeconds);
                                          }}
                                          title="تەواوکردنی سێت و دەستپێکردنی کاونتداون"
                                          style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '7px',
                                            border: 'none',
                                            background: isAllSetsCompleted ? 'rgba(34, 197, 94, 0.3)' : 'var(--accent-gradient)',
                                            color: '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: isAllSetsCompleted ? 'none' : '0 2px 8px var(--accent-glow)',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <Plus size={15} />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => setActiveFormExercise(ex)}
                                        className="liquid-pill no-print"
                                        title={t('formGuide')}
                                        style={{
                                          width: '36px',
                                          height: '36px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '10px',
                                          border: '1px solid var(--border-color)',
                                          background: 'var(--card-subtle)',
                                          color: 'var(--color-proteins)',
                                          cursor: 'pointer',
                                          flexShrink: 0
                                        }}
                                      >
                                        <Info size={15} />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExerciseToSwapConfirm({ ex, exIdx });
                                        }}
                                        className="liquid-pill no-print"
                                        title={language === 'en' ? 'Swap / Replace Exercise' : 'گۆڕینی ڕاهێنان بە جێگرەوە'}
                                        aria-label="Swap Exercise"
                                        style={{
                                          width: '36px',
                                          height: '36px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '10px',
                                          border: '1px solid rgba(239, 68, 68, 0.45)',
                                          background: 'rgba(239, 68, 68, 0.12)',
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                          flexShrink: 0
                                        }}
                                      >
                                        <RefreshCw size={15} color="#ef4444" />
                                      </button>
                                    </div>

                                    {/* هێڵی باریکی پڕبوونی کاونتداونی پشوو لەبن کاردی گەورە کاتێک تایمەر دەڕوات */}
                                    {isExerciseTimerActive && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          bottom: 0,
                                          left: 0,
                                          right: 0,
                                          height: '3.5px',
                                          background: 'rgba(255, 255, 255, 0.1)',
                                          overflow: 'hidden',
                                          pointerEvents: 'none'
                                        }}
                                      >
                                        <div
                                          style={{
                                            height: '100%',
                                            width: `${Math.min(100, Math.max(0, ((restTimerTotal - restTimerSeconds) / (restTimerTotal || 60)) * 100))}%`,
                                            background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #a855f7 100%)',
                                            boxShadow: '0 0 10px rgba(6, 182, 212, 0.8)',
                                            transition: 'width 1s linear'
                                          }}
                                        />
                                      </div>
                                    )}

                                    {/* بەشی تۆمارکردنی سێتەکان کاتێک کراوەیە */}
                                    {isExpanded && renderExerciseSetLogger(ex, exKey, exIdx, setsCount, currentLogs)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <button 
                    onClick={() => toggleFinishDayWorkout(selectedDayIdx)}
                    style={{ 
                      width: '100%', padding: '16px', 
                      background: completedDayIndices.includes(selectedDayIdx) 
                        ? 'var(--accent-glow)' 
                        : 'var(--accent-gradient)', 
                      color: 'var(--text-main)', 
                      border: completedDayIndices.includes(selectedDayIdx) 
                        ? '1.5px solid var(--accent-glow)' 
                        : '1px solid rgba(255,255,255,0.3)', 
                      borderRadius: '18px', fontSize: '15px', fontWeight: '800', cursor: 'pointer',
                      boxShadow: completedDayIndices.includes(selectedDayIdx) 
                        ? '0 6px 20px var(--accent-glow)' 
                        : '0 10px 25px var(--accent-glow)', 
                      backdropFilter: 'blur(15px)'
                    }}
                  >
                    {completedDayIndices.includes(selectedDayIdx) ? <><Check size={16} className="inline-block" /> {t('completed')}</> : <>{t('finishWorkout')} <Check size={16} className="inline-block" /></>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}</React.Fragment>
      )}

      {/* ٣. پەڕەی خۆراک (Nutrition View - بە تەواوی لەسەر تابی خۆراک دەمێنێتەوە بێ گۆڕانی بەش) */}
      {activeTab === 'nutrition' && (
        <div style={{ position: 'relative', zIndex: 1, padding: '10px 14px 18px 14px', direction: currentLangConfig.dir }}>
          
          {/* ئەگەر یاریزان خشتەی نەبوو */}
          {!hasDietPlan && (
            <div style={{ minHeight: aiDietStep === 'prompt' ? '68vh' : 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '24px 20px' }}>
              {aiDietStep === 'prompt' ? (
                <div style={{ textAlign: 'center' }}>
                  {/* ئایکۆنی ڕووناک و بێ شەیپ */}
                  <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 6px 20px var(--accent-glow))' }}>
                    <UtensilsCrossed size={56} color="var(--accent-primary)" strokeWidth={1.8} />
                  </div>

                  {/* ناونیشان و دەقی ناسک */}
                  <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '10px' }}>
                    {currentLangConfig.code === 'en' ? 'Personalized Nutrition Plan' : currentLangConfig.code === 'ar' ? 'الجدول الغذائي الشخصي' : currentLangConfig.code === 'fa' ? 'برنامه تغذیه اختصاصی' : 'خشتەی خۆراکی تایبەت بە خۆت'}
                  </h2>
                  <p style={{ fontSize: '13.5px', lineHeight: '1.6', maxWidth: '340px', margin: '0 auto 26px', color: 'var(--text-muted)' }}>
                    {currentLangConfig.code === 'en' ? 'Smart AI designs a balanced 7-day scientific nutrition course tailored to your calories and goals.' : currentLangConfig.code === 'ar' ? 'يصمم الذكاء الاصطناعي جدولاً غذائياً علمياً متكاملاً لـ 7 أيام بدقة تناسب سعراتك وأهدافك.' : currentLangConfig.code === 'fa' ? 'هوش مصنوعی یک برنامه غذایی علمی ۷ روزه متناسب با وزن و اهداف شما طراحی می‌کند.' : 'سیستەمی زیرەک خشتەیەکی زانستیی ٧ ڕۆژە بەپێی کێش و کالۆریی ئامانجەکەت دادەڕێژێت.'}
                  </p>

                  {/* دوگمەی سەرەکی */}
                  <button
                    onClick={() => setAiDietStep('select')}
                    className="liquid-pill"
                    style={{
                      padding: '14px 24px',
                      background: 'var(--accent-gradient)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: '15px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      boxShadow: '0 4px 18px var(--accent-glow)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <Sparkles size={18} fill="#ffffff" />
                    <span>{currentLangConfig.code === 'en' ? 'Start Diet Setup' : currentLangConfig.code === 'ar' ? 'ابدأ في إعداد الجدول' : currentLangConfig.code === 'fa' ? 'شروع تنظیم برنامه' : 'دەستپێبکە بۆ دانانی خشتە'}</span>
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--accent-primary)', display: 'flex' }}><UtensilsCrossed size={20} color="var(--accent-primary)" /></span>
                      <h2 style={{ fontSize: '17px', fontWeight: '800' }}>
                        {currentLangConfig.code === 'en' ? 'Select Diet Protocol' : currentLangConfig.code === 'ar' ? 'اختر نمط النظام الغذائي' : currentLangConfig.code === 'fa' ? 'انتخاب نوع رژیم' : 'هەڵبژاردنی سیستەمی خۆراک'}
                      </h2>
                    </div>
                    <button
                      onClick={() => setAiDietStep('prompt')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', padding: '4px 8px' }}
                    >
                      {currentLangConfig.code === 'en' ? 'Back' : currentLangConfig.code === 'ar' ? 'رجوع' : currentLangConfig.code === 'fa' ? 'بازگشت' : 'گەڕانەوە'}
                    </button>
                  </div>
                  <p className="text-subtle" style={{ fontSize: '12.5px', marginBottom: '18px', color: 'var(--text-muted)' }}>
                    {currentLangConfig.code === 'en' ? 'Select the diet protocol for AI to create your meal plan:' : currentLangConfig.code === 'ar' ? 'اختر نمط النظام الغذائي ليقوم الذكاء الاصطناعي بإعداد خطتك:' : currentLangConfig.code === 'fa' ? 'نوع رژیم غذایی را انتخاب کنید تا هوش مصنوعی برنامه شما را بسازد:' : 'جۆری ئەو دایتە هەڵبژێرە کە دەتەوێت ئەی ئای خشتەکەتی لەسەر دروست بکات:'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    {[
                      { 
                        id: 'balanced', 
                        label: currentLangConfig.code === 'en' ? 'Balanced Diet' : currentLangConfig.code === 'ar' ? 'نظام متوازن' : currentLangConfig.code === 'fa' ? 'رژیم متعادل' : 'دایتی هاوسەنگ', 
                        icon: <Salad size={16} className="inline-block" />, 
                        desc: currentLangConfig.code === 'en' ? 'Optimal for general health and maintaining weight' : currentLangConfig.code === 'ar' ? 'مناسب للصحة العامة وتثبيت الوزن' : currentLangConfig.code === 'fa' ? 'مناسب برای سلامت عمومی و تثبیت وزن' : 'گونجاوە بۆ تەندروستی گشتی و جێگیرکردنی کێش' 
                      },
                      { 
                        id: 'keto', 
                        label: currentLangConfig.code === 'en' ? 'Keto Diet' : currentLangConfig.code === 'ar' ? 'نظام الكيتو' : currentLangConfig.code === 'fa' ? 'رژیم کتو' : 'سیستەمی کیتۆ', 
                        icon: <Egg size={16} className="inline-block" />, 
                        desc: currentLangConfig.code === 'en' ? 'Very low carbs, high healthy fats for rapid fat burning' : currentLangConfig.code === 'ar' ? 'كربوهيدرات منخفضة جداً ودهون عالية لحرق الدهون' : currentLangConfig.code === 'fa' ? 'حداقل کربوهیدرات و چربی بالا برای سوزاندن چربی' : 'کەمترین کاربۆهیدرات، زۆرترین چەوری بۆ سوتاندنی خێرای چەوری' 
                      },
                      { 
                        id: 'high_protein', 
                        label: currentLangConfig.code === 'en' ? 'High Protein' : currentLangConfig.code === 'ar' ? 'بروتين عالي' : currentLangConfig.code === 'fa' ? 'پروتئین بالا' : 'پڕۆتینی بەرز', 
                        icon: <Beef size={16} className="inline-block" />, 
                        desc: currentLangConfig.code === 'en' ? 'Ideal for building lean muscle mass and athletic recovery' : currentLangConfig.code === 'ar' ? 'مثالي لبناء وتضخيم العضلات واستشفائها' : currentLangConfig.code === 'fa' ? 'مناسب برای عضله‌سازی و بازسازی ورزشی' : 'گونجاوە بۆ دروستکردن و گەورەکردنی ماسولکە' 
                      },
                      { 
                        id: 'low_carb', 
                        label: currentLangConfig.code === 'en' ? 'Low Carb' : currentLangConfig.code === 'ar' ? 'قليل الكربوهيدرات' : currentLangConfig.code === 'fa' ? 'کم‌کربوهیدرات' : 'کاربۆهیدراتی کەم', 
                        icon: <Drumstick size={16} className="inline-block" />, 
                        desc: currentLangConfig.code === 'en' ? 'Effective fat loss without severe hunger feelings' : currentLangConfig.code === 'ar' ? 'دابەزاندنی کێش بەبێ برسیەتی زۆر' : currentLangConfig.code === 'fa' ? 'کاهش وزن موثر بدون احساس گرسنگی شدید' : 'دابەزاندنی کێش بەبێ برسیەتی زۆر' 
                      }
                    ].map(diet => (
                      <button
                        key={diet.id}
                        onClick={() => generateAiDietProgram(diet.id)}
                        disabled={isGeneratingDiet}
                        className="liquid-pill"
                        style={{ padding: '14px', textAlign: isRtl ? 'right' : 'left', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid var(--accent-glow)', cursor: 'pointer', background: 'var(--card-subtle)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                          <span>{diet.icon}</span> {diet.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{diet.desc}</div>
                      </button>
                    ))}
                  </div>

                  {isGeneratingDiet && (
                    <div style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: '800' }}>
                      {currentLangConfig.code === 'en' ? 'Preparing a scientific nutrition plan for you... ⏳' : currentLangConfig.code === 'ar' ? 'جاري تحضير جدول غذائي مخصص لك... ⏳' : currentLangConfig.code === 'fa' ? 'در حال آماده‌سازی برنامه غذایی شما... ⏳' : 'خەریکی ئامادەکردنی خشتەیەکی زانستی و پرۆفیشناڵین بۆت... ⏳'}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* بەشی سەرەکی خشتەی ژەمەکان کە بە بەردەوامی دەمێنێتەوە تا یاریزان نەیگۆڕێت یان نەسڕێتەوە */}
          {hasDietPlan && (
            <div>
              <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{t('nutrition')}</h1>
                  <div className="text-subtle" style={{ fontSize: '12px', marginTop: '2px' }}>
                    {currentLangConfig.code === 'en' ? 'Athlete Meal Plan • All Days' : currentLangConfig.code === 'ar' ? 'جدول الوجبات • كل الأيام' : currentLangConfig.code === 'fa' ? 'برنامه غذایی • همه روزها' : 'خشتەی خۆراکی یاریزان • هەموو ڕۆژەکان'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* دوگمەی گۆڕینی خشتە بە AI */}
                  <button
                    onClick={() => setShowAiDietModal(true)}
                    style={{
                      background: 'var(--accent-gradient)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 15px var(--accent-glow)'
                    }}
                    title={t('changePlan')}
                  >
                    <Sparkles size={14} color="#ffffff" />
                    <span>{t('changePlan')}</span>
                  </button>

                  {/* دوگمەی سڕینەوەی خشتەی خۆراک */}
                  <button
                    onClick={handleDeleteDietPlan}
                    className="liquid-pill"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.08)'
                    }}
                    title={t('delete')}
                  >
                    <Trash2 size={14} />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              </header>



              {renderMealJourney()}
            </div>
          )}

        </div>
      )}

      {/* ==================== مۆداڵی دیاریکردنی ڕێژە و یەکە (Portion Customization Modal) ==================== */}
      {selectedFoodForPortion && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 100000, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end', 
            padding: 0, 
            backgroundColor: 'rgba(0,0,0,0.8)', 
            backdropFilter: 'blur(8px)' 
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedFoodForPortion(null); }}
        >
          <div 
            className="modal-content bottom-sheet-content" 
            style={{ 
              width: '100%', 
              maxWidth: '480px', 
              maxHeight: '85vh', 
              overflowY: 'auto', 
              padding: '24px 20px', 
              borderRadius: '28px 28px 0 0', 
              borderTop: '1px solid var(--border-color)',
              direction: currentLangConfig.dir,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
            }}
          >
            {/* دەسکی کێشان (Top Pull Indicator) */}
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px', margin: '0 auto 16px auto' }}></div>
            
            {/* ناونیشانی خواردنەکە */}
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '30px' }}>{selectedFoodForPortion.icon}</span>
                <div>
                  <h2 style={{ fontSize: '17.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {getLocalizedFoodName(selectedFoodForPortion, language)}
                  </h2>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-carbs)', fontWeight: '600' }}>
                    {language === 'ku' ? (selectedFoodForPortion.englishName || selectedFoodForPortion.name) : (selectedFoodForPortion.englishName || selectedFoodForPortion.name)}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedFoodForPortion(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} className="inline-block" /></button>
            </div>

            {/* هەڵبژاردنی یەکەی کێشان (Portion Unit Selector) */}
            {(() => {
              const getLocalizedUnitName = (name) => {
                return getLocalizedUnit(name, language);
              };
              const isGramUnit = (portionUnitObj?.ratio === 1 || portionUnitObj?.name === 'گرام' || portionUnitObj?.name === 'g');

              return (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-muted)' }}>
                      {t('portionUnit')}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(selectedFoodForPortion.units || [{ name: 'g', ratio: 1 }]).map(u => {
                        const isUnitSelected = portionUnitObj.name === u.name;
                        const isUgram = u.ratio === 1 || u.name === 'گرام' || u.name === 'مل' || u.name === 'g' || u.name === 'ml';
                        return (
                          <button
                            key={u.name}
                            onClick={() => {
                              setPortionUnitObj(u);
                              if (isUgram) {
                                setPortionQty(selectedFoodForPortion.standardWeight || 150);
                              } else {
                                setPortionQty(1);
                              }
                            }}
                            className="liquid-pill"
                            style={{
                              padding: '8px 16px',
                              border: isUnitSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                              background: isUnitSelected ? 'var(--accent-gradient)' : 'var(--card-subtle)',
                              color: isUnitSelected ? '#ffffff' : 'var(--text-main)',
                              fontWeight: '800',
                              fontSize: '13px',
                              cursor: 'pointer'
                            }}
                          >
                            {getLocalizedUnitName(u.name)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* دیاریکردنی بڕ / ژمارە بە کۆنتڕۆڵی ڕاستەوخۆ */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-muted)' }}>
                      {t('quantity')} ({getLocalizedUnitName(portionUnitObj.name)})
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => setPortionQty(prev => Math.max(prev - (isGramUnit ? 25 : 1), 1))}
                        className="liquid-pill"
                        style={{ width: '42px', height: '46px', fontSize: '18px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        min="1"
                        value={portionQty}
                        onChange={e => setPortionQty(Math.max(Number(e.target.value) || 1, 1))}
                        style={{ flex: 1, padding: '12px', textAlign: 'center', fontSize: '19px', fontWeight: '800', borderRadius: '14px', color: 'var(--color-carbs)' }}
                      />
                      <button 
                        onClick={() => setPortionQty(prev => prev + (isGramUnit ? 25 : 1))}
                        className="liquid-pill"
                        style={{ width: '42px', height: '46px', fontSize: '18px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* ژەمی مەبەست (دوگمەی مۆر بەپێی داخوازی) */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-muted)' }}>
                      {currentLangConfig.code === 'en' ? 'Target Meal:' : currentLangConfig.code === 'ar' ? 'الوجبة المستهدفة:' : currentLangConfig.code === 'fa' ? 'وعده هدف:' : 'ژەمی مەبەست:'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'breakfast', label: t('breakfast') },
                        { id: 'lunch', label: t('lunch') },
                        { id: 'snack', label: t('snack') },
                        { id: 'dinner', label: t('dinner') }
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => setPortionMealTarget(m.id)}
                          className="liquid-pill"
                          style={{
                            padding: '10px 4px',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            textAlign: 'center',
                            cursor: 'pointer',
                            border: portionMealTarget === m.id ? '1.5px solid #a855f7' : '1px solid var(--border-color)',
                            background: portionMealTarget === m.id ? 'linear-gradient(135deg, #9333EA 0%, #6B21A8 100%)' : 'var(--card-subtle)',
                            color: portionMealTarget === m.id ? '#ffffff' : 'var(--text-main)',
                            boxShadow: portionMealTarget === m.id ? '0 0 12px rgba(168, 85, 247, 0.45)' : 'none'
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* دوگمەی کۆتایی زیادکردن */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleConfirmAddPortion}
                style={{ flex: 1, padding: '14px', background: 'var(--accent-gradient)', color: '#ffffff', border: 'none', borderRadius: '16px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 0 25px var(--accent-glow)' }}
              >
                + {t('addToMyMeal')}
              </button>
              <button 
                onClick={() => setSelectedFoodForPortion(null)} 
                className="liquid-pill" 
                style={{ padding: '14px 18px', cursor: 'pointer', fontWeight: '700' }}
              >
                {t('close')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ٤. بەشی تایبەتی زیاتر (More Section with Sub-tabs) */}
      {(activeTab === 'more' || activeTab === 'ai') && (
        <div style={{ 
          position: 'relative', 
          zIndex: 1, 
          padding: '8px 12px 10px 12px', 
          direction: currentLangConfig.dir, 
          display: 'flex', 
          flexDirection: 'column', 
          flex: moreActiveTab === 'coach' ? 1 : 'unset',
          height: moreActiveTab === 'coach' ? '100%' : 'auto', 
          minHeight: 0,
          maxWidth: '860px',
          margin: '0 auto',
          width: '100%',
          overflowX: 'hidden',
          overflowY: moreActiveTab === 'coach' ? 'hidden' : 'visible'
        }}>
          
          {/* تابی مێنیوی سەرەکیی زیاتر (More Menu Hub - 2x2 Minimal Clean Grid) */}
          {moreActiveTab === 'menu' && (
            <div className="fade-in" style={{ padding: '8px 4px 30px 4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* دوگمەی ڕاهێنەری زیرەک */}
                <button
                  type="button"
                  onClick={() => setMoreActiveTab('coach')}
                  className="liquid-pill"
                  style={{
                    padding: '24px 16px',
                    borderRadius: '22px',
                    background: 'var(--card-subtle)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
                    transition: 'all 0.25s ease',
                    outline: 'none'
                  }}
                >
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '18px',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 6px 20px var(--accent-glow)'
                  }}>
                    <Bot size={28} />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'center' }}>
                    {t('aiCoach')}
                  </span>
                </button>

                {/* دوگمەی نەخشەی سێ ڕەهەندی ماسولکەکان */}
                <button
                  type="button"
                  onClick={() => setMoreActiveTab('anatomy')}
                  className="liquid-pill"
                  style={{
                    padding: '24px 16px',
                    borderRadius: '22px',
                    background: 'var(--card-subtle)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
                    transition: 'all 0.25s ease',
                    outline: 'none'
                  }}
                >
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 6px 20px rgba(6, 182, 212, 0.4)'
                  }}>
                    <PersonStanding size={30} />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'center' }}>
                    {currentLangConfig.code === 'en' ? 'Visual Muscle Atlas' : currentLangConfig.code === 'ar' ? 'أطلس العضلات المصور' : currentLangConfig.code === 'fa' ? 'اطلس تصویری عضلات' : 'فەرهەنگی وێنەیی ماسولکەکان'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* تابی ڕاهێنەر لەناو بەشی زیاتر */}
          {moreActiveTab === 'coach' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {/* ١. سەردێڕی سەرەوەی ڕاهێنەری تایبەت */}
          <header style={{ 
            marginBottom: '10px',
            padding: '12px 16px',
            borderRadius: '20px',
            background: 'var(--accent-gradient-subtle)',
            border: '1px solid var(--accent-glow)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            position: 'sticky',
            top: 0,
            zIndex: 30
          }}>
            <div className="flex-between" style={{ alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMoreActiveTab('menu')}
                  className="liquid-pill"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: 'var(--card-subtle)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                  title={currentLangConfig.code === 'en' ? 'Back' : currentLangConfig.code === 'ar' ? 'رجوع' : currentLangConfig.code === 'fa' ? 'بازگشت' : 'گەڕانەوە'}
                >
                  {isRtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                </button>

                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 15px var(--accent-glow)',
                  flexShrink: 0
                }}>
                  <Sparkles size={20} color="#ffffff" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
                      {t('aiCoach')}
                    </h2>
                  </div>
                </div>
              </div>

              {/* دوگمەی چاتی نوێ */}
              <button
                type="button"
                onClick={() => setChatMessages([])}
                className="liquid-pill"
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '11.5px', 
                  fontWeight: '800', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  color: 'var(--text-main)', 
                  background: 'var(--card-subtle)', 
                  border: '1px solid var(--border-color)' 
                }}
                title={currentLangConfig.code === 'en' ? 'Start New Chat' : currentLangConfig.code === 'ar' ? 'بدء محادثة جديدة' : currentLangConfig.code === 'fa' ? 'شروع گفتگوی جدید' : 'دەستپێکردنەوەی چات'}
              >
                <span><RefreshCw size={16} className="inline-block" /></span>
                <span>{currentLangConfig.code === 'en' ? 'New Chat' : currentLangConfig.code === 'ar' ? 'محادثة جديدة' : currentLangConfig.code === 'fa' ? 'گفتگوی جدید' : 'چاتی نوێ'}</span>
              </button>
            </div>

            
          </header>

          {/* ٢. ناوەڕۆکی چاتی ڕاهێنەری تایبەت */}
          <div 
            ref={chatScrollRef}
            style={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '14px', 
              paddingRight: isRtl ? '0' : '6px',
              paddingLeft: isRtl ? '6px' : '0',
              marginBottom: '10px'
            }}
          >
            {chatMessages.length === 0 ? (
              /* شاشەی بەخێرهاتنی فەرمی ڕاهێنەری تایبەت لەگەڵ ٥ پێشنیارە خێراکە */
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '16px 10px',
                userSelect: 'none'
              }}>
                <div style={{ textAlign: isRtl ? 'right' : 'left', marginBottom: '18px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    background: 'var(--accent-gradient-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid var(--accent-glow)',
                    boxShadow: '0 0 25px var(--accent-glow)',
                    marginBottom: '12px'
                  }}>
                    <span style={{ color: "var(--accent-primary)", display: "flex" }}><Sparkles size={26} /></span>
                  </div>

                  <h1 style={{
                    fontSize: '24px',
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, #60A5FA 50%, var(--color-carbs) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: '0 0 6px 0',
                    letterSpacing: '-0.3px'
                  }}>
                    {t('coachGreeting')} <Hand size={16} className="inline-block" />
                  </h1>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0, fontWeight: '600', lineHeight: '1.6' }}>
                    {t('coachSubtitle')}
                  </p>
                </div>

                {/* سەردێڕی پێشنیارە خێراکان */}
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span><Sparkles size={16} className="inline-block" /></span>
                  <span>{t('quickPrompts')}:</span>
                </div>

                {/* ٥ کارتی پێشنیارکراوی زانستی بەپێی پلانەکە */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '8px'
                }}>
                  {[
                    {
                      icon: <><Salad size={16} className="inline-block" /></>,
                      title: currentLangConfig.code === 'en' ? 'Suggest a high-protein meal' : currentLangConfig.code === 'ar' ? 'اقترح وجبة غنية بالبروتين' : currentLangConfig.code === 'fa' ? 'پیشنهاد وعده غذایی پرپروتئین' : 'پێشنیاری ژەمێکی دەوڵەمەند بە پرۆتینم بۆ بکە',
                      desc: currentLangConfig.code === 'en' ? 'Macro & calorie breakdown with quick add option' : currentLangConfig.code === 'ar' ? 'تفاصيل السعرات والماكروز مع زر الإضافة السريعة' : currentLangConfig.code === 'fa' ? 'تحلیل کالری و ماکرو با امکان افزودن سریع' : 'شیکاری ماکرۆ و کالۆری لەگەڵ کارتی زیادکردن بۆ ئەپ',
                      prompt: currentLangConfig.code === 'en' ? 'Suggest a high-protein meal' : currentLangConfig.code === 'ar' ? 'اقترح وجبة غنية بالبروتين' : currentLangConfig.code === 'fa' ? 'یک وعده پرپروتئین پیشنهاد بده' : 'پێشنیاری ژەمێکی دەوڵەمەند بە پرۆتینم بۆ بکە'
                    },
                    {
                      icon: <><Dumbbell size={16} className="inline-block" /></>,
                      title: currentLangConfig.code === 'en' ? 'Adjust my workout to 5 days' : currentLangConfig.code === 'ar' ? 'عدّل تماريني إلى ٥ أيام أسبوعياً' : currentLangConfig.code === 'fa' ? 'برنامه تمرینی‌ام را به ۵ روز تنظیم کن' : 'کۆرسەکەم ڕێکبخە بۆ ٥ ڕۆژ لە هەفتەدا',
                      desc: currentLangConfig.code === 'en' ? 'Upper / Lower / Push / Pull / Legs split' : currentLangConfig.code === 'ar' ? 'تقسيم Upper / Lower / Push / Pull / Legs' : currentLangConfig.code === 'fa' ? 'تقسیم‌بندی Upper / Lower / Push / Pull / Legs' : 'داڕشتنی دابەشکردنی Upper / Lower / Push / Pull / Legs',
                      prompt: currentLangConfig.code === 'en' ? 'Adjust my workout to 5 days a week' : currentLangConfig.code === 'ar' ? 'عدل جدول تماريني إلى ٥ أيام في الأسبوع' : currentLangConfig.code === 'fa' ? 'برنامه تمرینی من را به ۵ روز در هفته تنظیم کن' : 'کۆرسەکەم بگۆڕە بۆ ٥ ڕۆژ لە هەفتەدا'
                    },
                    {
                      icon: <><Target size={16} className="inline-block" color="var(--text-main)" /></>,
                      title: currentLangConfig.code === 'en' ? 'Change goal to weight loss & fat burn' : currentLangConfig.code === 'ar' ? 'تغيير هدفي إلى إنقاص الوزن وحرق الدهون' : currentLangConfig.code === 'fa' ? 'تغییر هدف به کاهش وزن و چربی‌سوزی' : 'ئامانجم بگۆڕە بۆ دابەزاندنی کێش و سوتاندنی چەوری',
                      desc: currentLangConfig.code === 'en' ? 'Set calorie deficit and target weight' : currentLangConfig.code === 'ar' ? 'ضبط عجز السعرات والوزن المستهدف' : currentLangConfig.code === 'fa' ? 'تنظیم کسری کالری و وزن هدف' : 'دانانی کورتهێنانی کالۆری و کێشی ئامانج',
                      prompt: currentLangConfig.code === 'en' ? 'Change my goal to weight loss and fat burning' : currentLangConfig.code === 'ar' ? 'غير هدفي إلى إنقاص الوزن وحرق الدهون' : currentLangConfig.code === 'fa' ? 'هدف من را به کاهش وزن و چربی‌سوزی تغییر بده' : 'ئامانجم بگۆڕە بۆ دابەزاندنی کێش و سوتاندنی چەوری'
                    },
                    {
                      icon: <><Bandage size={16} className="inline-block" /></>,
                      title: currentLangConfig.code === 'en' ? 'I have back pain, how should I train?' : currentLangConfig.code === 'ar' ? 'عندي ألم في الظهر، كيف أتمرن؟' : currentLangConfig.code === 'fa' ? 'کمردرد دارم، چطور تمرین کنم؟' : 'ئازاری پشتم هەیە چۆن مەشق بکەم؟',
                      desc: currentLangConfig.code === 'en' ? 'Health guidelines and safe substitutions' : currentLangConfig.code === 'ar' ? 'إرشادات صحية وبدائل التمارين الآمنة' : currentLangConfig.code === 'fa' ? 'راهنمایی سلامت و جایگزینی حرکات ایمن' : 'ڕێنمایی تەندروستی و گۆڕینی مەشقە مەترسیدارەکان',
                      prompt: currentLangConfig.code === 'en' ? 'I have back pain, how should I adjust my workouts?' : currentLangConfig.code === 'ar' ? 'عندي ألم في الظهر، كيف أتمرن بأمان؟' : currentLangConfig.code === 'fa' ? 'کمردرد دارم، چطور تمریناتم را تنظیم کنم؟' : 'ئازاری پشتم هەیە چۆن مەشق بکەم؟'
                    },
                    {
                      icon: <><Droplet size={16} className="inline-block" /></>,
                      title: currentLangConfig.code === 'en' ? 'How much calories & water do I need?' : currentLangConfig.code === 'ar' ? 'كم أحتاج من السعرات والماء يومياً؟' : currentLangConfig.code === 'fa' ? 'روزانه به چقدر کالری و آب نیاز دارم؟' : 'پێویستم بە چەند کالۆری و ئاوە بەپێی کێشم؟',
                      desc: currentLangConfig.code === 'en' ? 'Scientific calculation based on your profile' : currentLangConfig.code === 'ar' ? 'حساب دقيق لاحتياجات الماء والسعرات' : currentLangConfig.code === 'fa' ? 'محاسبه دقیق کالری و آب بر اساس مشخصات شما' : 'هەژمارکردنی وردی ئاو و کالۆری بەپێی کێش',
                      prompt: currentLangConfig.code === 'en' ? 'How much calories and water do I need daily for my weight?' : currentLangConfig.code === 'ar' ? 'كم أحتاج من السعرات والماء يومياً وفقاً لوزني؟' : currentLangConfig.code === 'fa' ? 'بر اساس وزنم روزانه به چقدر آب و کالری نیاز دارم؟' : 'پێویستم بە چەند کالۆری و ئاوە بەپێی کێشم؟'
                    }
                  ].map((card, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => handleSendAiChatMessage(card.prompt)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: 'var(--card-subtle)',
                        border: '1px solid var(--border-color)',
                        textAlign: isRtl ? 'right' : 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.borderColor = 'var(--accent-glow)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--card-subtle)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{card.icon}</span>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)' }}>{card.title}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {card.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* لێشاوی پەیامەکان */
              chatMessages.map(msg => {
                const isUser = msg.sender === 'user';
                const isCopied = copiedMsgId === msg.id;
                const isLiked = likedMsgs[msg.id];

                if (isUser) {
                  return (
                    <div 
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isRtl ? 'flex-start' : 'flex-end',
                        width: '100%'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span><User size={16} className="inline-block" /> {profile.name || (currentLangConfig.code === 'en' ? 'Athlete' : currentLangConfig.code === 'ar' ? 'بطل' : currentLangConfig.code === 'fa' ? 'قهرمان' : 'پاڵەوان')}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div style={{
                        maxWidth: '85%',
                        padding: '12px 16px',
                        borderRadius: isRtl ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                        background: 'var(--accent-gradient)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        boxShadow: '0 4px 15px var(--accent-glow)',
                        wordBreak: 'break-word'
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                // پەیامی ڕاهێنەری تایبەت
                return (
                  <div 
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      width: '100%',
                      paddingBottom: '6px'
                    }}
                  >
                    {/* سەردێڕی پەیامی ڕاهێنەر Coach */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        background: 'var(--accent-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Sparkles size={15} color="#ffffff" />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                        {t('aiCoach')}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--color-proteins)', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                        {currentLangConfig.code === 'en' ? 'Smart Coach' : currentLangConfig.code === 'ar' ? 'المدرب الذكي' : currentLangConfig.code === 'fa' ? 'مربی هوشمند' : 'ڕاهێنەری زیرەک'} <Check size={16} className="inline-block" />
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {msg.timestamp}
                      </span>
                    </div>

                    <div style={{ paddingLeft: isRtl ? '0' : '34px', paddingRight: isRtl ? '34px' : '0' }}>
                      
                      {/* دەقی وەڵام بە فۆرماتی دەوڵەمەند */}
                      <div style={{
                        padding: '14px 16px',
                        borderRadius: '16px',
                        background: 'var(--card-subtle)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '13.5px',
                        lineHeight: '1.7',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                      }}>
                        {renderAntigravityFormattedText(msg.text)}
                      </div>

                      {/* کارتی کارلێککاری جێبەجێکردن لە بەرنامەدا (Interactive In-App Action Card) */}
                      {msg.action && (
                        <div className="dark-card" style={{
                          marginTop: '10px',
                          padding: '14px 16px',
                          background: msg.action.isApplied 
                            ? 'var(--accent-glow)' 
                            : 'var(--accent-gradient-subtle)',
                          border: msg.action.isApplied ? '1.5px solid var(--accent-glow)' : '1.5px solid var(--accent-glow)',
                          borderRadius: '16px',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.25)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '18px' }}>
                              {msg.action.type === 'SWITCH_COURSE' ? <><Dumbbell size={16} className="inline-block" /></> : msg.action.type === 'CHANGE_GOAL' ? <><Target size={16} className="inline-block" color="var(--text-main)" /></> : msg.action.type === 'ADD_MEAL' ? <><Utensils size={16} className="inline-block" /></> : (msg.action.type?.includes('WATER') || msg.action.title?.toString().includes('ئاو') || msg.action.title?.toString().toLowerCase().includes('water')) ? <><Droplet size={16} className="inline-block" color="#38bdf8" /></> : <><Bandage size={16} className="inline-block" /></>}
                            </span>
                            <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                              {msg.action.title}
                            </div>
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.4' }}>
                            {msg.action.description}
                          </div>

                          {msg.action.isApplied ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--color-carbs)', fontSize: '12.5px', fontWeight: '800', padding: '8px', background: 'var(--card-subtle)', borderRadius: '12px' }}>
                              <span><Check size={16} className="inline-block" /></span>
                              <span>{t('appliedSuccess')}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleExecuteAiAction(msg.action, msg)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: 'var(--accent-gradient)',
                                color: '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                fontSize: '12.5px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 6px 20px var(--accent-glow)'
                              }}
                            >
                              <span><Zap size={16} className="inline-block" /></span>
                              <span>{t('applyToApp')}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* باڕی خوارەوەی پەیام (کۆپیکردن و کاردانەوە) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(msg.text);
                              setCopiedMsgId(msg.id);
                              setTimeout(() => setCopiedMsgId(null), 2000);
                            }
                          }}
                          className="liquid-pill"
                          style={{ padding: '3px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: isCopied ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                          title={currentLangConfig.code === 'en' ? 'Copy message' : currentLangConfig.code === 'ar' ? 'نسخ الرسالة' : currentLangConfig.code === 'fa' ? 'کپی پیام' : 'کۆپیکردن'}
                        >
                          <span>{isCopied ? <><Check size={16} className="inline-block" /></> : <><Clipboard size={16} className="inline-block" /></>}</span>
                          <span>{isCopied ? (currentLangConfig.code === 'en' ? 'Copied' : currentLangConfig.code === 'ar' ? 'تم النسخ' : currentLangConfig.code === 'fa' ? 'کپی شد' : 'کۆپیکرا') : (currentLangConfig.code === 'en' ? 'Copy' : currentLangConfig.code === 'ar' ? 'نسخ' : currentLangConfig.code === 'fa' ? 'کپی' : 'کۆپیکردن')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLikedMsgs(prev => ({ ...prev, [msg.id]: prev[msg.id] === 'like' ? null : 'like' }))}
                          className="liquid-pill"
                          style={{ padding: '3px 8px', fontSize: '11px', cursor: 'pointer', color: isLiked === 'like' ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                          title={currentLangConfig.code === 'en' ? 'Helpful' : currentLangConfig.code === 'ar' ? 'مفيد' : currentLangConfig.code === 'fa' ? 'مفید بود' : 'سوپاس'}
                        >
                          <ThumbsUp size={16} className="inline-block" />
                        </button>
                      </div>

                      {/* پێشنیارە خێراکانی پەیامی دواتر */}
                      {msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                          {msg.suggestedReplies.map((replyText, rIdx) => (
                            <button
                              key={rIdx}
                              type="button"
                              onClick={() => handleSendAiChatMessage(replyText)}
                              className="liquid-pill"
                              style={{
                                padding: '5px 12px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                color: 'var(--color-calories)',
                                border: '1px solid var(--accent-glow)',
                                background: 'var(--accent-glow)',
                                transition: 'all 0.2s ease',
                                textAlign: isRtl ? 'right' : 'left'
                              }}
                            >
                              <span>{replyText}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* ئەنیمەیشنی بیرکردنەوەی سیستەم */}
            {isAiThinking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'var(--card-subtle)', borderRadius: '16px', width: 'fit-content', border: '1px solid var(--border-color)' }}>
                <Sparkles size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '12.5px', color: 'var(--color-calories)', fontWeight: '700' }}>
                  {t('aiThinking')}
                </span>
                <span style={{ display: 'inline-flex', gap: '4px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'pulse 1s infinite' }}></span>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4F46E5', animation: 'pulse 1s infinite 0.2s' }}></span>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'pulse 1s infinite 0.4s' }}></span>
                </span>
              </div>
            )}
          </div>

          {/* ٣. باڕی کەپسوولی ناردنی پرۆمپت */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendAiChatMessage(); }}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px'
            }}
          >
            {/* کەپسوولی سەرەکی پرۆمپت */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px 6px 14px',
              borderRadius: '50px',
              background: theme === 'light' ? '#ffffff' : 'var(--card-bg)',
              border: theme === 'light' ? '1.5px solid rgba(147, 51, 234, 0.35)' : '1.5px solid var(--accent-glow)',
              boxShadow: theme === 'light' ? '0 8px 24px rgba(0,0,0,0.08)' : '0 8px 30px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(20px)'
            }}>
              <button
                type="submit"
                disabled={!chatInput.trim() || isAiThinking}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: chatInput.trim() 
                    ? 'var(--accent-gradient)'
                    : (theme === 'light' ? 'rgba(0,0,0,0.06)' : 'var(--border-color)'),
                  color: chatInput.trim() ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: chatInput.trim() ? 'pointer' : 'default',
                  opacity: chatInput.trim() ? 1 : 0.6,
                  boxShadow: chatInput.trim() ? '0 6px 20px var(--accent-glow)' : 'none',
                  transition: 'all 0.25s ease'
                }}
              >
                <SendIcon size={17} color={chatInput.trim() ? '#ffffff' : 'var(--text-muted)'} />
              </button>

              <input
                type="text"
                dir={isRtl ? 'rtl' : 'ltr'}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onFocus={() => setIsChatInputFocused(true)}
                onBlur={() => setIsChatInputFocused(false)}
                placeholder={t('askAiPlaceholder')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50px',
                  color: 'var(--text-main)',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />

              

              
            </div>
          </form>
            </div>
          )}

          {/* تابی نەخشەی سێ ڕەهەندی ماسولکەکان */}
          {moreActiveTab === 'anatomy' && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setMoreActiveTab('menu')}
                  className="liquid-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '14px',
                    background: 'var(--card-subtle)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                  <span>{currentLangConfig.code === 'en' ? 'Back' : currentLangConfig.code === 'ar' ? 'رجوع' : currentLangConfig.code === 'fa' ? 'بازگشت' : 'گەڕانەوە'}</span>
                </button>

                {/* لە جیاتی ئەو نوسینە، دوو دوگمەی شیکی ماڵەوە و هۆڵ بۆ فلتەرکردنی وەرزشەکان */}
                <div style={{
                  display: 'inline-flex',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '4px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  gap: '4px'
                }}>
                  <button
                    type="button"
                    onClick={() => setAtlasLocationFilter('home')}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      background: atlasLocationFilter === 'home' 
                        ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' 
                        : 'transparent',
                      color: atlasLocationFilter === 'home' ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.25s ease',
                      boxShadow: atlasLocationFilter === 'home' ? '0 2px 12px rgba(6, 182, 212, 0.45)' : 'none'
                    }}
                  >
                    <span>🏠</span>
                    <span>{currentLangConfig.code === 'en' ? 'Home' : currentLangConfig.code === 'ar' ? 'المنزل' : currentLangConfig.code === 'fa' ? 'خانه' : 'ماڵەوە'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAtlasLocationFilter('gym')}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      background: atlasLocationFilter === 'gym' 
                        ? 'var(--accent-gradient)' 
                        : 'transparent',
                      color: atlasLocationFilter === 'gym' ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.25s ease',
                      boxShadow: atlasLocationFilter === 'gym' ? '0 2px 12px var(--accent-glow)' : 'none'
                    }}
                  >
                    <Dumbbell size={14} />
                    <span>{currentLangConfig.code === 'en' ? 'Gym' : currentLangConfig.code === 'ar' ? 'الجيم' : currentLangConfig.code === 'fa' ? 'باشگاه' : 'هۆڵ'}</span>
                  </button>
                </div>
              </div>

              <MuscleAnatomy3D
                onSelectExercise={(exName) => {
                  setActiveTab('workout');
                }}
                currentLangConfig={currentLangConfig}
                locationFilter={atlasLocationFilter}
                onLocationChange={setAtlasLocationFilter}
              />
            </div>
          )}

        </div>
      )}

      {/* ٥. پەڕەی پرۆفایل (Profile View - لەگەڵ کارتی ئامانجی یاریزان بە ئاراستە و سەهمی تەواو زانستی) */}
      {activeTab === 'profile' && (
        <div style={{ position: 'relative', zIndex: 1, padding: '10px 14px 18px 14px', direction: currentLangConfig.dir }}>
          <header className="flex-between" style={{ marginBottom: '14px' }}>
            <h1 className="title-large" style={{ fontSize: '20px' }}>{getLocalizedAthleteName(profile.name, language)}</h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button"
                onClick={() => {
                  changeTheme(theme === 'dark' ? 'light' : 'dark');
                  if (typeof playSparkleSound === 'function') playSparkleSound();
                }}
                className="liquid-pill"
                style={{ width: '38px', height: '38px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', transition: 'all 0.25s ease' }}
                title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              >
                {theme === 'dark' ? (
                  <Moon size={18} style={{ color: '#FBBF24', transition: 'transform 0.25s ease' }} />
                ) : (
                  <Sun size={18} style={{ color: '#F59E0B', transition: 'transform 0.25s ease' }} />
                )}
              </button>

              <button 
                onClick={() => setShowSettingsModal(true)}
                className="liquid-pill"
                style={{ padding: '8px 14px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <SettingsIcon size={16} />
                <span>{t('settings')}</span>
              </button>
            </div>
          </header>

          {/* کارتی سەرەکی پرۆفایل */}
          <div className="dark-card" style={{ position: 'relative', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
            {/* دوگمەی قەڵەم بۆ دەستکاری پرۆفایل لە لای چەپ */}
            <button 
              onClick={() => { setEditFormData({ ...profile }); setShowEditProfileModal(true); }}
              style={{ position: 'absolute', top: '16px', left: '16px', background: 'var(--card-subtle)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', transition: 'all 0.2s' }}
              title={t('editProfile')}
            >
              <EditIcon size={16} />
            </button>

            {/* دوگمەی دەرچوون یان چوونەژوورەوە وەک ئایکۆن لە لای ڕاست */}
            {authUser ? (
              <button 
                type="button"
                onClick={() => setShowLogoutConfirmModal(true)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', transition: 'all 0.2s' }}
                title={t('logout') || "Log Out"}
              >
                <LogOut size={16} />
              </button>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--card-subtle)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', transition: 'all 0.2s' }}
                title={t('login') || "Sign In"}
              >
                <User size={16} />
              </button>
            )}

            {/* وێنەی پرۆفایل لەگەڵ ئایکۆنی گووگڵ ئەگەر چوبێتە ژوورەوە */}
            {authUser?.photoURL ? (
              <div style={{ position: 'relative', width: '58px', height: '58px' }}>
                <img 
                  src={authUser.photoURL} 
                  alt={authUser.displayName || 'Profile'} 
                  style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)', boxShadow: '0 0 16px var(--accent-glow)' }} 
                />
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
                  <img src="https://www.google.com/favicon.ico" width="11" height="11" alt="Google" />
                </div>
              </div>
            ) : (
              <ProfilePic gender={profile.gender} size={58} />
            )}

            <h2 style={{ fontSize: '20px', fontWeight: '800', marginTop: '12px', marginBottom: '2px' }}>{getLocalizedAthleteName(profile.name, language)}</h2>

            {/* بەشی هەژمار ڕاستەوخۆ لەسەر کارتەکە */}
            {authUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                  <span style={{ fontWeight: '700' }}>{authUser.email || authUser.phoneNumber}</span>
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', marginBottom: '12px' }}>
                <button 
                  onClick={handleLogin}
                  style={{ background: '#ffffff', color: '#0f172a', border: 'none', borderRadius: '10px', padding: '6px 14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
                  title="Google"
                >
                  <img src="https://www.google.com/favicon.ico" width="14" height="14" alt="Google" />
                  <span>{currentLangConfig.code === 'en' ? 'Connect Google' : currentLangConfig.code === 'ar' ? 'ربط بجوجل' : currentLangConfig.code === 'fa' ? 'اتصال به گوگل' : 'بەستنەوە بە گووگڵ'}</span>
                </button>
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="liquid-pill"
                  style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                  title={currentLangConfig.code === 'en' ? 'Phone login' : currentLangConfig.code === 'ar' ? 'تسجيل بالهاتف' : currentLangConfig.code === 'fa' ? 'ورود با شماره موبایل' : 'چوونەژوورەوە بە ژمارەی مۆبایل'}
                >
                  <Phone size={13} color="var(--accent-primary)" />
                  <span>{currentLangConfig.code === 'en' ? 'Phone' : currentLangConfig.code === 'ar' ? 'الهاتف' : currentLangConfig.code === 'fa' ? 'موبایل' : 'مۆبایل'}</span>
                </button>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', width: '100%', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '18px', textAlign: 'center', marginTop: '8px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{profile.weight}</div>
                <div className="text-subtle" style={{ fontSize: '11px', marginTop: '2px' }}>{t('weight')} ({t('kg')})</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-carbs)' }}>{profile.targetWeight}</div>
                <div className="text-subtle" style={{ fontSize: '11px', marginTop: '2px' }}>{t('targetWeight')} ({t('kg')})</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{profile.height}</div>
                <div className="text-subtle" style={{ fontSize: '11px', marginTop: '2px' }}>{t('height')} ({t('cm')})</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{profile.age}</div>
                <div className="text-subtle" style={{ fontSize: '11px', marginTop: '2px' }}>{t('age')}</div>
              </div>
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  {profile.gender === 'female' ? <FemaleIcon size={15} color="var(--text-main)" /> : <MaleIcon size={15} color="var(--text-main)" />}
                  <span>{profile.gender === 'female' ? t('female') : t('male')}</span>
                </div>
                <div className="text-subtle" style={{ fontSize: '11px', marginTop: '2px' }}>{t('gender')}</div>
              </div>
            </div>
          </div>

          {/* کارتی ئامانجی یاریزان لەگەڵ ئاراستەی تەواو و دروستی سەهم لە هەردوو زمانی کوردی و ئینگلیزی */}
          <div className="dark-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div className="flex-between" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-primary)', display: 'flex' }}><TargetIcon size={22} color="var(--accent-primary)" /></span>
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>{t('athleteGoal')}</h3>
              </div>
              
              <div style={{ display: 'flex', gap: '6px' }}>

                <button 
                  onClick={() => { setGoalFormData({ targetWeight: profile.targetWeight, targetDays: profile.targetDays, goal: profile.goal, goalPace: profile.goalPace || 'normal', bodyGoals: profile.bodyGoals || { enlarge: [], shrink: [] } }); setShowGoalModal(true); }}
                  className="liquid-pill"
                  style={{ padding: '8px', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title={t('change')}
                >
                  <EditIcon size={14} color="var(--accent-primary)" />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              {/* ناوی ئامانجی وەرزشی (تەنها بۆ نیشاندان بەبێ چوونە ناو ئیدیت) */}
              <div 
                className="liquid-pill" 
                style={{ 
                  color: 'var(--accent-primary)', 
                  padding: '12px 14px', 
                  fontSize: '13px', 
                  fontWeight: '800', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  cursor: 'default',
                  userSelect: 'none'
                }}
              >
                <TargetIcon size={16} color="var(--accent-primary)" />
                <span style={{ flex: 1 }}>{getLocalizedGoal(profile.goal, language)}</span>
                <span style={{
                  fontSize: '11px',
                  color: profile.goalPace === 'slow' ? '#10b981' : profile.goalPace === 'fast' ? '#f59e0b' : profile.goalPace === 'very_fast' ? '#ef4444' : '#38bdf8',
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {profile.goalPace === 'slow' ? '⏱️ ' : profile.goalPace === 'fast' ? '🔥 ' : profile.goalPace === 'very_fast' ? '🚀 ' : '⚡ '}
                  {getLocalizedPace(profile.goalPace || 'normal', language)}
                </span>
              </div>

              <div className="liquid-pill" style={{ padding: '12px 14px' }}>
                <div className="text-subtle" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>{t('weight')}: {t('today')}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '800' }}>{isRtl ? '←' : '→'}</span>
                  <span>{t('targetWeight')}</span>
                </div>
                
                {/* ڕێکخستنی سەهم و ئاراستەی کێشی ئێستا بۆ کێشی ئامانج */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '800', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-main)' }}>{profile.weight} {t('kg')}</span>
                  <span style={{ color: 'var(--accent-primary)', fontSize: '18px', display: 'inline-flex', alignItems: 'center' }}>
                    {isRtl ? '←' : '→'}
                  </span>
                  <span style={{ color: 'var(--color-carbs)' }}>{profile.targetWeight} {t('kg')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* دۆخی تەندروستی */}
          <div className="dark-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HealthCrossIcon size={20} color="var(--color-carbs)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>{t('healthStatus')}</h3>
              </div>
            </div>

            {/* لیستی کێشە تەندروستییەکان یان پەیامی دڵنیاکەرەوە لە کاتی نەبوونی پێکان */}
            {profile.healthConditions && profile.healthConditions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {profile.healthConditions.map(cond => (
                  <div key={cond} className="liquid-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-glow)', border: '1px solid var(--accent-glow)', color: 'var(--color-calories)', padding: '6px 14px', fontSize: '13px', fontWeight: '800' }}>
                    <span><AlertTriangle size={16} className="inline-block" /> {cond}</span>
                    <button onClick={() => handleRemoveHealthCondition(cond)} style={{ background: 'none', border: 'none', color: 'var(--color-calories)', cursor: 'pointer', fontWeight: 'bold' }}><X size={16} className="inline-block" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', fontStyle: 'italic' }}>
                {currentLangConfig.code === 'en'
                  ? 'No health injuries recorded. Add any conditions or pain here so workouts can adjust safely.'
                  : currentLangConfig.code === 'ar'
                  ? 'صحتك مستقرة ولم تسجل أي إصابات. إذا كان لديك ألم أضفه هنا لحماية تمارينك.'
                  : currentLangConfig.code === 'fa'
                  ? 'وضعیت سلامت شما ثبت شده و آسیبی ندارید. در صورت درد اینجا اضافه کنید.'
                  : 'تەندروستیت جێگیرە و هیچ کێشەیەکت تۆمار نەکردووە (ئەگەر ئازارێکت هەیە لێرە زیادی بکە تا سیستەم ڕاهێنانەکانت بۆ بپارێزێت).'}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={newConditionInput} 
                onChange={e => setNewConditionInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddHealthCondition(); }}
                placeholder={currentLangConfig.code === 'en'
                  ? 'e.g. Knee pain, Lower back disc, Shoulder...'
                  : currentLangConfig.code === 'ar'
                  ? 'مثال: ألم الركبة، الديسك، ألم الكتف...'
                  : currentLangConfig.code === 'fa'
                  ? 'مثال: درد زانو، دیسک کمر، شانه...'
                  : 'بۆ نموونە: ئازاری ئەژنۆ، دیسک، ئازاری شان...'}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '14px', fontSize: '13px' }}
              />
              <button onClick={() => handleAddHealthCondition()} style={{ background: 'var(--accent-gradient)', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '14px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 0 15px var(--accent-glow)' }}>
                + {t('add')}
              </button>
            </div>
          </div>

          {/* کارتی سەپلیمێنت و تەواوکەرە خۆراکییەکان (Supplements & Nutritionals Card) */}
          <div className="dark-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>
                  {language === 'en' ? 'Supplements & Vitamins' : 'سەپلیمێنت و تەواوکەرە خۆراکییەکان'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplementsModal(true)}
                className="liquid-pill"
                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)' }}
              >
                <EditIcon size={13} />
                <span>{language === 'en' ? 'Edit' : 'دەستکاری'}</span>
              </button>
            </div>

            {profile.supplements && profile.supplements.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {profile.supplements.map((sup, sIdx) => {
                  const sName = typeof sup === 'string' ? sup : (sup.name || sup.englishName);
                  return (
                    <div key={sIdx} className="liquid-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.35)', color: 'var(--text-main)', padding: '6px 12px', fontSize: '12.5px', fontWeight: '700' }}>
                      <Sparkles size={13} color="#a855f7" />
                      <span>{sName}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{language === 'en' ? 'No supplements selected.' : 'هیچ سەپلیمێنتێک دیاری نەکراوە.'}</span>
                <button
                  type="button"
                  onClick={() => setShowSupplementsModal(true)}
                  className="liquid-pill"
                  style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer' }}
                >
                  + {language === 'en' ? 'Add' : 'زیادکردن'}
                </button>
              </div>
            )}
          </div>

          {/* ==================== کارتی شیکاری وێنەی لەش بە زیرەکی دەستکرد (AI Physique Vision Card) ==================== */}
          <div className="dark-card" style={{ padding: '20px', marginBottom: '20px', border: '1.5px solid var(--accent-glow)', background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)' }}>
            <div className="flex-between" style={{ marginBottom: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '900', margin: 0 }}>
                  {language === 'en' ? 'AI Physique Vision & Body Scan' : 'شیکاری وێنەی لەش بە زیرەکی دەستکرد'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhysiqueModal(true)}
                className="liquid-pill"
                style={{
                  padding: '7px 14px',
                  borderRadius: '12px',
                  background: 'var(--accent-gradient)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px var(--accent-glow)'
                }}
              >
                <Camera size={14} />
                <span>{profile.physiqueAnalysis ? (language === 'en' ? 'Re-Scan' : 'سکانەوە') : (language === 'en' ? 'Scan Body' : 'وێنەگرتن و سکان')}</span>
              </button>
            </div>

            {profile.physiqueAnalysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="liquid-pill" style={{ padding: '10px', textAlign: 'center', background: 'var(--card-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>چەوری خەمڵێنراو</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--color-carbs)' }}>{profile.physiqueAnalysis.bodyFatPercentage}%</div>
                  </div>
                  <div className="liquid-pill" style={{ padding: '10px', textAlign: 'center', background: 'var(--card-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>پێکهاتەی لەش</div>
                    <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{profile.physiqueAnalysis.bodyType}</div>
                  </div>
                </div>

                {profile.physiqueAnalysis.laggingMuscles && profile.physiqueAnalysis.laggingMuscles.length > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                    <span style={{ color: '#ef4444', fontWeight: '800' }}>ماسولکە دواکەوتووەکان: </span>
                    <span style={{ color: 'var(--text-muted)' }}>{profile.physiqueAnalysis.laggingMuscles.join(' • ')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                {language === 'en'
                  ? 'Take 3 photos (front, side, back) with guided silhouette outlines. AI evaluates body fat %, spots lagging muscles, and customizes your workout course.'
                  : 'بە گرتنی ٣ وێنە (پێشەوە، تەنیشت، دواوە) لەگەڵ چوارچێوەی ئاوتلاین، ئەی ئای هەڵسەنگاندن بۆ چەوری و ماسولکە لاوازەکان دەکات و کۆرسەکەت بە تەواوی بۆ ڕێکدەخات.'}
              </div>
            )}
          </div>

          {/* ==================== پەنێڵی بەڕێوەبەری و ڕاهێنەر (Master Coach Panel) ==================== */}
          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="liquid-card"
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.18) 0%, rgba(59, 130, 246, 0.15) 100%)',
                border: '1.5px solid rgba(168, 85, 247, 0.45)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(147, 51, 234, 0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #9333EA 0%, #3B82F6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(147, 51, 234, 0.4)'
                }}>
                  <ShieldCheck size={20} color="#ffffff" />
                </div>
                <div style={{ textAlign: currentLangConfig.dir === 'rtl' ? 'right' : 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff' }}>
                    {language === 'en' ? 'Master Coach & Admin Panel' : 'پەنێڵی بەڕێوەبەری و ڕاهێنەر'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {language === 'en' ? 'Manage Athletes, Photos & Workout Courses' : 'کۆنتڕۆڵی یاریزانان، وێنەکانی جەستە، و کۆرسەکان'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#A855F7', fontWeight: '800' }}>
                {currentLangConfig.dir === 'rtl' ? 'کردنەوە ←' : 'Open →'}
              </div>
            </button>
          </div>

          {/* ==================== دوگمەی سوور بۆ ڕێستکردنەوەی تەواوی بەرنامەکە ==================== */}
          <div style={{ marginTop: '28px', paddingTop: '14px', borderTop: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(185, 28, 28, 0.22) 100%)',
                border: '1.5px solid rgba(239, 68, 68, 0.45)',
                borderRadius: '18px',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '14px',
                fontWeight: '800',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
                transition: 'all 0.2s ease'
              }}
            >
              <Trash2 size={18} />
              <span>{currentLangConfig.code === 'en' ? 'Reset App (Fresh Start)' : currentLangConfig.code === 'ar' ? 'إعادة ضبط التطبيق (Reset App)' : currentLangConfig.code === 'fa' ? 'راه‌اندازی مجدد برنامه (Reset App)' : 'ڕێستکردنەوەی بەرنامە (Reset App)'}</span>
            </button>
          </div>
        </div>
      )}
          </main>

      {/* ==================== مۆداڵی زیرەکی دەستکرد بۆ دۆزینەوەی خواردن (AI Food Finder Modal - Bottom Sheet) ==================== */}
      {showAiFoodModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end', 
            padding: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAiFoodModal(false);
          }}
        >
          <div 
            className="modal-content bottom-sheet-content" 
            style={{ 
              width: '100%', 
              maxWidth: '480px', 
              maxHeight: '85vh', 
              overflowY: 'auto', 
              padding: '20px 20px 28px 20px', 
              borderRadius: '28px 28px 0 0', 
              borderTop: '1px solid var(--border-color)', 
              direction: currentLangConfig.dir,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
            }}
          >
            {/* دەسکی کێشان (Top Pull Indicator) */}
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px', margin: '0 auto 16px auto', flexShrink: 0 }}></div>

            <div className="flex-between" style={{ marginBottom: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-primary)', display: 'flex' }}><Sparkles size={20} color="var(--accent-primary)" /></span>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{t('aiFoodSearch')}</h2>
              </div>
              <button 
                onClick={() => setShowAiFoodModal(false)} 
                className="liquid-pill"
                style={{ width: '34px', height: '34px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--text-main)', background: 'var(--card-subtle)' }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-subtle" style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
              {currentLangConfig.code === 'en' ? 'Type the name of any local or international food, and AI will estimate calories and nutrients:' : currentLangConfig.code === 'ar' ? 'اكتب اسم أي وجبة محلية أو عالمية، وسيقوم الذكاء الاصطناعي بتقدير السعرات والقيم الغذائية:' : currentLangConfig.code === 'fa' ? 'نام هر غذای محلی یا بین‌المللی را وارد کنید، هوش مصنوعی کالری و مواد مغذی را محاسبه می‌کند:' : 'ناوی هەر خواردنێکی کوردی یان جیهانی بنووسە، سیستەمی پێشکەوتوو ڕاستەوخۆ کالۆری و تەواوی پێکهاتەکانی دەخەمڵێنێت:'}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <input 
                type="text" 
                value={aiCustomInput} 
                onChange={e => setAiCustomInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && aiCustomInput.trim()) handleAiFindFood(aiCustomInput); }}
                placeholder={currentLangConfig.code === 'en' ? 'e.g. Dolma, Biryani, Pizza, Pasta...' : currentLangConfig.code === 'ar' ? 'مثلاً: دولمة، برياني، بيتزا، معكرونة...' : currentLangConfig.code === 'fa' ? 'مثلاً: دلمه، بریانی، پیتزا، ماکارونی...' : 'بۆ نموونە: دۆڵمە، بریانی، پیتزا، ماکەرۆنی...'}
                style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', fontSize: '14px' }}
              />
            </div>

            {/* پێشنیارە خێراکان */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '700' }}>
                {currentLangConfig.code === 'en' ? 'Quick Suggestions:' : currentLangConfig.code === 'ar' ? 'اقتراحات سريعة:' : currentLangConfig.code === 'fa' ? 'پیشنهادات سریع:' : 'پێشنیارە خێراکان:'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(currentLangConfig.code === 'en' 
                  ? ['Kurdish Dolma', 'Meat Biryani', 'Chicken Shawarma', 'Pepperoni Pizza', 'Protein Shake', 'Roast Lamb with Rice']
                  : currentLangConfig.code === 'ar'
                  ? ['دولمة كردية', 'برياني باللحم', 'شاورما دجاج', 'بيتزا بيبروني', 'بروتين شيك', 'قوزي على الرز']
                  : currentLangConfig.code === 'fa'
                  ? ['دلمه کردی', 'بریانی گوشت', 'شاورما مرغ', 'پیتزا پپرونی', 'شیک پروتئین', 'چلو گوشت / قوزی']
                  : ['دۆڵمەی کوردی', 'بریانی بە گۆشت', 'شاورمەی مریشک', 'پیتزای بیبەرۆنی', 'پڕۆتین شێک', 'قۆزی سەر برنج']
                ).map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => handleAiFindFood(suggestion)}
                    className="liquid-pill"
                    style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: 'var(--color-carbs)', border: '1px solid var(--color-carbs)' }}
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => handleAiFindFood(aiCustomInput)}
                disabled={!aiCustomInput.trim() || isAiProcessing}
                style={{ flex: 1, padding: '14px', background: 'var(--accent-gradient)', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 0 25px var(--accent-glow)' }}
              >
                {isAiProcessing ? (currentLangConfig.code === 'en' ? 'Analyzing...' : currentLangConfig.code === 'ar' ? 'جارٍ التحليل...' : currentLangConfig.code === 'fa' ? 'در حال تحلیل...' : 'خەریکی شیکارییە...') : <><Sparkles size={16} className="inline-block" /> {currentLangConfig.code === 'en' ? 'Find & Estimate Portion' : currentLangConfig.code === 'ar' ? 'بحث وتحديد الكمية' : currentLangConfig.code === 'fa' ? 'یافتن و تعیین مقدار' : 'دۆزینەوە و دیاریکردنی بڕ'}</>}
              </button>
              <button onClick={() => setShowAiFoodModal(false)} className="liquid-pill" style={{ padding: '14px 18px', cursor: 'pointer', fontWeight: '700' }}>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== مۆداڵی ئاگادارییەکان (Notifications Modal - Bottom Sheet) ==================== */}
      {showNotificationsModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end', 
            padding: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNotificationsModal(false);
          }}
        >
          <div 
            className="modal-content bottom-sheet-content" 
            style={{ 
              width: '100%', 
              maxWidth: '480px', 
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '20px 20px 28px 20px', 
              borderRadius: '28px 28px 0 0',
              borderTop: '1px solid var(--border-color)',
              direction: currentLangConfig.dir,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
            }}
          >
            {/* دەسکی کێشان (Top Pull Indicator) */}
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px', margin: '0 auto 16px auto', flexShrink: 0 }}></div>

            <div className="flex-between" style={{ marginBottom: '18px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-primary)', display: 'flex' }}><BellIcon size={20} color="var(--accent-primary)" /></span>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{t('notifications')}</h2>
              </div>
              <button 
                onClick={() => setShowNotificationsModal(false)} 
                className="liquid-pill"
                style={{ width: '34px', height: '34px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--text-main)', background: 'var(--card-subtle)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '320px', overflowY: 'auto' }}>
              {notifications.map(item => (
                <div key={item.id} className="liquid-pill" style={{ padding: '14px', border: item.unread ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)', background: item.unread ? 'var(--accent-glow)' : 'var(--card-subtle)' }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px' }}>
                      <span>{item.icon}</span>
                      <span>{item.title}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.time}</span>
                  </div>
                  <div className="text-subtle" style={{ fontSize: '12.5px', marginTop: '4px', lineHeight: '1.4' }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleMarkAllNotificationsAsRead} className="liquid-pill" style={{ flex: 1, padding: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', color: 'var(--color-carbs)' }}>
                <Check size={16} className="inline-block" /> {currentLangConfig.code === 'en' ? 'Mark All as Read' : currentLangConfig.code === 'ar' ? 'تحديد الكل كمقروء' : currentLangConfig.code === 'fa' ? 'علامت‌گذاری همه به عنوان خوانده‌شده' : 'خوێندنەوەی هەمووی'}
              </button>
              <button onClick={() => setShowNotificationsModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--accent-gradient)', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== مۆداڵی داڕشتنی کۆرس (AI Dynamic Course Engine - هەمووی لە یەک پەڕە) ==================== */}
      {showNewCourseModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '20px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isGeneratingAiCourse) setShowNewCourseModal(false);
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              width: '100%', 
              maxWidth: '480px', 
              maxHeight: '90vh', 
              overflowY: 'auto', 
              padding: '24px', 
              borderRadius: '24px',
              direction: currentLangConfig.dir 
            }}
          >
            {/* سەردێڕ */}
            <div className="flex-between" style={{ marginBottom: '18px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px var(--accent-glow)' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
                    {currentLangConfig.code === 'en' ? 'Design Scientific Program' : currentLangConfig.code === 'ar' ? 'تصميم برنامج علمي' : currentLangConfig.code === 'fa' ? 'طراحی برنامه علمی' : 'داڕشتنی کۆرسی زانستی'}
                  </h2>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {currentLangConfig.code === 'en' ? 'Configure schedule, goals, and focus muscle groups' : currentLangConfig.code === 'ar' ? 'تحديد الأيام، الأهداف، والعضلات المستهدفة' : currentLangConfig.code === 'fa' ? 'تعیین روزها، اهداف و عضلات هدف' : 'دیاریکردنی کات، ئامانجەکان و بەشەکانی جەستە'}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowNewCourseModal(false)} 
                disabled={isGeneratingAiCourse}
                style={{ background: 'var(--card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* ١. بەشی ڕۆژەکان و کاتی وەرزش (Workout Days Availability) */}
            <div style={{ marginBottom: '18px' }}>
              <div className="flex-between" style={{ marginBottom: '10px', alignItems: 'center' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarDays size={16} color="var(--accent-primary)" />
                  <span>{currentLangConfig.code === 'en' ? 'How many days can you train per week?' : currentLangConfig.code === 'ar' ? 'كم يوماً يمكنك التمرين أسبوعياً؟' : currentLangConfig.code === 'fa' ? 'چند روز در هفته فرصت ورزش دارید؟' : 'چەند ڕۆژ مەجالی وەرزشت هەیە؟'}</span>
                </div>
                {aiDaysRecommendation.loading ? (
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{currentLangConfig.code === 'en' ? 'Analyzing...' : currentLangConfig.code === 'ar' ? 'جارٍ التحليل...' : currentLangConfig.code === 'fa' ? 'در حال تحلیل...' : 'شیکاری...'}</span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--color-carbs)', fontWeight: '800' }}>
                    {currentLangConfig.code === 'en' ? `Recommended: ${aiDaysRecommendation.days} Days` : currentLangConfig.code === 'ar' ? `المقترح: ${aiDaysRecommendation.days} أيام` : currentLangConfig.code === 'fa' ? `پیشنهادی: ${aiDaysRecommendation.days} روز` : `پێشنیاری سیستەم: ${aiDaysRecommendation.days} ڕۆژ`}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '12px' }}>
                {[2, 3, 4, 5, 6].map(d => {
                  const isSel = builderDaysCount === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setBuilderDaysCount(d)}
                      className="liquid-pill"
                      style={{
                        padding: '10px 4px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        border: isSel ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: isSel ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                        color: isSel ? '#ffffff' : 'var(--text-main)'
                      }}
                    >
                      <div>{d} {currentLangConfig.code === 'en' ? 'Days' : currentLangConfig.code === 'ar' ? 'أيام' : currentLangConfig.code === 'fa' ? 'روز' : 'ڕۆژ'}</div>
                      {d === (aiDaysRecommendation.days || 4) && <div style={{ fontSize: '9px', color: isSel ? '#fff' : 'var(--color-carbs)', marginTop: '2px' }}>{currentLangConfig.code === 'en' ? 'Smart⭐' : currentLangConfig.code === 'ar' ? 'مقترح⭐' : currentLangConfig.code === 'fa' ? 'پیشنهادی⭐' : 'پێشنیار⭐'}</div>}
                    </button>
                  );
                })}
              </div>

              {/* شوێنی ڕاهێنان (Gym / Home) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCourseLocation('gym')}
                  className="liquid-pill"
                  style={{
                    padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                    border: courseLocation === 'gym' ? 'none' : '1px solid var(--border-color)',
                    background: courseLocation === 'gym' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    color: courseLocation === 'gym' ? '#ffffff' : 'var(--text-main)',
                    boxShadow: courseLocation === 'gym' ? '0 4px 14px var(--accent-glow)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Dumbbell size={15} color={courseLocation === 'gym' ? '#ffffff' : 'currentColor'} /> {t('locationGym') || (currentLangConfig.code === 'en' ? 'Gym Workout' : currentLangConfig.code === 'ar' ? 'نادي رياضي' : currentLangConfig.code === 'fa' ? 'باشگاه' : 'هۆڵی لەشجوانی')}
                </button>
                <button
                  type="button"
                  onClick={() => setCourseLocation('home')}
                  className="liquid-pill"
                  style={{
                    padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                    border: courseLocation === 'home' ? 'none' : '1px solid var(--border-color)',
                    background: courseLocation === 'home' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    color: courseLocation === 'home' ? '#ffffff' : 'var(--text-main)',
                    boxShadow: courseLocation === 'home' ? '0 4px 14px var(--accent-glow)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <UIIcon name="Home" size={15} color={courseLocation === 'home' ? '#ffffff' : 'currentColor'} /> {t('locationHome') || (currentLangConfig.code === 'en' ? 'Home Workout' : currentLangConfig.code === 'ar' ? 'تمارين منزلية' : currentLangConfig.code === 'fa' ? 'تمرین در خانه' : 'ماڵەوە')}
                </button>
              </div>

              {courseLocation === 'home' && (
                <div style={{ animation: 'fadeIn 0.3s ease-in-out', marginTop: '8px' }}>
                  <input 
                    type="text" 
                    value={homeEquipment} 
                    onChange={e => setHomeEquipment(e.target.value)} 
                    placeholder={currentLangConfig.code === 'en' ? 'List home equipment: dumbbells, bands, or none...' : currentLangConfig.code === 'ar' ? 'اكتب أدواتك: دمبل، حبال مقاومة، أو بدون...' : currentLangConfig.code === 'fa' ? 'تجهیزات خود را بنویسید: دمبل، کش، یا هیچ...' : 'ئامێرەکانت بنووسە: دەمبڵ، لاستیک، یان هیچ...'}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '12px' }}
                  />
                </div>
              )}
            </div>

            {/* ٢. بەشی ئامانجی یاریزان و کێش (Athlete Goal & Presets) */}
            <div style={{ marginBottom: '18px' }}>
              <div className="flex-between" style={{ marginBottom: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Target size={16} color="var(--accent-primary)" />
                  <span>{t('goal') || (currentLangConfig.code === 'en' ? 'Fitness Goal:' : currentLangConfig.code === 'ar' ? 'هدف التمرين:' : currentLangConfig.code === 'fa' ? 'هدف تمرین:' : 'ئامانجی ڕاهێنان:')}:</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTriggerAiGoalSuggestion('smart')}
                  disabled={isAiSuggestingGoal}
                  style={{
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: '1px solid var(--border-color)',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 12px var(--accent-glow)'
                  }}
                >
                  <Sparkles size={12} color="#ffffff" />
                  <span>{isAiSuggestingGoal ? (currentLangConfig.code === 'en' ? 'Analyzing...' : currentLangConfig.code === 'ar' ? 'تحليل...' : currentLangConfig.code === 'fa' ? 'تحلیل...' : 'شیکاری...') : (currentLangConfig.code === 'en' ? 'AI Suggestion' : currentLangConfig.code === 'ar' ? 'اقتراح ذكي' : currentLangConfig.code === 'fa' ? 'پیشنهاد هوشمند' : 'پێشنیاری سیستەم')}</span>
                </button>
              </div>

              {/* پەیامی سەرکەوتنی پێشنیاری سیستەم */}
              {aiGoalSuccessMsg && (
                <div style={{ background: 'var(--card-subtle)', border: '1px solid var(--accent-primary)', color: 'var(--color-carbs)', padding: '6px 12px', borderRadius: '10px', fontSize: '11.5px', fontWeight: '800', marginBottom: '8px', textAlign: 'center' }}>
                  {aiGoalSuccessMsg}
                </div>
              )}

              {/* هەڵبژاردنی ئامانج بە ٣ بەشی سەرەکی */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleTriggerAiGoalSuggestion('bulk')}
                  className="liquid-pill"
                  style={{ 
                    padding: '11px 4px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', textAlign: 'center', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    color: (goalFormData.goal?.includes('زیادکردن') || goalFormData.goal?.includes('Bulk')) ? '#ffffff' : 'var(--text-main)', 
                    border: (goalFormData.goal?.includes('زیادکردن') || goalFormData.goal?.includes('Bulk')) ? 'none' : '1px solid var(--border-color)',
                    background: (goalFormData.goal?.includes('زیادکردن') || goalFormData.goal?.includes('Bulk')) ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    boxShadow: (goalFormData.goal?.includes('زیادکردن') || goalFormData.goal?.includes('Bulk')) ? '0 4px 14px var(--accent-glow)' : 'none'
                  }}
                >
                  <BicepsFlexed size={16} color={(goalFormData.goal?.includes('زیادکردن') || goalFormData.goal?.includes('Bulk')) ? '#ffffff' : 'currentColor'} />
                  <span>{currentLangConfig.code === 'en' ? 'Muscle Gain' : currentLangConfig.code === 'ar' ? 'زيادة العضلات' : currentLangConfig.code === 'fa' ? 'رشد عضلات' : 'گەشەی ماسولکە'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerAiGoalSuggestion('cut')}
                  className="liquid-pill"
                  style={{ 
                    padding: '11px 4px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', textAlign: 'center', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    color: (goalFormData.goal?.includes('دابەزاندن') || goalFormData.goal?.includes('چەوری') || goalFormData.goal?.includes('Cut')) ? '#ffffff' : 'var(--text-main)', 
                    border: (goalFormData.goal?.includes('دابەزاندن') || goalFormData.goal?.includes('چەوری') || goalFormData.goal?.includes('Cut')) ? 'none' : '1px solid var(--border-color)',
                    background: (goalFormData.goal?.includes('دابەزاندن') || goalFormData.goal?.includes('چەوری') || goalFormData.goal?.includes('Cut')) ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    boxShadow: (goalFormData.goal?.includes('دابەزاندن') || goalFormData.goal?.includes('چەوری') || goalFormData.goal?.includes('Cut')) ? '0 4px 14px var(--accent-glow)' : 'none'
                  }}
                >
                  <Flame size={16} color={(goalFormData.goal?.includes('دابەزاندن') || goalFormData.goal?.includes('چەوری') || goalFormData.goal?.includes('Cut')) ? '#ffffff' : 'currentColor'} />
                  <span>{currentLangConfig.code === 'en' ? 'Fat Loss' : currentLangConfig.code === 'ar' ? 'حرق الدهون' : currentLangConfig.code === 'fa' ? 'چربی‌سوزی' : 'سوتاندنی چەوری'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerAiGoalSuggestion('recomp')}
                  className="liquid-pill"
                  style={{ 
                    padding: '11px 4px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', textAlign: 'center', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    color: (goalFormData.goal?.includes('جێگیر') || goalFormData.goal?.includes('Recomposition')) ? '#ffffff' : 'var(--text-main)', 
                    border: (goalFormData.goal?.includes('جێگیر') || goalFormData.goal?.includes('Recomposition')) ? 'none' : '1px solid var(--border-color)',
                    background: (goalFormData.goal?.includes('جێگیر') || goalFormData.goal?.includes('Recomposition')) ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    boxShadow: (goalFormData.goal?.includes('جێگیر') || goalFormData.goal?.includes('Recomposition')) ? '0 4px 14px var(--accent-glow)' : 'none'
                  }}
                >
                  <Zap size={16} color={(goalFormData.goal?.includes('جێگیر') || goalFormData.goal?.includes('Recomposition')) ? '#ffffff' : 'currentColor'} />
                  <span>{currentLangConfig.code === 'en' ? 'Maintain' : currentLangConfig.code === 'ar' ? 'تثبيت الوزن' : currentLangConfig.code === 'fa' ? 'تثبیت وزن' : 'جێگیرکردنی کێش'}</span>
                </button>
              </div>

              {/* کێشی ئامانج (کگ) بە تەنیا لەگەڵ دوگمەی + و - */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card-subtle)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={16} color="var(--accent-primary)" />
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '700' }}>{t('targetWeight')}:</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'ltr' }}>
                  <button
                    type="button"
                    onClick={() => setGoalFormData(prev => ({ 
                      ...prev, 
                      targetWeight: Math.max(30, (Number(prev.targetWeight) || profile.weight || 70) - 1) 
                    }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Minus size={15} />
                  </button>

                  <input 
                    type="number" 
                    value={goalFormData.targetWeight} 
                    onChange={e => setGoalFormData({ ...goalFormData, targetWeight: Number(e.target.value) })} 
                    style={{ 
                      width: '60px', 
                      padding: '6px 4px', 
                      borderRadius: '10px', 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-main)', 
                      fontSize: '15px', 
                      textAlign: 'center', 
                      fontWeight: '900' 
                    }} 
                  />

                  <button
                    type="button"
                    onClick={() => setGoalFormData(prev => ({ 
                      ...prev, 
                      targetWeight: (Number(prev.targetWeight) || profile.weight || 70) + 1 
                    }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Plus size={15} />
                  </button>

                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginLeft: '2px' }}>{t('kg')}</span>
                </div>
              </div>
            </div>

            {/* خێرایی گەیشتن بە ئامانج (Goal Pace: Slow, Normal, Fast, Very Fast) */}
            {(() => {
              const paceConfigs = [
                { id: 'slow', label: t('paceSlow') || 'هێواش', color: '#10b981', bg: 'linear-gradient(135deg, #10b981, #059669)', glow: 'rgba(16, 185, 129, 0.4)', badgeBg: 'rgba(16, 185, 129, 0.12)', badgeBorder: 'rgba(16, 185, 129, 0.3)' },
                { id: 'normal', label: t('paceNormal') || 'ئاسایی', color: '#38bdf8', bg: 'linear-gradient(135deg, #0284c7, #2563eb)', glow: 'rgba(56, 189, 248, 0.4)', badgeBg: 'rgba(56, 189, 248, 0.12)', badgeBorder: 'rgba(56, 189, 248, 0.3)' },
                { id: 'fast', label: t('paceFast') || 'خێرا', color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #ea580c)', glow: 'rgba(245, 158, 11, 0.4)', badgeBg: 'rgba(245, 158, 11, 0.12)', badgeBorder: 'rgba(245, 158, 11, 0.3)' },
                { id: 'very_fast', label: t('paceVeryFast') || 'زۆر خێرا', color: '#ef4444', bg: 'linear-gradient(135deg, #ef4444, #dc2626)', glow: 'rgba(239, 68, 68, 0.4)', badgeBg: 'rgba(239, 68, 68, 0.12)', badgeBorder: 'rgba(239, 68, 68, 0.3)' }
              ];
              const activePace = paceConfigs.find(p => p.id === (goalFormData.goalPace || 'normal')) || paceConfigs[1];

              return (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} color={activePace.color} />
                      <span>{t('goalPace') || 'خێرایی گەیشتن بە ئامانج'}:</span>
                    </div>
                    <span style={{ fontSize: '11px', color: activePace.color, fontWeight: '800', background: activePace.badgeBg, padding: '2px 8px', borderRadius: '8px', border: `1px solid ${activePace.badgeBorder}` }}>
                      {getLocalizedPace(goalFormData.goalPace || 'normal', language)}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {paceConfigs.map(p => {
                      const isSelected = (goalFormData.goalPace || 'normal') === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const currentW = Number(profile.weight) || 75;
                            const targetW = Number(goalFormData.targetWeight) || currentW;
                            const delta = Math.abs(targetW - currentW);
                            const weeklyRate = p.id === 'slow' ? 0.3 : p.id === 'normal' ? 0.5 : p.id === 'fast' ? 0.75 : 1.0;
                            const autoDays = delta > 0 ? Math.max(p.id === 'very_fast' ? 14 : 20, Math.round((delta / weeklyRate) * 7)) : (goalFormData.targetDays || 45);

                            setGoalFormData(prev => ({
                              ...prev,
                              goalPace: p.id,
                              targetDays: autoDays
                            }));
                          }}
                          style={{
                            padding: '11px 4px',
                            borderRadius: '12px',
                            border: isSelected ? `1.5px solid ${p.color}` : '1px solid var(--border-color)',
                            background: isSelected ? p.bg : 'var(--card-subtle)',
                            color: isSelected ? '#ffffff' : 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? `0 4px 14px ${p.glow}` : 'none',
                            fontSize: '12px',
                            fontWeight: '800',
                            textAlign: 'center'
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ٣. بەشی ئامانجی جەستەیی: گەورەکردن و بچووککردن */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12.5px', color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Target size={15} color="var(--accent-primary)" />
                <span>{t('bodyGoalsTitle')} ({currentLangConfig.code === 'en' ? 'Target Muscles' : currentLangConfig.code === 'ar' ? 'العضلات المستهدفة' : currentLangConfig.code === 'fa' ? 'عضلات هدف' : 'سەرنجی ماسولکەکان'}):</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'var(--card-subtle)', padding: '10px 12px', borderRadius: '14px', border: '1px solid var(--accent-glow)' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--accent-primary)', marginBottom: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <BicepsFlexed size={13} /> {t('enlargeBody')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {(profile.gender === 'female' ? FEMALE_BODY_PARTS : MALE_BODY_PARTS).map(part => (
                      <label key={`cg-enlarge-${part.id}`} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11.5px', color: 'var(--text-main)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={goalFormData.bodyGoals?.enlarge?.includes(part.id)}
                          onChange={(e) => {
                            const newEnlarge = e.target.checked 
                              ? [...(goalFormData.bodyGoals?.enlarge || []), part.id] 
                              : (goalFormData.bodyGoals?.enlarge || []).filter(id => id !== part.id);
                            const newShrink = (goalFormData.bodyGoals?.shrink || []).filter(id => id !== part.id);
                            setGoalFormData({ ...goalFormData, bodyGoals: { enlarge: newEnlarge, shrink: newShrink }});
                          }}
                          style={{ accentColor: 'var(--accent-primary)', width: '15px', height: '15px' }}
                        />
                        {part[currentLangConfig.code] || part.en || part.ku}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--card-subtle)', padding: '10px 12px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--color-carbs)', marginBottom: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <Flame size={13} /> {t('shrinkBody')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {(profile.gender === 'female' ? FEMALE_BODY_PARTS : MALE_BODY_PARTS).map(part => (
                      <label key={`cg-shrink-${part.id}`} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11.5px', color: 'var(--text-main)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={goalFormData.bodyGoals?.shrink?.includes(part.id)}
                          onChange={(e) => {
                            const newShrink = e.target.checked 
                              ? [...(goalFormData.bodyGoals?.shrink || []), part.id] 
                              : (goalFormData.bodyGoals?.shrink || []).filter(id => id !== part.id);
                            const newEnlarge = (goalFormData.bodyGoals?.enlarge || []).filter(id => id !== part.id);
                            setGoalFormData({ ...goalFormData, bodyGoals: { enlarge: newEnlarge, shrink: newShrink }});
                          }}
                          style={{ accentColor: 'var(--color-carbs)', width: '15px', height: '15px' }}
                        />
                        {part[currentLangConfig.code] || part.en || part.ku}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ٤. پێشبینینی ڕاستەوخۆی کالۆری پێویست بەپێی ئەم ئامانجە */}
            {(() => {
              const previewCalc = calculateScientificGoalByAi({
                ...profile,
                targetWeight: Number(goalFormData.targetWeight) || profile.weight,
                targetDays: Number(goalFormData.targetDays) || 45,
                goal: goalFormData.goal,
                goalPace: goalFormData.goalPace || 'normal'
              });

              return (
                <div className="dark-card" style={{ padding: '10px 12px', marginBottom: '18px', background: 'var(--accent-glow)', border: '1px solid var(--accent-glow)' }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>
                      {currentLangConfig.code === 'en' ? 'Target Daily Calories:' : currentLangConfig.code === 'ar' ? 'السعرات المستهدفة حسب الهدف:' : currentLangConfig.code === 'fa' ? 'کالری مورد نیاز بر اساس هدف:' : 'کالۆری پێویست بەپێی ئامانج:'}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>{previewCalc.goalCalories} <span style={{ fontSize: '11px', color: 'var(--color-carbs)' }}>{t('kcal')}</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-main)', borderTop: '1px solid var(--border-color)', paddingTop: '5px' }}>
                    <span><Beef size={14} className="inline-block" /> {t('protein')}: <b style={{ color: 'var(--color-proteins)' }}>{previewCalc.goalProtein}g</b></span>
                    <span><Wheat size={14} className="inline-block" /> {t('carbs')}: <b style={{ color: 'var(--color-carbs)' }}>{previewCalc.goalCarbs}g</b></span>
                    <span><Cookie size={14} className="inline-block" /> {t('fat')}: <b style={{ color: 'var(--color-calories)' }}>{previewCalc.goalFat}g</b></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '5px', marginTop: '5px' }}>
                    <span>⏳ {language === 'en' ? 'Estimated Duration:' : 'ماوەی پێشبینیکراو:'} <b style={{ color: 'var(--text-main)' }}>{previewCalc.targetDays} {language === 'en' ? 'Days' : 'ڕۆژ'}</b></span>
                    <span>⏱️ {language === 'en' ? 'Rest:' : 'پشوو:'} <b style={{ color: 'var(--color-carbs)' }}>{(goalFormData.goalPace || 'normal') === 'slow' ? '90s' : (goalFormData.goalPace || 'normal') === 'fast' ? '45s' : (goalFormData.goalPace || 'normal') === 'very_fast' ? '35s' : '60s'}</b></span>
                  </div>
                </div>
              );
            })()}

            {/* ٥. دوگمەی داڕشتن لە خوارەوە */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                onClick={() => handleGenerateCustomCourse(builderDaysCount)}
                disabled={isGeneratingAiCourse}
                style={{ flex: 1, padding: '14px', background: 'var(--accent-gradient)', color: '#ffffff', border: 'none', borderRadius: '16px', fontSize: '13.5px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 0 25px var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isGeneratingAiCourse ? (
                  <span>{currentLangConfig.code === 'en' ? 'Designing Scientific Program...' : currentLangConfig.code === 'ar' ? 'جارٍ تصميم البرنامج العلمي...' : currentLangConfig.code === 'fa' ? 'در حال طراحی برنامه علمی...' : 'خەریکی داڕشتنی زانستییە...'}</span>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>{currentLangConfig.code === 'en' ? `Design Scientific Program for ${builderDaysCount} Days` : currentLangConfig.code === 'ar' ? `تصميم برنامج علمي لـ ${builderDaysCount} أيام` : currentLangConfig.code === 'fa' ? `طراحی برنامه علمی برای ${builderDaysCount} روز` : `داڕشتنی کۆرسی زانستی بۆ ${builderDaysCount} ڕۆژ`}</span>
                  </>
                )}
              </button>

              <button 
                type="button"
                onClick={() => setShowNewCourseModal(false)} 
                disabled={isGeneratingAiCourse}
                className="liquid-pill" 
                style={{ padding: '14px 18px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
              >
                {t('close')}
              </button>
            </div>

          </div>
        </div>
      )}

      
      {/* مۆداڵی خشتەی خۆراکی پێشکەوتوو (AI Diet Modal) */}
      {showAiDietModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '460px', padding: '24px', direction: currentLangConfig.dir }}>
            
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#06B6D4', display: 'flex' }}><Sparkles size={22} color="#06B6D4" /></span>
                <h2 style={{ fontSize: '19px', fontWeight: '800' }}>
                  {currentLangConfig.code === 'en' ? 'Smart Nutrition Plans' : currentLangConfig.code === 'ar' ? 'الخطط الغذائية الذكية' : currentLangConfig.code === 'fa' ? 'برنامه‌های غذایی هوشمند' : 'خشتەی پێشکەوتوو'}
                </h2>
              </div>
              <button onClick={() => setShowAiDietModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer' }}><UIIcon name="X" size={16} /></button>
            </div>
            
            <p className="text-subtle" style={{ fontSize: '13px', marginBottom: '20px', lineHeight: '1.6' }}>
              {currentLangConfig.code === 'en' ? 'To replace your current plan with a new one, select your preferred diet protocol for AI generation:' : currentLangConfig.code === 'ar' ? 'إذا كنت ترغب في استبدال خطتك الحالية بأخرى جديدة، يرجى اختيار النمط الغذائي الذي تريده:' : currentLangConfig.code === 'fa' ? 'اگر می‌خواهید برنامه فعلی را با برنامه جدید جایگزین کنید، لطفاً نوع رژیم غذایی را انتخاب کنید:' : 'ئەگەر دەتەوێت خشتەی پێشووت بسڕیتەوە و یەکێکی نوێ دروست بکەیت، تکایە جۆری ئەو دایتە هەڵبژێرە کە دەتەوێت ئەی ئای خشتەکەتی لەسەر دروست بکات:'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                { 
                  id: 'balanced', 
                  label: currentLangConfig.code === 'en' ? 'Balanced Diet' : currentLangConfig.code === 'ar' ? 'نظام متوازن' : currentLangConfig.code === 'fa' ? 'رژیم متعادل' : 'دایتی هاوسەنگ', 
                  icon: <Salad size={16} className="inline-block" />, 
                  desc: currentLangConfig.code === 'en' ? 'Optimal for general health and maintaining weight' : currentLangConfig.code === 'ar' ? 'مناسب للصحة العامة وتثبيت الوزن' : currentLangConfig.code === 'fa' ? 'مناسب برای سلامت عمومی و تثبیت وزن' : 'گونجاوە بۆ تەندروستی گشتی و جێگیرکردنی کێش' 
                },
                { 
                  id: 'keto', 
                  label: currentLangConfig.code === 'en' ? 'Keto Diet' : currentLangConfig.code === 'ar' ? 'نظام الكيتو' : currentLangConfig.code === 'fa' ? 'رژیم کتو' : 'سیستەمی کیتۆ', 
                  icon: <Egg size={16} className="inline-block" />, 
                  desc: currentLangConfig.code === 'en' ? 'Very low carbs, high healthy fats for rapid fat burning' : currentLangConfig.code === 'ar' ? 'كربوهيدرات منخفضة جداً ودهون عالية لحرق الدهون' : currentLangConfig.code === 'fa' ? 'حداقل کربوهیدرات و چربی بالا برای سوزاندن چربی' : 'کەمترین کاربۆهیدرات، زۆرترین چەوری بۆ سوتاندنی خێرای چەوری' 
                },
                { 
                  id: 'high_protein', 
                  label: currentLangConfig.code === 'en' ? 'High Protein' : currentLangConfig.code === 'ar' ? 'بروتين عالي' : currentLangConfig.code === 'fa' ? 'پروتئین بالا' : 'پڕۆتینی بەرز', 
                  icon: <Beef size={16} className="inline-block" />, 
                  desc: currentLangConfig.code === 'en' ? 'Ideal for building lean muscle mass and athletic recovery' : currentLangConfig.code === 'ar' ? 'مثالي لبناء وتضخيم العضلات واستشفائها' : currentLangConfig.code === 'fa' ? 'مناسب برای عضله‌سازی و بازسازی ورزشی' : 'گونجاوە بۆ دروستکردن و گەورەکردنی ماسولکە' 
                },
                { 
                  id: 'low_carb', 
                  label: currentLangConfig.code === 'en' ? 'Low Carb' : currentLangConfig.code === 'ar' ? 'قليل الكربوهيدرات' : currentLangConfig.code === 'fa' ? 'کم‌کربوهیدرات' : 'کاربۆهیدراتی کەم', 
                  icon: <Drumstick size={16} className="inline-block" />, 
                  desc: currentLangConfig.code === 'en' ? 'Effective fat loss without severe hunger feelings' : currentLangConfig.code === 'ar' ? 'دابەزاندنی کێش بەبێ برسیەتی زۆر' : currentLangConfig.code === 'fa' ? 'کاهش وزن موثر بدون احساس گرسنگی شدید' : 'دابەزاندنی کێش بەبێ برسیەتی زۆر' 
                }
              ].map(diet => (
                <button
                  key={diet.id}
                  onClick={() => {
                    generateAiDietProgram(diet.id);
                    setShowAiDietModal(false);
                  }}
                  disabled={isGeneratingDiet}
                  className="liquid-pill"
                  style={{ padding: '14px', textAlign: isRtl ? 'right' : 'left', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid var(--accent-glow)', cursor: 'pointer', background: 'var(--card-subtle)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                    <span>{diet.icon}</span> {diet.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{diet.desc}</div>
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setShowAiDietModal(false)} 
              className="liquid-pill" 
              style={{ width: '100%', padding: '14px 18px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}

      {/* سێتینگ و ڕێکخستنەکان (Settings Modal - Bottom Sheet) */}
      {showSettingsModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end', 
            padding: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettingsModal(false);
          }}
        >
          <div 
            className="modal-content bottom-sheet-content" 
            style={{ 
              width: '100%', 
              maxWidth: '480px', 
              maxHeight: '85vh', 
              overflowY: 'auto', 
              padding: '20px 20px 28px 20px', 
              borderRadius: '28px 28px 0 0', 
              borderTop: '1px solid var(--border-color)', 
              direction: currentLangConfig.dir,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
            }}
          >
            {/* دەسکی کێشان (Top Pull Indicator) */}
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px', margin: '0 auto 16px auto', flexShrink: 0 }}></div>

            <div className="flex-between" style={{ marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-primary)', display: 'flex' }}><SettingsIcon size={20} color="var(--accent-primary)" /></span>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{t('settings')}</h2>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)} 
                className="liquid-pill"
                style={{ width: '34px', height: '34px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--text-main)', background: 'var(--card-subtle)' }}
              >
                <X size={16} />
              </button>
            </div>

            
            
            {/* ڕەنگی بەرنامە (Color Theme) */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '10px' }}>
                <Palette size={16} className="inline-block" /> {t('appColor') || (currentLangConfig.code === 'en' ? 'App Theme Color' : currentLangConfig.code === 'ar' ? 'لون التطبيق' : currentLangConfig.code === 'fa' ? 'رنگ برنامه' : 'ڕەنگی بەرنامە')}
              </div>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {[
                  { id: 'system', name: currentLangConfig.code === 'en' ? 'Auto' : currentLangConfig.code === 'ar' ? 'تلقائي' : currentLangConfig.code === 'fa' ? 'خودکار' : 'خۆکار', color1: '#94a3b8', color2: '#475569' },
                  { id: 'default', name: currentLangConfig.code === 'en' ? 'Default' : currentLangConfig.code === 'ar' ? 'افتراضي' : currentLangConfig.code === 'fa' ? 'پیش‌فرض' : 'بنەڕەتی', color1: '#9333EA', color2: '#06B6D4' },
                  { id: 'pink', name: currentLangConfig.code === 'en' ? 'Pink' : currentLangConfig.code === 'ar' ? 'وردي' : currentLangConfig.code === 'fa' ? 'صورتی' : 'پەمەیی', color1: '#F472B6', color2: '#BE185D' },
                  { id: 'emerald', name: currentLangConfig.code === 'en' ? 'Emerald' : currentLangConfig.code === 'ar' ? 'زمردي' : currentLangConfig.code === 'fa' ? 'زمردی' : 'سەوز', color1: '#10B981', color2: '#0D9488' },
                  { id: 'ocean', name: currentLangConfig.code === 'en' ? 'Ocean' : currentLangConfig.code === 'ar' ? 'أزرق' : currentLangConfig.code === 'fa' ? 'اقیانوسی' : 'شین', color1: '#3B82F6', color2: '#0EA5E9' },
                  { id: 'sunset', name: currentLangConfig.code === 'en' ? 'Sunset' : currentLangConfig.code === 'ar' ? 'غروب' : currentLangConfig.code === 'fa' ? 'غروب' : 'پرتەقاڵی', color1: '#F97316', color2: '#EAB308' }
                ].map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => changeColorTheme(ct.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      background: 'none', border: 'none', cursor: 'pointer', minWidth: '60px'
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: `linear-gradient(135deg, ${ct.color1}, ${ct.color2})`,
                      border: colorTheme === ct.id ? '3px solid var(--text-main)' : '3px solid transparent',
                      boxShadow: colorTheme === ct.id ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}></div>
                    <span style={{ fontSize: '11px', fontWeight: colorTheme === ct.id ? '800' : '600', color: colorTheme === ct.id ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {ct.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>


            {/* زمانی بەرنامە - کۆکراوە و ڕێک بە تەنها زمانی کارا لەگەڵ هێما */}
            <div style={{ marginBottom: '24px', position: 'relative' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={16} className="inline-block" style={{ color: 'var(--accent-primary)' }} /> 
                <span>{t('language')}</span>
              </div>
              
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowSettingsLangDropdown(prev => !prev)}
                  className="liquid-pill"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'var(--card-subtle)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    fontWeight: '800',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span>{currentLangConfig.name}</span>
                  </div>
                  <ChevronDown 
                    size={18} 
                    style={{ 
                      color: 'var(--text-muted)', 
                      transform: showSettingsLangDropdown ? 'rotate(180deg)' : 'none', 
                      transition: 'transform 0.2s ease' 
                    }} 
                  />
                </button>

                {showSettingsLangDropdown && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '6px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                      zIndex: 50,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          changeLanguage(lang.code);
                          setShowSettingsLangDropdown(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: 'none',
                          background: language === lang.code ? 'var(--accent-gradient)' : 'transparent',
                          color: language === lang.code ? '#ffffff' : 'var(--text-main)',
                          fontSize: '13px',
                          fontWeight: language === lang.code ? '800' : '600',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span>{lang.name}</span>
                        </div>
                        {language === lang.code && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* دەنگەکانی بەرنامە (Sound Effects) - کارتی شوشەیی مۆدێرن و ڕێکخراو */}
            <div style={{ marginBottom: '24px' }}>
              <div 
                onClick={() => {
                  const nextState = !soundEnabled;
                  toggleSound(nextState);
                  if (nextState) playSetCompleteSound();
                }}
                className="liquid-pill"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--card-subtle)',
                  border: soundEnabled ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  borderRadius: '18px',
                  cursor: 'pointer',
                  boxShadow: soundEnabled ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.25s ease',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '14px',
                    background: soundEnabled ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: soundEnabled ? '#ffffff' : 'var(--text-muted)',
                    boxShadow: soundEnabled ? '0 4px 15px var(--accent-glow)' : 'none',
                    transition: 'all 0.25s ease'
                  }}>
                    {soundEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '3px' }}>
                      {t('soundEffects') || 'دەنگەکانی بەرنامە (Sound Effects)'}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: soundEnabled ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                      {soundEnabled ? (t('soundEnabled') || 'چالاکە • دەنگی کلیک و تەواوبوون') : (t('soundDisabled') || 'ناچالاکە • دۆخی بێدەنگ')}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '800',
                  background: soundEnabled ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.07)',
                  color: soundEnabled ? '#ffffff' : 'var(--text-muted)',
                  border: soundEnabled ? 'none' : '1px solid var(--border-color)',
                  boxShadow: soundEnabled ? '0 2px 10px var(--accent-glow)' : 'none',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: soundEnabled ? '#22c55e' : '#ef4444',
                    boxShadow: soundEnabled ? '0 0 8px #22c55e' : 'none'
                  }} />
                  <span>{soundEnabled ? (t('soundEnabled') || 'چالاکە') : (t('soundDisabled') || 'ناچالاکە')}</span>
                </div>
              </div>
            </div>

            {/* پەنجەرەی پڕۆتینی خێرا (Quick Protein Tracker Settings) */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} className="inline-block text-amber-400" />
                <span>{t('quickProteinWidgetSetting')}</span>
              </div>

              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  background: 'var(--card-subtle)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '16px',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: !isProteinWidgetDismissed ? '#10B981' : 'var(--text-muted)',
                        display: 'inline-block'
                      }} 
                    />
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                      {!isProteinWidgetDismissed ? t('showWidget') : t('hideWidget')}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {t('quickProteinWidgetDesc')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextDismissed = !isProteinWidgetDismissed;
                    setIsProteinWidgetDismissed(nextDismissed);
                    if (!nextDismissed && !lastUsedProtein) {
                      setLastUsedProtein(defaultLastProtein);
                    }
                    try {
                      localStorage.setItem('app_protein_widget_dismissed', nextDismissed ? 'true' : 'false');
                    } catch (e) {}
                  }}
                  className="liquid-pill"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '900',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: !isProteinWidgetDismissed ? 'var(--accent-gradient)' : 'var(--card-subtle)',
                    color: !isProteinWidgetDismissed ? '#ffffff' : 'var(--text-muted)',
                    border: !isProteinWidgetDismissed ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    boxShadow: !isProteinWidgetDismissed ? '0 2px 10px var(--accent-glow)' : 'none',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  {!isProteinWidgetDismissed 
                    ? (currentLangConfig.code === 'en' ? 'Enabled' : currentLangConfig.code === 'ar' ? 'مفعل' : currentLangConfig.code === 'fa' ? 'فعال' : 'چالاکە')
                    : (currentLangConfig.code === 'en' ? 'Enable +' : currentLangConfig.code === 'ar' ? 'تفعيل +' : currentLangConfig.code === 'fa' ? 'فعال‌سازی +' : 'چالاککردنەوە +')}
                </button>
              </div>
            </div>

            <button 
              onClick={() => setShowSettingsModal(false)}
              style={{ width: '100%', padding: '14px', background: 'var(--accent-gradient)', color: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 0 25px var(--accent-glow)', backdropFilter: 'blur(10px)' }}
            >
              {t('save')}
            </button>
          </div>
        </div>
      )}

      {/* ==================== مۆداڵی چوونەژوورەوە و هەژمار (Auth Modal) ==================== */}
      {showAuthModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '420px', padding: '24px', direction: currentLangConfig.dir }}>
            <div className="flex-between" style={{ marginBottom: '18px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                  {currentLangConfig.code === 'en' ? 'Account & Cloud' : currentLangConfig.code === 'ar' ? 'الحساب والسحابة' : currentLangConfig.code === 'fa' ? 'حساب کاربری و ابری' : 'هەژمار و کڵاود'}
                </h2>
              </div>
              <button onClick={() => setShowAuthModal(false)} style={{ background: 'var(--card-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
              {currentLangConfig.code === 'en' ? 'To backup your workout programs and data to the cloud and sync across devices, sign in below:' : currentLangConfig.code === 'ar' ? 'لحفظ برامجك التدريبية وبياناتك في السحابة ومزامنتها على أي جهاز، قم بتسجيل الدخول:' : currentLangConfig.code === 'fa' ? 'برای پشتیبان‌گیری از برنامه‌های تمرینی و داده‌ها در فضای ابری و همگام‌سازی در دستگاه‌های دیگر، وارد شوید:' : 'بۆ پاراستنی کۆرسی ڕاهێنان و هەموو داتاکانت لە کڵاود و بەکارهێنانی لە هەر ئامێرێکی تردا، لە ڕێگەی یەکێک لەم شێوازانە بچۆ ژوورەوە:'}
            </p>

            {/* دوگمەی سەرەکی گووگڵ */}
            <button 
              onClick={async () => {
                await handleLogin();
                setShowAuthModal(false);
              }} 
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#ffffff', color: '#000000', fontSize: '14px', fontWeight: '800', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', marginBottom: '16px' }}
            >
              <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="Google" />
              <span>{currentLangConfig.code === 'en' ? 'Continue with Google' : currentLangConfig.code === 'ar' ? 'المتابعة باستخدام Google' : currentLangConfig.code === 'fa' ? 'ادامه با Google' : 'بەردەوامبوون لەگەڵ گووگڵ'}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {currentLangConfig.code === 'en' ? 'Or via phone number' : currentLangConfig.code === 'ar' ? 'أو عبر رقم الهاتف' : currentLangConfig.code === 'fa' ? 'یا از طریق شماره موبایل' : 'یان لە ڕێگەی مۆبایل'}
              </div>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>

            {!confirmationResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', direction: 'ltr' }}>
                  <select 
                    value={selectedCountryCode}
                    onChange={(e) => setSelectedCountryCode(e.target.value)}
                    dir="ltr"
                    style={{ boxSizing: 'border-box', flex: '0 0 115px', padding: '12px 8px', borderRadius: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                  >
                    {COUNTRIES.map(c => (
                      <option 
                        key={c.code} 
                        value={c.code} 
                        style={{ background: theme === 'light' ? '#ffffff' : '#1a1e2e', color: theme === 'light' ? '#0f172a' : '#ffffff' }}
                      >
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  
                  <input 
                    type="tel" 
                    placeholder="XXX XXXX" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    dir="ltr"
                    style={{ boxSizing: 'border-box', flex: '1', minWidth: 0, padding: '12px', borderRadius: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '15px', outline: 'none', textAlign: 'left', letterSpacing: '2px' }}
                  />
                </div>
                <button onClick={handleSendOtp} disabled={phoneLoading} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--accent-gradient)', color: '#ffffff', border: 'none', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px var(--accent-glow)' }}>
                  {phoneLoading ? (currentLangConfig.code === 'en' ? 'Please wait...' : currentLangConfig.code === 'ar' ? 'يرجى الانتظار...' : currentLangConfig.code === 'fa' ? 'لطفاً صبر کنید...' : 'چاوەڕێ بکە...') : (currentLangConfig.code === 'en' ? 'Send Verification Code (SMS)' : currentLangConfig.code === 'ar' ? 'إرسال رمز التحقق (SMS)' : currentLangConfig.code === 'fa' ? 'ارسال کد تأیید (SMS)' : 'ناردنی کۆدی کورتەنامە (SMS)')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder={currentLangConfig.code === 'en' ? 'Enter 6-digit code' : currentLangConfig.code === 'ar' ? 'أدخل الرمز المكون من 6 أرقام' : currentLangConfig.code === 'fa' ? 'کد ۶ رقمی را وارد کنید' : 'کۆدی 6 ژمارەیی بنووسە'} 
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '16px', outline: 'none', textAlign: 'center', letterSpacing: '4px' }}
                />
                <button onClick={async () => {
                  await handleVerifyOtp();
                  setShowAuthModal(false);
                }} disabled={phoneLoading} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--accent-primary)', color: '#ffffff', border: 'none', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px var(--accent-glow)' }}>
                  {phoneLoading ? (currentLangConfig.code === 'en' ? 'Verifying...' : currentLangConfig.code === 'ar' ? 'جارٍ التحقق...' : currentLangConfig.code === 'fa' ? 'در حال تأیید...' : 'دڵنیاکردنەوە...') : (currentLangConfig.code === 'en' ? 'Verify & Sign In' : currentLangConfig.code === 'ar' ? 'تأكيد ودخول' : currentLangConfig.code === 'fa' ? 'تأیید و ورود' : 'چەسپاندن و چوونەژوورەوە')}
                </button>
              </div>
            )}
            <div id="recaptcha-container"></div>
          </div>
        </div>
      )}

      {/* مۆداڵی دەستکاری پرۆفایل (Edit Profile - Bottom Sheet) */}
      {showEditProfileModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end', 
            padding: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditProfileModal(false);
          }}
        >
          <div 
            className="modal-content bottom-sheet-content" 
            style={{ 
              width: '100%', 
              maxWidth: '480px', 
              maxHeight: '85vh', 
              overflowY: 'auto', 
              padding: '20px 20px 28px 20px', 
              borderRadius: '28px 28px 0 0', 
              borderTop: '1px solid var(--border-color)', 
              direction: currentLangConfig.dir,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
            }}
          >
            {/* دەسکی کێشان (Top Pull Indicator) */}
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px', margin: '0 auto 16px auto', flexShrink: 0 }}></div>

            <div className="flex-between" style={{ marginBottom: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-primary)', display: 'flex' }}><Pencil size={20} color="var(--accent-primary)" /></span>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{t('editProfile')}</h2>
              </div>
              <button 
                onClick={() => setShowEditProfileModal(false)} 
                className="liquid-pill"
                style={{ width: '34px', height: '34px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--text-main)', background: 'var(--card-subtle)' }}
              >
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>{t('name')}:</label>
                <input type="text" value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', marginTop: '4px' }} />
              </div>

              {/* دیاریکردنی ڕەگەز (Gender Selector) */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>{t('gender')}:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, gender: 'male' })}
                    className="liquid-pill"
                    style={{
                      padding: '11px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      border: (!editFormData.gender || editFormData.gender === 'male' || editFormData.gender === 'نێر') ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: (!editFormData.gender || editFormData.gender === 'male' || editFormData.gender === 'نێر') ? 'var(--accent-gradient-subtle)' : 'var(--border-color)',
                      color: 'var(--text-main)',
                      boxShadow: (!editFormData.gender || editFormData.gender === 'male' || editFormData.gender === 'نێر') ? '0 4px 15px var(--accent-glow)' : 'none'
                    }}
                  >
                    <MaleIcon size={16} color="var(--text-main)" />
                    <span>{t('male')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, gender: 'female' })}
                    className="liquid-pill"
                    style={{
                      padding: '11px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      border: (editFormData.gender === 'female' || editFormData.gender === 'مێ') ? '1.5px solid #EC4899' : '1px solid var(--border-color)',
                      background: (editFormData.gender === 'female' || editFormData.gender === 'مێ') ? 'var(--accent-gradient-subtle)' : 'var(--border-color)',
                      color: 'var(--text-main)',
                      boxShadow: (editFormData.gender === 'female' || editFormData.gender === 'مێ') ? '0 4px 15px rgba(236, 72, 153, 0.3)' : 'none'
                    }}
                  >
                    <FemaleIcon size={16} color={editFormData.gender === "female" || editFormData.gender === "مێ" ? "#ffffff" : "var(--text-main)"} />
                    <span>{t('female')}</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>{t('weight')} ({t('kg')}):</label>
                  <input type="number" value={editFormData.weight} onChange={e => setEditFormData({ ...editFormData, weight: Number(e.target.value) })} style={{ width: '100%', padding: '12px', borderRadius: '12px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>{t('height')} ({t('cm')}):</label>
                  <input type="number" value={editFormData.height} onChange={e => setEditFormData({ ...editFormData, height: Number(e.target.value) })} style={{ width: '100%', padding: '12px', borderRadius: '12px', marginTop: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>{t('age')}:</label>
                <input type="number" value={editFormData.age} onChange={e => setEditFormData({ ...editFormData, age: Number(e.target.value) })} style={{ width: '100%', padding: '12px', borderRadius: '12px', marginTop: '4px' }} />
              </div>
            </div>

            
            


            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSaveProfile} style={{ flex: 1, padding: '12px', background: 'var(--accent-gradient)', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' }}>{t('save')}</button>
              <button onClick={() => setShowEditProfileModal(false)} className="liquid-pill" style={{ padding: '12px 18px', cursor: 'pointer', fontWeight: '700' }}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* مۆداڵی دەستکاری ئامانج (Goal Settings - Bottom Sheet) */}
      {showGoalModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end', 
            padding: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGoalModal(false);
          }}
        >
          <div 
            className="modal-content bottom-sheet-content" 
            style={{ 
              width: '100%', 
              maxWidth: '480px', 
              maxHeight: '85vh', 
              overflowY: 'auto', 
              padding: '20px 20px 28px 20px', 
              borderRadius: '28px 28px 0 0', 
              borderTop: '1px solid var(--border-color)', 
              direction: currentLangConfig.dir,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
            }}
          >
            {/* دەسکی کێشان (Top Pull Indicator) */}
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px', margin: '0 auto 16px auto', flexShrink: 0 }}></div>

            <div className="flex-between" style={{ marginBottom: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-primary)', display: 'flex' }}><TargetIcon size={20} color="var(--accent-primary)" /></span>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{t('goalSettings')}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleTriggerAiGoalSuggestion('smart')}
                  disabled={isAiSuggestingGoal}
                  style={{
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: '1px solid var(--border-color)',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 15px var(--accent-glow)'
                  }}
                >
                  <Sparkles size={13} color="#ffffff" />
                  <span>{isAiSuggestingGoal ? (currentLangConfig.code === 'en' ? 'Analyzing...' : currentLangConfig.code === 'ar' ? 'جاري التحليل...' : currentLangConfig.code === 'fa' ? 'در حال تحلیل...' : 'خەریکی شیکارییە...') : (currentLangConfig.code === 'en' ? 'AI Suggestion' : currentLangConfig.code === 'ar' ? 'اقتراح ذكي' : currentLangConfig.code === 'fa' ? 'پیشنهاد هوشمند' : 'پێشنیاری سیستەم')}</span>
                </button>
                <button 
                  onClick={() => setShowGoalModal(false)} 
                  className="liquid-pill"
                  style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--text-main)', background: 'var(--card-subtle)' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* پەیامی سەرکەوتنی پێشنیاری سیستەم */}
            {aiGoalSuccessMsg && (
              <div style={{ background: 'var(--card-subtle)', border: '1px solid var(--accent-primary)', color: 'var(--color-carbs)', padding: '8px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', marginBottom: '12px', textAlign: 'center' }}>
                {aiGoalSuccessMsg}
              </div>
            )}

            {/* کارتی نیشاندانی ئامانجی هەڵبژێردراو */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '1px solid var(--accent-glow)',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                  flexShrink: 0
                }}>
                  <TargetIcon size={22} color="#ffffff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-carbs)', fontWeight: '800', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{currentLangConfig.code === 'en' ? 'Active Selected Goal:' : currentLangConfig.code === 'ar' ? 'الهدف الرياضي المختار:' : currentLangConfig.code === 'fa' ? 'هدف ورزشی انتخاب شده:' : 'ئامانجی وەرزشی هەڵبژێردراو:'}</span>
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1.4' }}>
                    {getLocalizedGoal(goalFormData.goal || profile.goal, language)}
                  </div>
                </div>
              </div>
            </div>

            {/* هەڵبژاردنی ئامانجی وەرزشی بە ٣ بەشی سەرەکی */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={15} color="var(--accent-primary)" />
                <span>{currentLangConfig.code === 'en' ? 'Choose Fitness Goal:' : currentLangConfig.code === 'ar' ? 'اختر الهدف الرياضي:' : currentLangConfig.code === 'fa' ? 'انتخاب هدف ورزشی:' : 'هەڵبژاردنی ئامانجی وەرزشی:'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleTriggerAiGoalSuggestion('bulk')}
                  className="liquid-pill"
                  style={{ 
                    padding: '11px 4px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', textAlign: 'center', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    color: (goalFormData.goal?.includes('زیادکردن') || goalFormData.goal?.includes('Bulk')) ? '#ffffff' : 'var(--text-main)', 
                    border: (goalFormData.goal?.includes('زیادکردن') || goalFormData.goal?.includes('Bulk')) ? 'none' : '1px solid var(--border-color)',
                    background: (goalFormData.goal?.includes('زیادکردن') || goalFormData.goal?.includes('Bulk')) ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    boxShadow: (goalFormData.goal?.includes('زیادکردن') || goalFormData.goal?.includes('Bulk')) ? '0 4px 14px var(--accent-glow)' : 'none'
                  }}
                >
                  <BicepsFlexed size={16} color={(goalFormData.goal?.includes('زیادکردن') || goalFormData.goal?.includes('Bulk')) ? '#ffffff' : 'currentColor'} />
                  <span>{currentLangConfig.code === 'en' ? 'Muscle Gain' : currentLangConfig.code === 'ar' ? 'زيادة العضلات' : currentLangConfig.code === 'fa' ? 'رشد عضلات' : 'گەشەی ماسولکە'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerAiGoalSuggestion('cut')}
                  className="liquid-pill"
                  style={{ 
                    padding: '11px 4px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', textAlign: 'center', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    color: (goalFormData.goal?.includes('دابەزاندن') || goalFormData.goal?.includes('چەوری') || goalFormData.goal?.includes('Cut')) ? '#ffffff' : 'var(--text-main)', 
                    border: (goalFormData.goal?.includes('دابەزاندن') || goalFormData.goal?.includes('چەوری') || goalFormData.goal?.includes('Cut')) ? 'none' : '1px solid var(--border-color)',
                    background: (goalFormData.goal?.includes('دابەزاندن') || goalFormData.goal?.includes('چەوری') || goalFormData.goal?.includes('Cut')) ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    boxShadow: (goalFormData.goal?.includes('دابەزاندن') || goalFormData.goal?.includes('چەوری') || goalFormData.goal?.includes('Cut')) ? '0 4px 14px var(--accent-glow)' : 'none'
                  }}
                >
                  <Flame size={16} color={(goalFormData.goal?.includes('دابەزاندن') || goalFormData.goal?.includes('چەوری') || goalFormData.goal?.includes('Cut')) ? '#ffffff' : 'currentColor'} />
                  <span>{currentLangConfig.code === 'en' ? 'Fat Loss' : currentLangConfig.code === 'ar' ? 'حرق الدهون' : currentLangConfig.code === 'fa' ? 'چربی‌سوزی' : 'سوتاندنی چەوری'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerAiGoalSuggestion('recomp')}
                  className="liquid-pill"
                  style={{ 
                    padding: '11px 4px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', textAlign: 'center', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    color: (goalFormData.goal?.includes('جێگیر') || goalFormData.goal?.includes('Recomposition')) ? '#ffffff' : 'var(--text-main)', 
                    border: (goalFormData.goal?.includes('جێگیر') || goalFormData.goal?.includes('Recomposition')) ? 'none' : '1px solid var(--border-color)',
                    background: (goalFormData.goal?.includes('جێگیر') || goalFormData.goal?.includes('Recomposition')) ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                    boxShadow: (goalFormData.goal?.includes('جێگیر') || goalFormData.goal?.includes('Recomposition')) ? '0 4px 14px var(--accent-glow)' : 'none'
                  }}
                >
                  <Zap size={16} color={(goalFormData.goal?.includes('جێگیر') || goalFormData.goal?.includes('Recomposition')) ? '#ffffff' : 'currentColor'} />
                  <span>{currentLangConfig.code === 'en' ? 'Maintain' : currentLangConfig.code === 'ar' ? 'تثبيت الوزن' : currentLangConfig.code === 'fa' ? 'تثبیت وزن' : 'جێگیرکردنی کێش'}</span>
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card-subtle)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={18} color="var(--accent-primary)" />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700' }}>{t('targetWeight')}:</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'ltr' }}>
                  <button
                    type="button"
                    onClick={() => setGoalFormData(prev => ({ 
                      ...prev, 
                      targetWeight: Math.max(30, (Number(prev.targetWeight) || profile.weight || 70) - 1) 
                    }))}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Minus size={16} />
                  </button>

                  <input 
                    type="number" 
                    value={goalFormData.targetWeight} 
                    onChange={e => setGoalFormData({ ...goalFormData, targetWeight: Number(e.target.value) })} 
                    style={{ 
                      width: '65px', 
                      padding: '8px 4px', 
                      borderRadius: '10px', 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-main)', 
                      fontSize: '15px', 
                      textAlign: 'center', 
                      fontWeight: '900' 
                    }} 
                  />

                  <button
                    type="button"
                    onClick={() => setGoalFormData(prev => ({ 
                      ...prev, 
                      targetWeight: (Number(prev.targetWeight) || profile.weight || 70) + 1 
                    }))}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <Plus size={16} />
                  </button>

                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginLeft: '2px' }}>{t('kg')}</span>
                </div>
              </div>
            </div>

            {/* بەشی هەڵبژاردنی خێرایی گەیشتن بە ئامانج (Goal Pace: Slow, Normal, Fast, Very Fast) */}
            {(() => {
              const paceConfigs = [
                { id: 'slow', label: t('paceSlow') || 'هێواش', color: '#10b981', bg: 'linear-gradient(135deg, #10b981, #059669)', glow: 'rgba(16, 185, 129, 0.4)', badgeBg: 'rgba(16, 185, 129, 0.12)', badgeBorder: 'rgba(16, 185, 129, 0.3)' },
                { id: 'normal', label: t('paceNormal') || 'ئاسایی', color: '#38bdf8', bg: 'linear-gradient(135deg, #0284c7, #2563eb)', glow: 'rgba(56, 189, 248, 0.4)', badgeBg: 'rgba(56, 189, 248, 0.12)', badgeBorder: 'rgba(56, 189, 248, 0.3)' },
                { id: 'fast', label: t('paceFast') || 'خێرا', color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #ea580c)', glow: 'rgba(245, 158, 11, 0.4)', badgeBg: 'rgba(245, 158, 11, 0.12)', badgeBorder: 'rgba(245, 158, 11, 0.3)' },
                { id: 'very_fast', label: t('paceVeryFast') || 'زۆر خێرا', color: '#ef4444', bg: 'linear-gradient(135deg, #ef4444, #dc2626)', glow: 'rgba(239, 68, 68, 0.4)', badgeBg: 'rgba(239, 68, 68, 0.12)', badgeBorder: 'rgba(239, 68, 68, 0.3)' }
              ];
              const activePace = paceConfigs.find(p => p.id === (goalFormData.goalPace || 'normal')) || paceConfigs[1];

              return (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={15} color={activePace.color} />
                      <span>{t('goalPace') || 'خێرایی گەیشتن بە ئامانج'}:</span>
                    </div>
                    <span style={{ fontSize: '11px', color: activePace.color, fontWeight: '800', background: activePace.badgeBg, padding: '2px 8px', borderRadius: '8px', border: `1px solid ${activePace.badgeBorder}` }}>
                      {getLocalizedPace(goalFormData.goalPace || 'normal', language)}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {paceConfigs.map(p => {
                      const isSelected = (goalFormData.goalPace || 'normal') === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const currentW = Number(profile.weight) || 75;
                            const targetW = Number(goalFormData.targetWeight) || currentW;
                            const delta = Math.abs(targetW - currentW);
                            const weeklyRate = p.id === 'slow' ? 0.3 : p.id === 'normal' ? 0.5 : p.id === 'fast' ? 0.75 : 1.0;
                            const autoDays = delta > 0 ? Math.max(p.id === 'very_fast' ? 14 : 20, Math.round((delta / weeklyRate) * 7)) : (goalFormData.targetDays || 45);

                            setGoalFormData(prev => ({
                              ...prev,
                              goalPace: p.id,
                              targetDays: autoDays
                            }));
                          }}
                          style={{
                            padding: '11px 4px',
                            borderRadius: '12px',
                            border: isSelected ? `1.5px solid ${p.color}` : '1px solid var(--border-color)',
                            background: isSelected ? p.bg : 'var(--card-subtle)',
                            color: isSelected ? '#ffffff' : 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? `0 4px 14px ${p.glow}` : 'none',
                            fontSize: '12px',
                            fontWeight: '800',
                            textAlign: 'center'
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <UIIcon name='Target' size={16} /> {t('bodyGoalsTitle')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--card-subtle)', padding: '12px', borderRadius: '12px', border: '1px solid var(--accent-glow)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)', marginBottom: '10px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <UIIcon name='Dumbbell' size={14} /> {t('enlargeBody')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(profile.gender === 'male' ? MALE_BODY_PARTS : FEMALE_BODY_PARTS).map(part => (
                      <label key={`enlarge-${part.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={goalFormData.bodyGoals?.enlarge?.includes(part.id)}
                          onChange={(e) => {
                            const newEnlarge = e.target.checked 
                              ? [...(goalFormData.bodyGoals?.enlarge || []), part.id] 
                              : (goalFormData.bodyGoals?.enlarge || []).filter(id => id !== part.id);
                            const newShrink = (goalFormData.bodyGoals?.shrink || []).filter(id => id !== part.id);
                            setGoalFormData({ ...goalFormData, bodyGoals: { enlarge: newEnlarge, shrink: newShrink }});
                          }}
                          style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                        />
                        {part[currentLangConfig.code] || part.en || part.ku}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'var(--card-subtle)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-carbs)', marginBottom: '10px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <UIIcon name='Fire' size={14} /> {t('shrinkBody')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(profile.gender === 'male' ? MALE_BODY_PARTS : FEMALE_BODY_PARTS).map(part => (
                      <label key={`shrink-${part.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={goalFormData.bodyGoals?.shrink?.includes(part.id)}
                          onChange={(e) => {
                            const newShrink = e.target.checked 
                              ? [...(goalFormData.bodyGoals?.shrink || []), part.id] 
                              : (goalFormData.bodyGoals?.shrink || []).filter(id => id !== part.id);
                            const newEnlarge = (goalFormData.bodyGoals?.enlarge || []).filter(id => id !== part.id);
                            setGoalFormData({ ...goalFormData, bodyGoals: { enlarge: newEnlarge, shrink: newShrink }});
                          }}
                          style={{ accentcolor: 'var(--color-carbs)', width: '16px', height: '16px' }}
                        />
                        {part[currentLangConfig.code] || part.en || part.ku}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* پێشبینینی ڕاستەوخۆی کالۆری پێویست بەپێی ئەم ئامانجە */}
            {(() => {
              const previewCalc = calculateScientificGoalByAi({
                ...profile,
                targetWeight: Number(goalFormData.targetWeight) || profile.weight,
                targetDays: Number(goalFormData.targetDays) || 45,
                goal: goalFormData.goal,
                goalPace: goalFormData.goalPace || 'normal'
              });

              return (
                <div className="dark-card" style={{ padding: '12px 14px', marginBottom: '18px', background: 'var(--accent-glow)', border: '1px solid var(--accent-glow)' }}>
                  <div className="flex-between" style={{ marginBottom: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-muted)' }}>{t('targetCalories')}:</span>
                    <span style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-main)' }}>{previewCalc.goalCalories} <span style={{ fontSize: '11px', color: 'var(--color-carbs)' }}>{t('kcal')}</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-main)', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                    <span><Beef size={16} className="inline-block" /> {t('protein')}: <b style={{ color: 'var(--color-proteins)' }}>{previewCalc.goalProtein}g</b></span>
                    <span><Wheat size={16} className="inline-block" /> {t('carbs')}: <b style={{ color: 'var(--color-carbs)' }}>{previewCalc.goalCarbs}g</b></span>
                    <span><Cookie size={16} className="inline-block" /> {t('fat')}: <b style={{ color: 'var(--color-calories)' }}>{previewCalc.goalFat}g</b></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '6px', marginTop: '6px' }}>
                    <span>⏳ {language === 'en' ? 'Estimated Duration:' : 'ماوەی پێشبینیکراو:'} <b style={{ color: 'var(--text-main)' }}>{previewCalc.targetDays} {language === 'en' ? 'Days' : 'ڕۆژ'}</b></span>
                    <span>⏱️ {language === 'en' ? 'Rest Interval:' : 'کاتی پشوو:'} <b style={{ color: 'var(--color-carbs)' }}>{(goalFormData.goalPace || 'normal') === 'slow' ? '90s' : (goalFormData.goalPace || 'normal') === 'fast' ? '45s' : (goalFormData.goalPace || 'normal') === 'very_fast' ? '35s' : '60s'}</b></span>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSaveGoal} style={{ flex: 1, padding: '12px', background: 'var(--accent-gradient)', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' }}>{t('save')}</button>
              <button onClick={() => setShowGoalModal(false)} className="liquid-pill" style={{ padding: '12px 18px', cursor: 'pointer', fontWeight: '700' }}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}


      {/* ==================== مۆداڵی مێژووی کالۆری و خۆراک (Nutrition & Calorie History Bottom Sheet) ==================== */}
      {showNutritionHistoryModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end', 
            padding: 0, 
            backgroundColor: 'rgba(0,0,0,0.55)', 
            backdropFilter: 'blur(14px)' 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNutritionHistoryModal(false);
          }}
        >
          <div 
            className="modal-content bottom-sheet-content" 
            style={{ 
              width: '100%', 
              maxWidth: '540px', 
              maxHeight: '85vh', 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'var(--card-bg, #0f172a)', 
              borderRadius: '24px 24px 0 0', 
              border: '1px solid var(--border-color)', 
              borderBottom: 'none', 
              boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden'
            }}
          >
            {/* گرتە بۆ ڕاکێشان بەرەو خوارەوە (Drag Handle) */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* سەردێڕی مۆداڵ */}
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#38bdf8', display: 'flex', background: 'rgba(56, 189, 248, 0.12)', padding: '8px', borderRadius: '12px' }}>
                  <CalendarDays size={20} strokeWidth={2.4} />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {currentLangConfig.code === 'en' ? 'Weekly Calorie & Nutrition History' : currentLangConfig.code === 'ar' ? 'سجل السعرات والتغذية الأسبوعي' : currentLangConfig.code === 'fa' ? 'تاریخچه هفتگی کالری و تغذیه' : 'مێژووی هەفتانەی کالۆری و خۆراک'}
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {currentLangConfig.code === 'en' ? 'Review daily calorie intake, macros & logged meals' : 'پێداچوونەوەی کالۆری، ماکرۆ و ژەمەکانی ڕۆژانە'}
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowNutritionHistoryModal(false)}
                className="liquid-pill"
                style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* ناوەڕۆکی مۆداڵ (Scrollable) */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const todayIdx = getTodayDayIdx();
                const dayNames = ['شەممە', 'یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی'];
                const dayNamesEn = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                const targetCals = profile?.goalCalories || 2500;

                // هەژمارکردنی کۆی هەفتانە
                let totalWeekCals = 0;
                let daysWithLogs = 0;

                for (let i = 0; i < 7; i++) {
                  const m = dietMeals && dietMeals[i] ? dietMeals[i] : {};
                  const eaten = Object.values(m).flat().filter(item => item && item.isEaten);
                  const c = eaten.reduce((acc, item) => acc + (Number(item.calories) || 0), 0);
                  totalWeekCals += c;
                  if (c > 0) daysWithLogs++;
                }

                return (
                  <>
                    {/* کارتی پوختەی گشتی هەفتانە */}
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(168, 85, 247, 0.08))',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {currentLangConfig.code === 'en' ? 'Weekly Consumed' : 'کۆی کالۆری بەکارهاتووی هەفتە'}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8' }}>
                          {totalWeekCals.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: '600' }}>{t('calories')}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'end' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {currentLangConfig.code === 'en' ? 'Logged Days' : 'ڕۆژانی تۆمارکراو'}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {daysWithLogs} / 7 {currentLangConfig.code === 'en' ? 'Days' : 'ڕۆژ'}
                        </div>
                      </div>
                    </div>

                    {/* لیستی ٧ ڕۆژەکە */}
                    {dayNames.map((dName, idx) => {
                      const isToday = idx === todayIdx;
                      const isSelected = idx === selectedDayIdx;
                      const dayMeals = dietMeals && dietMeals[idx] ? dietMeals[idx] : { breakfast: [], lunch: [], snack: [], dinner: [] };
                      const eatenItems = Object.values(dayMeals).flat().filter(item => item && item.isEaten);
                      const cals = eatenItems.reduce((acc, item) => acc + (Number(item.calories) || 0), 0);
                      const prot = eatenItems.reduce((acc, item) => acc + (Number(item.protein) || 0), 0);
                      const carb = eatenItems.reduce((acc, item) => acc + (Number(item.carbs) || 0), 0);
                      const fat = eatenItems.reduce((acc, item) => acc + (Number(item.fat) || 0), 0);
                      const percent = Math.min(100, Math.round((cals / targetCals) * 100));
                      const isExpanded = expandedHistoryDayIdx === idx;
                      const localizedDay = currentLangConfig.code === 'en' ? dayNamesEn[idx] : dName;

                      return (
                        <div 
                          key={idx}
                          style={{
                            borderRadius: '16px',
                            background: isToday ? 'rgba(56, 189, 248, 0.05)' : 'var(--card-subtle, rgba(255, 255, 255, 0.03))',
                            border: isToday ? '1.5px solid rgba(56, 189, 248, 0.35)' : '1px solid var(--border-color)',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* سەرکارتەی ڕۆژەکە */}
                          <div 
                            onClick={() => setExpandedHistoryDayIdx(isExpanded ? null : idx)}
                            style={{
                              padding: '12px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '12px',
                                background: isToday ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.06)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                fontWeight: '800',
                                flexShrink: 0
                              }}>
                                {idx + 1}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                                    {localizedDay}
                                  </span>
                                  {isToday && (
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: '800',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      background: 'rgba(56, 189, 248, 0.15)',
                                      color: '#38bdf8',
                                      border: '1px solid rgba(56, 189, 248, 0.3)'
                                    }}>
                                      {currentLangConfig.code === 'en' ? 'Today' : 'ئەمڕۆ'}
                                    </span>
                                  )}
                                  {isSelected && !isToday && (
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      background: 'rgba(168, 85, 247, 0.15)',
                                      color: 'var(--accent-primary)',
                                      border: '1px solid rgba(168, 85, 247, 0.3)'
                                    }}>
                                      {currentLangConfig.code === 'en' ? 'Active' : 'دیاریکراو'}
                                    </span>
                                  )}
                                </div>

                                {/* هێڵی پێشکەوتنی بچووک */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                  <div style={{ flex: 1, height: '5px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                    <div style={{
                                      width: `${percent}%`,
                                      height: '100%',
                                      borderRadius: '999px',
                                      background: percent >= 100 ? '#22c55e' : percent >= 50 ? 'var(--accent-gradient)' : '#38bdf8',
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '11px', fontWeight: '700', color: percent >= 100 ? '#22c55e' : 'var(--text-muted)' }}>
                                    {cals} / {targetCals}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* دوگمەی کردنەوە و داخران */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div
                                className="liquid-pill"
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0
                                }}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </div>
                            </div>
                          </div>

                          {/* بەشی کراوەی ماکرۆ و ژەمەکان (Accordion Body) */}
                          {isExpanded && (
                            <div style={{
                              padding: '12px 14px',
                              borderTop: '1px solid var(--border-color)',
                              background: 'rgba(0,0,0,0.2)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              {/* باجەکانی ماکرۆ */}
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  background: 'rgba(168, 85, 247, 0.12)',
                                  color: 'var(--color-proteins)',
                                  border: '1px solid rgba(168, 85, 247, 0.25)',
                                  fontSize: '11px',
                                  fontWeight: '700'
                                }}>
                                  🥩 {t('protein')}: {Math.round(prot)}g
                                </span>
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  color: 'var(--color-carbs)',
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  fontSize: '11px',
                                  fontWeight: '700'
                                }}>
                                  🍚 {t('carbs')}: {Math.round(carb)}g
                                </span>
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  background: 'rgba(234, 179, 8, 0.12)',
                                  color: 'var(--color-fats)',
                                  border: '1px solid rgba(234, 179, 8, 0.25)',
                                  fontSize: '11px',
                                  fontWeight: '700'
                                }}>
                                  🥑 {t('fat')}: {Math.round(fat)}g
                                </span>
                              </div>

                              {/* لیستی ژەمەکانی ئەو ڕۆژە */}
                              {eatenItems.length === 0 ? (
                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                                  {currentLangConfig.code === 'en' ? 'No food logged for this day yet.' : 'هیچ خۆراکێک بۆ ئەم ڕۆژە تا ئێستا تۆمار نەکراوە.'}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {['breakfast', 'lunch', 'snack', 'dinner'].map(mType => {
                                    const mItems = (dayMeals[mType] || []).filter(item => item && item.isEaten);
                                    if (mItems.length === 0) return null;

                                    const mLabel = mType === 'breakfast' ? t('breakfast') : mType === 'lunch' ? t('lunch') : mType === 'snack' ? t('snack') : t('dinner');

                                    return (
                                      <div key={mType} style={{ padding: '6px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                          {mLabel}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                          {mItems.map((item, itemIdx) => (
                                            <div key={itemIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                                              <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>{item.icon || '🍽️'}</span>
                                                <span>{getLocalizedFoodName(item, language)}</span>
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({item.quantity || 100} {item.unit || 'g'})</span>
                                              </span>
                                              <span style={{ fontWeight: '700', color: '#38bdf8', fontSize: '11px' }}>
                                                {item.calories} {t('calories')}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>

            {/* دوگمەی داخستن لە خوارەوە */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowNutritionHistoryModal(false)}
                className="liquid-pill"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ویندۆی خوارەوە بۆ ژەمەکان و بانکی خۆراک (Home Meals & Food Bank Bottom Sheet) */}
      {showHomeMealsModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end', 
            padding: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            backdropFilter: 'blur(14px)' 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHomeMealsModal(false);
          }}
        >
          <div 
            className="modal-content bottom-sheet-content" 
            style={{ 
              width: '100%', 
              maxWidth: '520px', 
              maxHeight: '85vh', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: '28px 28px 0 0', 
              padding: '20px 20px 24px 20px', 
              borderTop: '1px solid var(--border-color)', 
              direction: currentLangConfig.dir,
              boxShadow: theme === 'light' ? '0 -10px 40px rgba(15, 23, 42, 0.12)' : '0 -15px 45px rgba(0,0,0,0.65)'
            }}
          >
            {/* دەسکی کێشان (Top Pull Indicator) */}
            <div style={{ width: '44px', height: '4px', background: theme === 'light' ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255,255,255,0.35)', borderRadius: '2px', margin: '0 auto 16px auto', flexShrink: 0 }}></div>

            {/* سەردێڕ و دوگمەی داخستن */}
            <div className="flex-between" style={{ marginBottom: '16px', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--card-subtle)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', boxShadow: '0 2px 10px var(--accent-glow)' }}>
                  <UtensilsCrossed size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                    {homeMealsModalTab === 'meals' ? t('todaysMeals') : t('foodBank')}
                  </h3>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={() => setShowFoodCategoryFilter(prev => !prev)} 
                  className="liquid-pill"
                  title={currentLangConfig.code === 'en' ? 'Filter Categories' : 'فلتەری جۆرەکان'}
                  style={{
                    width: '36px',
                    height: '36px',
                    padding: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: showFoodCategoryFilter ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    color: showFoodCategoryFilter ? 'var(--accent-primary)' : 'var(--text-main)',
                    background: showFoodCategoryFilter ? 'var(--accent-glow)' : 'var(--card-subtle)'
                  }}
                >
                  <SlidersHorizontal size={17} />
                </button>

                <button 
                  type="button"
                  onClick={() => setShowHomeMealsModal(false)} 
                  className="liquid-pill"
                  style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--text-main)', background: 'var(--card-subtle)' }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* گۆڕینی نێوان ژەمەکان و بانکی خۆراک */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '4px', background: 'var(--card-subtle)', borderRadius: '16px', marginBottom: '16px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
              <button
                onClick={() => setHomeMealsModalTab('meals')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: homeMealsModalTab === 'meals' ? 'var(--accent-gradient)' : 'transparent',
                  color: homeMealsModalTab === 'meals' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: homeMealsModalTab === 'meals' ? '0 4px 15px var(--accent-glow)' : 'none'
                }}
              >
                <UIIcon name="History" size={15} color={homeMealsModalTab === 'meals' ? '#ffffff' : 'currentColor'} />
                <span>{t('todaysMeals')}</span>
              </button>

              <button
                onClick={() => setHomeMealsModalTab('food_bank')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: homeMealsModalTab === 'food_bank' ? 'var(--accent-gradient)' : 'transparent',
                  color: homeMealsModalTab === 'food_bank' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: homeMealsModalTab === 'food_bank' ? '0 4px 15px var(--accent-glow)' : 'none'
                }}
              >
                <UtensilsCrossed size={15} color={homeMealsModalTab === 'food_bank' ? '#ffffff' : 'currentColor'} />
                <span>{t('foodBank')}</span>
              </button>
            </div>

            {/* ناوەڕۆک بە سکرۆڵ */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px', paddingLeft: '2px' }}>
              {homeMealsModalTab === 'meals' ? (
                <div>
                  {renderHomeMeals()}
                </div>
              ) : (
                <div>
                  {renderFoodBank()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* مۆداڵی سکانی خۆراک (Bottom Sheet Window) */}
      {showScanModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end', 
            padding: 0, 
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowScanModal(false);
          }}
        >
          <div 
            className="modal-content bottom-sheet-content" 
            style={{ 
              width: '100%', 
              maxWidth: '480px', 
              padding: 0, 
              overflow: 'hidden', 
              borderRadius: '28px 28px 0 0', 
              borderTop: '1px solid var(--border-color)',
              direction: currentLangConfig.dir,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
            }}
          >
            <CameraScanner 
              onClose={() => setShowScanModal(false)} 
              language={language}
              currentLangConfig={currentLangConfig}
              onFoodScanned={(scannedFood) => {
                const parseNum = (v, fallback = 0) => {
                  if (typeof v === 'number' && !isNaN(v)) return v;
                  if (typeof v === 'string') {
                    const match = v.match(/[0-9.]+/);
                    if (match) {
                      const n = parseFloat(match[0]);
                      if (!isNaN(n)) return n;
                    }
                  }
                  return fallback;
                };

                const cal = parseNum(scannedFood.baseCalories ?? scannedFood.calories, 200);
                const prot = parseNum(scannedFood.baseProtein ?? scannedFood.proteinNum ?? scannedFood.protein, 10);
                const carbs = parseNum(scannedFood.baseCarbs ?? scannedFood.carbsNum ?? scannedFood.carbs, 20);
                const fat = parseNum(scannedFood.baseFat ?? scannedFood.fatNum ?? scannedFood.fat, 5);
                const estWeight = parseNum(scannedFood.weight ?? scannedFood.estimatedWeight ?? scannedFood.portionWeight, 150);
                const estUnit = scannedFood.unit || (scannedFood.isLiquid ? 'مل' : 'گرام');

                const newFoodItem = {
                  id: 'scan_' + Date.now(),
                  name: scannedFood.name || 'خواردنی سکانکراو',
                  englishName: scannedFood.englishName || scannedFood.name || 'Scanned Food',
                  icon: scannedFood.icon || '🍽️',
                  baseCalories: Math.round((cal / (estWeight || 100)) * 100),
                  baseProtein: Math.round((prot / (estWeight || 100)) * 100),
                  baseCarbs: Math.round((carbs / (estWeight || 100)) * 100),
                  baseFat: Math.round((fat / (estWeight || 100)) * 100),
                  standardWeight: estWeight,
                  isLiquid: scannedFood.isLiquid || false,
                  category: 'all',
                  isAiGenerated: true
                };
                setShowScanModal(false);
                openPortionSelector(newFoodItem, estUnit, estWeight);
              }}
            />
          </div>
        </div>
      )}

      {/* مۆداڵی فێرکاری و ڕێنمایی شێوازی دروستی ڕاهێنان (Exercise Form Guide Modal) */}
      {activeFormExercise && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '20px', 
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveFormExercise(null);
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              width: '100%', 
              maxWidth: '460px', 
              padding: '24px', 
              borderRadius: '24px', 
              direction: currentLangConfig.dir,
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* سەردێڕ */}
            <div className="flex-between" style={{ marginBottom: '18px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '14px', 
                  background: 'var(--accent-gradient)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#fff',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                  flexShrink: 0
                }}>
                  <Dumbbell size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>
                    {getLocalizedExerciseName(activeFormExercise, language)}
                  </h3>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-proteins)', fontWeight: '700', marginTop: '3px' }}>
                    {activeFormExercise.englishName || activeFormExercise.nameEn || getExerciseEnglishName(activeFormExercise)}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setActiveFormExercise(null)} 
                style={{ 
                  background: 'var(--card-subtle)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px', 
                  width: '32px', 
                  height: '32px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer' 
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* وێنەی گەورە و جوڵاوی ئۆفلاین بۆ ڕاهێنانەکە */}
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '18px'
            }}>
              <ExerciseThumbnail
                exerciseName={activeFormExercise.englishName || activeFormExercise.nameEn || getExerciseEnglishName(activeFormExercise)}
                size={180}
              />
            </div>

            {/* زانیاری خێرا: بەش، سێت، دووبارە */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '8px', 
              marginBottom: '20px',
              padding: '12px',
              background: 'var(--card-subtle)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{currentLangConfig.code === 'en' ? 'Target Muscle' : currentLangConfig.code === 'ar' ? 'العضلة المستهدفة' : currentLangConfig.code === 'fa' ? 'عضله هدف' : 'ماسولکەی ئامانج'}</div>
                <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                  {getLocalizedMuscle(activeFormExercise.muscle || activeFormExercise.target, language)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{currentLangConfig.code === 'en' ? 'Sets & Reps' : currentLangConfig.code === 'ar' ? 'المجموعات والتكرار' : currentLangConfig.code === 'fa' ? 'ست و تکرار' : 'سێت و دووبارە'}</div>
                <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--color-proteins)', marginTop: '2px' }}>
                  {activeFormExercise.sets} × {activeFormExercise.reps}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{currentLangConfig.code === 'en' ? 'Rest Period' : currentLangConfig.code === 'ar' ? 'الراحة بين المجموعات' : currentLangConfig.code === 'fa' ? 'استراحت بین ست' : 'پشووی نێوان سێت'}</div>
                <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--color-carbs)', marginTop: '2px' }}>
                  {activeFormExercise.rest || (currentLangConfig.code === 'en' ? '60s' : currentLangConfig.code === 'ar' ? '٦٠ ثانية' : currentLangConfig.code === 'fa' ? '۶۰ ثانیه' : '٦٠ چرکە')}
                </div>
              </div>
            </div>

            {/* خاڵەکانی شێوازی دروست بە پێی خودی ڕاهێنانەکە (Exercise-Specific Form Guidelines) */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lightbulb size={16} color="var(--color-carbs)" />
                <span>{currentLangConfig.code === 'en' ? 'Proper Form & Safety Guidelines:' : currentLangConfig.code === 'ar' ? 'قواعد الأداء الصحيح والسلامة:' : currentLangConfig.code === 'fa' ? 'اصول اجرای صحیح و ایمنی:' : 'یاساکانی ئەنجامدانی شێوازی دروست:'}</span>
              </div>

              {(() => {
                const guidelines = getExerciseFormGuidelines(activeFormExercise, language);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* کارتی یەکەم: شێوازی دەستپێکردن و هاوسەنگی جەستە */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '16px' }}>{guidelines.setup.icon}</span>
                      <div>
                        <b style={{ fontSize: '12px', color: 'var(--text-main)' }}>{guidelines.setup.title}</b>
                        <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                          {guidelines.setup.desc}
                        </p>
                      </div>
                    </div>

                    {/* کارتی دووەم: تەکنیکی هەناسەدان و هێز */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '16px' }}>{guidelines.breathing.icon}</span>
                      <div>
                        <b style={{ fontSize: '12px', color: 'var(--text-main)' }}>{guidelines.breathing.title}</b>
                        <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                          {guidelines.breathing.desc}
                        </p>
                      </div>
                    </div>

                    {/* کارتی سێیەم: مەودای جوڵە و خێرایی زانستی */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '16px' }}>{guidelines.tempo.icon}</span>
                      <div>
                        <b style={{ fontSize: '12px', color: 'var(--text-main)' }}>{guidelines.tempo.title}</b>
                        <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                          {guidelines.tempo.desc}
                        </p>
                      </div>
                    </div>

                    {activeFormExercise.tip && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(168, 85, 247, 0.08)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                        <span style={{ fontSize: '16px' }}>💡</span>
                        <div>
                          <b style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>{currentLangConfig.code === 'en' ? 'Coach Tip:' : currentLangConfig.code === 'ar' ? 'توجيه المدرب:' : currentLangConfig.code === 'fa' ? 'نکته مربی:' : 'ڕێنمایی تایبەتی ڕاهێنەر:'}</b>
                          <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                            {activeFormExercise.tip}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* دوگمەی سێرچی ڤیدیۆ لە یوتیوب - تەنها لۆگۆی یوتیوب بەبێ نوسین و سێرچی ١٠٠٪ ئینگلیزی */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  const englishQuery = getExerciseEnglishName(activeFormExercise);
                  const query = encodeURIComponent(englishQuery + ' exercise form tutorial');
                  window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
                }}
                title="YouTube Tutorial"
                aria-label="YouTube Tutorial"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#ff0000',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(255, 0, 0, 0.35)',
                  transition: 'transform 0.15s ease, opacity 0.15s ease'
                }}
              >
                <svg viewBox="0 0 24 24" width="36" height="26" fill="#ffffff">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </button>

              <button
                onClick={() => setActiveFormExercise(null)}
                className="liquid-pill"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {currentLangConfig.code === 'en' ? 'Got It / Close' : currentLangConfig.code === 'ar' ? 'فهمت / إغلاق' : currentLangConfig.code === 'fa' ? 'متوجه شدم / بستن' : 'تێگەیشتم / داخستن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== مۆداڵی ڕێستکردنەوەی بەرنامە و ئەکاونت (Reset Modal) ==================== */}
      {showResetModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '20px', 
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isResetting) setShowResetModal(false);
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              width: '100%', 
              maxWidth: '440px', 
              padding: '24px', 
              borderRadius: '24px', 
              direction: currentLangConfig.dir,
              border: '1.5px solid rgba(239, 68, 68, 0.35)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.65)'
            }}
          >
            {/* سەردێڕی مۆداڵ */}
            <div className="flex-between" style={{ marginBottom: '18px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '12px', 
                  background: 'rgba(239, 68, 68, 0.12)', 
                  border: '1px solid rgba(239, 68, 68, 0.25)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#ef4444'
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#ef4444', margin: 0 }}>
                    {currentLangConfig.code === 'en' ? 'System Reset' : currentLangConfig.code === 'ar' ? 'إعادة ضبط النظام' : currentLangConfig.code === 'fa' ? 'راه‌اندازی مجدد سیستم' : 'ڕێستکردنەوەی سیستەم'}
                  </h3>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {currentLangConfig.code === 'en' ? 'Please choose one of the options:' : currentLangConfig.code === 'ar' ? 'يرجى اختيار أحد الخيارات:' : currentLangConfig.code === 'fa' ? 'لطفاً یکی از گزینه‌ها را انتخاب کنید:' : 'تکایە یەکێک لە هەڵبژاردنەکان دیاری بکە:'}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowResetModal(false)} 
                disabled={isResetting}
                style={{ 
                  background: 'var(--card-subtle)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px', 
                  width: '32px', 
                  height: '32px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer' 
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* ئاگاداری گرنگ */}
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '18px', fontSize: '11.5px', color: 'var(--text-main)', lineHeight: '1.6' }}>
              ⚠️ <b>{currentLangConfig.code === 'en' ? 'Warning:' : currentLangConfig.code === 'ar' ? 'تنبيه:' : currentLangConfig.code === 'fa' ? 'توجه:' : 'ئاگاداربە:'}</b> {currentLangConfig.code === 'en' ? 'This action is irreversible! Your data will be deleted.' : currentLangConfig.code === 'ar' ? 'هذا الإجراء لا يمكن التراجع عنه! سيتم حذف بياناتك.' : currentLangConfig.code === 'fa' ? 'این عملیات غیرقابل بازگشت است! داده‌های شما پاک خواهد شد.' : 'ئەم کردارە ناگەڕێتەوە! داتاکانت دەسڕێنەوە.'}
            </div>

            {/* دوو هەڵبژاردنەکە */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {/* هەڵبژاردنی ١: ڕێستکردنی بەرنامە */}
              <button
                type="button"
                onClick={handleResetAppOnly}
                disabled={isResetting}
                className="liquid-pill"
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  textAlign: isRtl ? 'right' : 'left',
                  cursor: 'pointer',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0, marginTop: '2px' }}>
                  <RotateCcw size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {currentLangConfig.code === 'en' ? '1. Reset App Data Only' : currentLangConfig.code === 'ar' ? '١. إعادة ضبط بيانات التطبيق فقط' : currentLangConfig.code === 'fa' ? '۱. بازنشانی فقط داده‌های برنامه' : <><span>١. ڕێستکردنی بەرنامە</span> <span dir="ltr" style={{ fontSize: '12px', opacity: 0.85 }}>(Reset App)</span></>}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                    {currentLangConfig.code === 'en' ? 'Clear workout split, meals, water and weight logs. App restarts fresh while your account stays intact.' : currentLangConfig.code === 'ar' ? 'مسح جدول التمارين، الوجبات، الماء والوزن. يعود التطبيق للبداية مع بقاء حسابك مسجلاً.' : currentLangConfig.code === 'fa' ? 'پاک کردن برنامه تمرینی، وعده‌ها، آب و وزن. برنامه از نو شروع می‌شود و حساب شما حفظ می‌شود.' : 'سڕینەوەی خشتەی وەرزش، ژەمەکان، تۆماری کێش و ئاو. بەرنامەکە دەگەڕێتەوە بۆ دەستپێکی سەرەتایی (ئەکاونتەکەت پارێزراو دەبێت).'}
                  </div>
                </div>
              </button>

              {/* هەڵبژاردنی ٢: ڕێستکردنی بەرنامە و ئەکاونت */}
              <button
                type="button"
                onClick={handleResetAppAndAccount}
                disabled={isResetting}
                className="liquid-pill"
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  textAlign: isRtl ? 'right' : 'left',
                  cursor: 'pointer',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0, marginTop: '2px' }}>
                  <Trash2 size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {currentLangConfig.code === 'en' ? '2. Full Reset & Sign Out' : currentLangConfig.code === 'ar' ? '٢. إعادة ضبط كامل وتسجيل الخروج' : currentLangConfig.code === 'fa' ? '۲. بازنشانی کامل و خروج از حساب' : <><span>٢. ڕێستکردنی بەرنامە و ئەکاونت</span> <span dir="ltr" style={{ fontSize: '12px', opacity: 0.85 }}>(Reset App & Account)</span></>}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                    {currentLangConfig.code === 'en' ? 'Clear all local data and sign out completely. Returns to welcome screen as a brand new install.' : currentLangConfig.code === 'ar' ? 'مسح كافة البيانات وتسجيل الخروج بالكامل. يعود التطبيق لشاشة الترحيب كتثبيت جديد.' : currentLangConfig.code === 'fa' ? 'پاک کردن تمام داده‌ها و خروج کامل از حساب. بازگشت به صفحه خوش‌آمدگویی همانند نصب اولیه.' : 'سڕینەوەی تەواوی داتاکان و چوونەدەرەوە لە ئەکاونت (Sign Out). بەرنامەکە دەگەڕێتەوە بۆ پەڕەی سەرەتای چوونەژوورەوە وەک ئەوەی تازە دابەزێندرابێت.'}
                  </div>
                </div>
              </button>
            </div>

            {/* دوگمەی پاشگەزبوونەوە */}
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              disabled={isResetting}
              className="liquid-pill"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {isResetting ? (currentLangConfig.code === 'en' ? 'Resetting...' : currentLangConfig.code === 'ar' ? 'جاري الضبط...' : currentLangConfig.code === 'fa' ? 'در حال بازنشانی...' : 'خەریکی ڕێستکردنەوەیە...') : (currentLangConfig.code === 'en' ? 'Cancel / Close' : currentLangConfig.code === 'ar' ? 'إلغاء / إغلاق' : currentLangConfig.code === 'fa' ? 'لغو / بستن' : 'پاشگەزبوونەوە / داخستن')}
            </button>
          </div>
        </div>
      )}

      {/* ==================== مۆداڵی دڵنیابوونەوەی دەرچوون لە ئەکاونت (Logout Confirmation Modal) ==================== */}
      {showLogoutConfirmModal && (
        <div 
          className="modal-backdrop" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '20px', 
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoggingOut) setShowLogoutConfirmModal(false);
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              width: '100%', 
              maxWidth: '380px', 
              padding: '24px', 
              borderRadius: '24px', 
              direction: currentLangConfig.dir,
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 35px rgba(239, 68, 68, 0.22)',
              textAlign: 'center'
            }}
          >
            {/* ئایکۆنی دەرچوون */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              margin: '0 auto 16px auto',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)'
            }}>
              <LogOut size={28} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
              {t('logoutConfirmTitle')}
            </h3>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 24px 0' }}>
              {t('logoutConfirmDesc')}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              {/* دوگمەی نەخێر */}
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                disabled={isLoggingOut}
                className="liquid-pill"
                style={{
                  flex: 1,
                  padding: '13px',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-subtle)',
                  color: 'var(--text-main)',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
              >
                {t('confirmNo')}
              </button>

              {/* دوگمەی بەڵێ */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                style={{
                  flex: 1,
                  padding: '13px',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  border: '1.5px solid rgba(239, 68, 68, 0.6)',
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 18px rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
              >
                <span>{isLoggingOut ? (currentLangConfig.code === 'en' ? 'Signing out...' : currentLangConfig.code === 'ar' ? 'جاري الخروج...' : currentLangConfig.code === 'fa' ? 'در حال خروج...' : 'خەریکی دەرچوونە...') : t('confirmYes')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ئەنیمەیشنی لۆدینگی دوو چرکەیی لەگەڵ سوڕانەوەی بازنە بۆ جێبەجێکردنی فەرمانەکان */}
      {actionLoadingState.active && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              background: 'linear-gradient(145deg, #181c30 0%, #101222 100%)',
              border: '1.5px solid var(--accent-glow)',
              borderRadius: '24px',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 35px var(--accent-glow)',
              maxWidth: '320px',
              width: '100%',
              textAlign: 'center',
              direction: currentLangConfig.dir
            }}
          >
            {/* بازنەی سوڕاوە (Spinning Circle) */}
            <div className="action-loading-spinner" style={{ marginBottom: '18px' }} />

            <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>
              {actionLoadingState.message}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--accent-primary)" />
              <span>{currentLangConfig.code === 'en' ? 'Applying action...' : currentLangConfig.code === 'ar' ? 'جاري المعالجة والتطبيق...' : currentLangConfig.code === 'fa' ? 'در حال اعمال در برنامه...' : 'خەریکی جێبەجێکردنە لە بەرنامەدا...'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== شاشەی سەوزی دەستپێکە بۆ ٣ چرکە لە دوای کاونتداون (3s Full-Screen Start Set Overlay) ==================== */}
      {showStartSetOverlay && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999999,
            backgroundColor: '#16a34a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease-in-out',
            direction: currentLangConfig.dir,
            cursor: 'pointer'
          }}
          onClick={() => setShowStartSetOverlay(false)}
        >
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 0 35px rgba(255,255,255,0.4)'
          }}>
            <Play size={48} color="#ffffff" />
          </div>
          <h1 style={{
            fontSize: '44px',
            fontWeight: '900',
            color: '#ffffff',
            margin: '0 0 10px 0',
            textAlign: 'center',
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            letterSpacing: '1px'
          }}>
            دەستپێکە
          </h1>
          <p style={{
            fontSize: '18px',
            fontWeight: '800',
            color: 'rgba(255, 255, 255, 0.95)',
            margin: 0,
            textAlign: 'center'
          }}>
            کاتی پشوو تەواوبوو، سێتی دواتر دەستیپێکرد!
          </p>
        </div>
      )}

      {/* ==================== دیالۆگی دڵنیاکەرەوەی گۆڕینی ڕاهێنان (Exercise Swap Confirmation) ==================== */}
      {exerciseToSwapConfirm && (
        <div 
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            direction: currentLangConfig.dir
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setExerciseToSwapConfirm(null); }}
        >
          <div 
            className="modal-content"
            style={{
              background: 'linear-gradient(145deg, #181c30 0%, #101222 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              borderRadius: '24px',
              padding: '24px 20px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(239, 68, 68, 0.25)',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              margin: '0 auto 14px auto'
            }}>
              <RefreshCw size={26} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
              {language === 'en' ? 'Swap Exercise' : 'گۆڕینی ڕاهێنان'}
            </h3>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 18px 0' }}>
              {language === 'en'
                ? `Do you want to change "${exerciseToSwapConfirm.ex?.englishName || exerciseToSwapConfirm.ex?.name}"? You can let AI pick an alternative, choose from the catalog, or remove it.`
                : `دەتەوێت ڕاهێنانی "${getLocalizedExerciseName(exerciseToSwapConfirm.ex, language)}" بگۆڕیت؟ دەتوانیت لە ڕێگەی زیرەکی دەستکرد یان لە لیستی جێگرەوەکان یەکێکی تر هەڵبژێریت.`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* گۆڕین لە ڕێگەی زیرەکی دەستکرد */}
              <button
                type="button"
                onClick={() => handleAiSwapSingleExercise(exerciseToSwapConfirm.ex, exerciseToSwapConfirm.exIdx)}
                disabled={isAiSwappingExercise}
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'var(--accent-gradient)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px var(--accent-glow)'
                }}
              >
                <Sparkles size={16} />
                <span>{isAiSwappingExercise ? (language === 'en' ? 'Finding with AI...' : 'خەریکی دۆزینەوەیە بە AI...') : (language === 'en' ? 'Auto-Swap with AI' : 'گۆڕین لە ڕێگەی زیرەکی دەستکرد (AI)')}</span>
              </button>

              {/* هەڵبژاردنی جێگرەوە لە لیست */}
              <button
                type="button"
                onClick={() => {
                  setExerciseSwapModalData(exerciseToSwapConfirm);
                  setExerciseToSwapConfirm(null);
                }}
                className="liquid-pill"
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'var(--card-subtle)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Dumbbell size={15} />
                <span>{language === 'en' ? 'Choose from Alternative List' : 'هەڵبژاردنی جێگرەوە لە لیست'}</span>
              </button>

              {/* سڕینەوەی ئەم ڕاهێنانە */}
              <button
                type="button"
                onClick={() => handleDeleteExerciseFromDay(exerciseToSwapConfirm.exIdx)}
                className="liquid-pill"
                style={{
                  padding: '10px 14px',
                  borderRadius: '14px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} />
                <span>{language === 'en' ? 'Remove Exercise Completely' : 'لابردنی یەکجارەکی ئەم ڕاهێنانە'}</span>
              </button>

              {/* پەشیمانبوونەوە */}
              <button
                type="button"
                onClick={() => setExerciseToSwapConfirm(null)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '14px',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {language === 'en' ? 'Cancel' : 'پەشیمانبوونەوە'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== مۆداڵی تەواوی ڕاهێنانە جێگرەوەکان بە فلتەری ماسولکە و نەبوونی دووبارە (Exercise Alternatives Modal) ==================== */}
      {exerciseSwapModalData && (
        <div 
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 0,
            direction: currentLangConfig.dir
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setExerciseSwapModalData(null); }}
        >
          <div 
            className="modal-content bottom-sheet-content"
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '28px 28px 0 0',
              padding: '20px 18px 26px 18px',
              borderTop: '1px solid var(--border-color)',
              boxShadow: '0 -15px 45px rgba(0,0,0,0.65)'
            }}
          >
            {/* دەسکی کێشان */}
            <div style={{ width: '44px', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', margin: '0 auto 14px auto', flexShrink: 0 }}></div>

            <div className="flex-between" style={{ marginBottom: '14px', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
                  {language === 'en' ? 'Select Alternative Exercise' : 'هەڵبژاردنی ڕاهێنانی جێگرەوە'}
                </h3>
                <div style={{ fontSize: '11.5px', color: 'var(--color-carbs)', fontWeight: '700', marginTop: '2px' }}>
                  {language === 'en' ? 'Target: ' : 'مەبەست: '}{getLocalizedMuscle(exerciseSwapModalData.ex?.muscle, language)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExerciseSwapModalData(null)}
                className="liquid-pill"
                style={{ width: '34px', height: '34px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--text-main)', background: 'var(--card-subtle)' }}
              >
                <X size={17} />
              </button>
            </div>

            {/* گۆڕینی ڕاستەوخۆ لە ڕێگەی AI */}
            <div style={{ marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => handleAiSwapSingleExercise(exerciseSwapModalData.ex, exerciseSwapModalData.exIdx)}
                disabled={isAiSwappingExercise}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '14px',
                  background: 'var(--accent-gradient)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px var(--accent-glow)'
                }}
              >
                <Sparkles size={16} />
                <span>{isAiSwappingExercise ? (language === 'en' ? 'Analyzing with AI...' : 'خەریکی دۆزینەوەیە بە AI...') : (language === 'en' ? 'Auto-Swap with AI' : 'گۆڕین لە ڕێگەی زیرەکی دەستکرد (AI)')}</span>
              </button>
            </div>

            {/* فلتەری ماسولکە */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '10px' }}>
              {[
                { id: 'same', label: language === 'en' ? 'Same Muscle' : 'هەمان ماسولکە' },
                { id: 'all', label: language === 'en' ? 'All Muscles' : 'هەموو جۆرەکان' },
                { id: 'chest', label: 'سنگ' },
                { id: 'back', label: 'پشت' },
                { id: 'shoulders', label: 'شان' },
                { id: 'arms', label: 'قۆڵ' },
                { id: 'legs', label: 'قاچ' },
                { id: 'core', label: 'کۆڕ و ورگ' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSwapMuscleFilter(f.id)}
                  className="liquid-pill"
                  style={{
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: swapMuscleFilter === f.id ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: swapMuscleFilter === f.id ? 'var(--accent-glow)' : 'var(--card-subtle)',
                    color: swapMuscleFilter === f.id ? 'var(--accent-primary)' : 'var(--text-main)'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* لیستی ڕاهێنانە جێگرەوەکان بەبێ هەبوونی دووبارە لە هەمان ڕۆژ */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {(() => {
                const dayExercises = (workoutCourse?.weeklyPlan || [])[selectedDayIdx]?.exercises || [];
                const existingNames = new Set(dayExercises.map(e => (e.englishName || e.name || '').toLowerCase().trim()));
                const targetMuscle = (exerciseSwapModalData.ex?.muscle || '').toLowerCase();

                const filteredCatalog = (ALTERNATIVE_EXERCISES_CATALOG || []).filter(item => {
                  const itemKey = (item.englishName || item.name || '').toLowerCase().trim();
                  // 1. مەرجی یەکەم: نابێت لە هەمان ئەو ڕۆژە هەبێت (No duplicates on the same day)
                  if (existingNames.has(itemKey)) return false;

                  // 2. مەرجی ماسولکە بەپێی فلتەر
                  if (swapMuscleFilter === 'same') {
                    return item.muscle.toLowerCase().includes(targetMuscle) || targetMuscle.includes(item.muscle.toLowerCase());
                  }
                  if (swapMuscleFilter === 'all') return true;
                  if (swapMuscleFilter === 'chest') return item.muscle.includes('سنگ') || item.muscle.toLowerCase().includes('chest');
                  if (swapMuscleFilter === 'back') return item.muscle.includes('پشت') || item.muscle.toLowerCase().includes('back') || item.muscle.toLowerCase().includes('lats');
                  if (swapMuscleFilter === 'shoulders') return item.muscle.includes('شان') || item.muscle.toLowerCase().includes('shoulder');
                  if (swapMuscleFilter === 'arms') return item.muscle.includes('قۆڵ') || item.muscle.includes('بایسێپس') || item.muscle.includes('تڕایسێپس');
                  if (swapMuscleFilter === 'legs') return item.muscle.includes('قاچ') || item.muscle.toLowerCase().includes('leg') || item.muscle.toLowerCase().includes('quad');
                  if (swapMuscleFilter === 'core') return item.muscle.includes('کۆڕ') || item.muscle.includes('ورگ') || item.muscle.toLowerCase().includes('abs');
                  return true;
                });

                if (filteredCatalog.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {language === 'en' ? 'No alternative exercises found in this category.' : 'هیچ ڕاهێنانێکی تر لەم بەشە نەدۆزرایەوە کە لە هەمان ڕۆژ نەبێت.'}
                    </div>
                  );
                }

                return filteredCatalog.map((candidate, cIdx) => (
                  <div
                    key={cIdx}
                    onClick={() => handleReplaceExerciseInDay(exerciseSwapModalData.exIdx, candidate)}
                    className="liquid-pill"
                    style={{
                      padding: '12px 14px',
                      borderRadius: '16px',
                      background: 'var(--card-subtle)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      direction: 'ltr'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ExerciseThumbnail exerciseName={candidate.englishName || candidate.name} size={42} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: '800', fontSize: '14.5px', color: 'var(--text-main)' }}>
                          {candidate.englishName || candidate.name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-carbs)', fontWeight: '600', marginTop: '2px' }}>
                          {candidate.muscle} • {candidate.sets || 4}x{candidate.reps || '10-12'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: 'var(--accent-gradient)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      {language === 'en' ? 'Select' : 'هەڵبژاردن'}
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================== مۆداڵی تەواوی سەپلیمێنت و ڤیتامین و دەرمانەکان (Supplements Selector Modal) ==================== */}
      {showSupplementsModal && (
        <div 
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 0,
            direction: currentLangConfig.dir
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSupplementsModal(false); }}
        >
          <div 
            className="modal-content bottom-sheet-content"
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '28px 28px 0 0',
              padding: '20px 18px 26px 18px',
              borderTop: '1px solid var(--border-color)',
              boxShadow: '0 -15px 45px rgba(0,0,0,0.65)'
            }}
          >
            {/* دەسکی کێشان */}
            <div style={{ width: '44px', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', margin: '0 auto 14px auto', flexShrink: 0 }}></div>

            <div className="flex-between" style={{ marginBottom: '14px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={22} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '17px', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
                  {language === 'en' ? 'Supplements, Vitamins & Hormones' : 'سەپلیمێنت، ڤیتامین، دەرمان و هۆرمۆن'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplementsModal(false)}
                className="liquid-pill"
                style={{ width: '34px', height: '34px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--text-main)', background: 'var(--card-subtle)' }}
              >
                <X size={17} />
              </button>
            </div>

            {/* گەڕان لەناو سەپلیمێنتەکان */}
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder={language === 'en' ? 'Search supplements...' : 'گەڕان لەناو سەپلیمێنت و ڤیتامینەکان...'}
                value={supplementSearchText}
                onChange={(e) => setSupplementSearchText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* لیستی پۆلێنکراوی تەواوکەرە خۆراکییەکان */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
              {(() => {
                const searchLower = (supplementSearchText || '').toLowerCase().trim();
                const currentSups = Array.isArray(profile.supplements) ? profile.supplements : [];

                return (MASTER_SUPPLEMENTS_CATALOG || []).map((cat, catIdx) => {
                  const filteredItems = (cat.items || []).filter(item => {
                    if (!searchLower) return true;
                    return item.name.toLowerCase().includes(searchLower) || (item.englishName && item.englishName.toLowerCase().includes(searchLower));
                  });

                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={catIdx}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡</span>
                        <span>{cat.category}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                        {filteredItems.map((item, iIdx) => {
                          const isSelected = currentSups.some(s => (typeof s === 'string' ? s : (s.name || s.englishName)) === item.name);

                          return (
                            <div
                              key={iIdx}
                              onClick={() => {
                                const exists = currentSups.some(s => (typeof s === 'string' ? s : (s.name || s.englishName)) === item.name);
                                let updated;
                                if (exists) {
                                  updated = currentSups.filter(s => (typeof s === 'string' ? s : (s.name || s.englishName)) !== item.name);
                                } else {
                                  updated = [...currentSups, item.name];
                                }
                                setProfile(prev => ({ ...prev, supplements: updated }));
                              }}
                              className="liquid-pill"
                              style={{
                                padding: '10px 12px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: isSelected ? 'var(--accent-gradient)' : 'var(--card-subtle)',
                                border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                color: isSelected ? '#ffffff' : 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px',
                                boxShadow: isSelected ? '0 4px 15px var(--accent-glow)' : 'none',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                                <div style={{ fontSize: '12.5px', fontWeight: '800' }}>{item.name}</div>
                                {item.englishName && <div style={{ fontSize: '10px', opacity: 0.8 }}>{item.englishName}</div>}
                              </div>
                              {isSelected && <Check size={14} style={{ strokeWidth: 3 }} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* دوگمەی تەواوبوو */}
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => {
                  setShowSupplementsModal(false);
                  playSparkleSound();
                }}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '16px',
                  background: 'var(--accent-gradient)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px var(--accent-glow)'
                }}
              >
                {language === 'en' ? 'Done & Save' : 'تەواوبوو و پاشەکەوتکردن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== مۆداڵی پێشکەوتووی شیکاری وێنەی لەش بە زیرەکی دەستکرد (AI Physique Vision Scanner) ==================== */}
      <PhysiqueScannerModal
        isOpen={showPhysiqueModal}
        onClose={() => setShowPhysiqueModal(false)}
        language={language}
        currentLangConfig={currentLangConfig}
        profile={profile}
        onPhysiqueAnalyzed={handlePhysiqueAnalyzed}
      />

      {/* ==================== شاشەی قفڵکردنی ئەپڵیکەیشن لە دوورەوە (Remote Kill-Switch Lock Screen) ==================== */}
      {isAppSuspended && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 7, 15, 0.98)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 44px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)',
          boxSizing: 'border-box',
          textAlign: 'center',
          direction: 'rtl'
        }}>
          <div style={{
            maxWidth: '380px',
            width: '100%',
            background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '24px',
            padding: '36px 24px',
            boxShadow: '0 20px 60px rgba(239, 68, 68, 0.25)'
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '22px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              color: '#ef4444'
            }}>
              <ShieldAlert size={36} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', margin: '0 0 8px 0' }}>
              هەژمارەکەت ڕاگیراوە
            </h2>

            <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              {appSuspendReason || 'ئەم ئەپڵیکەیشنە لەلایەن ڕاهێنەرەوە ڕاگیراوە. تکایە بۆ چالاککردنەوە پەیوەندی بە بەڕێوەبەرایەتی هۆڵی BQ GYM بکە.'}
            </p>

            <div style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '12px',
              color: '#94a3b8'
            }}>
              BQ GYM Security System • دۆخ: قفڵکراوە
            </div>
          </div>
        </div>
      )}

      {/* ==================== مۆداڵی بەڕێوەبەری و ڕاهێنەر (Master Admin Dashboard Modal) ==================== */}
      <AdminDashboardModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />

      {/* ==================== هێڵی خوارەوە (Luminous Purple-Blue Liquid Glass Bottom Bar) ==================== */}
      <nav 
        className="bottom-nav" 
        dir="ltr"
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: '100%', 
          maxWidth: '480px', 
          height: 'calc(64px + max(env(safe-area-inset-bottom, 0px), 30px))', 
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 30px)',
          alignItems: 'flex-start',
          background: 'transparent',
          border: 'none',
          borderTop: 'none',
          zIndex: 2000, 
          paddingLeft: '6px',
          paddingRight: '6px',
          overflow: 'visible',
          direction: 'ltr',
          display: ((isKeyboardOpen || isChatInputFocused) && (activeTab === 'more' || activeTab === 'ai') && moreActiveTab === 'coach') ? 'none' : 'flex'
        }}
      >
        {/* پاشبنەمای قەوس و بڕاوەی شوشەیی */}
        <svg 
          viewBox="0 0 500 95" 
          preserveAspectRatio="none" 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '66px', 
            zIndex: 0, 
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          <path 
            d={svgCutoutPath} 
            fill="var(--bottom-nav-bg)"
            style={{ 
              filter: theme === 'light' ? 'drop-shadow(0 -4px 16px rgba(59, 130, 246, 0.12))' : 'drop-shadow(0 -8px 24px rgba(0,0,0,0.7))',
              transition: 'd 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' 
            }}
          />
          <path 
            d={svgBorderPath} 
            fill="none" 
            stroke="var(--nav-border)" 
            strokeWidth="1.6"
            style={{ transition: 'd 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
        </svg>

        {/* پڕکەرەوەی سەیف-زۆنی ژێر دوگمەکان تا لەسەر ئایفۆن دوگمەکان بەرز ببنەوە */}
        <div style={{
          position: 'absolute',
          top: '63px',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--bottom-nav-bg)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        {/* دوگمەکانی تابەکان */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', height: '64px', justifyContent: 'space-around', alignItems: 'center', direction: 'ltr' }}>
          {tabList.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'more') setMoreActiveTab('menu');
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flex: 1,
                  height: '100%',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  userSelect: 'none'
                }}
              >
                {/* بازنەی ئایکۆنی بەرزبووەوەی شوشەیی مۆر و شین (بەرزکراوەتەوە بۆ 26px تا بە تەواوی لە شەیپەکە جیا ببێتەوە) */}
                <div style={{
                  width: isActive ? '46px' : '32px',
                  height: isActive ? '46px' : '32px',
                  borderRadius: '50%',
                  background: isActive 
                    ? 'var(--accent-gradient)' 
                    : 'transparent',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  transform: isActive ? 'translateY(-26px)' : 'translateY(0)',
                  boxShadow: isActive 
                    ? '0 10px 22px var(--accent-glow), inset 0 2px 4px rgba(255, 255, 255, 0.65)' 
                    : 'none',
                  border: 'none',
                  outline: 'none',
                  backdropFilter: isActive ? 'blur(10px)' : 'none',
                  transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                  {tab.icon(isActive)}
                </div>

                <span style={{ 
                  fontSize: isActive ? '10.5px' : '10px', 
                  fontWeight: '800',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                  marginTop: isActive ? '-6px' : '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  transition: 'all 0.25s ease'
                }}>
                  {tab.label}
                  {isActive && (
                    <span style={{ 
                      width: '3.5px', 
                      height: '3.5px', 
                      borderRadius: '50%', 
                      background: 'var(--accent-primary)'
                    }} />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </nav>
        </>
      )}
    </div>
  );
}
