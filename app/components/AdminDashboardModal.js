'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, ShieldAlert, Users, Camera, Dumbbell, 
  Search, RefreshCw, X, Lock, CheckCircle2, AlertTriangle, 
  Trash2, Edit3, Plus, ArrowLeft, ArrowRight, Eye, Download,
  Flame, Sparkles, UserX, UserCheck, KeyRound, ExternalLink,
  ChevronDown, ChevronUp, SlidersHorizontal, Filter, UserMinus,
  Check, UserPlus, Shield
} from 'lucide-react';
import { 
  fetchAllAthletes, 
  subscribeToAllAthletes,
  setAthleteSuspensionState, 
  pushAdminCourseToAthlete,
  fetchAdminsList,
  saveAdminAccount,
  deleteAdminAccount,
  DEFAULT_SUPER_ADMIN
} from '../utils/cloudSync';
import { playSparkleSound, playCaptureSuccessSound, triggerHaptic } from '../utils/audioFX';

export default function AdminDashboardModal({ isOpen, onClose }) {
  // دۆخی چوونەژوورەوە و ئەدمینی چالاک
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');

  // داتای یاریزانان و ئەدمینەکان
  const [athletes, setAthletes] = useState([]);
  const [adminsList, setAdminsList] = useState([DEFAULT_SUPER_ADMIN]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // بینینی سەرەکی: 'athletes' (لیستی یاریزانان) | 'albums' (ئەلبوومی وێنەکان) | 'admins' (بەڕێوەبەران و ڕۆڵەکان)
  const [mainView, setMainView] = useState('athletes');

  // گەڕان و فیلتەرەکان
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all'); // 'all' | 'male' | 'female'
  const [accountTypeFilter, setAccountTypeFilter] = useState('all'); // 'all' | 'guest' | 'registered'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'suspended'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // فیلتەرە پێشکەوتووەکان: تەمەن، کێش، باڵا، چەوری، ئامانج
  const [ageRange, setAgeRange] = useState('all'); // 'all' | '<20' | '20-30' | '30-40' | '40+'
  const [weightRange, setWeightRange] = useState('all'); // 'all' | '<60' | '60-75' | '75-90' | '90+'
  const [heightRange, setHeightRange] = useState('all'); // 'all' | '<165' | '165-175' | '175-185' | '185+'
  const [bodyFatRange, setBodyFatRange] = useState('all'); // 'all' | '<15' | '15-22' | '22+'
  const [goalFilter, setGoalFilter] = useState('all'); // 'all' | 'bulk' | 'cut' | 'maintain'

  // یاریزانی هەڵبژێردراو بۆ پیشاندانی وردەکاری
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [athleteDetailTab, setAthleteDetailTab] = useState('profile'); // 'profile' | 'photos' | 'course' | 'control'

  // مۆداڵی پێشاندانی ئەلبوومی وێنەی یاریزان
  const [selectedAlbumAthlete, setSelectedAlbumAthlete] = useState(null);

  // دۆخی دەستکاریکردنی کۆرس
  const [editableCourse, setEditableCourse] = useState(null);
  const [coachNotes, setCoachNotes] = useState('');
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // دۆخی بەڕێوەبردنی ئەدمینە نوێیەکان
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    name: '',
    email: '',
    pin: '',
    role: 'coach',
    permissions: {
      canManageAdmins: false,
      canSuspend: true,
      canEditCourse: true,
      canViewPhotos: true
    }
  });

  // دۆخی ڕاگرتن
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [customSuspendReason, setCustomSuspendReason] = useState('هەژمارەکەت ڕاگیراوە لەلایەن ڕاهێنەرەوە');

  // وێنەی گەورەکراو
  const [previewImage, setPreviewImage] = useState(null);

  // چوونەژوورەوەی ئەدمین بەپێی کۆدی نهێنی
  const handleLogin = (e) => {
    if (e) e.preventDefault();
    const cleanPin = pinInput.trim();
    
    // دۆزینەوەی ئەدمین بەپێی PIN لە لیستی فەرمی ئەدمینەکان
    const foundAdmin = adminsList.find(a => String(a.pin) === cleanPin);

    if (foundAdmin || (DEFAULT_SUPER_ADMIN?.pin && cleanPin === String(DEFAULT_SUPER_ADMIN.pin))) {
      const activeAdm = foundAdmin || DEFAULT_SUPER_ADMIN;
      setCurrentAdmin(activeAdm);
      setAuthError('');
      loadData();
      playSparkleSound();
    } else {
      setAuthError('کۆدی نهێنی (PIN) هەڵەیە! تکایە کۆدی دروست لێبدە.');
      triggerHaptic([50, 100, 50]);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [athletesList, admins] = await Promise.all([
        fetchAllAthletes(),
        fetchAdminsList()
      ]);
      setAthletes(athletesList);
      setAdminsList(admins);
    } catch (err) {
      console.error('Failed to load data:', err);
      setFetchError(err.message || 'نەتوانرا پەیوەندی بە داتابەیسەوە بکرێت');
    } finally {
      setIsLoading(false);
    }
  };

  // گوێگرتنی ڕاستەوخۆ لە کاتی کراوەبوونی پەنێڵدا
  useEffect(() => {
    if (isOpen && currentAdmin) {
      loadData();
      const unsub = subscribeToAllAthletes((liveList) => {
        setAthletes(liveList);
      });
      return () => unsub();
    }
  }, [isOpen, currentAdmin]);

  // هەژمارکردنی فلتەرە چالاکەکان
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (genderFilter !== 'all') count++;
    if (accountTypeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (ageRange !== 'all') count++;
    if (weightRange !== 'all') count++;
    if (heightRange !== 'all') count++;
    if (bodyFatRange !== 'all') count++;
    if (goalFilter !== 'all') count++;
    return count;
  }, [genderFilter, accountTypeFilter, statusFilter, ageRange, weightRange, heightRange, bodyFatRange, goalFilter]);

  const resetAllFilters = () => {
    setGenderFilter('all');
    setAccountTypeFilter('all');
    setStatusFilter('all');
    setAgeRange('all');
    setWeightRange('all');
    setHeightRange('all');
    setBodyFatRange('all');
    setGoalFilter('all');
    setSearchQuery('');
  };

  // فیلتەرکردنی سەرجەم یاریزانان بە هەموو فلتەرەکان
  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => {
      const p = a.profile || {};
      const name = (p.name || a.displayName || a.name || '').toLowerCase();
      const phone = (p.phone || a.phoneNumber || '').toLowerCase();
      const email = (a.email || p.email || '').toLowerCase();
      const id = (a.id || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      // ١. گەڕان بە ناو، ئیمەیڵ، ژمارە، یان ID
      if (q) {
        const matches = name.includes(q) || phone.includes(q) || email.includes(q) || id.includes(q);
        if (!matches) return false;
      }

      // ٢. فلتەری ڕەگەز (Gender)
      const gender = (p.gender || a.gender || 'male').toLowerCase();
      const isFemale = gender.includes('female') || gender.includes('مێ') || gender.includes('ئافرەت');
      if (genderFilter === 'male' && isFemale) return false;
      if (genderFilter === 'female' && !isFemale) return false;

      // ٣. فلتەری جۆری هەژمار (Guest vs Registered)
      const isGuest = Boolean(a.isGuest || a.authType === 'guest' || (!a.email && !a.phoneNumber && !a.photoURL));
      if (accountTypeFilter === 'guest' && !isGuest) return false;
      if (accountTypeFilter === 'registered' && isGuest) return false;

      // ٤. فلتەری دۆخی هەژمار (Status: Active vs Suspended)
      const isSuspended = Boolean(a.isSuspended || a.status === 'suspended');
      if (statusFilter === 'active' && isSuspended) return false;
      if (statusFilter === 'suspended' && !isSuspended) return false;

      // ٥. فلتەری تەمەن (Age)
      const age = Number(p.age) || 0;
      if (ageRange === '<20' && (age <= 0 || age >= 20)) return false;
      if (ageRange === '20-30' && (age < 20 || age > 30)) return false;
      if (ageRange === '30-40' && (age < 30 || age > 40)) return false;
      if (ageRange === '40+' && age < 40) return false;

      // ٦. فلتەری کێش (Weight)
      const weight = Number(p.weight) || 0;
      if (weightRange === '<60' && (weight <= 0 || weight >= 60)) return false;
      if (weightRange === '60-75' && (weight < 60 || weight > 75)) return false;
      if (weightRange === '75-90' && (weight < 75 || weight > 90)) return false;
      if (weightRange === '90+' && weight < 90) return false;

      // ٧. فلتەری باڵا (Height)
      const height = Number(p.height) || 0;
      if (heightRange === '<165' && (height <= 0 || height >= 165)) return false;
      if (heightRange === '165-175' && (height < 165 || height > 175)) return false;
      if (heightRange === '175-185' && (height < 175 || height > 185)) return false;
      if (heightRange === '185+' && height < 185) return false;

      // ٨. فلتەری چەوری (Body Fat %)
      const bf = Number(p.physiqueAnalysis?.bodyFatPercentage) || 0;
      if (bodyFatRange === '<15' && (bf <= 0 || bf >= 15)) return false;
      if (bodyFatRange === '15-22' && (bf < 15 || bf > 22)) return false;
      if (bodyFatRange === '22+' && bf < 22) return false;

      // ٩. فلتەری ئامانج (Fitness Goal)
      const goal = (p.goal || '').toLowerCase();
      if (goalFilter === 'bulk' && !(goal.includes('زیادکردن') || goal.includes('گەشە') || goal.includes('bulk'))) return false;
      if (goalFilter === 'cut' && !(goal.includes('دابەزاندن') || goal.includes('سوتاندن') || goal.includes('cut'))) return false;
      if (goalFilter === 'maintain' && !(goal.includes('جێگیر') || goal.includes('تەندروستی') || goal.includes('maintain'))) return false;

      return true;
    });
  }, [athletes, searchQuery, genderFilter, accountTypeFilter, statusFilter, ageRange, weightRange, heightRange, bodyFatRange, goalFilter]);

  // ئەو یاریزانانەی کە خاوەنی وێنەی ئەلبوومن
  const athletesWithPhotos = useMemo(() => {
    return filteredAthletes.filter(a => {
      const pa = a.profile?.physiqueAnalysis;
      return pa && (pa.photos?.frontUrl || pa.photos?.sideUrl || pa.photos?.backUrl || pa.bodyFatPercentage);
    });
  }, [filteredAthletes]);

  // ژماردنی ئامارەکان
  const stats = useMemo(() => {
    const total = athletes.length;
    const suspended = athletes.filter(a => a.isSuspended || a.status === 'suspended').length;
    const active = total - suspended;
    const guests = athletes.filter(a => a.isGuest || a.authType === 'guest' || (!a.email && !a.phoneNumber && !a.photoURL)).length;
    const males = athletes.filter(a => !(a.profile?.gender || '').includes('female') && !(a.profile?.gender || '').includes('مێ')).length;
    const females = total - males;
    const withScans = athletes.filter(a => a.profile?.physiqueAnalysis).length;
    return { total, active, suspended, guests, males, females, withScans };
  }, [athletes]);

  // دیاریکردنی یاریزان بۆ بینین
  const handleSelectAthlete = (athlete, tab = 'profile') => {
    setSelectedAthlete(athlete);
    setEditableCourse(JSON.parse(JSON.stringify(athlete.workoutCourse || null)));
    setCoachNotes(athlete.workoutCourse?.adminNotes || '');
    setCustomSuspendReason(athlete.suspendReason || 'هەژمارەکەت ڕاگیراوە لەلایەن ڕاهێنەرەوە');
    setAthleteDetailTab(tab);
    setSaveSuccessMessage('');
  };

  // گۆڕینی دۆخی ڕاگرتن
  const handleToggleSuspend = async (athlete, forceState = null) => {
    if (currentAdmin && currentAdmin.permissions && !currentAdmin.permissions.canSuspend) {
      alert('ببورە، تۆ مۆڵەتی ڕاگرتنی هەژمارت نییە (تەنها سەرپەرشتیاری سەرەکی دەتوانێت).');
      return;
    }

    const currentState = Boolean(athlete.isSuspended || athlete.status === 'suspended');
    const newState = forceState !== null ? forceState : !currentState;
    
    setIsUpdatingStatus(true);
    try {
      await setAthleteSuspensionState(athlete.id, newState, customSuspendReason);
      playCaptureSuccessSound();
      
      setAthletes(prev => prev.map(a => {
        if (a.id === athlete.id) {
          return {
            ...a,
            isSuspended: newState,
            status: newState ? 'suspended' : 'active',
            suspendReason: newState ? customSuspendReason : ''
          };
        }
        return a;
      }));

      if (selectedAthlete && selectedAthlete.id === athlete.id) {
        setSelectedAthlete(prev => ({
          ...prev,
          isSuspended: newState,
          status: newState ? 'suspended' : 'active',
          suspendReason: newState ? customSuspendReason : ''
        }));
      }
    } catch (e) {
      alert('هەڵەیەک ڕوویدا لە گۆڕینی دۆخی هەژمار: ' + e.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // پاشەکەوتکردنی کۆرسی ڕاهێنان
  const handleSaveCourse = async () => {
    if (currentAdmin && currentAdmin.permissions && !currentAdmin.permissions.canEditCourse) {
      alert('ببورە، مۆڵەتی دەستکاریکردنی کۆرست پێنەدراوە.');
      return;
    }

    if (!selectedAthlete || !editableCourse) return;
    setIsSavingCourse(true);
    setSaveSuccessMessage('');
    try {
      await pushAdminCourseToAthlete(selectedAthlete.id, editableCourse, coachNotes);
      playSparkleSound();
      setSaveSuccessMessage('کۆرسەکە بە سەرکەوتوویی نوێکرایەوە و ڕاستەوخۆ گەیشتە مۆبایلی یاریزانەکە! 🎉');
      
      setAthletes(prev => prev.map(a => {
        if (a.id === selectedAthlete.id) {
          return {
            ...a,
            workoutCourse: {
              ...editableCourse,
              adminNotes: coachNotes,
              updatedByAdmin: true
            }
          };
        }
        return a;
      }));
    } catch (e) {
      alert('نەتوانرا کۆرسەکە بنێردرێت: ' + e.message);
    } finally {
      setIsSavingCourse(false);
    }
  };

  // زیادکردنی ئەدمینی نوێ
  const handleAddNewAdmin = async (e) => {
    if (e) e.preventDefault();
    if (!newAdminData.name || !newAdminData.pin) {
      alert('تکایە ناو و کۆدی PIN بنووسە!');
      return;
    }

    const newAdm = {
      id: 'admin_' + Date.now(),
      name: newAdminData.name,
      email: newAdminData.email || '',
      pin: newAdminData.pin,
      role: newAdminData.role,
      permissions: {
        canManageAdmins: newAdminData.role === 'super_admin',
        canSuspend: newAdminData.role === 'super_admin' || newAdminData.permissions.canSuspend,
        canEditCourse: newAdminData.role !== 'viewer' && newAdminData.permissions.canEditCourse,
        canViewPhotos: newAdminData.permissions.canViewPhotos
      },
      createdAt: new Date().toISOString()
    };

    await saveAdminAccount(newAdm);
    setAdminsList(prev => [...prev, newAdm]);
    setShowAddAdminModal(false);
    setNewAdminData({
      name: '',
      email: '',
      pin: '',
      role: 'coach',
      permissions: { canManageAdmins: false, canSuspend: true, canEditCourse: true, canViewPhotos: true }
    });
    playSparkleSound();
  };

  // سڕینەوەی ئەدمین
  const handleDeleteAdmin = async (adminId) => {
    if (adminId === 'admin_master_01') {
      alert('ناتوانیت سەرپەرشتیاری سەرەکی بسڕیتەوە!');
      return;
    }
    if (confirm('دڵنیایت لە سڕینەوەی ئەم ئەدمینە؟')) {
      await deleteAdminAccount(adminId);
      setAdminsList(prev => prev.filter(a => a.id !== adminId));
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 7, 15, 0.98)',
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      color: '#f8fafc',
      fontFamily: 'inherit',
      direction: 'rtl',
      // حیسابی وردی سەیف زۆن و داینامیک ئایلەند بۆ مۆبایل و ئایفۆن
      paddingTop: 'max(env(safe-area-inset-top, 0px), 44px)',
      paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
      paddingLeft: 'max(env(safe-area-inset-left, 0px), 14px)',
      paddingRight: 'max(env(safe-area-inset-right, 0px), 14px)',
      boxSizing: 'border-box'
    }}>

      {/* ==================== ١. ئەگەر ئەدمین هێشتا لۆگین نەبووە ==================== */}
      {!currentAdmin ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '400px',
            width: '100%',
            background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1.5px solid rgba(168, 85, 247, 0.45)',
            borderRadius: '26px',
            padding: '34px 26px',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(168, 85, 247, 0.25)'
          }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #9333EA 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              boxShadow: '0 12px 30px rgba(147, 51, 234, 0.4)'
            }}>
              <ShieldCheck size={34} color="#ffffff" />
            </div>

            <h2 style={{ fontSize: '21px', fontWeight: '900', margin: '0 0 6px 0', color: '#ffffff' }}>
              پەنێڵی بەڕێوەبەری BQ GYM
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: '1.6' }}>
              تکایە کۆدی نهێنی ڕاهێنەر (Master PIN) لێبدە. کۆدی بنەڕەتی: <strong>7788</strong>
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input 
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="کۆدی نهێنی (PIN)..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  border: authError ? '1.5px solid #ef4444' : '1.5px solid rgba(255, 255, 255, 0.18)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#ffffff',
                  fontSize: '18px',
                  textAlign: 'center',
                  letterSpacing: '4px',
                  fontWeight: '900',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              {authError && (
                <div style={{ fontSize: '12.5px', color: '#ef4444', fontWeight: '700' }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  background: 'var(--accent-gradient, linear-gradient(135deg, #9333EA 0%, #3B82F6 100%))',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(147, 51, 234, 0.4)'
                }}
              >
                چوونەژوورەوەی ڕاهێنەر
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                داخستن و گەڕانەوە
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ==================== ٢. داشبۆردی سەرەکی ==================== */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

          {/* سەرپەڕەی سەرەکی (Header بە حیسابی تەواوی Dynamic Island) */}
          <header style={{
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(15, 23, 42, 0.9)',
            borderRadius: '18px 18px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #9333EA 0%, #3B82F6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(147, 51, 234, 0.35)'
              }}>
                <ShieldCheck size={22} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: '900', margin: 0, color: '#ffffff' }}>
                  داشبۆردی سەرپەرشتیاری BQ GYM
                </h1>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '800' }}>
                  بەخێربێیت: {currentAdmin.name} ({currentAdmin.role === 'super_admin' ? 'سەرپەرشتیاری گشتی' : 'ڕاهێنەر'})
                </div>
              </div>
            </div>

            {/* دوگمەکانی نوێکردنەوە و دەرچوون */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={loadData}
                disabled={isLoading}
                title="نوێکردنەوە"
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                <span>نوێکردنەوە</span>
              </button>

              <button
                onClick={onClose}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                  fontSize: '12px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
                <span>دەرچوون</span>
              </button>
            </div>
          </header>

          {/* ٣ دوگمەی سەرەکی بۆ گۆڕینی بەشەکان: (لیستی یاریزانان / ئەلبوومی وێنەکان / بەڕێوەبەران) */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.7)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '4px 10px',
            gap: '8px'
          }}>
            <button
              onClick={() => setMainView('athletes')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: 'none',
                background: mainView === 'athletes' ? 'linear-gradient(135deg, #9333EA 0%, #4F46E5 100%)' : 'transparent',
                color: mainView === 'athletes' ? '#ffffff' : '#94a3b8',
                fontSize: '13px',
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Users size={16} />
              <span>یاریزانەکان ({filteredAthletes.length})</span>
            </button>

            <button
              onClick={() => setMainView('albums')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: 'none',
                background: mainView === 'albums' ? 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)' : 'transparent',
                color: mainView === 'albums' ? '#ffffff' : '#94a3b8',
                fontSize: '13px',
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Camera size={16} />
              <span>ئەلبوومی وێنەکان ({athletesWithPhotos.length})</span>
            </button>

            {currentAdmin.permissions?.canManageAdmins && (
              <button
                onClick={() => setMainView('admins')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: mainView === 'admins' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'transparent',
                  color: mainView === 'admins' ? '#ffffff' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Shield size={16} />
                <span>ئەدمین و ڕۆڵ ({adminsList.length})</span>
              </button>
            )}
          </div>

          {/* ==================== باڕی فلتەر و گەڕان (بۆ هەموو بەشەکانی پانێڵ کاردەکات) ==================== */}
          {(mainView === 'athletes' || mainView === 'albums') && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.65)',
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {/* باڕی گەڕان */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="گەڕان بە ناو، ئیمەیڵ، ژمارەی مۆبایل، یان ID..."
                    style={{
                      width: '100%',
                      padding: '9px 38px 9px 12px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* دوگمەی فلتەرە پێشکەوتووەکان */}
                <button
                  onClick={() => setShowAdvancedFilters(prev => !prev)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '12px',
                    background: activeFiltersCount > 0 ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    border: activeFiltersCount > 0 ? '1.5px solid #A855F7' : '1px solid rgba(255, 255, 255, 0.15)',
                    color: activeFiltersCount > 0 ? '#C084FC' : '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Filter size={14} />
                  <span>فلتەرەکان {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
                  {showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* دوگمەکانی فلتەری خێرا: (ڕەگەز: هەمووی، پیاو، ئافرەت) + (بێ هەژمار / میوان) + (ڕاگیراو) */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800' }}>ڕەگەز:</span>
                {[
                  { id: 'all', label: 'هەمووی' },
                  { id: 'male', label: 'پیاو 👨' },
                  { id: 'female', label: 'ئافرەت 👩' }
                ].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGenderFilter(g.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      border: genderFilter === g.id ? '1px solid #9333EA' : '1px solid rgba(255,255,255,0.1)',
                      background: genderFilter === g.id ? 'linear-gradient(135deg, #9333EA 0%, #4F46E5 100%)' : 'rgba(255,255,255,0.05)',
                      color: genderFilter === g.id ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {g.label}
                  </button>
                ))}

                <span style={{ height: '14px', width: '1px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

                {/* دوگمەی تایبەت بۆ بەکارهێنەرانی بێ هەژمار (میوان - Guest) */}
                <button
                  onClick={() => setAccountTypeFilter(prev => prev === 'guest' ? 'all' : 'guest')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    border: accountTypeFilter === 'guest' ? '1px solid #F59E0B' : '1px solid rgba(255,255,255,0.1)',
                    background: accountTypeFilter === 'guest' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.05)',
                    color: accountTypeFilter === 'guest' ? '#FBBF24' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <UserMinus size={12} />
                  <span>بێ هەژمار (میوان: {stats.guests})</span>
                </button>

                {/* دوگمەی ڕاگیراوەکان (باند) */}
                <button
                  onClick={() => setStatusFilter(prev => prev === 'suspended' ? 'all' : 'suspended')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    border: statusFilter === 'suspended' ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                    background: statusFilter === 'suspended' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)',
                    color: statusFilter === 'suspended' ? '#EF4444' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  ⛔ ڕاگیراو ({stats.suspended})
                </button>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetAllFilters}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      padding: '4px 6px'
                    }}
                  >
                    سڕینەوەی فلتەرەکان ✕
                  </button>
                )}
              </div>

              {/* کەرتی فلتەرە پێشکەوتووەکان (تەمەن، کێش، باڵا، چەوری، ئامانج) */}
              {showAdvancedFilters && (
                <div style={{
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px'
                }}>
                  {/* تەمەن */}
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', display: 'block', marginBottom: '4px' }}>تەمەن:</label>
                    <select
                      value={ageRange}
                      onChange={(e) => setAgeRange(e.target.value)}
                      style={{ width: '100%', padding: '6px', borderRadius: '8px', background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontSize: '12px' }}
                    >
                      <option value="all">هەموو تەمەنێک</option>
                      <option value="<20">کەمتر لە ٢٠ ساڵ</option>
                      <option value="20-30">٢٠ بۆ ٣٠ ساڵ</option>
                      <option value="30-40">٣٠ بۆ ٤٠ ساڵ</option>
                      <option value="40+">سەروو ٤٠ ساڵ</option>
                    </select>
                  </div>

                  {/* کێش */}
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', display: 'block', marginBottom: '4px' }}>کێش:</label>
                    <select
                      value={weightRange}
                      onChange={(e) => setWeightRange(e.target.value)}
                      style={{ width: '100%', padding: '6px', borderRadius: '8px', background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontSize: '12px' }}
                    >
                      <option value="all">هەموو کێشێک</option>
                      <option value="<60">کەمتر لە ٦٠ کگم</option>
                      <option value="60-75">٦٠ بۆ ٧٥ کگم</option>
                      <option value="75-90">٧٥ بۆ ٩٠ کگم</option>
                      <option value="90+">سەروو ٩٠ کگم</option>
                    </select>
                  </div>

                  {/* باڵا */}
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', display: 'block', marginBottom: '4px' }}>باڵا:</label>
                    <select
                      value={heightRange}
                      onChange={(e) => setHeightRange(e.target.value)}
                      style={{ width: '100%', padding: '6px', borderRadius: '8px', background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontSize: '12px' }}
                    >
                      <option value="all">هەموو باڵایەک</option>
                      <option value="<165">کەمتر لە ١٦٥ سم</option>
                      <option value="165-175">١٦٥ بۆ ١٧٥ سم</option>
                      <option value="175-185">١٧٥ بۆ ١٨٥ سم</option>
                      <option value="185+">سەروو ١٨٥ سم</option>
                    </select>
                  </div>

                  {/* ڕێژەی چەوری */}
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', display: 'block', marginBottom: '4px' }}>چەوری لەش:</label>
                    <select
                      value={bodyFatRange}
                      onChange={(e) => setBodyFatRange(e.target.value)}
                      style={{ width: '100%', padding: '6px', borderRadius: '8px', background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontSize: '12px' }}
                    >
                      <option value="all">هەمووی</option>
                      <option value="<15">ژێر ١٥٪ (وشک/Lean)</option>
                      <option value="15-22">١٥٪ تا ٢٢٪ (مامناوەند)</option>
                      <option value="22+">سەروو ٢٢٪ (بەرز)</option>
                    </select>
                  </div>

                  {/* ئامانج */}
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', display: 'block', marginBottom: '4px' }}>ئامانج:</label>
                    <select
                      value={goalFilter}
                      onChange={(e) => setGoalFilter(e.target.value)}
                      style={{ width: '100%', padding: '6px', borderRadius: '8px', background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontSize: '12px' }}
                    >
                      <option value="all">هەموو ئامانجێک</option>
                      <option value="bulk">گەشەی ماسولکە (Bulk)</option>
                      <option value="cut">دابەزاندن و چەوری (Cut)</option>
                      <option value="maintain">جێگیرکردنی کێش</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== بەشی سەرەکی (Main View Container) ==================== */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

            {/* ==================== تابی یەکەم: لیستی یاریزانەکان (Athletes Directory) ==================== */}
            {mainView === 'athletes' && (
              filteredAthletes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                  <Users size={44} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px 0', color: '#94a3b8' }}>
                    هیچ یاریزانێک نەدۆزرایەوە بەم فلتەرانە
                  </h3>
                  <button
                    onClick={resetAllFilters}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', marginTop: '10px', cursor: 'pointer' }}
                  >
                    پاککردنەوەی هەموو فلتەرەکان
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {filteredAthletes.map(athlete => {
                    const isSuspended = Boolean(athlete.isSuspended || athlete.status === 'suspended');
                    const p = athlete.profile || {};
                    const hasScan = Boolean(p.physiqueAnalysis?.photos || p.physiqueAnalysis);
                    const isFemale = (p.gender || '').includes('female') || (p.gender || '').includes('مێ');
                    const isGuest = Boolean(athlete.isGuest || athlete.authType === 'guest' || (!athlete.email && !athlete.phoneNumber && !athlete.photoURL));

                    return (
                      <div 
                        key={athlete.id}
                        style={{
                          background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.45) 0%, rgba(15, 23, 42, 0.75) 100%)',
                          border: isSuspended ? '1.5px solid rgba(239, 68, 68, 0.55)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '20px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.35)'
                        }}
                      >
                        {/* سەری کارت: ناو و پڕۆفایل و باجەکان */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '14px',
                              background: isSuspended 
                                ? 'rgba(239, 68, 68, 0.25)' 
                                : isFemale 
                                  ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)' 
                                  : 'linear-gradient(135deg, #A855F7 0%, #06B6D4 100%)',
                              border: isSuspended ? '1.5px solid #ef4444' : '1.5px solid rgba(255, 255, 255, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '900',
                              fontSize: '18px',
                              color: '#ffffff',
                              overflow: 'hidden'
                            }}>
                              {athlete.photoURL ? (
                                <img src={athlete.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                (p.name || athlete.name || 'P')[0]?.toUpperCase()
                              )}
                            </div>

                            <div>
                              <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{p.name || athlete.displayName || (isGuest ? 'یاریزانی میوان' : 'یاریزانی BQ GYM')}</span>
                                <span style={{ fontSize: '12px' }}>{isFemale ? '👩' : '👨'}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {p.phone || athlete.phoneNumber || athlete.email || (isGuest ? 'بێ هەژمار (میوان)' : `ID: ${athlete.id.substring(0, 8)}...`)}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <div style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '10.5px',
                              fontWeight: '900',
                              background: isSuspended ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: isSuspended ? '#ef4444' : '#10b981',
                              border: isSuspended ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                            }}>
                              {isSuspended ? '⛔ ڕاگیراو' : '🟢 چالاک'}
                            </div>

                            {isGuest && (
                              <div style={{ fontSize: '9.5px', color: '#FBBF24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                میوان (Guest)
                              </div>
                            )}
                          </div>
                        </div>

                        {/* زانیاری کێش، باڵا، چەوری لەش */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '6px',
                          background: 'rgba(0, 0, 0, 0.28)',
                          padding: '8px',
                          borderRadius: '12px',
                          textAlign: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>کێش</div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>{p.weight || '--'} kg</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>باڵا</div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>{p.height || '--'} cm</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>چەوری</div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: p.physiqueAnalysis ? '#fbbf24' : '#94a3b8' }}>
                              {p.physiqueAnalysis?.bodyFatPercentage ? `${p.physiqueAnalysis.bodyFatPercentage}%` : '--'}
                            </div>
                          </div>
                        </div>

                        {/* ئەگەر وێنەی جەستەی گرتبێت */}
                        {hasScan && (
                          <div 
                            onClick={() => setSelectedAlbumAthlete(athlete)}
                            style={{
                              fontSize: '11px',
                              color: '#c084fc',
                              background: 'rgba(168, 85, 247, 0.12)',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Camera size={13} />
                              <span>خاوەنی ٣ وێنەی پشکنینی جەستەیە</span>
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: '800' }}>سەیرکردنی ئەلبووم ←</span>
                          </div>
                        )}

                        {/* دوگمەکانی کۆنتڕۆڵ */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <button
                            onClick={() => handleSelectAthlete(athlete, 'profile')}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #9333EA 0%, #3B82F6 100%)',
                              border: 'none',
                              color: '#ffffff',
                              fontSize: '12.5px',
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={15} />
                            <span>زانیاری و وێنە و کۆرس</span>
                          </button>

                          {/* دوگمەی ڕاگرتن / چالاککردنەوە */}
                          <button
                            onClick={() => handleToggleSuspend(athlete)}
                            disabled={isUpdatingStatus}
                            title={isSuspended ? 'چالاککردنەوەی هەژمار' : 'ڕاگرتنی بەرنامە لە دوورەوە'}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '12px',
                              background: isSuspended ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              border: isSuspended ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                              color: isSuspended ? '#10b981' : '#ef4444',
                              fontSize: '12px',
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            {isSuspended ? <UserCheck size={16} /> : <UserX size={16} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ==================== تابی دووەم: ئەلبوومی وێنەکان (Master Photo Albums Gallery) ==================== */}
            {mainView === 'albums' && (
              athletesWithPhotos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                  <Camera size={44} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px 0', color: '#94a3b8' }}>
                    هیچ ئەلبوومێکی وێنە بەردەست نییە لەم فلتەرەدا
                  </h3>
                  <p style={{ fontSize: '12.5px', margin: 0 }}>
                    کاتێک یاریزانان وێنەی (پێشەوە، تەنیشت، دواوە) دەگرن، لێرەدا بە ئەلبووم پیشان دەدرێن.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                  {athletesWithPhotos.map(athlete => {
                    const p = athlete.profile || {};
                    const pa = p.physiqueAnalysis || {};
                    const photos = pa.photos || {};
                    const mainThumb = photos.frontUrl || photos.sideUrl || photos.backUrl;
                    const isFemale = (p.gender || '').includes('female') || (p.gender || '').includes('مێ');

                    return (
                      <div 
                        key={athlete.id}
                        onClick={() => setSelectedAlbumAthlete(athlete)}
                        style={{
                          background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
                          border: '1.5px solid rgba(168, 85, 247, 0.35)',
                          borderRadius: '20px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.2s'
                        }}
                      >
                        {/* وێنەی پێشەوەی ئەلبووم */}
                        <div style={{ height: '220px', position: 'relative', background: '#090d16' }}>
                          {mainThumb ? (
                            <img src={mainThumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
                              وێنەی شیکاری
                            </div>
                          )}

                          {/* باجی ڕێژەی چەوری لەسەر وێنەکە */}
                          {pa.bodyFatPercentage && (
                            <div style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: 'rgba(0, 0, 0, 0.75)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid #fbbf24',
                              color: '#fbbf24',
                              fontSize: '12px',
                              fontWeight: '900',
                              padding: '4px 8px',
                              borderRadius: '8px'
                            }}>
                              چەوری: {pa.bodyFatPercentage}%
                            </div>
                          )}

                          <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '10px',
                            background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(8px)',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            📸 ٣ وێنەی پۆزینگ
                          </div>
                        </div>

                        {/* ناو و زانیاری یاریزان */}
                        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>
                              {p.name || 'یاریزانی BQ GYM'} {isFemale ? '👩' : '👨'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {p.weight || '--'} kg
                            </div>
                          </div>

                          {pa.laggingMuscles && pa.laggingMuscles.length > 0 && (
                            <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              لاوازەکان: {pa.laggingMuscles.join('، ')}
                            </div>
                          )}

                          <div style={{
                            marginTop: '4px',
                            fontSize: '11.5px',
                            color: '#06B6D4',
                            fontWeight: '800',
                            textAlign: 'center',
                            background: 'rgba(6, 182, 212, 0.1)',
                            padding: '6px',
                            borderRadius: '8px'
                          }}>
                            کلیک بکە بۆ بینینی هەرسێ وێنەکە و پڕۆفایل ←
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ==================== تابی سێیەم: بەڕێوەبەران و ڕۆڵەکان (Admins & Custom Roles) ==================== */}
            {mainView === 'admins' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '900', margin: 0, color: '#ffffff' }}>
                      بەڕێوەبردنی ئەدمینەکان و دەسەڵاتەکان
                    </h3>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      دەتوانیت ئەدمینی نوێ زیاد بکەیت و بە دڵی خۆت ڕۆڵ و دەسەڵاتیان پێ بدەیت.
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAddAdminModal(true)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '900',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <UserPlus size={16} />
                    <span>+ زیادکردنی ئەدمینی نوێ</span>
                  </button>
                </div>

                {/* لیستی ئەدمینەکان */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                  {adminsList.map(adm => {
                    const isSuper = adm.role === 'super_admin' || adm.id === 'admin_master_01';
                    return (
                      <div 
                        key={adm.id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.7)',
                          border: isSuper ? '1.5px solid #9333EA' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '18px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: isSuper ? 'linear-gradient(135deg, #9333EA 0%, #3B82F6 100%)' : 'rgba(255, 255, 255, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff'
                            }}>
                              <Shield size={20} />
                            </div>
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: '900', color: '#fff' }}>{adm.name}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{adm.email || 'Admin User'}</div>
                            </div>
                          </div>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: '900',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isSuper ? 'rgba(147, 51, 234, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                            color: isSuper ? '#C084FC' : '#06B6D4'
                          }}>
                            {isSuper ? '👑 سوپەر ئەدمین' : adm.role === 'coach' ? '🏋️ ڕاهێنەر' : '👁️ بینەر'}
                          </span>
                        </div>

                        {/* دەسەڵاتەکان */}
                        <div style={{
                          background: 'rgba(0,0,0,0.3)',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontSize: '11.5px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          color: '#cbd5e1'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>کۆدی نهێنی (PIN):</span>
                            <span style={{ fontWeight: '900', letterSpacing: '2px', color: '#fff' }}>••••</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>دەستکاریکردنی کۆرس:</span>
                            <span>{adm.permissions?.canEditCourse ? '✅ بەڵێ' : '❌ نەخێر'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>ڕاگرتن و باندکردن:</span>
                            <span>{adm.permissions?.canSuspend ? '✅ بەڵێ' : '❌ نەخێر'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>بینینی وێنەکانی جەستە:</span>
                            <span>{adm.permissions?.canViewPhotos ? '✅ بەڵێ' : '❌ نەخێر'}</span>
                          </div>
                        </div>

                        {!isSuper && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                              onClick={() => handleDeleteAdmin(adm.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Trash2 size={13} />
                              <span>سڕینەوەی ئەم ئەدمینە</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== ٤. مۆداڵی پێشاندانی ئەلبوومی وێنەکان (Album Viewer Modal) ==================== */}
      {selectedAlbumAthlete && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(20px)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '680px',
            width: '100%',
            background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1.5px solid rgba(168, 85, 247, 0.45)',
            borderRadius: '24px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}>
            {/* سەرپەڕەی ئەلبووم */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '900', margin: 0, color: '#fff' }}>
                  ئەلبوومی وێنەی: {selectedAlbumAthlete.profile?.name || 'یاریزان'}
                </h3>
                <div style={{ fontSize: '11.5px', color: '#10b981' }}>
                  ڕێژەی چەوری: {selectedAlbumAthlete.profile?.physiqueAnalysis?.bodyFatPercentage || '--'}% • {selectedAlbumAthlete.profile?.physiqueAnalysis?.bodyType || 'وەرزشی'}
                </div>
              </div>
              <button onClick={() => setSelectedAlbumAthlete(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* هەرسێ وێنەکە (پێشەوە، تەنیشت، دواوە) */}
            <div style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { key: 'frontUrl', label: 'پێشەوە (Front)' },
                  { key: 'sideUrl', label: 'تەنیشت (Side)' },
                  { key: 'backUrl', label: 'دواوە (Back)' }
                ].map(img => {
                  const url = selectedAlbumAthlete.profile?.physiqueAnalysis?.photos?.[img.key];
                  return (
                    <div key={img.key} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ height: '240px', background: '#090d16' }}>
                        {url ? (
                          <img 
                            src={url} 
                            alt={img.label} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                            onClick={() => setPreviewImage(url)} 
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', fontSize: '12px' }}>
                            وێنە نییە
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '800', color: '#cbd5e1', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        {img.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* دوگمەی کردنەوەی پەڕەی تەواوی زانیاریی ئەم یاریزانە */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const a = selectedAlbumAthlete;
                  setSelectedAlbumAthlete(null);
                  handleSelectAthlete(a, 'profile');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #9333EA 0%, #3B82F6 100%)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13.5px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(147, 51, 234, 0.4)'
                }}
              >
                <Eye size={17} />
                <span>کردنەوەی پەڕەی تەواوی زانیاری و دەستکاریکردنی کۆرس</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ٥. مۆداڵی تەواوی زانیارییەکانی یاریزان (Athlete Comprehensive Profile) ==================== */}
      {selectedAthlete && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(20px)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '780px',
            width: '100%',
            maxHeight: '92vh',
            background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1.5px solid rgba(168, 85, 247, 0.45)',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)'
          }}>

            {/* سەردێڕ */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#ffffff' }}>
                  {selectedAthlete.profile?.name || 'پڕۆفایلی تەواوی یاریزان'}
                </h2>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {selectedAthlete.profile?.phone || selectedAthlete.email || `ID: ${selectedAthlete.id}`}
                </div>
              </div>
              <button onClick={() => setSelectedAthlete(null)} style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '10px', padding: '8px', color: '#ffffff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* تاپەکانی ناو مۆداڵ */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.3)' }}>
              {[
                { id: 'profile', label: '👤 سەرجەم زانیارییەکان' },
                { id: 'photos', label: '📸 وێنەکانی جەستە' },
                { id: 'course', label: '🏋️ دەستکاریکردنی کۆرس' },
                { id: 'control', label: '⛔ قفڵکردنی ئەپ' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setAthleteDetailTab(t.id)}
                  style={{
                    flex: 1,
                    padding: '12px 6px',
                    background: athleteDetailTab === t.id ? 'rgba(147, 51, 234, 0.2)' : 'transparent',
                    border: 'none',
                    borderBottom: athleteDetailTab === t.id ? '2.5px solid #A855F7' : '2.5px solid transparent',
                    color: athleteDetailTab === t.id ? '#ffffff' : '#94a3b8',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ناوەڕۆکی مۆداڵ بەپێی تاب */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

              {/* ١. هەموو زانیارییە کەسی و جەستەییەکان */}
              {athleteDetailTab === 'profile' && (() => {
                const p = selectedAthlete.profile || {};
                const pa = p.physiqueAnalysis || {};
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>ڕەگەز</div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{p.gender || 'دیاری نەکراوە'}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>تەمەن</div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{p.age || '--'} ساڵ</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>کێشی ئێستا</div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{p.weight || '--'} kg</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>باڵا</div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{p.height || '--'} cm</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>کێشی ئامانج</div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>{p.targetWeight || '--'} kg</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>ماوەی گەیشتن</div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{p.targetDays || 45} ڕۆژ</div>
                      </div>
                    </div>

                    {/* ئامانج و سەپلیمێنتەکان */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#A855F7' }}>ئامانجی سەرەکی: </strong>
                        <span style={{ color: '#fff' }}>{p.goal || 'گەشەی ماسولکە'}</span>
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#06B6D4' }}>سەپلیمێنت و ڤیتامینەکان: </strong>
                        <span style={{ color: '#fff' }}>{(p.supplements || []).join(', ') || 'هیچ'}</span>
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#EF4444' }}>پێکان و تەندروستی: </strong>
                        <span style={{ color: '#fff' }}>{(p.healthConditions || []).join(', ') || 'تەندروستە'}</span>
                      </div>
                    </div>

                    {/* کالۆری و ماکرۆکان */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center' }}>
                      <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div style={{ fontSize: '10px', color: '#ef4444' }}>کالۆری</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#ef4444' }}>{p.goalCalories || 2200}</div>
                      </div>
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div style={{ fontSize: '10px', color: '#3b82f6' }}>پرۆتین</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#3b82f6' }}>{p.goalProtein || 150}g</div>
                      </div>
                      <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ fontSize: '10px', color: '#f59e0b' }}>کارب</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#f59e0b' }}>{p.goalCarbs || 250}g</div>
                      </div>
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div style={{ fontSize: '10px', color: '#10b981' }}>چەوری</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#10b981' }}>{p.goalFat || 60}g</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ٢. وێنەکان */}
              {athleteDetailTab === 'photos' && (() => {
                const pa = selectedAthlete.profile?.physiqueAnalysis;
                const photos = pa?.photos || {};
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { key: 'frontUrl', label: 'پێشەوە (Front)' },
                        { key: 'sideUrl', label: 'تەنیشت (Side)' },
                        { key: 'backUrl', label: 'دواوە (Back)' }
                      ].map(img => {
                        const url = photos[img.key];
                        return (
                          <div key={img.key} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ height: '220px', background: '#090d16' }}>
                              {url ? (
                                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }} onClick={() => setPreviewImage(url)} />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', fontSize: '12px' }}>وێنە نییە</div>
                              )}
                            </div>
                            <div style={{ padding: '8px', textAlign: 'center', fontSize: '11.5px', fontWeight: '800', color: '#cbd5e1' }}>{img.label}</div>
                          </div>
                        );
                      })}
                    </div>

                    {pa && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '800' }}>
                          ڕێژەی چەوری خەمڵێنراو: {pa.bodyFatPercentage}% ({pa.bodyType})
                        </div>
                        {pa.laggingMuscles && (
                          <div style={{ fontSize: '12.5px', color: '#ef4444' }}>
                            <strong>ماسولکە دواکەوتووەکان: </strong> {pa.laggingMuscles.join(' • ')}
                          </div>
                        )}
                        {pa.postureFeedback && (
                          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                            <strong>ڕاوەستان و هاوسەنگی: </strong> {pa.postureFeedback}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ٣. دەستکاریکردنی کۆرس */}
              {athleteDetailTab === 'course' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {editableCourse ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '900', color: '#fff', margin: 0 }}>{editableCourse.title}</h4>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{editableCourse.daysPerWeek} ڕۆژ لە هەفتەدا</span>
                        </div>
                        <button
                          onClick={handleSaveCourse}
                          disabled={isSavingCourse}
                          style={{
                            padding: '10px 18px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <CheckCircle2 size={16} />
                          <span>{isSavingCourse ? 'خەریکی ناردنە...' : 'پاشەکەوت و ناردن بۆ یاریزان'}</span>
                        </button>
                      </div>

                      {saveSuccessMessage && (
                        <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '12px', color: '#10b981', fontSize: '12.5px', fontWeight: '800' }}>
                          {saveSuccessMessage}
                        </div>
                      )}

                      {/* تێبینی ڕاهێنەر */}
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>تێبینی و ڕێنمایی ڕاهێنەر بۆ یاریزان:</label>
                        <textarea
                          value={coachNotes}
                          onChange={(e) => setCoachNotes(e.target.value)}
                          placeholder="تێبینی بنووسە بۆ یاریزانەکە..."
                          rows={2}
                          style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* ڕۆژەکان و ڕاهێنانەکان */}
                      {(editableCourse.weeklyPlan || []).map((day, dIdx) => (
                        <div key={dIdx} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '12px' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#C084FC', marginBottom: '8px' }}>
                            {day.dayName} - <span style={{ color: '#fff' }}>{day.focus || (day.isRestDay ? 'پشوو' : 'ڕاهێنان')}</span>
                          </div>

                          {Array.isArray(day.exercises) && day.exercises.map((ex, exIdx) => (
                            <div key={exIdx} style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                              <input 
                                type="text"
                                value={ex.name}
                                onChange={(e) => {
                                  const upd = { ...editableCourse };
                                  upd.weeklyPlan[dIdx].exercises[exIdx].name = e.target.value;
                                  setEditableCourse(upd);
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12.5px', fontWeight: '800', flex: 1, outline: 'none' }}
                              />
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input 
                                  type="text"
                                  value={ex.sets}
                                  onChange={(e) => {
                                    const upd = { ...editableCourse };
                                    upd.weeklyPlan[dIdx].exercises[exIdx].sets = e.target.value;
                                    setEditableCourse(upd);
                                  }}
                                  style={{ width: '30px', textAlign: 'center', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '11px', padding: '3px' }}
                                />
                                <input 
                                  type="text"
                                  value={ex.reps}
                                  onChange={(e) => {
                                    const upd = { ...editableCourse };
                                    upd.weeklyPlan[dIdx].exercises[exIdx].reps = e.target.value;
                                    setEditableCourse(upd);
                                  }}
                                  style={{ width: '50px', textAlign: 'center', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '11px', padding: '3px' }}
                                />
                                <button
                                  onClick={() => {
                                    const upd = { ...editableCourse };
                                    upd.weeklyPlan[dIdx].exercises.splice(exIdx, 1);
                                    setEditableCourse(upd);
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>یاریزان کۆرسی نییە</div>
                  )}
                </div>
              )}

              {/* ٤. قفڵکردنی ئەپ */}
              {athleteDetailTab === 'control' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: selectedAthlete.isSuspended ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: selectedAthlete.isSuspended ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: selectedAthlete.isSuspended ? '#ef4444' : '#10b981' }}>
                          {selectedAthlete.isSuspended ? '⛔ ئەم بەرنامەیە لەسەر مۆبایلی یاریزان قفڵە' : '🟢 بەرنامەکە کراوەیە'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleSuspend(selectedAthlete)}
                        disabled={isUpdatingStatus}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '12px',
                          background: selectedAthlete.isSuspended ? 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)' : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                          border: 'none',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '900',
                          cursor: 'pointer'
                        }}
                      >
                        {selectedAthlete.isSuspended ? 'چالاککردنەوە' : 'ڕاگرتن (باند)'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>هۆکاری ڕاگرتن بۆ سەر مۆبایلی یاریزان:</label>
                    <input 
                      type="text"
                      value={customSuspendReason}
                      onChange={(e) => setCustomSuspendReason(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== ٦. مۆداڵی زیادکردنی ئەدمینی نوێ ==================== */}
      {showAddAdminModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(15px)',
          zIndex: 110000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '900', margin: 0, color: '#fff' }}>
                زیادکردنی ئەدمینی نوێ
              </h3>
              <button onClick={() => setShowAddAdminModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>ناوی ئەدمین:</label>
                <input 
                  type="text"
                  required
                  value={newAdminData.name}
                  onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                  placeholder="ناوی ڕاهێنەر یان ئەدمین..."
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>ئیمەیڵ یان ناسناو:</label>
                <input 
                  type="text"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                  placeholder="coach@bqgym.com"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>کۆدی نهێنی چوونەژوورەوە (PIN):</label>
                <input 
                  type="password"
                  required
                  value={newAdminData.pin}
                  onChange={(e) => setNewAdminData({ ...newAdminData, pin: e.target.value })}
                  placeholder="کۆدی PIN..."
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '3px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>ڕۆڵ و دەسەڵات:</label>
                <select
                  value={newAdminData.role}
                  onChange={(e) => setNewAdminData({ ...newAdminData, role: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px' }}
                >
                  <option value="coach">🏋️ ڕاهێنەر (Trainer / Coach) - کۆرس و وێنەکان</option>
                  <option value="super_admin">👑 سەرپەرشتیاری گشتی (Super Admin) - هەموو دەسەڵاتەکان</option>
                  <option value="viewer">👁️ بینەر (Viewer) - تەنها بینینی ئامار</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13.5px',
                    fontWeight: '900',
                    cursor: 'pointer'
                  }}
                >
                  پاشەکەوتکردنی ئەدمین
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  داخستن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ٧. مۆداڵی گەورەکردنی وێنە (Preview Full Image) ==================== */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.96)',
            zIndex: 120000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <img 
            src={previewImage} 
            alt="Preview" 
            style={{ maxWidth: '95vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: '16px' }} 
          />
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
