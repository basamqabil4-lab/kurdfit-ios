'use client';
import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Phone, Mail, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { 
  signInWithPopup, 
  signInWithRedirect, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';

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

export default function AccountAuthModal({
  isOpen = true,
  onClose,
  isGate = false,
  onSuccess,
  onContinueAsGuest,
  currentLangConfig = { code: 'ku', dir: 'rtl' },
  theme = 'dark'
}) {
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'signin'
  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  
  // Email & Password State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  // Phone SMS State
  const [selectedCountryCode, setSelectedCountryCode] = useState('+964');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpFocused, setOtpFocused] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Status & Error
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const isRtl = currentLangConfig.dir === 'rtl';

  // Labels by language
  const labels = {
    ku: {
      welcomeTitle: 'بەخێربێیت بۆ BQ GYM',
      welcomeSubtitle: 'ڕاهێنەری زیرەکی لەشجوانی و خۆراک',
      googleBtn: 'Google',
      phoneBtn: 'مۆبایل',
      emailBtn: 'ئیمەیڵ',
      orDivider: 'یان',
      emailPlaceholder: 'athlete@bqgym.com',
      passwordPlaceholder: 'وشەی نهێنی (لانیکەم ٦ پیت)...',
      phonePlaceholder: '750 XXX XXXX',
      otpPlaceholder: 'کۆدی ٦ ژمارەیی (SMS)...',
      sendOtpBtn: 'ناردنی کۆدی کورتەنامە (SMS)',
      verifyOtpBtn: 'دڵنیاکردنەوە و چوونەژوورەوە',
      createAccountBtn: 'دروستکردنی هەژمار',
      signInBtn: 'چوونەژوورەوە بۆ هەژمار',
      alreadyHaveAccount: 'هەژمارت هەیە؟',
      dontHaveAccount: 'هەژمارت نییە؟',
      logInLink: 'چوونەژوورەوە',
      signUpLink: 'دروستکردنی هەژمار',
      continueAsGuest: 'بەردەوامبوون وەک میوان',
      errorFillFields: 'تکایە هەموو خانەکان بە دروستی پڕبکەرەوە',
      errorShortPass: 'وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت',
      errorInvalidEmail: 'ئیمەیڵەکەت دروست نییە',
      errorEmailExists: 'ئەم ئیمەیڵە پێشتر بەکارهاتووە',
      errorWrongPass: 'ئیمەیڵ یان وشەی نهێنی هەڵەیە',
      errorPhone: 'تکایە ژمارەی مۆبایل بنووسە بەبێ سفری سەرەتا',
      errorOtp: 'کۆدەکە هەڵەیە یان بەسەرچووە',
      successCreated: 'هەژمارەکەت بە سەرکەوتوویی دروستکرا!',
      successLogin: 'بەخێربێیتەوە بۆ ناو بەرنامە!'
    },
    en: {
      welcomeTitle: 'Welcome to BQ GYM',
      welcomeSubtitle: 'Smart AI Fitness & Nutrition Coach',
      googleBtn: 'Google',
      phoneBtn: 'Phone',
      emailBtn: 'Email',
      orDivider: 'or',
      emailPlaceholder: 'athlete@bqgym.com',
      passwordPlaceholder: 'Password (min. 6 characters)...',
      phonePlaceholder: '750 XXX XXXX',
      otpPlaceholder: '6-digit SMS code...',
      sendOtpBtn: 'Send Verification Code (SMS)',
      verifyOtpBtn: 'Verify & Sign In',
      createAccountBtn: 'Create an Account',
      signInBtn: 'Log In',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      logInLink: 'Log In',
      signUpLink: 'Create one',
      continueAsGuest: 'Continue as Guest',
      errorFillFields: 'Please fill in all fields correctly',
      errorShortPass: 'Password must be at least 6 characters',
      errorInvalidEmail: 'Invalid email address',
      errorEmailExists: 'This email is already registered',
      errorWrongPass: 'Incorrect email or password',
      errorPhone: 'Please enter a valid phone number',
      errorOtp: 'Invalid or expired code',
      successCreated: 'Account created successfully!',
      successLogin: 'Welcome back!'
    },
    ar: {
      welcomeTitle: 'مرحباً بك في BQ GYM',
      welcomeSubtitle: 'مدرب اللياقة والتغذية الذكي بالذكاء الاصطناعي',
      googleBtn: 'Google',
      phoneBtn: 'الهاتف',
      emailBtn: 'البريد',
      orDivider: 'أو',
      emailPlaceholder: 'athlete@bqgym.com',
      passwordPlaceholder: 'كلمة المرور (٦ أحرف على الأقل)...',
      phonePlaceholder: '750 XXX XXXX',
      otpPlaceholder: 'رمز التحقق المكون من ٦ أرقام...',
      sendOtpBtn: 'إرسال رمز التحقق (SMS)',
      verifyOtpBtn: 'تأكيد ودخول',
      createAccountBtn: 'إنشاء حساب جديد',
      signInBtn: 'تسجيل الدخول',
      alreadyHaveAccount: 'هل لديك حساب بالفعل؟',
      dontHaveAccount: 'ليس لديك حساب؟',
      logInLink: 'تسجيل الدخول',
      signUpLink: 'إنشاء حساب',
      continueAsGuest: 'المتابعة كضيف',
      errorFillFields: 'يرجى ملء جميع الحقول بشكل صحيح',
      errorShortPass: 'يجب أن لا تقل كلمة المرور عن ٦ أحرف',
      errorInvalidEmail: 'البريد الإلكتروني غير صالح',
      errorEmailExists: 'هذا البريد الإلكتروني مسجل بالفعل',
      errorWrongPass: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      errorPhone: 'يرجى إدخال رقم هاتف صحيح',
      errorOtp: 'الرمز غير صحيح أو منتهي الصلاحية',
      successCreated: 'تم إنشاء الحساب بنجاح!',
      successLogin: 'أهلاً بعودتك!'
    },
    fa: {
      welcomeTitle: 'به BQ GYM خوش آمدید',
      welcomeSubtitle: 'مربی هوشمند تناسب اندام و رژیم غذایی',
      googleBtn: 'Google',
      phoneBtn: 'موبایل',
      emailBtn: 'ایمیل',
      orDivider: 'یا',
      emailPlaceholder: 'athlete@bqgym.com',
      passwordPlaceholder: 'رمز عبور (حداقل ۶ نویسه)...',
      phonePlaceholder: '750 XXX XXXX',
      otpPlaceholder: 'کد ۶ رقمی پیامک...',
      sendOtpBtn: 'ارسال کد تأیید (SMS)',
      verifyOtpBtn: 'تأیید و ورود',
      createAccountBtn: 'ساخت حساب کاربری',
      signInBtn: 'ورود به حساب',
      alreadyHaveAccount: 'قبلاً ثبت نام کرده‌اید؟',
      dontHaveAccount: 'حساب کاربری ندارید؟',
      logInLink: 'ورود',
      signUpLink: 'ثبت‌نام',
      continueAsGuest: 'ادامه به عنوان مهمان',
      errorFillFields: 'لطفاً تمامی موارد را به درستی وارد کنید',
      errorShortPass: 'رمز عبور باید حداقل ۶ نویسه باشد',
      errorInvalidEmail: 'ایمیل نامعتبر است',
      errorEmailExists: 'این ایمیل قبلاً ثبت شده است',
      errorWrongPass: 'ایمیل یا رمز عبور اشتباه است',
      errorPhone: 'لطفاً شماره موبایل معتبر وارد کنید',
      errorOtp: 'کد نامعتبر است یا منقضی شده است',
      successCreated: 'حساب کاربری با موفقیت ساخته شد!',
      successLogin: 'خوش آمدید!'
    }
  };

  const l = labels[currentLangConfig.code] || labels.ku;

  // Auto-detect country code for phone
  useEffect(() => {
    if (method === 'phone') {
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          if (data && data.country_calling_code) {
            setSelectedCountryCode(data.country_calling_code);
          }
        })
        .catch(() => {});
    }
  }, [method]);

  // Recaptcha setup for Phone Auth
  const setupRecaptcha = () => {
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'bq-recaptcha-container', {
        size: 'invisible'
      });
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // پشکنینی ژینگەی مۆبایلی نەیتیڤ (Capacitor لەسەر iOS / Android یان WebView)
    const isNativeMobile = typeof window !== 'undefined' && (
      window.Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:' ||
      (window.location.hostname === 'localhost' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    );

    if (isNativeMobile) {
      setLoading(false);
      // سیاسەتی ئاسایشی گووگڵ ڕێگری دەکات لە لۆگینی ڕاستەوخۆ لەناو WebView (disallowed_useragent 403).
      // ڕێگری دەکەین لەوەی بەکارهێنەر لە پەڕەی گووگڵدا گیریان بخوات؛ و ڕاستەوخۆ ڕێنماییان دەکەین بۆ ئیمەیڵ یان مۆبایل.
      setErrorMessage(
        currentLangConfig.code === 'ar'
          ? 'تنبيه: سياسة أمان جوجل تمنع الدخول المباشر داخل تطبيقات الهاتف. يرجى استخدام البريد الإلكتروني أو رقم الهاتف للدخول الآمن.'
          : currentLangConfig.code === 'en'
          ? 'Notice: Google security blocks OAuth inside mobile app WebViews. Please use Email or Phone Number for instant access.'
          : 'ئاگاداری: یاسای ئاسایشی گووگڵ ڕێگری دەکات لە لۆگینی ناو وێبڤیوی مۆبایل. تکایە ئیمەیڵ یان ژمارەی مۆبایل بەکاربهێنە کە بە پارێزراوی کاردەکەن.'
      );
      setMethod('email');
      return;
    }

    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res && res.user) {
        setSuccessMessage(l.successLogin);
        if (onSuccess) onSuccess(res.user);
        if (onClose) onClose();
      }
    } catch (error) {
      console.warn("Google popup error:", error);
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user') {
        setErrorMessage(
          currentLangConfig.code === 'en'
            ? 'Sign-in window was closed or blocked. Try email login.'
            : 'پەنجەرەی گووگڵ داخرا یان بلۆک کرا. تکایە بە ئیمەیڵ بچۆ ژوورەوە.'
        );
      } else {
        setErrorMessage(error.message || 'Google sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // گەڕاندنەوەی وشەی نهێنی (Password Reset via Email)
  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage(
        currentLangConfig.code === 'ar'
          ? 'يرجى إدخال بريدك الإلكتروني أولاً'
          : currentLangConfig.code === 'en'
          ? 'Please enter your email address first'
          : 'تکایە سەرەتا ناونیشانی ئیمەیڵەکەت بنووسە'
      );
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetEmailSent(true);
      setSuccessMessage(
        currentLangConfig.code === 'ar'
          ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
          : currentLangConfig.code === 'en'
          ? 'Password reset link sent to your email.'
          : 'لینکی گۆڕینی وشەی نهێنی بۆ ئیمەیڵەکەت نێردرا. تکایە سندووقی نامەکانت بپشکنە.'
      );
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setErrorMessage(
          currentLangConfig.code === 'ar'
            ? 'لا يوجد حساب مسجل بهذا البريد'
            : currentLangConfig.code === 'en'
            ? 'No account found with this email'
            : 'هیچ هەژمارێک بەم ئیمەیڵە نەدۆزرایەوە'
        );
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage(l.errorInvalidEmail);
      } else {
        setErrorMessage(err.message || 'Error sending reset email');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email & Password Auth
  const handleEmailAuth = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage(l.errorFillFields);
      return;
    }
    if (password.length < 6) {
      setErrorMessage(l.errorShortPass);
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        setSuccessMessage(l.successCreated);
        if (onSuccess) onSuccess(res.user);
        if (onClose) onClose();
      } else {
        const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
        setSuccessMessage(l.successLogin);
        if (onSuccess) onSuccess(res.user);
        if (onClose) onClose();
      }
    } catch (error) {
      console.error("Email auth error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage(l.errorEmailExists);
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage(l.errorInvalidEmail);
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setErrorMessage(l.errorWrongPass);
      } else {
        setErrorMessage(error.message || 'Authentication error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone SMS - Send OTP
  const handleSendOtp = async () => {
    setErrorMessage('');
    if (!phoneNumber) {
      setErrorMessage(l.errorPhone);
      return;
    }
    setLoading(true);
    try {
      setupRecaptcha();
      const cleanPhone = phoneNumber.replace(/^0+/, '');
      const formattedPhone = selectedCountryCode + cleanPhone;
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setSuccessMessage('کۆدی کورتەنامە نێردرا');
    } catch (error) {
      console.error("SMS Error:", error);
      setErrorMessage(error.message || 'SMS error');
    } finally {
      setLoading(false);
    }
  };

  // Phone SMS - Verify OTP
  const handleVerifyOtp = async () => {
    setErrorMessage('');
    if (!otpCode || !confirmationResult) {
      setErrorMessage(l.errorOtp);
      return;
    }
    setLoading(true);
    try {
      const res = await confirmationResult.confirm(otpCode);
      setConfirmationResult(null);
      setPhoneNumber('');
      setOtpCode('');
      setSuccessMessage(l.successLogin);
      if (onSuccess) onSuccess(res.user);
      if (onClose) onClose();
    } catch (error) {
      console.error("OTP Error:", error);
      setErrorMessage(l.errorOtp);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 32px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 32px)',
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)',
        background: 'rgba(6, 8, 14, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        direction: currentLangConfig.dir,
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}
    >
      {/* Background ambient radial glow (Only in dark mode) */}
      {theme !== 'light' && (
        <div 
          style={{
            position: 'absolute',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.18) 0%, rgba(37, 99, 235, 0.12) 50%, transparent 80%)',
            pointerEvents: 'none',
            zIndex: 0,
            filter: 'blur(40px)'
          }}
        />
      )}

      {/* Main Elevated Dark Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '390px',
          maxHeight: 'calc(100dvh - max(env(safe-area-inset-top, 0px), 32px) - max(env(safe-area-inset-bottom, 0px), 32px))',
          overflowY: 'auto',
          background: '#131419',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '28px',
          padding: '34px 26px 28px 26px',
          boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.04)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}
      >
        {/* Optional Close Button (only if not a mandatory post-onboarding gate) */}
        {!isGate && onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '18px',
              right: isRtl ? 'auto' : '18px',
              left: isRtl ? '18px' : 'auto',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={16} />
          </button>
        )}

        {/* Centered Squircle Brand Emblem */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: '#0a0b0e',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            position: 'relative'
          }}
        >
          {/* Custom BQ GYM Geometric Athletic Emblem */}
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer modern curve */}
            <path 
              d="M16 4C9.37 4 4 9.37 4 16C4 22.63 9.37 28 16 28C22.63 28 28 22.63 28 16C28 9.37 22.63 4 16 4Z" 
              stroke="#ffffff" 
              strokeWidth="2.4" 
              strokeLinecap="round"
              strokeDasharray="40 10"
            />
            {/* Central BQ athletic dumbbell core */}
            <path 
              d="M11 11H14C15.66 11 17 12.34 17 14C17 15.1 16.4 16.05 15.5 16.55C16.6 17.05 17.3 18.05 17.3 19.2C17.3 20.86 15.96 22.2 14.3 22.2H11V11Z" 
              fill="#ffffff" 
            />
            <circle cx="21" cy="21" r="3.2" fill="#38BDF8" />
          </svg>
        </div>

        {/* Welcome Heading */}
        <h1
          style={{
            fontSize: '22px',
            fontWeight: '800',
            letterSpacing: '-0.4px',
            color: '#ffffff',
            margin: '0 0 6px 0',
            lineHeight: '1.25'
          }}
        >
          {l.welcomeTitle}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '13px',
            fontWeight: '500',
            color: '#8e95a5',
            margin: '0 0 22px 0',
            lineHeight: '1.4'
          }}
        >
          {l.welcomeSubtitle}
        </p>

        {/* Social / Quick Action Pills (Google and Phone) */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            width: '100%',
            marginBottom: '18px'
          }}
        >
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '9999px',
              background: '#1d1f27',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#252833'}
            onMouseLeave={e => e.currentTarget.style.background = '#1d1f27'}
          >
            {/* Google SVG Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{l.googleBtn}</span>
          </button>

          {/* Phone SMS / Quick Mode Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setMethod(method === 'email' ? 'phone' : 'email');
              setErrorMessage('');
            }}
            disabled={loading}
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '9999px',
              background: method === 'phone' ? 'rgba(56, 189, 248, 0.15)' : '#1d1f27',
              border: method === 'phone' ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={e => {
              if (method !== 'phone') e.currentTarget.style.background = '#252833';
            }}
            onMouseLeave={e => {
              if (method !== 'phone') e.currentTarget.style.background = '#1d1f27';
            }}
          >
            {method === 'phone' ? <Mail size={16} color="#38BDF8" /> : <Phone size={16} color="#94a3b8" />}
            <span>{method === 'phone' ? l.emailBtn : l.phoneBtn}</span>
          </button>
        </div>

        {/* Divider with "or" / "یان" */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            margin: '0 0 16px 0'
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
          <span
            style={{
              padding: '0 12px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6e7585',
              textTransform: 'lowercase'
            }}
          >
            {l.orDivider}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
        </div>

        {/* Form Inputs Section */}
        {method === 'email' ? (
          isForgotPassword ? (
            <form onSubmit={handleForgotPassword} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ textAlign: isRtl ? 'right' : 'left', fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5' }}>
                {currentLangConfig.code === 'ar' 
                  ? 'أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور:' 
                  : currentLangConfig.code === 'en' 
                  ? 'Enter your email to receive a password reset link:' 
                  : 'ئیمەیڵەکەت بنووسە بۆ ئەوەی لینکی گۆڕینی وشەی نهێنیت بۆ بنێرین:'}
              </div>

              {/* Email Input */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  borderRadius: '14px',
                  boxSizing: 'border-box',
                  background: emailFocused
                    ? 'linear-gradient(#14151c, #14151c) padding-box, linear-gradient(90deg, #ec4899 0%, #a855f7 22%, #3b82f6 45%, #06b6d4 68%, #10b981 85%, #eab308 100%) border-box'
                    : '#191a21',
                  border: emailFocused ? '1.6px solid transparent' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: emailFocused ? '0 0 16px rgba(168, 85, 247, 0.25), 0 0 4px rgba(56, 189, 248, 0.3)' : 'none',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <input
                  type="email"
                  placeholder={l.emailPlaceholder}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  dir="ltr"
                  style={{
                    width: '100%',
                    height: '48px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Error or Success Notice */}
              {errorMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '12px',
                    fontWeight: '700',
                    textAlign: 'start'
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                    fontSize: '12px',
                    fontWeight: '700',
                    textAlign: 'start'
                  }}
                >
                  <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Submit Reset Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '9999px',
                  background: '#ffffff',
                  color: '#08090c',
                  fontSize: '14px',
                  fontWeight: '800',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '6px',
                  boxShadow: '0 4px 18px rgba(255, 255, 255, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? '...' : (currentLangConfig.code === 'ar' ? 'إرسال رابط التعيين' : currentLangConfig.code === 'en' ? 'Send Reset Link' : 'ناردنی لینکی گۆڕین')}
              </button>

              {/* Back to normal auth */}
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '6px 0',
                  textDecoration: 'underline'
                }}
              >
                {currentLangConfig.code === 'ar' ? 'الرجوع إلى تسجيل الدخول' : currentLangConfig.code === 'en' ? 'Back to Sign In' : 'گەڕانەوە بۆ چوونەژوورەوە'}
              </button>
            </form>
          ) : (
          <form onSubmit={handleEmailAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 1. Email Input */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                borderRadius: '14px',
                boxSizing: 'border-box',
                background: emailFocused
                  ? 'linear-gradient(#14151c, #14151c) padding-box, linear-gradient(90deg, #ec4899 0%, #a855f7 22%, #3b82f6 45%, #06b6d4 68%, #10b981 85%, #eab308 100%) border-box'
                  : '#191a21',
                border: emailFocused ? '1.6px solid transparent' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: emailFocused ? '0 0 16px rgba(168, 85, 247, 0.25), 0 0 4px rgba(56, 189, 248, 0.3)' : 'none',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <input
                type="email"
                placeholder={l.emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                dir="ltr"
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 2. Password Input with SIGNATURE RAINBOW GRADIENT BORDER ONLY ON FOCUS */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                borderRadius: '14px',
                boxSizing: 'border-box',
                /* Rainbow Gradient Border ONLY when focused */
                background: passwordFocused
                  ? 'linear-gradient(#14151c, #14151c) padding-box, linear-gradient(90deg, #ec4899 0%, #a855f7 22%, #3b82f6 45%, #06b6d4 68%, #10b981 85%, #eab308 100%) border-box'
                  : '#191a21',
                border: passwordFocused ? '1.6px solid transparent' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: passwordFocused
                  ? '0 0 16px rgba(168, 85, 247, 0.25), 0 0 4px rgba(56, 189, 248, 0.3)'
                  : 'none',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={l.passwordPlaceholder}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                dir="ltr"
                style={{
                  width: '100%',
                  height: '46px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: isRtl ? '0 16px 0 44px' : '0 44px 0 16px',
                  fontSize: '14.5px',
                  fontWeight: '600',
                  color: '#ffffff',
                  boxSizing: 'border-box',
                  letterSpacing: showPassword ? 'normal' : '2px'
                }}
              />
              
              {/* Eye Toggle Icon inside Rainbow Box */}
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: isRtl ? 'auto' : '12px',
                  left: isRtl ? '12px' : 'auto',
                  background: 'none',
                  border: 'none',
                  color: '#8e95a5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Forgot password link */}
            {authMode === 'signin' && (
              <div style={{ display: 'flex', justifyContent: isRtl ? 'flex-start' : 'flex-end', width: '100%', marginTop: '-4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    textDecoration: 'underline'
                  }}
                >
                  {currentLangConfig.code === 'ar' ? 'هل نسيت كلمة المرور؟' : currentLangConfig.code === 'en' ? 'Forgot password?' : 'وشەی نهێنیت لەبیرچووە؟'}
                </button>
              </div>
            )}

            {/* Error or Success Notice */}
            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '12px',
                  fontWeight: '700',
                  textAlign: 'start'
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: '700',
                  textAlign: 'start'
                }}
              >
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Primary Action Button: Solid White Pill from Reference Image */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '9999px',
                background: '#ffffff',
                color: '#08090c',
                fontSize: '14.5px',
                fontWeight: '800',
                border: 'none',
                cursor: 'pointer',
                marginTop: '10px',
                boxShadow: '0 4px 18px rgba(255, 255, 255, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(0.99)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {loading ? (
                <span>...</span>
              ) : (
                <span>{authMode === 'signup' ? l.createAccountBtn : l.signInBtn}</span>
              )}
            </button>
          </form>
        )) : (
          /* Phone OTP SMS Section */
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!confirmationResult ? (
              <>
                <div style={{ display: 'flex', gap: '8px', direction: 'ltr', width: '100%' }}>
                  <select
                    value={selectedCountryCode}
                    onChange={e => setSelectedCountryCode(e.target.value)}
                    style={{
                      flex: '0 0 100px',
                      height: '48px',
                      background: '#191a21',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      padding: '0 8px',
                      outline: 'none'
                    }}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code} style={{ background: '#131419', color: '#ffffff' }}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  <div
                    style={{
                      flex: 1,
                      position: 'relative',
                      borderRadius: '14px',
                      boxSizing: 'border-box',
                      background: phoneFocused
                        ? 'linear-gradient(#14151c, #14151c) padding-box, linear-gradient(90deg, #ec4899 0%, #a855f7 22%, #3b82f6 45%, #06b6d4 68%, #10b981 85%, #eab308 100%) border-box'
                        : '#191a21',
                      border: phoneFocused ? '1.6px solid transparent' : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: phoneFocused ? '0 0 16px rgba(168, 85, 247, 0.25), 0 0 4px rgba(56, 189, 248, 0.3)' : 'none',
                      transition: 'all 0.25s ease',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <input
                      type="tel"
                      placeholder={l.phonePlaceholder}
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                      dir="ltr"
                      style={{
                        width: '100%',
                        height: '48px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        padding: '0 14px',
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#ffffff',
                        letterSpacing: '1px'
                      }}
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div style={{ color: '#f87171', fontSize: '12px', fontWeight: '700', textAlign: 'start' }}>
                    {errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '9999px',
                    background: '#ffffff',
                    color: '#08090c',
                    fontSize: '14px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '8px',
                    boxShadow: '0 4px 18px rgba(255, 255, 255, 0.18)'
                  }}
                >
                  {loading ? '...' : l.sendOtpBtn}
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    borderRadius: '14px',
                    boxSizing: 'border-box',
                    background: otpFocused
                      ? 'linear-gradient(#14151c, #14151c) padding-box, linear-gradient(90deg, #ec4899 0%, #a855f7 22%, #3b82f6 45%, #06b6d4 68%, #10b981 85%, #eab308 100%) border-box'
                      : '#191a21',
                    border: otpFocused ? '1.6px solid transparent' : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: otpFocused ? '0 0 16px rgba(168, 85, 247, 0.25), 0 0 4px rgba(56, 189, 248, 0.3)' : 'none',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <input
                    type="text"
                    placeholder={l.otpPlaceholder}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    onFocus={() => setOtpFocused(true)}
                    onBlur={() => setOtpFocused(false)}
                    dir="ltr"
                    style={{
                      width: '100%',
                      height: '48px',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      padding: '0 16px',
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#ffffff',
                      textAlign: 'center',
                      letterSpacing: '5px'
                    }}
                  />
                </div>

                {errorMessage && (
                  <div style={{ color: '#f87171', fontSize: '12px', fontWeight: '700', textAlign: 'start' }}>
                    {errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '9999px',
                    background: '#ffffff',
                    color: '#08090c',
                    fontSize: '14px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '8px',
                    boxShadow: '0 4px 18px rgba(255, 255, 255, 0.18)'
                  }}
                >
                  {loading ? '...' : l.verifyOtpBtn}
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer Toggle (Already have an account? Log In) from Reference Image */}
        <div
          style={{
            marginTop: '22px',
            fontSize: '13px',
            color: '#8e95a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>{authMode === 'signup' ? l.alreadyHaveAccount : l.dontHaveAccount}</span>
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontWeight: '700',
              cursor: 'pointer',
              padding: 0,
              fontSize: '13px',
              textDecoration: 'underline',
              textUnderlineOffset: '3px'
            }}
          >
            {authMode === 'signup' ? l.logInLink : l.signUpLink}
          </button>
        </div>

        {/* Continue as Guest fallback (Discrete bypass) */}
        {onContinueAsGuest && (
          <button
            type="button"
            onClick={onContinueAsGuest}
            style={{
              marginTop: '16px',
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
          >
            <span>{l.continueAsGuest}</span>
            {isRtl ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
          </button>
        )}

        {/* Invisible Recaptcha Container for SMS OTP Verification */}
        <div id="bq-recaptcha-container" />
      </div>
    </div>
  );
}
