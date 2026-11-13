'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RotateCcw, Sparkles, Upload, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { CameraScanIcon, UIIcon } from './Icons';

export default function CameraScanner({ onClose, onFoodScanned, t, currentLangConfig, language = 'ku' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const directCaptureInputRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const lang = currentLangConfig?.code || language || 'ku';

  // دەستپێکردنی ڕاستەوخۆی کامێرا لە ناو بەرنامەکەدا
  const startCamera = async (facing = facingMode) => {
    setIsRequesting(true);
    setCameraError(null);
    setPermissionDenied(false);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NotSupported');
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          },
          audio: false
        });
      } catch (e1) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
      streamRef.current = stream;
      setIsCameraActive(true);
      setIsRequesting(false);
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play warning:', playErr);
        }
      }
    } catch (err) {
      console.warn("Live camera access failed or permission needed:", err);
      setIsCameraActive(false);
      setIsRequesting(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setCameraError('PermissionDenied');
      } else if (err.message === 'NotSupported') {
        setCameraError('NotSupported');
      } else {
        setCameraError(err.message || 'CameraUnavailable');
      }
    }
  };

  useEffect(() => {
    // دەستپێکردنی خۆکارانە لە کاتی کردنەوەی سکانەردا
    startCamera(facingMode);

    // گوێگرتن لە گۆڕانکاری دۆخی ڕێگەپێدان (Permission Status Change)
    let permObj = null;
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' })
        .then(status => {
          permObj = status;
          if (status.state === 'denied') {
            setPermissionDenied(true);
          }
          status.onchange = () => {
            if (status.state === 'granted') {
              setPermissionDenied(false);
              startCamera(facingMode);
            } else if (status.state === 'denied') {
              setPermissionDenied(true);
            }
          };
        })
        .catch(() => {});
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (permObj) permObj.onchange = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const processImageBase64 = async (base64) => {
    setIsScanning(true);
    try {
      const data = await window.analyzeFoodDirectly(base64, null);
      setIsScanning(false);
      
      if (data && data.isFood) {
        if (onFoodScanned) {
          onFoodScanned(data);
        } else {
          const successMsg = lang === 'en' ? `Scan successful: ${data.englishName || data.name} - ${data.calories} kcal` : lang === 'ar' ? `تم الفحص بنجاح: ${data.name} - ${data.calories} سعرة` : lang === 'fa' ? `اسکن با موفقیت انجام شد: ${data.name} - ${data.calories} کالری` : `سکانەکە سەرکەوتوو بوو: ${data.name} - ${data.calories} کالۆری`;
          alert(successMsg);
        }
        onClose();
      } else {
        alert(data?.message || (lang === 'en' ? 'This is not recognized as food.' : lang === 'ar' ? 'لم يتم التعرف عليه كطعام.' : lang === 'fa' ? 'این غذا نیست یا شناسایی نشد.' : 'ئەمە خواردن نییە یان نەناسرایەوە.'));
        startCamera(facingMode);
      }
    } catch (err) {
      console.error(err);
      alert(lang === 'en' ? 'An error occurred connecting to AI' : lang === 'ar' ? 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي' : lang === 'fa' ? 'خطایی در ارتباط با هوش مصنوعی رخ داد' : 'هەڵەیەک ڕوویدا لە پەیوەندی کردن بە زیرەکی دەستکرد');
      setIsScanning(false);
      startCamera(facingMode);
    }
  };

  // گرتنی وێنەی ڕاستەوخۆ بە کامێرا لەگەڵ بچووککردنەوەی خێرا (Ultra-Fast In-App Capture)
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;

    // بچووککردنەوە بۆ قەبارەی زێڕینی ئەی ئای (ماکسیمەم ٨٠٠ پیکسڵ)
    const maxDim = 800;
    let w = vWidth;
    let h = vHeight;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    // دەرکردنی کۆدی سووک (JPEG بە کوالیتی 0.72 - قەبارە تەنها ~٦٠ بۆ ٨٠ کیلۆبایت!)
    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);

    // ڕاگرتنی ڕاستەوخۆی کامێرا بۆ پاشەکەوتی باتری
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    processImageBase64(compressedBase64);
  };

  // هەڵبژاردنی وێنە لە گەلەری یان لە کامێرای ڕاستەوخۆی مۆبایل
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);

          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          processImageBase64(compressedBase64);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '520px', maxHeight: '85vh', backgroundColor: '#090d16', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* هێڵی سەرەوە (Top Controls Bar) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isScanning ? '#f59e0b' : '#10b981', boxShadow: isScanning ? '0 0 10px #f59e0b' : '0 0 10px #10b981' }} />
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.3px' }}>
            {isScanning 
              ? (lang === 'en' ? 'AI Analyzing...' : lang === 'ar' ? 'جاري التحليل بالذكاء الاصطناعي...' : lang === 'fa' ? 'در حال تحلیل با هوش مصنوعی...' : 'خەریکی شیکاری زیرەکی دەستکرد...') 
              : (lang === 'en' ? 'Live Food Scanner' : lang === 'ar' ? 'سكانر الوجبات المباشر' : lang === 'fa' ? 'اسکنر زنده غذا' : 'سکانەری ڕاستەوخۆی خواردن')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={toggleFacingMode}
            className="liquid-pill"
            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '800', color: '#ffffff', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            title={lang === 'en' ? 'Switch Camera' : 'گۆڕینی کامێرا'}
          >
            <RotateCcw size={13} color="#ffffff" />
            <span>{lang === 'en' ? 'Flip' : 'گۆڕین'}</span>
          </button>

          <button 
            type="button"
            onClick={onClose} 
            className="liquid-pill"
            style={{ width: '34px', height: '34px', padding: 0, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.25)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ناوچەی سەرەکی نیشاندانی ڕاستەوخۆی کامێرا (Direct Live Scanner View) */}
      <div
        onClick={() => { if (!isCameraActive && !isRequesting) startCamera(facingMode); }}
        style={{ position: 'relative', flex: 1, width: '100%', minHeight: '420px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000000' }}
      >
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />

        {/* چوارچێوەی ئەلیکترۆنی سکانەر لە سەنتەردا */}
        <div style={{ position: 'absolute', width: '270px', height: '270px', border: '2px solid rgba(56, 189, 248, 0.4)', borderRadius: '24px', boxShadow: '0 0 30px rgba(56, 189, 248, 0.25)', pointerEvents: 'none' }}>
          {/* گۆشە بریقەدارەکان */}
          <div style={{ position: 'absolute', top: '-3px', left: '-3px', width: '24px', height: '24px', borderTop: '4px solid #38bdf8', borderLeft: '4px solid #38bdf8', borderTopLeftRadius: '22px' }} />
          <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '24px', height: '24px', borderTop: '4px solid #38bdf8', borderRight: '4px solid #38bdf8', borderTopRightRadius: '22px' }} />
          <div style={{ position: 'absolute', bottom: '-3px', left: '-3px', width: '24px', height: '24px', borderBottom: '4px solid #38bdf8', borderLeft: '4px solid #38bdf8', borderBottomLeftRadius: '22px' }} />
          <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '24px', height: '24px', borderBottom: '4px solid #38bdf8', borderRight: '4px solid #38bdf8', borderBottomRightRadius: '22px' }} />
          
          {/* هێڵی لیزەری سکان (Laser line) */}
          <div className="scanner-laser-line" />
        </div>

        {/* پەیامی ڕێنمایی لە کاتی بینیندا */}
        {!isScanning && (
          <div style={{ position: 'absolute', bottom: '25px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '11.5px', fontWeight: '700', pointerEvents: 'none' }}>
            {lang === 'en' ? 'Aim camera at food plate' : lang === 'ar' ? 'وجّه الكاميرا نحو صحن الطعام' : lang === 'fa' ? 'دوربین را به سمت بشقاب غذا بگیرید' : 'کامێراکە ڕێکبخە لەسەر قاپی خواردنەکە'}
          </div>
        )}

        {/* دۆخی لۆدینگی شیکاری (Scanning Overlay) */}
        {isScanning && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
            <div className="action-loading-spinner" style={{ marginBottom: '18px' }} />
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', marginBottom: '6px' }}>
              {lang === 'en' ? 'Analyzing Food, Portion & Macros...' : lang === 'ar' ? 'جاري تقدير الكمية والسعرات والماكروز...' : lang === 'fa' ? 'در حال تخمین مقدار، کالری و پروتئین...' : 'خەریکی خەمڵاندنی بڕ و کالۆری و پڕۆتینی خواردنەکەیە...'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-carbs)', fontWeight: '700' }}>
              {lang === 'en' ? 'AI Vision Precision Analysis' : 'شیکاری وردی زیرەکی دەستکرد بۆ قاپەکەت'}
            </div>
          </div>
        )}
      </div>

      {/* باڕی خوارەوەی کۆنتڕۆڵ (Bottom Shutter Controls) */}
      <div style={{ padding: '14px 24px', background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(9,13,22,0.95) 100%)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 }}>
        {/* هەڵبژاردن لە گەلەری */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="liquid-pill"
          style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: '14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <UIIcon name="ImageGallery" size={16} color="#38bdf8" />
          <span>{lang === 'en' ? 'Gallery' : 'گەلەری'}</span>
        </button>

        {/* دوگمەی گەورەی وێنەگرتنی ناوخۆیی (In-App Shutter Button) */}
        <button
          type="button"
          onClick={() => {
            if (isCameraActive && videoRef.current && videoRef.current.readyState >= 2) {
              capturePhoto();
            } else {
              directCaptureInputRef.current?.click();
            }
          }}
          disabled={isScanning}
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
            border: '4px solid #ffffff',
            boxShadow: '0 0 25px rgba(56, 189, 248, 0.6), inset 0 0 10px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isScanning ? 'not-allowed' : 'pointer',
            opacity: isScanning ? 0.5 : 1,
            transform: 'scale(1)',
            transition: 'all 0.15s ease'
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          title={lang === 'en' ? 'Take Photo' : 'وێنەگرتن'}
        >
          <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)' }} />
          </div>
        </button>

        {/* دوگمەی وێنەگرتنی مۆبایل وەک یەدەگ */}
        <button
          type="button"
          onClick={() => directCaptureInputRef.current?.click()}
          disabled={isScanning}
          className="liquid-pill"
          style={{ padding: '10px 14px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', borderRadius: '14px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
          title={lang === 'en' ? 'Mobile Camera' : 'کامێرای مۆبایل'}
        >
          <Zap size={14} color="#38bdf8" />
          <span>{lang === 'en' ? 'Direct Snap' : 'مۆبایل'}</span>
        </button>
      </div>

      {/* ئینپووتی شاراوەی گەلەری */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileSelect} 
      />

      {/* ئینپووتی شاراوەی وێنەگرتنی ڕاستەوخۆ بە کامێرای مۆبایل (Direct Mobile Camera Capture) */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={directCaptureInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileSelect} 
      />
    </div>
  );
}
