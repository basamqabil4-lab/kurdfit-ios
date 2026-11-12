'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Dumbbell, Sparkles, 
  Play, Info, Flame, Target, ArrowRight, ArrowLeft, CheckCircle2, 
  HelpCircle, X, Shield, Zap
} from 'lucide-react';
import ExerciseThumbnail from './ExerciseThumbnail';

// =========================================================================
// داتابەیسی دەوڵەمەندی ماسولکەکان و ڕاهێنانەکانیان بۆ سلایدەری سەرەوە و خوارەوە
// =========================================================================
const MUSCLE_DATA = [
  {
    id: 'upper_chest',
    category: 'chest',
    nameKu: 'سنگی سەرەوە',
    nameEn: 'Upper Chest',
    scientific: 'Clavicular Pectoralis Major',
    categoryKu: 'سنگ',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    descriptionKu: 'بەرپرسە لە پاڵنانی قورسایی بەرەو سەرەوە و پڕکردنی بەشی سەرەوەی قەفەسی سنگ تا دەگاتە ئێسکی چەڵەمە.',
    mainExercise: 'incline dumbbell bench press',
    exercises: [
      { nameKu: 'ئینکلایین دەمبڵ پرێس', englishName: 'incline dumbbell bench press', sets: '4 سێت', reps: '10-12', equipment: 'دەمبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'گۆشەی کورسییەکە لەسەر ٣٠ بۆ ٤٥ پلە دابنێ بۆ ئەوەی زۆرترین پەستان بکەوێتە سەر سنگی سەرەوە.' },
      { nameKu: 'ئینکلایین باربێڵ پرێس', englishName: 'barbell incline bench press', sets: '4 سێت', reps: '8-10', equipment: 'باربێڵ', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'باربێڵەکە بە هێواشی دابەزێنە تا نزیک بەشی سەرەوەی سنگ و پاشان بە تەقینەوەیی پاڵی پێوە بنێ.' },
      { nameKu: 'کەیبڵ فلای لە خوارەوە بۆ سەرەوە', englishName: 'standing cable chest fly', sets: '3 سێت', reps: '12-15', equipment: 'کەیبڵ', difficulty: 'ئاسان', location: 'gym', tipKu: 'لە کاتی لێکخشاندنی دەستەکان لە سەرەوە، یەک چرکە سنگی سەرەوەت گرژ بکە.' },
      { nameKu: 'شناوی پایک بە گۆشەی بەرز (Pike Push-ups)', englishName: 'pike push-ups', sets: '3 سێت', reps: '10-12', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'سمتت بەرز بکەرەوە و سەرت بەرەو خوارەوە دابەزێنە؛ ئەم گۆشەیە بە تەواوی سنگی سەرەوە بەهێز دەکات.' }
    ]
  },
  {
    id: 'mid_chest',
    category: 'chest',
    nameKu: 'سنگی ناوەڕاست و گشتی',
    nameEn: 'Mid Chest',
    scientific: 'Sternal Pectoralis Major',
    categoryKu: 'سنگ',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    descriptionKu: 'گەورەترین بەشی سنگ کە قەبارە و ئەستووری گشتی بە سنگ دەبەخشێت و هێزی سەرەکی پاڵنان دابین دەکات.',
    mainExercise: 'barbell bench press',
    exercises: [
      { nameKu: 'بێنچ پرێس بە باربێڵ', englishName: 'barbell bench press', sets: '4 سێت', reps: '8-10', equipment: 'باربێڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'پێیەکانت بە توندی لەسەر زەوی بچەسپێنە و شانەکانت لە پشتەوە کۆبکەرەوە.' },
      { nameKu: 'فلات دەمبڵ پرێس', englishName: 'dumbbell bench press', sets: '4 سێت', reps: '10-12', equipment: 'دەمبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'دەمبڵەکان ڕێگە دەدەن مەودای جووڵەکەت فراوانتر بێت بە بەراورد بە باربێڵ.' },
      { nameKu: 'کەیبڵ چێست فلای', englishName: 'cable chest fly', sets: '3 سێت', reps: '12-15', equipment: 'کەیبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'ئەنیشکەکان کەمێک چەماوە ڕابگرە تا پەستان نەکەوێتە سەر جومگەی ئەنیشک.' },
      { nameKu: 'شناوی ستاندارد (Standard Push-ups)', englishName: 'push-ups', sets: '3 سێت', reps: '15-20', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'جەستەت لە یەک هێڵی ڕێکدا ڕابگرە و بە تەواوی داببەزە تا سنگت نزیک زەوی دەبێتەوە.' }
    ]
  },
  {
    id: 'lower_chest',
    category: 'chest',
    nameKu: 'سنگی خوارەوە',
    nameEn: 'Lower Chest',
    scientific: 'Abdominal Pectoralis Major',
    categoryKu: 'سنگ',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    descriptionKu: 'هێڵی دەوری خوارەوەی سنگ دروست دەکات و شێوەیەکی بڕاو و تۆکمە بە سنگ دەبەخشێت.',
    mainExercise: 'chest dips',
    exercises: [
      { nameKu: 'دیپس بۆ خوارەوەی سنگ', englishName: 'chest dips', sets: '3 سێت', reps: '10-12', equipment: 'ئامێر', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'کەمێک جەستەت بەرەو پێشەوە بچەمێنەرەوە بۆ ئەوەی پەستانەکە لەسەر سنگ بێت نەک ترایسێپس.' },
      { nameKu: 'دیکلایین دەمبڵ پرێس', englishName: 'decline dumbbell bench press', sets: '3 سێت', reps: '10-12', equipment: 'دەمبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'لە کاتی بەرزکردنەوەدا هەناسە بدەرەوە و سنگی خوارەوەت توند بکە.' },
      { nameKu: 'دیپس لەسەر کورسی (Chair Dips)', englishName: 'bench dips', sets: '3 سێت', reps: '12-15', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'دەستەکانت لەسەر لێواری کورسی دابنێ و جەستەت کەمێک بچەمێنەرەوە بۆ بەهێزکردنی هێڵی خوارەوەی سنگ.' }
    ]
  },
  {
    id: 'lats',
    category: 'back',
    nameKu: 'باڵەکان (لاتس)',
    nameEn: 'Lats (Wings)',
    scientific: 'Latissimus Dorsi',
    categoryKu: 'پشت',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    descriptionKu: 'گەورەترین ماسولکەی پشت کە شێوەی پیتی V دەبەخشێت بە لەش و پانی پشت و قەد دیاری دەکات.',
    mainExercise: 'lat pulldown',
    exercises: [
      { nameKu: 'لات پولداون بە کەیبڵ', englishName: 'lat pulldown', sets: '4 سێت', reps: '10-12', equipment: 'کەیبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'میڵەکە بەرەو بەشی سەرەوەی سنگ ڕابکێشە و لە خوارەوە کەمێک گرژی بکە.' },
      { nameKu: 'عوقلە بە دەستی پان', englishName: 'pull-ups', sets: '3 سێت', reps: '6-10', equipment: 'ئامێر', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'شانەکانت بە هێزی باڵەکان بەرز بکەرەوە بەبێ لەرزینی ناپێویستی قاچەکانت.' },
      { nameKu: 'لات پولداون بە گرتنی پان', englishName: 'lat pulldown wide grip', sets: '3 سێت', reps: '10-12', equipment: 'کەیبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'گرتنی پان زیاتر تیشک دەخاتە سەر لێوارەکانی دەرەوەی باڵەکان.' },
      { nameKu: 'ڕاکێشانی جەستە بە ئەنیشک لەسەر زەوی (Reverse Push-up)', englishName: 'floor reverse push-up', sets: '3 سێت', reps: '12-15', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'لەسەر پشت پاڵبکەوە و بە پاڵنانی ئەنیشکەکانت بۆ سەر زەوی، پشتت بەرز بکەرەوە تا باڵەکانت گرژ دەبن.' }
    ]
  },
  {
    id: 'mid_back',
    category: 'back',
    nameKu: 'ناوەڕاستی پشت',
    nameEn: 'Upper & Mid Back',
    scientific: 'Rhomboids & Teres Major',
    categoryKu: 'پشت',
    color: '#0284c7',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    descriptionKu: 'ئەستووری و قووڵی ماسولکەیی بە پشت دەبەخشێت و بڕبڕەکانی پشت لە مەترسی برینداربوون دەپارێزێت.',
    mainExercise: 'seated cable row',
    exercises: [
      { nameKu: 'سیتد کەیبڵ ڕۆو', englishName: 'seated cable row', sets: '4 سێت', reps: '10-12', equipment: 'کەیبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'پشتت بە ڕێکی ڕابگرە و دەسکەکە بەرەو ناوک ڕابکێشە لە کاتێکدا شانت لە پشتەوە جووت دەکەیت.' },
      { nameKu: 'بێنت ئۆڤەر باربێڵ ڕۆو', englishName: 'bent over barbell row', sets: '4 سێت', reps: '8-10', equipment: 'باربێڵ', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'کەمەر بە گۆشەی ٤٥ پلە بچەمێنەرەوە و بە تەواوی ئاگاداری ڕێکی بڕبڕەی پشتت بە.' },
      { nameKu: 'دەمبڵ ڕۆو بە یەک دەست', englishName: 'single arm dumbbell row', sets: '3 سێت', reps: '10-12', equipment: 'دەمبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'ئەنیشکت بەرەو تەنیشتی کەمەر بەرز بکەرەوە تا زۆرترین گرژی دروست ببێت.' },
      { nameKu: 'بەرزکردنەوەی ئەنیشک لەسەر زەوی بۆ ناوەڕاستی پشت', englishName: 'floor reverse push-up', sets: '3 سێت', reps: '12-15', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'لە کاتی بەرزکردنەوەی جەستەدا، هەردوو لای شانت لە پشتەوە بە یەکتر بگەیەنە.' }
    ]
  },
  {
    id: 'lower_back',
    category: 'back',
    nameKu: 'خوارەوەی پشت (کەمەر)',
    nameEn: 'Lower Back',
    scientific: 'Erector Spinae',
    categoryKu: 'پشت',
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    descriptionKu: 'بناغەی ڕاگرتنی تەواوی باڵا و بڕبڕەی پشتە کە هێز دەدات بە بەرزکردنەوەی قورسایی و پاراستنی کەمەر.',
    mainExercise: 'barbell deadlift',
    exercises: [
      { nameKu: 'دیدلیفت بە باربێڵ', englishName: 'barbell deadlift', sets: '4 سێت', reps: '6-8', equipment: 'باربێڵ', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'باربێڵەکە بە تەواوی بە نزیک پێست و لاقەکانتدا بەرز بکەرەوە بۆ پاراستنی کەمەر.' },
      { nameKu: 'ڕۆمانیەن دیدلیفت', englishName: 'romanian deadlift', sets: '3 سێت', reps: '8-10', equipment: 'باربێڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'سمتت بەرەو دواوە پاڵ پێوە بنێ و کەمەر بە تەواوی ڕێک ڕابگرە.' },
      { nameKu: 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman)', englishName: 'superman holds', sets: '3 سێت', reps: '15 چرکە', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'لەسەر دەم پاڵبکەوە و دەست و قاچت بەرز بکەرەوە تا ماسولکەکانی خوارەوەی پشت بەهێز ببن.' }
    ]
  },
  {
    id: 'front_delts',
    category: 'shoulders',
    nameKu: 'شانی پێشەوە',
    nameEn: 'Front Deltoid',
    scientific: 'Anterior Deltoid',
    categoryKu: 'شان',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    descriptionKu: 'بەشی پێشەوەی قۆڵی سەرەوە لەگەڵ سنگ بەیەکەوە دەبەستێتەوە و بەرپرسە لە بەرزکردنەوەی دەست بەرەو پێشەوە.',
    mainExercise: 'dumbbell shoulder press',
    exercises: [
      { nameKu: 'شۆڵدەر پرێس بە دەمبڵ', englishName: 'dumbbell shoulder press', sets: '4 سێت', reps: '8-10', equipment: 'دەمبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'دەمبڵەکان تا ئاستی گوێیەکان دابەزێنە و پاشان بەرەو سەرەوە پاڵیان پێوە بنێ.' },
      { nameKu: 'میلیتەری پرێس بە باربێڵ', englishName: 'military press', sets: '3 سێت', reps: '6-8', equipment: 'باربێڵ', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'لە کاتی بەرزکردنەوەی باربێڵ لەسەر پێیەکانت جێگیر بە و کەمەرت مەشکێنە.' },
      { nameKu: 'فڕۆنت ڕەیز بە دەمبڵ', englishName: 'dumbbell front raise', sets: '3 سێت', reps: '12', equipment: 'دەمبڵ', difficulty: 'ئاسان', location: 'gym', tipKu: 'دەمبڵەکان تا ئاستی چاو بەرز بکەرەوە و بە هێواشی دایانبەزێنە.' },
      { nameKu: 'شناوی پایک بۆ شان (Pike Push-ups)', englishName: 'pike push-ups', sets: '3 سێت', reps: '10-12', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'بە شێوەی پیتی V پێچەوانە ڕابوەستە و سەرت بەرەو خوارەوە دابەزێنە بۆ بەهێزکردنی شانی پێشەوە.' }
    ]
  },
  {
    id: 'side_delts',
    category: 'shoulders',
    nameKu: 'شانی تەنیشت (پانی شان)',
    nameEn: 'Lateral Deltoid',
    scientific: 'Lateral Deltoid',
    categoryKu: 'شان',
    color: '#fb923c',
    gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
    descriptionKu: 'گرنگترین بەشی شان بۆ پێدانی پانی و شێوەی چوارگۆشەیی و پێدانی فراوانی باڵا بە شێوازی فەرمی.',
    mainExercise: 'dumbbell lateral raise',
    exercises: [
      { nameKu: 'لاتێرال ڕەیز بە دەمبڵ', englishName: 'dumbbell lateral raise', sets: '4 سێت', reps: '12-15', equipment: 'دەمبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'ئەنیشکەکان کەمێک چەماوە بن و مەهێڵە قورسایی زۆر بتلەرزێنێت.' },
      { nameKu: 'لاتێرال ڕەیز بە کەیبڵ', englishName: 'cable lateral raise', sets: '3 سێت', reps: '12-15', equipment: 'کەیبڵ', difficulty: 'ئاسان', location: 'gym', tipKu: 'کەیبڵ فشاری بەردەوام لەسەر هەموو مەودای جووڵەکە دەهێڵێتەوە.' },
      { nameKu: 'شناوی پایک بە دەستی فراوان (Wide Pike)', englishName: 'pike push-ups', sets: '3 سێت', reps: '10-12', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'دەستەکان کەمێک فراوانتر بکەرەوە و تەنیشتی شانەکانت گرژ بکە لە کاتی پاڵنانی جەستە.' }
    ]
  },
  {
    id: 'rear_delts',
    category: 'shoulders',
    nameKu: 'شانی دواوە',
    nameEn: 'Rear Deltoid',
    scientific: 'Posterior Deltoid',
    categoryKu: 'شان',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    descriptionKu: 'تەواوکەری شێوەی خڕی تۆپئاسای شانە کە لە ڕووی دواوەوە دیارە و بڕبڕە و مل لە چەمانەوە دەپارێزێت.',
    mainExercise: 'cable face pull',
    exercises: [
      { nameKu: 'فەیس پووڵ بە کەیبڵ', englishName: 'cable face pull', sets: '4 سێت', reps: '12-15', equipment: 'کەیبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'گوریسەکە بەرەو لووت و چاوت ڕابکێشە و ئەنیشکەکانت بەرز ڕابگرە.' },
      { nameKu: 'ڕیڤێرس پێک دێک', englishName: 'reverse pec deck', sets: '3 سێت', reps: '12-15', equipment: 'ئامێر', difficulty: 'ئاسان', location: 'gym', tipKu: 'شانەکانت لە دواوە یەک بخە و قۆڵت کەمێک چەماوە ڕابگرە.' },
      { nameKu: 'بەرزکردنەوەی ئەنیشک لەسەر زەوی (Floor Reverse Push-up)', englishName: 'floor reverse push-up', sets: '3 سێت', reps: '10-12', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'ئەنیشکەکانت بە قووڵی لە زەوی بچەسپێنە بۆ خستنەگەڕی تەواوی پشتی شان.' }
    ]
  },
  {
    id: 'traps',
    category: 'shoulders',
    nameKu: 'تڕاپیز (ماسولکەی مل)',
    nameEn: 'Trapezius',
    scientific: 'Trapezius',
    categoryKu: 'شان',
    color: '#eab308',
    gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    descriptionKu: 'لە بنی سەرەوە تا ناوەڕاستی پشت درێژ دەبێتەوە و بەرپرسە لە بەرزکردنەوە و سووڕاندنی شان و پاراستنی مل.',
    mainExercise: 'dumbbell shrug',
    exercises: [
      { nameKu: 'شڕەگ بە دەمبڵ', englishName: 'dumbbell shrug', sets: '4 سێت', reps: '12-15', equipment: 'دەمبڵ', difficulty: 'ئاسان', location: 'gym', tipKu: 'شانەکانت ڕاستەوخۆ بەرەو گوێیەکانت بەرز بکەرەوە و لە خولانەوەی نادروست بەدوور بە.' },
      { nameKu: 'شڕەگ بە باربێڵ', englishName: 'barbell shrug', sets: '4 سێت', reps: '10-12', equipment: 'باربێڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'قورسایی بە تەواوی کۆنتڕۆڵ بکە و بۆ ٢ چرکە لە سەرەوە شانت ڕابگرە.' },
      { nameKu: 'شناوی پایک بە مەودای تەواوی سەرەوە', englishName: 'pike push-ups', sets: '3 سێت', reps: '10-12', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'لە بەرزترین خاڵی پایکدا، شانەکانت بەرەو گوێیەکانت پاڵ پێوە بنێ بۆ کارپێکردنی تڕاپیز.' }
    ]
  },
  {
    id: 'biceps',
    category: 'arms',
    nameKu: 'بایسێپس (دوو سەرەی قۆڵ)',
    nameEn: 'Biceps Brachii',
    scientific: 'Biceps Brachii',
    categoryKu: 'قۆڵ',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    descriptionKu: 'دیارترین و جوانترین بەشی پێشەوەی قۆڵ کە توانای نووشتانەوە دەدات بە ئەنیشک و هێزی کێشان زیاد دەکات.',
    mainExercise: 'barbell bicep curl',
    exercises: [
      { nameKu: 'بایسێپس کۆڕڵ بە باربێڵ', englishName: 'barbell bicep curl', sets: '4 سێت', reps: '10-12', equipment: 'باربێڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'ئەنیشکەکانت جێگیر بکە لە تەنیشت کەمەرت و با تەنها پێشەوەی قۆڵت بجوڵێت.' },
      { nameKu: 'دەمبڵ بایسێپس کۆڕڵ', englishName: 'dumbbell biceps curl', sets: '3 سێت', reps: '10-12', equipment: 'دەمبڵ', difficulty: 'ئاسان', location: 'gym', tipKu: 'لە کاتی بەرزکردنەوەی دەمبڵەکان، مەچەکت کەمێک بەرەو دەرەوە بسووڕێنە.' },
      { nameKu: 'پریچەر کۆڕڵ', englishName: 'preacher curl', sets: '3 سێت', reps: '10-12', equipment: 'ئامێر', difficulty: 'ناوەند', location: 'gym', tipKu: 'لەسەر کورسی پریچەر قۆڵت بە تەواوی دابنێ تا هیچ کەس و ماسولکەیەک یارمەتیت نەدات جگە لە بایسێپس.' },
      { nameKu: 'دیپس لەسەر کورسی بە دەستی پێچەوانە', englishName: 'bench dips', sets: '3 سێت', reps: '10-12', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'لە ماڵەوە بە کێشی جەستە دیپس بە گرتنی جیاواز و پاڵنانی بەهێز، تەواوی قۆڵ و باڵ چالاک دەکات.' }
    ]
  },
  {
    id: 'brachialis',
    category: 'arms',
    nameKu: 'براکیالیس (ئەستوورکەری قۆڵ)',
    nameEn: 'Brachialis',
    scientific: 'Brachialis',
    categoryKu: 'قۆڵ',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    descriptionKu: 'لە ژێر بایسێپسدایە و کاتێک گەورە دەبێت، بایسێپس پاڵ پێوە دەنێت بەرەو سەرەوە و قۆڵ زۆر پان و گەورە پیشان دەدات.',
    mainExercise: 'dumbbell hammer curl',
    exercises: [
      { nameKu: 'هامەر کۆڕڵ بە دەمبڵ', englishName: 'dumbbell hammer curl', sets: '4 سێت', reps: '10-12', equipment: 'دەمبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'دەمبڵەکان وەک چەکوش ڕابگرە کە لەپی دەست بەرەو ڕووی یەکتر بن.' },
      { nameKu: 'شناوی دایمۆند بۆ بەهێزکردنی باڵ (Diamond Push-ups)', englishName: 'diamond push-ups', sets: '3 سێت', reps: '10-12', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'شناوی دایمۆند پەستانێکی زۆر دەخاتە سەر بەشی دەرەوەی قۆڵ و براکیالیس.' }
    ]
  },
  {
    id: 'triceps',
    category: 'arms',
    nameKu: 'ترایسێپس (سێ سەرەی قۆڵ)',
    nameEn: 'Triceps',
    scientific: 'Triceps Brachii',
    categoryKu: 'قۆڵ',
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    descriptionKu: 'دوو لەسەر سێی (٦٦٪) قەبارەی گشتی قۆڵ پێکدەهێنێت و کلیلە بۆ ئەستووری و هێزی پاڵنانی قۆڵەکان.',
    mainExercise: 'triceps rope pushdown',
    exercises: [
      { nameKu: 'ترایسێپس پوشداون بە گوریس', englishName: 'triceps rope pushdown', sets: '4 سێت', reps: '12-15', equipment: 'کەیبڵ', difficulty: 'ئاسان', location: 'gym', tipKu: 'لە خوارەوە گوریسەکە لێک بکەرەوە و ترایسێپست توند گرژ بکە.' },
      { nameKu: 'سکەڵ کراشەرس بە باربێڵ', englishName: 'skull crushers', sets: '3 سێت', reps: '10-12', equipment: 'باربێڵ', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'میڵەکە بەرەو تەوێڵت دابەزێنە و ئەنیشکەکانت جێگیر بن بەرەو سەرەوە.' },
      { nameKu: 'ئۆڤەرهێد ترایسێپس بە دەمبڵ', englishName: 'overhead dumbbell triceps extension', sets: '3 سێت', reps: '10-12', equipment: 'دەمبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'دەمبڵەکە لە پشت سەرت دابەزێنە تا سەری درێژی ترایسێپس بە تەواوی بکشێت.' },
      { nameKu: 'پاشەملە لەسەر کورسی (Bench Dips)', englishName: 'bench dips', sets: '3 سێت', reps: '12-15', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'دەستەکان لەسەر کورسی دابنێ و بە ئەنیشکەکانت جەستەت دابەزێنە و بە هێزی ترایسێپس پاڵی پێوە بنێ.' },
      { nameKu: 'شناوی دایمۆند (Diamond Push-ups)', englishName: 'diamond push-ups', sets: '3 سێت', reps: '10-12', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'دەستەکانت وەک شێوەی ئەڵماس لێک نزیک بکەرەوە بۆ زۆرترین پەستان لەسەر سێ سەرەی قۆڵ.' }
    ]
  },
  {
    id: 'forearms',
    category: 'arms',
    nameKu: 'باسک و مەچەک',
    nameEn: 'Forearms',
    scientific: 'Brachioradialis & Flexors',
    categoryKu: 'قۆڵ',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    descriptionKu: 'هێزی گرتنی دەستەکان دیاری دەکات و گرنگە بۆ ڕاگرتنی قورسایی لە هەموو ڕاهێنانەکانی تری بەشی سەرەوە.',
    mainExercise: 'barbell wrist curl',
    exercises: [
      { nameKu: 'ڕست کۆڕڵ بە باربێڵ', englishName: 'barbell wrist curl', sets: '4 سێت', reps: '15-20', equipment: 'باربێڵ', difficulty: 'ئاسان', location: 'gym', tipKu: 'قۆڵت لەسەر ڕانت دابنێ و تەنها مەچەکت بەرەو سەرەوە و خوارەوە بجوڵێنە.' },
      { nameKu: 'پلانک بە فشاری سەر پەنجەکانی دەست (Fingertip Plank)', englishName: 'plank', sets: '3 سێت', reps: '30-45 چرکە', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'گرتنی بەهێزی زەوی بە پەنجەکان یارمەتیدەرە بۆ بەهێزکردنی ماسولکەکانی باسک و مەچەک.' }
    ]
  },
  {
    id: 'upper_abs',
    category: 'core',
    nameKu: 'شەش پارچەیی سەرەوەی سک',
    nameEn: 'Upper Rectus Abdominis',
    scientific: 'Upper Rectus Abdominis',
    categoryKu: 'سک',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    descriptionKu: 'پارچە دیارەکانی سەرەوەی سک دروست دەکات و بەرپرسە لە نووشتانەوەی قەد بەرەو پێشەوە.',
    mainExercise: 'crunches',
    exercises: [
      { nameKu: 'کەیبڵ ڕۆپ کرەنچ (Rope Crunch)', englishName: 'cable rope crunch', sets: '3 سێت', reps: '12-15', equipment: 'کەیبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'لە هۆڵ بە کەیبڵ کڕەنچ بکە بۆ چڕکردنەوەی ماسولکەکانی سەرەوەی سک.' },
      { nameKu: 'کرەنچس لەسەر زەوی (Crunches)', englishName: 'crunches', sets: '3 سێت', reps: '15-20', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'لەسەر پشت پاڵبکەوە و بە ماسولکەی سک سەر و بەشی سەرەوەی پشت بەرز بکەرەوە.' },
      { nameKu: 'پلانک بە جێگیری (Plank)', englishName: 'plank', sets: '3 سێت', reps: '60 چرکە', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'جەستەت وەک تەختە لەسەر ئەنیشک و پەنجەی پێ بە ڕێکی ڕابگرە.' }
    ]
  },
  {
    id: 'lower_abs',
    category: 'core',
    nameKu: 'خوارەوەی سک',
    nameEn: 'Lower Rectus Abdominis',
    scientific: 'Lower Rectus Abdominis',
    categoryKu: 'سک',
    color: '#f43f5e',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
    descriptionKu: 'تەختی و ڕێکی خوارەوەی کەمەر دابین دەکات و بەرپرسە لە بەرزکردنەوەی قاچەکان و ڕاگرتنی حەوز.',
    mainExercise: 'lying leg raises',
    exercises: [
      { nameKu: 'هەنگینگ لێگ ڕەیز (بەرزکردنەوە بە هەڵواسین)', englishName: 'hanging leg raises', sets: '3 سێت', reps: '10-12', equipment: 'باڕی عوقلە', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'لە باڕی عوقلە هەڵبواسە و قاچەکانت بەرز بکەرەوە بەبێ لەرزینی جەستە.' },
      { nameKu: 'بەرزکردنەوەی قاچ لەسەر زەوی (Lying Leg Raises)', englishName: 'lying leg raises', sets: '3 سێت', reps: '12-15', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'لەسەر پشت پاڵبکەوە و قاچەکانت بە ڕێکی بەرەو سەرەوە بەرز بکەرەوە بۆ خوارەوەی سک.' }
    ]
  },
  {
    id: 'obliques',
    category: 'core',
    nameKu: 'تەنیشتەکانی کەمەر (ئۆبلیکس)',
    nameEn: 'Obliques',
    scientific: 'External & Internal Obliques',
    categoryKu: 'سک',
    color: '#e11d48',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    descriptionKu: 'ماسولکەکانی تەنیشتی کەمەرن کە هێڵی V و شێوەی باریکی بە کەمەر دەبەخشن و قەد دەسووڕێنن.',
    mainExercise: 'russian twists',
    exercises: [
      { nameKu: 'وود چۆپ بە کەیبڵ (Woodchoppers)', englishName: 'standing cable chest fly', sets: '3 سێت', reps: '12-15', equipment: 'کەیبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'لە هۆڵ کەیبڵ بە لار بەرەو خوارەوە ڕابکێشە بۆ بەهێزکردنی تەنیشتی کەمەر.' },
      { nameKu: 'ڕەشن تویست (سوڕانی کەمەر)', englishName: 'russian twists', sets: '3 سێت', reps: '20', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'بە دانیشتنەوە قاچەکان کەمێک لە زەوی بەرز بکەرەوە و کەمەرت بۆ چەپ و ڕاست بسووڕێنە.' }
    ]
  },
  {
    id: 'quadriceps',
    category: 'legs',
    nameKu: 'چوار سەرەی ڕان (پێشەوەی قاچ)',
    nameEn: 'Quadriceps',
    scientific: 'Quadriceps Femoris',
    categoryKu: 'قاچ',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    descriptionKu: 'گەورەترین و بەهێزترین گرووپی ماسولکەیی لەشە کە لە ٤ سەر پێکهاتووە و هێزی ڕاوەستان و ڕۆیشتن دابین دەکات.',
    mainExercise: 'barbell squat',
    exercises: [
      { nameKu: 'سکوات بە باربێڵ', englishName: 'barbell squat', sets: '4 سێت', reps: '8-10', equipment: 'باربێڵ', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'سنگت بەرز ڕابگرە و داببەزە تا ڕانەکانت هاوتەریبی زەوی دەبن.' },
      { nameKu: 'لێگ پرێس بە ئامێر', englishName: 'leg press', sets: '4 سێت', reps: '10-12', equipment: 'ئامێر', difficulty: 'ناوەند', location: 'gym', tipKu: 'پێیەکانت لە ناوەڕاستی سەکۆکە دابنێ و لە سەرەوە ئەژنۆکانت بە تەواوی قوفڵ مەکە.' },
      { nameKu: 'لێگ ئێکس تێنشن (کردنەوەی قاچ)', englishName: 'leg extension', sets: '3 سێت', reps: '12-15', equipment: 'ئامێر', difficulty: 'ئاسان', location: 'gym', tipKu: 'لە سەرەوە قاچت بۆ یەک چرکە ڕێک ڕابگرە تا چوار سەرەی ڕانت بە توندی گرژ ببێت.' },
      { nameKu: 'سکوات بە کێشی جەستە (Bodyweight Squats)', englishName: 'bodyweight squats', sets: '4 سێت', reps: '15-20', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'پێیەکان بە پانتایی شان بکەرەوە و بە ڕێکی داببەزە تا ڕانەکانت هاوتەریبی زەوی دەبن.' },
      { nameKu: 'هەنگاونان بێ کێش (Bodyweight Lunges)', englishName: 'bodyweight lunges', sets: '3 سێت', reps: '12-15', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'هەنگاوی گەورە بنێ بۆ پێشەوە تا ماسولکەی پێشەوەی ڕان بە تەواوی گرژ دەبێت.' }
    ]
  },
  {
    id: 'hamstrings',
    category: 'legs',
    nameKu: 'پشتە ڕان (هامسترینگ)',
    nameEn: 'Hamstrings',
    scientific: 'Biceps Femoris & Semitendinosus',
    categoryKu: 'قاچ',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    descriptionKu: 'لە بەشی دواوەی ڕانە و بەرپرسە لە نووشتانەوەی ئەژنۆ و کێشانی قاچ بەرەو دواوە و خێرایی ڕاکردن.',
    mainExercise: 'seated leg curl',
    exercises: [
      { nameKu: 'سیتد لێگ کۆڕڵ بە ئامێر', englishName: 'seated leg curl', sets: '4 سێت', reps: '10-12', equipment: 'ئامێر', difficulty: 'ناوەند', location: 'gym', tipKu: 'قاچەکانت بە هێواشی بگەڕێنەرەوە تا تەواوی درێژایی پشتە ڕانت بکشێت.' },
      { nameKu: 'ڕۆمانیەن دیدلیفت بە باربێڵ', englishName: 'romanian deadlift', sets: '3 سێت', reps: '8-10', equipment: 'باربێڵ', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'ئەژنۆکانت کەمێک چەماوە بن و سمتت بەرەو دواوە پاڵ پێوە بنێ تا کشانی قووڵ دروست ببێت.' },
      { nameKu: 'پردی سمت و پشتی ڕان لەسەر زەوی', englishName: 'glute bridges', sets: '3 سێت', reps: '15-20', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'حەوزت بەرەو سەرەوە بەرز بکەرەوە و لە سەرەوە بۆ ٢ چرکە پشتی ڕانت توند بکە.' }
    ]
  },
  {
    id: 'glutes',
    category: 'legs',
    nameKu: 'سمت (گلوتس)',
    nameEn: 'Glutes',
    scientific: 'Gluteus Maximus & Medius',
    categoryKu: 'قاچ',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    descriptionKu: 'گەورەترین تاقە ماسولکەی تەواوی لەشی مرۆڤە کە هێزی ڕاوەستان، بازدان و جێگیری حەوز دابین دەکات.',
    mainExercise: 'barbell glute bridge',
    exercises: [
      { nameKu: 'هیپ تراست / گلوت بریج بە باربێڵ', englishName: 'barbell glute bridge', sets: '4 سێت', reps: '8-10', equipment: 'باربێڵ', difficulty: 'پێشکەوتوو', location: 'gym', tipKu: 'پشتی سەرەوەت لەسەر کورسی دابنێ و حەوزت پاڵ پێوە بنێ تا سمتت گرژ دەبێت.' },
      { nameKu: 'لانگز بە دەمبڵ', englishName: 'dumbbell lunges', sets: '3 سێت', reps: '10-12', equipment: 'دەمبڵ', difficulty: 'ناوەند', location: 'gym', tipKu: 'هەنگاوی گەورە بنێ بۆ پێشەوە تا ماسولکەکانی سمت بە قووڵی تێوەبگلێن.' },
      { nameKu: 'بەرزکردنەوەی حەوز لەسەر زەوی (Glute Bridges)', englishName: 'glute bridges', sets: '3 سێت', reps: '15-20', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'باشترین ڕاهێنانی سەر زەوییە بۆ بەهێزکردنی ماسولکەکانی سمت و پشت.' },
      { nameKu: 'سکواتی بولگاری لەسەر کورسی (Bulgarian Split)', englishName: 'bulgarian split squats', sets: '3 سێت', reps: '10-12', equipment: 'کێشی لەش', difficulty: 'ناوەند', location: 'home', tipKu: 'پێی دواوەت لەسەر کورسی دابنێ و بە تەواوی لەسەر قاچەکەی پێشەوەت داببەزە.' }
    ]
  },
  {
    id: 'calves',
    category: 'legs',
    nameKu: 'پۆز و خوارەوەی قاچ',
    nameEn: 'Calves',
    scientific: 'Gastrocnemius & Soleus',
    categoryKu: 'قاچ',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    descriptionKu: 'بەرپرسە لە بەرزکردنەوەی پاژنەی پێ و دابینکردنی هاوسەنگی و خێرایی لە کاتی ڕۆیشتن و ڕاکردندا.',
    mainExercise: 'standing calf raise',
    exercises: [
      { nameKu: 'ستاندینگ کاف ڕەیز بە ئامێر', englishName: 'standing calf raise', sets: '4 سێت', reps: '12-15', equipment: 'ئامێر', difficulty: 'ئاسان', location: 'gym', tipKu: 'لە سەرەوە بۆ ٢ چرکە ڕابوەستە و پاشان بە هێواشی پاژنەت دابەزێنە تا ماسولکەی پۆزت بکشێت.' },
      { nameKu: 'بەرزبوونەوە لەسەر پەنجەی پێ بە کێشی لەش', englishName: 'bodyweight standing calf raise', sets: '4 سێت', reps: '20-25', equipment: 'کێشی لەش', difficulty: 'ئاسان', location: 'home', tipKu: 'لەسەر لێواری پلیکانە یان زەوی ڕابوەستە و بە تەواوی لەسەر پەنجەکانی پێ بەرز بەرەوە.' }
    ]
  }
];

const CATEGORIES = [
  { id: 'all', labelKu: 'هەموو ماسولکەکان', labelEn: 'All Muscles', labelAr: 'كل العضلات', labelFa: 'همه عضلات', icon: '✨' },
  { id: 'chest', labelKu: 'سنگ', labelEn: 'Chest', labelAr: 'الصدر', labelFa: 'سینه', icon: '🛡️' },
  { id: 'back', labelKu: 'پشت', labelEn: 'Back', labelAr: 'الظهر', labelFa: 'پشت', icon: '🦅' },
  { id: 'shoulders', labelKu: 'شان و مل', labelEn: 'Shoulders', labelAr: 'الأكتاف', labelFa: 'شانه‌ها', icon: '⚡' },
  { id: 'arms', labelKu: 'قۆڵ و باسک', labelEn: 'Arms', labelAr: 'الذراعين', labelFa: 'بازوها', icon: '💪' },
  { id: 'core', labelKu: 'سک و کەمەر', labelEn: 'Core & Abs', labelAr: 'البطن والخصر', labelFa: 'شکم و پهلو', icon: '🔥' },
  { id: 'legs', labelKu: 'قاچ و سمت', labelEn: 'Legs & Glutes', labelAr: 'الأرجل والأرداف', labelFa: 'پاها و باسن', icon: '🦵' }
];

const MuscleAnatomy3D = React.memo(function MuscleAnatomy3D({ onSelectExercise, currentLangConfig = { code: 'ku', dir: 'rtl' }, locationFilter = 'gym', onLocationChange }) {
  const [selectedMuscleId, setSelectedMuscleId] = useState('upper_chest');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeFormModal, setActiveFormModal] = useState(null);

  // شێوازی پیشاندانی ڕاهێنانەکان (ڤیوی گەورە یان لیستی ئاسایی وەک بەشی ڕاهێنان)
  const [exerciseViewMode, setExerciseViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app_workout_view_mode') || 'large';
    }
    return 'large';
  });

  const handleToggleViewMode = () => {
    const nextMode = exerciseViewMode === 'compact' ? 'large' : 'compact';
    setExerciseViewMode(nextMode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('app_workout_view_mode', nextMode);
      } catch (e) {}
    }
  };

  const sliderRef = useRef(null);
  const isRtl = currentLangConfig?.dir === 'rtl';

  // پاشەکەوتکردنی وێنەکانی فەرهەنگی ماسولکە لە پاشبنەما بۆ دۆخی ئۆفلاین
  useEffect(() => {
    let cancel = false;
    const timer = setTimeout(() => {
      if (!cancel) {
        import('../utils/exerciseMedia').then(({ cacheMuscleAnatomyMedia }) => {
          cacheMuscleAnatomyMedia(MUSCLE_DATA);
        }).catch(() => {});
      }
    }, 1500);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, []);

  // وەرگێڕانی ناوی پۆلەکان بەپێی زمانی هەڵبژێردراو
  const getCategoryLabel = (cat) => {
    if (currentLangConfig?.code === 'en') return cat.labelEn || cat.labelKu;
    if (currentLangConfig?.code === 'ar') return cat.labelAr || cat.labelKu;
    if (currentLangConfig?.code === 'fa') return cat.labelFa || cat.labelKu;
    return cat.labelKu;
  };

  // دەستەواژەی "ڕاهێنان"
  const getExerciseWord = (count) => {
    if (currentLangConfig?.code === 'en') return count === 1 ? 'Exercise' : 'Exercises';
    if (currentLangConfig?.code === 'ar') return count === 1 ? 'تمرين' : 'تمارين';
    if (currentLangConfig?.code === 'fa') return 'تمرین';
    return 'ڕاهێنان';
  };

  // دۆزینەوەی ماسولکەی هەڵبژێردراو
  const currentMuscle = useMemo(() => {
    return MUSCLE_DATA.find(m => m.id === selectedMuscleId) || MUSCLE_DATA[0];
  }, [selectedMuscleId]);

  const activeLocation = locationFilter || 'gym';

  // فلتەرکردنی ڕاهێنانەکان بەپێی شوێن (هۆڵ یان ماڵەوە)
  const displayedExercises = useMemo(() => {
    if (!currentMuscle || !Array.isArray(currentMuscle.exercises)) return [];
    return currentMuscle.exercises.filter(ex => {
      const isHome = ex.location === 'home' || ex.equipment === 'کێشی لەش';
      if (activeLocation === 'home') return isHome;
      if (activeLocation === 'gym') return !isHome || ex.location === 'both';
      return true;
    });
  }, [currentMuscle, activeLocation]);


  // فلتەرکردنی لیستەکە بۆ ناو سلایدەر
  const filteredMuscles = useMemo(() => {
    if (selectedCategory === 'all') return MUSCLE_DATA;
    return MUSCLE_DATA.filter(m => m.category === selectedCategory);
  }, [selectedCategory]);

  // دەستکاریکردنی سلایدەر بە دوگمەکانی چەپ و ڕاست
  const scrollSlider = (direction) => {
    if (!sliderRef.current) return;
    const scrollAmount = 260;
    const multiplier = (direction === 'next' ? 1 : -1) * (isRtl ? -1 : 1);
    sliderRef.current.scrollBy({ left: scrollAmount * multiplier, behavior: 'smooth' });
  };

  // کاتێک فلتەری بەشێک دەگۆڕێت، یەکەم ماسولکەی ئەو بەشە هەڵبژێرە
  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    const matches = catId === 'all' ? MUSCLE_DATA : MUSCLE_DATA.filter(m => m.category === catId);
    if (matches.length > 0) {
      setSelectedMuscleId(matches[0].id);
    }
  };

  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'} 
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        paddingBottom: '40px',
        overflowX: 'hidden'
      }}
    >
      {/* فلتەرەکانی بەشەکان (بە شێوەیەکی تەنک و پاک بەبێ دەنگ و نوسینی زیادە) */}
      <div 
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '4px 2px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          flexShrink: 0
        }}
      >
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              style={{
                background: isSelected ? 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)' : 'rgba(255, 255, 255, 0.05)',
                color: isSelected ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                border: isSelected ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                borderRadius: '12px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <span>{cat.icon}</span>
              <span>{getCategoryLabel(cat)}</span>
            </button>
          );
        })}
      </div>

      {/* ================= بەشی ٢: سلایدەری ئاسۆیی وێنەی هەموو ماسولکەکان (Horizontal Muscle Carousel) ================= */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden', padding: '0 4px', flexShrink: 0 }}>
        {/* دوگمەی سلاید بەرەو پێشوو */}
        <button
          type="button"
          onClick={() => scrollSlider('prev')}
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            [isRtl ? 'right' : 'left']: '6px',
            zIndex: 10,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            transition: 'transform 0.15s ease'
          }}
          title="پێشوو"
        >
          {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* دوگمەی سلاید بەرەو دواتر */}
        <button
          type="button"
          onClick={() => scrollSlider('next')}
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            [isRtl ? 'left' : 'right']: '6px',
            zIndex: 10,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            transition: 'transform 0.15s ease'
          }}
          title="دواتر"
        >
          {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* کۆنتەینەری سلایدەر بە سکڕۆڵی ئاسۆیی نەرم */}
        <div
          ref={sliderRef}
          className="hide-scrollbar"
          style={{
            display: 'flex',
            gap: '14px',
            overflowX: 'auto',
            padding: '10px 4px 16px 4px',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {filteredMuscles.map((muscle) => {
            const isSelected = muscle.id === selectedMuscleId;
            return (
              <div
                key={muscle.id}
                onClick={() => {
                  setSelectedMuscleId(muscle.id);
                }}
                style={{
                  width: '180px',
                  minWidth: '180px',
                  scrollSnapAlign: 'start',
                  background: isSelected 
                    ? 'linear-gradient(180deg, rgba(168, 85, 247, 0.18) 0%, rgba(15, 23, 42, 0.95) 100%)' 
                    : 'var(--card-bg, rgba(17, 24, 39, 0.75))',
                  border: isSelected 
                    ? `2px solid ${muscle.color}` 
                    : '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s ease',
                  transform: isSelected ? 'scale(1.04) translateY(-3px)' : 'scale(1)',
                  boxShadow: isSelected 
                    ? `0 10px 25px -4px ${muscle.color}40, 0 0 12px ${muscle.color}30` 
                    : '0 4px 14px rgba(0,0,0,0.2)',
                  position: 'relative'
                }}
              >
                {/* تاگی هەڵبژێردراو لەسەر کارتەکە */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    [isRtl ? 'right' : 'left']: '8px',
                    background: muscle.gradient,
                    color: '#ffffff',
                    padding: '2px 7px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 3,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                  }}>
                    <CheckCircle2 size={11} />
                    <span>{currentLangConfig?.code === 'en' ? 'Selected' : currentLangConfig?.code === 'ar' ? 'محدد' : currentLangConfig?.code === 'fa' ? 'انتخاب شده' : 'دیاریکراو'}</span>
                  </div>
                )}

                {/* وێنەی ئەنیمەیشنی ڕاهێنان لەناو کارتی سلایدەکە */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '120px',
                  background: 'rgba(10, 15, 29, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <ExerciseThumbnail
                    exerciseName={muscle.mainExercise}
                    width="100%"
                    height="120px"
                    fit="contain"
                    borderRadius="0"
                    bg="transparent"
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '24px',
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9), transparent)'
                  }} />
                </div>

                {/* ناوی ماسولکەکە لە ژێر وێنەکە */}
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                  <div style={{
                    fontSize: '13.5px',
                    fontWeight: '900',
                    color: isSelected ? '#ffffff' : 'var(--text-main, #ffffff)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {muscle.nameKu}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: isSelected ? muscle.color : 'var(--text-muted, #94a3b8)',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {muscle.nameEn}
                  </div>

                  <div style={{
                    marginTop: 'auto',
                    paddingTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '10.5px',
                    color: 'var(--text-muted, #94a3b8)'
                  }}>
                    <span>{muscle.categoryKu}</span>
                    <span style={{
                      color: muscle.color,
                      fontWeight: '800',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '6px'
                    }}>
                      {muscle.exercises.length} {getExerciseWord(muscle.exercises.length)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= بەشی ٣: هەموو وەرزشەکانی ماسولکەی دیاریکراو (Exercise Showcase) ================= */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        flexShrink: 0
      }}>
        {/* سەردێڕ و زانیاری وردی ماسولکەی هەڵبژێردراو */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '4px 0'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                background: currentMuscle.gradient,
                color: '#ffffff',
                padding: '3px 9px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '900'
              }}>
                {currentMuscle.categoryKu}
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main, #ffffff)', margin: 0 }}>
                {currentMuscle.nameKu}
              </h3>
            </div>

            <div style={{ fontSize: '12.5px', color: currentMuscle.color, fontWeight: '700', marginTop: '3px' }}>
              {currentMuscle.nameEn} • <span style={{ color: 'var(--text-muted, #94a3b8)', fontWeight: '500' }}>{currentMuscle.scientific}</span>
            </div>
          </div>

          <div style={{
            background: 'var(--card-subtle, rgba(255, 255, 255, 0.05))',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            borderRadius: '14px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Target size={18} style={{ color: currentMuscle.color }} />
            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted, #94a3b8)' }}>
                {currentLangConfig?.code === 'en' ? 'Total Exercises' : currentLangConfig?.code === 'ar' ? 'إجمالي التمارين' : currentLangConfig?.code === 'fa' ? 'مجموع تمرین‌ها' : 'کۆی وەرزشەکان'}
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: '900', color: '#ffffff' }}>
                {currentMuscle.exercises.length} {getExerciseWord(currentMuscle.exercises.length)}
              </div>
            </div>
          </div>
        </div>

        {/* ناونیشانی بەشی ڕاهێنانەکان لەگەڵ دوگمەی گۆڕینی شێوازی بینین (View Toggle وەک بەشی ڕاهێنان) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', padding: '0 2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={17} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '14.5px', fontWeight: '900', color: 'var(--text-main, #ffffff)' }}>
              {activeLocation === 'home' 
    ? (currentLangConfig?.code === 'en' ? `Home Exercises for ${currentMuscle.nameEn}:` : currentLangConfig?.code === 'ar' ? `تمارين منزلية لـ ${currentMuscle.nameKu}:` : currentLangConfig?.code === 'fa' ? `تمرین‌های خانگی ${currentMuscle.nameKu}:` : `وەرزشەکانی ماڵەوەی ${currentMuscle.nameKu}:`)
    : (currentLangConfig?.code === 'en' ? `Gym Exercises for ${currentMuscle.nameEn}:` : currentLangConfig?.code === 'ar' ? `تمارين الجيم لـ ${currentMuscle.nameKu}:` : currentLangConfig?.code === 'fa' ? `تمرین‌های باشگاهی ${currentMuscle.nameKu}:` : `وەرزشەکانی هۆڵی ${currentMuscle.nameKu}:`)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', display: 'none', smDisplay: 'inline' }}>
              {exerciseViewMode === 'large' ? 'وێنەی گەورە' : 'لیستی ئاسایی'}
            </span>

            {/* دوگمەی تەنها ئایکۆن بۆ گۆڕینی شێوازی بینین (View Toggle) - وەک بەشی ڕاهێنان */}
            <button
              type="button"
              onClick={handleToggleViewMode}
              className="liquid-pill"
              title={exerciseViewMode === 'compact' ? (currentLangConfig.code === 'en' ? 'Large icons' : 'وێنەی گەورە') : (currentLangConfig.code === 'en' ? 'List View' : 'لیستی ئاسایی')}
              aria-label="Toggle exercise view"
              style={{
                width: '34px',
                height: '34px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                background: 'var(--card-subtle, rgba(255, 255, 255, 0.05))',
                color: 'var(--text-main, #ffffff)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              {exerciseViewMode === 'large' ? (
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
          </div>
        </div>

        {/* پیشاندانی ڕاهێنانەکان بەپێی شێوازی دیاریکراو (Large یان Compact) */}
        {exerciseViewMode === 'compact' ? (
          /* ١. شێوازی لیستی ئاسایی (وەک بەشی ڕاهێنان) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayedExercises.map((ex, idx) => {
              return (
                <div
                  key={idx}
                  onClick={() => setActiveFormModal(ex)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  {/* وێنەی دەستەچەپ */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <ExerciseThumbnail
                      exerciseName={ex.englishName}
                      size={52}
                      borderRadius="12px"
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14.5px',
                        fontWeight: '800',
                        color: 'var(--text-main, #ffffff)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {ex.nameKu}
                      </div>
                      <div style={{
                        fontSize: '11.5px',
                        color: 'var(--text-muted, #94a3b8)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {ex.englishName} • <span style={{ color: currentMuscle.color }}>{ex.equipment}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', marginTop: '1px' }}>
                        {ex.sets} • {ex.reps}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    color: 'var(--text-muted, #94a3b8)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    flexShrink: 0
                  }}>
                    {ex.difficulty}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          /* ٢. شێوازی کارتی وێنەی گەورە (Large Grid) */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '16px'
          }}>
            {displayedExercises.map((ex, idx) => {
              return (
                <div
                  key={idx}
                  onClick={() => setActiveFormModal(ex)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {/* وێنەی ئەنیمەیشنی جووڵاوی ڕاهێنانەکە */}
                  <div 
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '165px',
                      background: 'linear-gradient(180deg, #090e17 0%, #0f172a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ExerciseThumbnail
                      exerciseName={ex.englishName}
                      width="100%"
                      height="165px"
                      fit="contain"
                      borderRadius="0"
                      bg="transparent"
                    />

                    {/* تاگی ئاستی قورسی */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      [isRtl ? 'right' : 'left']: '10px',
                      zIndex: 2
                    }}>
                      <span style={{
                        background: ex.difficulty === 'پێشکەوتوو' ? 'rgba(239, 68, 68, 0.85)' : ex.difficulty === 'ناوەند' ? 'rgba(245, 158, 11, 0.85)' : 'rgba(16, 185, 129, 0.85)',
                        color: '#ffffff',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        fontSize: '10.5px',
                        fontWeight: '800',
                        backdropFilter: 'blur(6px)'
                      }}>
                        {ex.difficulty}
                      </span>
                    </div>

                    {/* تاگی ئامێر */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      [isRtl ? 'left' : 'right']: '10px',
                      zIndex: 2
                    }}>
                      <span style={{
                        background: 'rgba(0, 0, 0, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        backdropFilter: 'blur(6px)'
                      }}>
                        {ex.equipment}
                      </span>
                    </div>
                  </div>

                  {/* ناونیشان و ڕێژەی سێت و دووبارەکردنەوە */}
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main, #ffffff)', margin: 0 }}>
                        {ex.nameKu}
                      </h4>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px', fontWeight: '600' }}>
                        {ex.englishName}
                      </div>
                    </div>

                    {/* زانیاری سێت و دووبارە */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-color, rgba(255, 255, 255, 0.05))',
                      fontSize: '11.5px',
                      color: '#e2e8f0',
                      fontWeight: '700'
                    }}>
                      <Zap size={14} style={{ color: currentMuscle.color }} />
                      <span>{currentLangConfig?.code === 'en' ? 'Suggested:' : currentLangConfig?.code === 'ar' ? 'المقترح:' : currentLangConfig?.code === 'fa' ? 'پیشنهادی:' : 'پێشنیارکراو:'} {ex.sets} • {ex.reps}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= پەنجەرەی فێرکاری شێواز (Form Guide Modal) ================= */}
      {activeFormModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          direction: isRtl ? 'rtl' : 'ltr'
        }}
        onClick={() => setActiveFormModal(null)}
        >
          <div 
            style={{
              background: 'var(--card-bg, #0f172a)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* دوگمەی داخستن */}
            <button
              type="button"
              onClick={() => setActiveFormModal(null)}
              style={{
                position: 'absolute',
                top: '14px',
                [isRtl ? 'left' : 'right']: '14px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              <X size={18} />
            </button>

            {/* وێنەی تەواوی جووڵەی ڕاهێنان بە گەورەیی */}
            <div style={{
              width: '100%',
              height: '240px',
              background: '#090d16',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))'
            }}>
              <ExerciseThumbnail
                exerciseName={activeFormModal.englishName}
                width="100%"
                height="240px"
                fit="contain"
                borderRadius="0"
                bg="transparent"
              />
            </div>

            {/* زانیاری و ڕێنمایی ورد */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{
                  background: currentMuscle.gradient,
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '800'
                }}>
                  {currentMuscle.nameKu}
                </span>
                <h3 style={{ fontSize: '19px', fontWeight: '900', color: '#ffffff', margin: '6px 0 2px 0' }}>
                  {activeFormModal.nameKu}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                  {activeFormModal.englishName}
                </div>
              </div>

              {/* کەرەستە و سێت و ئاست */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '12px',
                borderRadius: '14px',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {currentLangConfig?.code === 'en' ? 'Equipment' : currentLangConfig?.code === 'ar' ? 'المعدات' : currentLangConfig?.code === 'fa' ? 'تجهیزات' : 'ئامێر'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{activeFormModal.equipment}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {currentLangConfig?.code === 'en' ? 'Sets & Reps' : currentLangConfig?.code === 'ar' ? 'المجموعات والتكرار' : currentLangConfig?.code === 'fa' ? 'ست و تکرار' : 'سێت و دووبارە'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{activeFormModal.sets}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {currentLangConfig?.code === 'en' ? 'Difficulty' : currentLangConfig?.code === 'ar' ? 'المستوى' : currentLangConfig?.code === 'fa' ? 'سطح سختی' : 'ئاستی قورسی'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{activeFormModal.difficulty}</div>
                </div>
              </div>

              {/* ڕێنمایی فۆرمی زانستی */}
              <div style={{
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '14px',
                padding: '14px',
                color: '#e2e8f0',
                fontSize: '13px',
                lineHeight: '1.6'
              }}>
                <div style={{ fontWeight: '800', color: '#c084fc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={16} />
                  <span>
                    {currentLangConfig?.code === 'en' ? 'Scientific Form Guide:' : currentLangConfig?.code === 'ar' ? 'إرشادات الأداء الصحيح:' : currentLangConfig?.code === 'fa' ? 'راهنمای علمی فرم حرکت:' : 'ڕێنمایی زانستی بۆ باشترین ئەنجام:'}
                  </span>
                </div>
                {activeFormModal.tipKu || (currentLangConfig?.code === 'en' ? 'Perform this exercise with full control throughout the range of motion.' : 'ئەم ڕاهێنانە بە تەواوی کۆنترۆڵ ئەنجام بدە و مەهێڵە کێشەکە فڕێ بدرێت.')}
              </div>

              {/* دوگمەی داخستن بەبێ ڕۆیشتن بۆ بەشی تر */}
              <button
                type="button"
                onClick={() => setActiveFormModal(null)}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                  color: 'var(--text-main, #ffffff)',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s ease'
                }}
              >
                <span>{currentLangConfig?.code === 'en' ? 'Close' : currentLangConfig?.code === 'ar' ? 'إغلاق' : currentLangConfig?.code === 'fa' ? 'بستن' : 'داخستن'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default MuscleAnatomy3D;
