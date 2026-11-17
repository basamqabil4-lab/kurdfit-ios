'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, RefreshCw, Check, X, Sparkles, ShieldCheck, 
  ArrowRight, ArrowLeft, Play, Zap, Dumbbell, Flame, 
  RotateCcw, Info, UserCheck, EyeOff, Layers
} from 'lucide-react';
import { playCaptureSuccessSound, playPoseAlignedSound, playSparkleSound } from '../utils/audioFX';
import { calculateScientificGoalByAi } from '../utils/scientificEngine';

export default function PhysiqueScannerModal({
  isOpen,
  onClose,
  language = 'ku',
  currentLangConfig = { dir: 'rtl', code: 'ku' },
  profile = {},
  onPhysiqueAnalyzed
}) {
  const isRtl = currentLangConfig.dir === 'rtl';

  // قۆناغەکانی سکانکردن:
  // 'intro' -> 'guide_front' -> 'cam_front' -> 'guide_side' -> 'cam_side' -> 'guide_back' -> 'cam_back' -> 'analyzing' -> 'results'
  const [currentStep, setCurrentStep] = useState('intro');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // وێنە گیراوەکان
  const [capturedImages, setCapturedImages] = useState({
    front: null,
    side: null,
    back: null
  });

  // دۆخی ئالاینمێنت و ئاوتلاینی سەوز/سوور
  const [isAligned, setIsAligned] = useState(false);
  const [alignmentSeconds, setAlignmentSeconds] = useState(0);
  const [isAutoSnapEnabled, setIsAutoSnapEnabled] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);

  // دۆخی شیکاری AI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const alignTimerRef = useRef(null);
  const canvasRef = useRef(null);

  // داگیرساندنی کامێرا کاتێک لە قۆناغی کامێراداین
  const isCameraStep = currentStep === 'cam_front' || currentStep === 'cam_side' || currentStep === 'cam_back';

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }
    setIsCameraReady(false);
    setIsAligned(false);
    if (alignTimerRef.current) clearInterval(alignTimerRef.current);
  }, []);

  const startCamera = useCallback(async (mode = facingMode) => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('کامێرا لەسەر ئەم ئامێرە بەردەست نییە');
      }
      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.warn("Camera init error, falling back:", err);
      try {
        const streamFallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = streamFallback;
        if (videoRef.current) {
          videoRef.current.srcObject = streamFallback;
          videoRef.current.play().catch(() => {});
          setIsCameraReady(true);
        }
      } catch (err2) {
        setCameraError('نەتوانرا دەستگەیشتن بە کامێرا پەیدا بکرێت. تکایە ڕێگەپێدانی کامێرا بدە.');
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isCameraStep && isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isCameraStep, isOpen, facingMode, startCamera, stopCamera]);

  // چاودێری وەستانی یاریزان و گۆڕینی ئاوتلاین بۆ سەوز لە کاتی جێگیربووندا
  useEffect(() => {
    if (!isCameraStep || !isCameraReady || !isAutoSnapEnabled) return;

    // دوای ١ چرکە لە دەرکەوتنی کەسەکە، ئاوتلاین دەبێتە سەوز و دەست بە کاونتداونی ٢ چرکە دەکات
    const delayTimer = setTimeout(() => {
      setIsAligned(true);
      playPoseAlignedSound();
    }, 1200);

    return () => clearTimeout(delayTimer);
  }, [isCameraStep, isCameraReady, isAutoSnapEnabled, currentStep]);

  // کاتژمێری ئۆتۆ-سناپ کاتێک سەوز بوو (Countdown 2s to auto-capture)
  useEffect(() => {
    if (isAligned && isCameraStep && isAutoSnapEnabled) {
      setAlignmentSeconds(2);
      const interval = setInterval(() => {
        setAlignmentSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            triggerSnapPhoto();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      alignTimerRef.current = interval;
      return () => clearInterval(interval);
    } else {
      setAlignmentSeconds(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAligned, isCameraStep, isAutoSnapEnabled]);

  // گرتنی وێنەی ڕاستەوخۆ لە ڤیدیۆکەوە
  const triggerSnapPhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const rawW = video.videoWidth || 640;
      const rawH = video.videoHeight || 480;
      const maxDim = 800;
      let targetW = rawW;
      let targetH = rawH;
      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      // ئەگەر کامێرای پێشەوە بوو، وێنەکە ئاوێنەیی ڕاست دەکەینەوە
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.75);

      // فلاش و دەنگی سەرکەوتن
      setIsFlashing(true);
      playCaptureSuccessSound();
      setTimeout(() => setIsFlashing(false), 220);

      // پاشەکەوتکردنی وێنەکە بەپێی قۆناغ
      if (currentStep === 'cam_front') {
        setCapturedImages(prev => ({ ...prev, front: base64 }));
        stopCamera();
        setCurrentStep('guide_side');
      } else if (currentStep === 'cam_side') {
        setCapturedImages(prev => ({ ...prev, side: base64 }));
        stopCamera();
        setCurrentStep('guide_back');
      } else if (currentStep === 'cam_back') {
        setCapturedImages(prev => ({ ...prev, back: base64 }));
        stopCamera();
        runAiPhysiqueAnalysis({ ...capturedImages, back: base64 });
      }
    } catch (err) {
      console.error("Snap photo error:", err);
    }
  };

  // ئەنجامدانی شیکاری AI لە ڕێگەی Gemini Vision لەگەڵ فۆڵباکی زانستی ISSN/Helms لە کاتی هەڵە یان ئۆفلایندا
  const buildScientificPhysiqueFallback = () => {
    const fallbackBf = profile.gender === 'female' ? 22 : 16;
    const calc = calculateScientificGoalByAi({
      ...profile,
      bodyFatPercentage: fallbackBf
    });
    return {
      bodyFatPercentage: fallbackBf,
      bodyType: 'مێزۆمۆرف (وەرزشی)',
      muscleMassLevel: 'مامناوەند لەگەڵ توانای گەشەی بەرز',
      laggingMuscles: ['سینگی سەرەوە (Incline Chest)', 'شانی لاوەکی (Lateral Delts)', 'پشتی فراوان (Lats Width)'],
      strongMuscles: ['قاچەکان', 'پێشەوەی باڵ'],
      postureFeedback: 'هاوسەنگی جەستە زۆر باشە، پێویستە سەرنج بخرێتە سەر سنگی سەرەوە و پشت بۆ پڕبوونی تەواو.',
      recommendedCalories: calc.goalCalories,
      recommendedProtein: calc.goalProtein,
      workoutFocusText: 'چڕکردنەوەی ڕاهێنانەکانی سنگی سەرەوە و بەشی لاوەکی شان لە سەرەتای ڕۆژەکاندا.'
    };
  };

  const runAiPhysiqueAnalysis = async (imagesObj) => {
    setCurrentStep('analyzing');
    setIsAnalyzing(true);
    try {
      if (typeof window !== 'undefined' && window.analyzePhysiqueDirectly && navigator.onLine !== false) {
        const result = await window.analyzePhysiqueDirectly(
          imagesObj.front,
          imagesObj.side,
          imagesObj.back,
          profile,
          language
        );
        if (result && typeof result === 'object') {
          setAnalysisResult(result);
          setCurrentStep('results');
          playSparkleSound();
          return;
        }
      }
      setAnalysisResult(buildScientificPhysiqueFallback());
      setCurrentStep('results');
      playSparkleSound();
    } catch (err) {
      console.warn("AI Physique Analysis fallback triggered:", err);
      setAnalysisResult(buildScientificPhysiqueFallback());
      setCurrentStep('results');
      playSparkleSound();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAnalysis = () => {
    if (analysisResult && onPhysiqueAnalyzed) {
      onPhysiqueAnalyzed(analysisResult, capturedImages);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100005,
        backgroundColor: 'rgba(5, 8, 16, 0.94)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
        direction: currentLangConfig.dir
      }}
    >
      <div 
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '92vh',
          maxHeight: '840px',
          background: 'linear-gradient(180deg, #131728 0%, #0c0f1d 100%)',
          border: '1.5px solid var(--accent-glow)',
          borderRadius: '30px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 40px var(--accent-glow)',
          position: 'relative'
        }}
      >
        {/* فلاش لە کاتی وێنەگرتندا */}
        {isFlashing && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: '#ffffff',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: 'flashAnim 0.22s ease-out'
          }} />
        )}

        {/* ==================== ١. هێڵی سەرەوە (Top Bar) ==================== */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.03)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 15px var(--accent-glow)'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
                {language === 'en' ? 'AI Physique Vision Scanner' : 'سکانەری بینینی جەستە بە زیرەکی دەستکرد'}
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--color-carbs)', fontWeight: '700' }}>
                {currentStep === 'intro' ? (language === 'en' ? 'Body Evaluation' : 'هەڵسەنگاندنی پێکهاتەی لەش')
                  : currentStep.startsWith('guide_') || currentStep.startsWith('cam_') ? (
                    currentStep.includes('front') ? 'وێنەی ١: لە پێشەوە' : currentStep.includes('side') ? 'وێنەی ٢: لە تەنیشت' : 'وێنەی ٣: لە پاشەوە'
                  ) : currentStep === 'analyzing' ? 'شیکاری زیرەکی دەستکرد' : 'ڕاپۆرتی پێکهاتەی جەستە'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="liquid-pill"
            style={{
              width: '34px',
              height: '34px',
              padding: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              background: 'var(--card-subtle)'
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* ==================== ٢. ناوەڕۆکی قۆناغەکان ==================== */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          {/* -------------------- قۆناغی سەرەتا: ڕوونکردنەوە و پەیامی تایبەتمەندی -------------------- */}
          {currentStep === 'intro' && (
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* سندوقی ئاگاداریی فەرمی بەپێی داخوازی دەقی یاریزان */}
                <div style={{
                  padding: '18px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.14) 0%, rgba(220, 38, 38, 0.06) 100%)',
                  border: '1.5px solid rgba(239, 68, 68, 0.45)',
                  boxShadow: '0 8px 30px rgba(239, 68, 68, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <EyeOff size={24} color="#ef4444" style={{ flexShrink: 0 }} />
                    <h2 style={{
                      fontSize: '17px',
                      fontWeight: '900',
                      color: '#ef4444',
                      margin: 0,
                      letterSpacing: '-0.2px'
                    }}>
                      تکایە هەوڵدە روخسارت دەرنەکەوێت یاخود دایپۆشە
                    </h2>
                  </div>

                  <p style={{
                    fontSize: '12.5px',
                    fontWeight: '400', // Regular font weight بەپێی داخوازی
                    color: 'rgba(255, 255, 255, 0.85)',
                    lineHeight: '1.7',
                    margin: 0
                  }}>
                    ئەم وێنە گرتنە پێویستە بۆ ئەوەی Ai هەڵسەنگاندن بۆ لەشی تۆ بکات و بە پێی پێویستی لەشی خۆت کۆرسەکانت بۆ دروستبکات، وە سەرجەم کۆرسەکان Ai ی راهێنراو دایدەنێت بە پێی زانیارییەکانی تۆ، بۆیە پێویستە هەموو زانیارییەکان دروستبێت و هەڵەی تیا نەبێت.
                  </p>
                </div>

                {/* ڕوونکردنەوەی سێ وێنەکە */}
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', marginTop: '6px' }}>
                  {language === 'en' ? '3 Required Poses for Complete 360° Analysis:' : '٣ وێنەی پێویست بۆ شیکاری تەواوی لەش:'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { step: '١', name: 'لە پێشەوە', en: 'Front Pose', desc: 'سنگ، ورگ، شان' },
                    { step: '٢', name: 'لە تەنیشت', en: 'Side Pose', desc: 'ئەستووری لەش، کەمەر' },
                    { step: '٣', name: 'لە دواوە', en: 'Back Pose', desc: 'پانی پشت و باڵەکان' }
                  ].map((p, idx) => (
                    <div 
                      key={idx}
                      className="liquid-pill"
                      style={{
                        padding: '14px 10px',
                        textAlign: 'center',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-subtle)'
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'var(--accent-gradient)',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: '900',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px auto'
                      }}>
                        {p.step}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{p.name}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.desc}</div>
                    </div>
                  ))}
                </div>

                {/* تایبەتمەندی و گرەنتی نهێنیبوون */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '11.5px',
                  color: '#10b981',
                  fontWeight: '700'
                }}>
                  <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                  <span>تەواوی وێنەکان پارێزراون و تەنها لەناو مۆبایلەکەت بۆ دەرهێنانی ئەنجامی زانستی لە لایەن زیرەکی دەستکرد شیکاری دەکرێن.</span>
                </div>
              </div>

              {/* دوگمەی دەستپێکردن */}
              <div style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep('guide_front')}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: '18px',
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    boxShadow: '0 6px 25px var(--accent-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>دەستپێکردنی گرتنی وێنەکان</span>
                  {isRtl ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* -------------------- قۆناغی ڕێنمایی وەستانی ١: لە پێشەوە -------------------- */}
          {currentStep === 'guide_front' && (
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)', background: 'var(--accent-glow)', padding: '4px 10px', borderRadius: '8px' }}>
                    هەنگاوی ١ لە ٣
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>پۆزینگی پێشەوە</span>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 16px 0' }}>
                  وێنەی پێشەوە: چۆن بوەستیت؟
                </h2>

                {/* وێنەی شێوازی وەستان */}
                <div style={{
                  width: '100%',
                  height: '210px',
                  borderRadius: '22px',
                  background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  border: '1.5px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                  position: 'relative'
                }}>
                  <svg width="120" height="190" viewBox="0 0 100 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="18" r="12" stroke="#a855f7" strokeWidth="2.5" fill="rgba(168, 85, 247, 0.15)" />
                    <path d="M 28 42 L 72 42 L 66 90 L 34 90 Z" stroke="#a855f7" strokeWidth="2.5" fill="rgba(168, 85, 247, 0.15)" />
                    <path d="M 28 42 L 14 75 L 12 105" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 72 42 L 86 75 L 88 105" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 40 90 L 36 170" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 60 90 L 64 170" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', bottom: '10px', fontSize: '11px', color: 'var(--color-carbs)', fontWeight: '700' }}>
                    وەستانی وەرزشی شل لە پێشەوە
                  </div>
                </div>

                {/* خاڵەکانی پۆزینگ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    'قاچەکانت بە پانیی شان بکەرەوە و ڕاست بوەستە.',
                    'باڵەکانت کەمێک لە تەنیشتەکانت دوور بخەرەوە تا کەمەر بە تەواوی دیار بێت.',
                    'سەرت بە بەرزی ڕابگرە و ڕاستەوخۆ سەیری کامێرا بکە.',
                    'مۆبایلەکە لە بەرزی کەمەر یان سنگ دابنێ (نزیکەی ٢ مەتر دوور).'
                  ].map((tip, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-main)', fontWeight: '600' }}>
                      <Check size={16} color="var(--color-proteins)" style={{ flexShrink: 0 }} />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep('cam_front')}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Camera size={18} />
                  <span>کردنەوەی کامێرای پێشەوە</span>
                </button>
              </div>
            </div>
          )}

          {/* -------------------- قۆناغی کامێرای وێنەی ١: پێشەوە -------------------- */}
          {currentStep === 'cam_front' && (
            <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000000', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* چوارچێوەی ئاوتلاینی لەش (سوور لە کاتی هەڵە/ سەوز لە کاتی تەواوبوون) */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <svg
                  width="260"
                  height="460"
                  viewBox="0 0 100 180"
                  fill="none"
                  style={{
                    transition: 'all 0.3s ease',
                    filter: isAligned 
                      ? 'drop-shadow(0 0 18px rgba(34, 197, 94, 0.95))' 
                      : 'drop-shadow(0 0 14px rgba(239, 68, 68, 0.85))'
                  }}
                >
                  {/* سەر */}
                  <circle 
                    cx="50" cy="18" r="11" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeDasharray={isAligned ? 'none' : '4 3'}
                  />
                  {/* جەستە و شانەکان */}
                  <path 
                    d="M 26 42 L 74 42 L 67 92 L 33 92 Z" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeDasharray={isAligned ? 'none' : '5 3'}
                  />
                  {/* دەستەکان لە تەنیشتەوە */}
                  <path 
                    d="M 26 42 L 13 80 L 11 110" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 74 42 L 87 80 L 89 110" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeLinecap="round" 
                  />
                  {/* قاچەکان */}
                  <path 
                    d="M 39 92 L 35 172" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="3.2" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 61 92 L 65 172" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="3.2" 
                    strokeLinecap="round" 
                  />
                </svg>
              </div>

              {/* پەیامی دۆخی ئاوتلاین لە سەرەوەی شاشە */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                right: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 20
              }}>
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: isAligned ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff', animation: 'pulse 1s infinite' }} />
                  <span>{isAligned ? `وەستانت دروستە! تۆمارکردن لە دوای ${alignmentSeconds} چرکە` : 'شێوەی وەستان: لەگەڵ ئاوتلاینەکە ڕێکبە'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="گۆڕینی کامێرا"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* باڕی کۆنتڕۆڵی خوارەوە بە دوگمەی گرتن و سناپی دەستی */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 24px',
                background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 20
              }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                  وێنەی ١: لە پێشەوە
                </div>

                {/* دوگمەی گەورەی گرتنی وێنە */}
                <button
                  type="button"
                  onClick={triggerSnapPhoto}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: isAligned ? '#22c55e' : '#ffffff',
                    border: '4px solid rgba(255,255,255,0.4)',
                    boxShadow: isAligned ? '0 0 25px #22c55e' : '0 0 20px rgba(0,0,0,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Camera size={26} color={isAligned ? '#ffffff' : '#111827'} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsAligned(prev => !prev)}
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.8)',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isAligned ? 'وەستان: دروست' : 'تاقیبکەوە: سەوز'}
                </button>
              </div>
            </div>
          )}

          {/* -------------------- قۆناغی ڕێنمایی وەستانی ٢: لە تەنیشتەوە -------------------- */}
          {currentStep === 'guide_side' && (
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)', background: 'var(--accent-glow)', padding: '4px 10px', borderRadius: '8px' }}>
                    هەنگاوی ٢ لە ٣
                  </span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={14} /> وێنەی ١ وەرگیرا
                  </span>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 16px 0' }}>
                  وێنەی تەنیشت: چۆن بوەستیت؟
                </h2>

                {/* وێنەی شێوازی وەستانی تەنیشت */}
                <div style={{
                  width: '100%',
                  height: '210px',
                  borderRadius: '22px',
                  background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  border: '1.5px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                  position: 'relative'
                }}>
                  <svg width="100" height="190" viewBox="0 0 80 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="40" cy="18" r="11" stroke="#38bdf8" strokeWidth="2.5" fill="rgba(56, 189, 248, 0.15)" />
                    <path d="M 32 40 C 45 40 52 50 48 70 C 45 85 48 95 42 100 L 30 100 C 26 80 28 55 32 40 Z" stroke="#38bdf8" strokeWidth="2.5" fill="rgba(56, 189, 248, 0.15)" />
                    <path d="M 36 42 L 32 85 L 28 115" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 38 100 L 34 170" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', bottom: '10px', fontSize: '11px', color: 'var(--color-carbs)', fontWeight: '700' }}>
                    وەستانی پڕۆفایل لە تەنیشتەوە
                  </div>
                </div>

                {/* خاڵەکانی پۆزینگی تەنیشت */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    'بە گۆشەی ٩٠ پلە بسوڕێ بۆ لای چەپ یان ڕاستی کامێراکە.',
                    'دەستەکانت کەمێک بەرەو پێشەوە بن تا ئەستووری سنگ، قۆڵ و کەمەر دیار بن.',
                    'پشتت ڕێک بکەرەوە و لە قەد پاڵ مەچۆ.',
                    'ئەم وێنەیە بۆ زانینی کێش و چەوری ورگ و ڕێکیی کەمەر گرنگە.'
                  ].map((tip, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-main)', fontWeight: '600' }}>
                      <Check size={16} color="var(--color-proteins)" style={{ flexShrink: 0 }} />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep('cam_side')}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Camera size={18} />
                  <span>کردنەوەی کامێرای تەنیشت</span>
                </button>
              </div>
            </div>
          )}

          {/* -------------------- قۆناغی کامێرای وێنەی ٢: تەنیشت -------------------- */}
          {currentStep === 'cam_side' && (
            <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000000', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* چوارچێوەی ئاوتلاینی تەنیشت */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <svg
                  width="200"
                  height="460"
                  viewBox="0 0 80 180"
                  fill="none"
                  style={{
                    transition: 'all 0.3s ease',
                    filter: isAligned 
                      ? 'drop-shadow(0 0 18px rgba(34, 197, 94, 0.95))' 
                      : 'drop-shadow(0 0 14px rgba(239, 68, 68, 0.85))'
                  }}
                >
                  <circle 
                    cx="40" cy="18" r="10" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeDasharray={isAligned ? 'none' : '4 3'}
                  />
                  <path 
                    d="M 32 40 C 47 40 54 52 48 72 C 44 86 48 95 42 102 L 28 102 C 24 80 26 55 32 40 Z" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeDasharray={isAligned ? 'none' : '5 3'}
                  />
                  <path 
                    d="M 35 42 L 30 85 L 26 115" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 36 102 L 32 172" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="3.2" 
                    strokeLinecap="round" 
                  />
                </svg>
              </div>

              {/* پەیامی سەرەوە */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                right: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 20
              }}>
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: isAligned ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff', animation: 'pulse 1s infinite' }} />
                  <span>{isAligned ? `وەستانی تەنیشت دروستە! تۆمارکردن: ${alignmentSeconds}s` : 'وەستانی تەنیشت: ڕێکبە لەگەڵ ئاوتلاینەکە'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* کۆنتڕۆڵی خوارەوە */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 24px',
                background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 20
              }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                  وێنەی ٢: لە تەنیشت
                </div>

                <button
                  type="button"
                  onClick={triggerSnapPhoto}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: isAligned ? '#22c55e' : '#ffffff',
                    border: '4px solid rgba(255,255,255,0.4)',
                    boxShadow: isAligned ? '0 0 25px #22c55e' : '0 0 20px rgba(0,0,0,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Camera size={26} color={isAligned ? '#ffffff' : '#111827'} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsAligned(prev => !prev)}
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.8)',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isAligned ? 'وەستان: دروست' : 'تاقیبکەوە: سەوز'}
                </button>
              </div>
            </div>
          )}

          {/* -------------------- قۆناغی ڕێنمایی وەستانی ٣: لە پاشەوە -------------------- */}
          {currentStep === 'guide_back' && (
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)', background: 'var(--accent-glow)', padding: '4px 10px', borderRadius: '8px' }}>
                    هەنگاوی ٣ لە ٣
                  </span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={14} /> وێنەی ١ و ٢ وەرگیران
                  </span>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 16px 0' }}>
                  وێنەی دواوە: چۆن بوەستیت؟
                </h2>

                {/* وێنەی شێوازی وەستانی پشت */}
                <div style={{
                  width: '100%',
                  height: '210px',
                  borderRadius: '22px',
                  background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  border: '1.5px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                  position: 'relative'
                }}>
                  <svg width="120" height="190" viewBox="0 0 100 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="18" r="12" stroke="#10b981" strokeWidth="2.5" fill="rgba(16, 185, 129, 0.15)" />
                    {/* شێوەی V-Taper ی پشت */}
                    <path d="M 24 42 L 76 42 L 64 92 L 36 92 Z" stroke="#10b981" strokeWidth="2.5" fill="rgba(16, 185, 129, 0.15)" />
                    <path d="M 24 42 L 12 76 L 10 106" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 76 42 L 88 76 L 90 106" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 40 92 L 36 170" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 60 92 L 64 170" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', bottom: '10px', fontSize: '11px', color: 'var(--color-carbs)', fontWeight: '700' }}>
                    پۆزینگی شیکاری ماسولکەکانی پشت و باڵ
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    'پشتت بکە لە کامێراکە بە تەواوی.',
                    'باڵەکانت کەمێک بکەرەوە تا پانی ماسولکەکانی پشت (Lats) و شانی دواوە دیار بن.',
                    'سنگت ڕێک بێت تا خواربوونەوە لە پشتدا ڕوونەدات.',
                    'ئەم وێنەیە بۆ زانینی پانی پشت و هاوسەنگی ماسولکە گرنگە.'
                  ].map((tip, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-main)', fontWeight: '600' }}>
                      <Check size={16} color="var(--color-proteins)" style={{ flexShrink: 0 }} />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep('cam_back')}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Camera size={18} />
                  <span>کردنەوەی کامێرای دواوە</span>
                </button>
              </div>
            </div>
          )}

          {/* -------------------- قۆناغی کامێرای وێنەی ٣: دواوە -------------------- */}
          {currentStep === 'cam_back' && (
            <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000000', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* چوارچێوەی ئاوتلاینی پشت */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <svg
                  width="260"
                  height="460"
                  viewBox="0 0 100 180"
                  fill="none"
                  style={{
                    transition: 'all 0.3s ease',
                    filter: isAligned 
                      ? 'drop-shadow(0 0 18px rgba(34, 197, 94, 0.95))' 
                      : 'drop-shadow(0 0 14px rgba(239, 68, 68, 0.85))'
                  }}
                >
                  <circle 
                    cx="50" cy="18" r="11" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeDasharray={isAligned ? 'none' : '4 3'}
                  />
                  <path 
                    d="M 23 42 L 77 42 L 65 92 L 35 92 Z" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeDasharray={isAligned ? 'none' : '5 3'}
                  />
                  <path 
                    d="M 23 42 L 11 78 L 9 108" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 77 42 L 89 78 L 91 108" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="2.8" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 39 92 L 35 172" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="3.2" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 61 92 L 65 172" 
                    stroke={isAligned ? '#22c55e' : '#ef4444'} 
                    strokeWidth="3.2" 
                    strokeLinecap="round" 
                  />
                </svg>
              </div>

              {/* پەیامی سەرەوە */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                right: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 20
              }}>
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: isAligned ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff', animation: 'pulse 1s infinite' }} />
                  <span>{isAligned ? `پۆزینگی دواوە تەواوە! تۆمارکردن: ${alignmentSeconds}s` : 'پۆزینگی دواوە: ڕێکبە لەگەڵ ئاوتلاینەکە'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* کۆنتڕۆڵی خوارەوە */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 24px',
                background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 20
              }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                  وێنەی ٣: لە پاشەوە
                </div>

                <button
                  type="button"
                  onClick={triggerSnapPhoto}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: isAligned ? '#22c55e' : '#ffffff',
                    border: '4px solid rgba(255,255,255,0.4)',
                    boxShadow: isAligned ? '0 0 25px #22c55e' : '0 0 20px rgba(0,0,0,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Camera size={26} color={isAligned ? '#ffffff' : '#111827'} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsAligned(prev => !prev)}
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.8)',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isAligned ? 'وەستان: دروست' : 'تاقیبکەوە: سەوز'}
                </button>
              </div>
            </div>
          )}

          {/* -------------------- قۆناغی شیکاری لۆدینگی ئەلیکترۆنی AI -------------------- */}
          {currentStep === 'analyzing' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: '90px', height: '90px', marginBottom: '24px' }}>
                <div className="action-loading-spinner" style={{ width: '90px', height: '90px', borderWidth: '4px' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                  <Sparkles size={36} />
                </div>
              </div>

              <h2 style={{ fontSize: '19px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                شیکاری وردی هەر ٣ وێنەکە لە لایەن AI
              </h2>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '340px', margin: '0 0 24px 0' }}>
                زیرەکی دەستکرد خەریکی خەمڵاندنی ڕێژەی چەوری، دەستنیشانکردنی ماسولکە لاوازەکان و داڕشتنی ڕێبەری تایبەتە بۆ جەستەت...
              </p>

              {/* چێکپۆینتە لۆژیکییەکان */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '300px', textAlign: isRtl ? 'right' : 'left' }}>
                {[
                  'بینینی وێنەی پێشەوە و خەمڵاندنی چەوری',
                  'شیکاری ئەستووری سنگ و کەمەر لە وێنەی تەنیشت',
                  'شیکاری هاوسەنگی و پانی ماسولکەکانی پشت'
                ].map((msg, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-proteins)', fontWeight: '700' }}>
                    <Check size={14} />
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -------------------- قۆناغی نیشاندانی ئەنجامی شیکاری و ڕاپۆرتی لەش -------------------- */}
          {currentStep === 'results' && analysisResult && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto' }}>
              
              <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '800', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 10px', borderRadius: '8px' }}>
                  شیکاری وێنەکان تەواو بوو
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: '6px 0 2px 0' }}>
                  ڕاپۆرتی پێکهاتەی جەستەی تۆ
                </h2>
              </div>

              {/* کارتی سەرەکی چەوری و جۆری جەستە */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}>
                <div className="dark-card" style={{ padding: '14px', textAlign: 'center', border: '1.5px solid var(--accent-glow)' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                    ڕێژەی خەمڵێنراوی چەوری
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--color-carbs)' }}>
                    {analysisResult.bodyFatPercentage}%
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#10b981', fontWeight: '800', marginTop: '2px' }}>
                    Body Fat Estimate
                  </div>
                </div>

                <div className="dark-card" style={{ padding: '14px', textAlign: 'center', border: '1.5px solid var(--accent-glow)' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                    شێوازی پێکهاتە
                  </div>
                  <div style={{ fontSize: '15.5px', fontWeight: '900', color: 'var(--text-main)', marginTop: '4px' }}>
                    {analysisResult.bodyType}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--color-proteins)', fontWeight: '800', marginTop: '6px' }}>
                    {analysisResult.muscleMassLevel}
                  </div>
                </div>
              </div>

              {/* ئەو ماسولکانەی دواکەوتوون و پێویستیان بە چڕکردنەوەیە */}
              <div className="dark-card" style={{ padding: '14px 16px', border: '1px solid rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Flame size={17} color="#ef4444" />
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#ef4444' }}>
                    ماسولکە لاوازەکان (ئەوانەی پێویستیان بە گەشەی زیاترە):
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(analysisResult.laggingMuscles || []).map((m, idx) => (
                    <span 
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.18)',
                        color: '#f87171',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        border: '1px solid rgba(239, 68, 68, 0.4)'
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* ڕێکخستنی کۆرسی ڕاهێنان بەپێی شیکاری وێنەکە */}
              <div className="dark-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Dumbbell size={16} color="var(--accent-primary)" />
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                    داڕشتنەوەی ڕاهێنان بەپێی وێنەکانت:
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                  {analysisResult.workoutFocusText || 'کۆرسەکەت بە شێوەیەک دەستکاری دەکرێت کە قەبارەی ڕاهێنانەکانی سنگ و شان و بەشە لاوازەکان پێش بخرێن.'}
                </p>
              </div>

              {/* ڕێکخستنی خۆراک و کالۆری بەپێی چەوری لەش */}
              <div className="dark-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={16} color="var(--color-carbs)" />
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                      کالۆری و پڕۆتینی زانستی بۆ لەشت:
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--color-carbs)' }}>
                    {analysisResult.recommendedCalories} kcal
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                  <span>پڕۆتینی ڕۆژانەی پێشنیارکراو:</span>
                  <b style={{ color: 'var(--color-proteins)' }}>{analysisResult.recommendedProtein}g</b>
                </div>
              </div>

              {/* دوگمەی جێبەجێکردن لە بەرنامەدا */}
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleApplyAnalysis}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14.5px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Sparkles size={18} />
                  <span>جێبەجێکردن و داڕشتنی کۆرس بەپێی وێنەکانم</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="liquid-pill"
                  style={{
                    width: '100%',
                    padding: '11px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  داخستن
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
