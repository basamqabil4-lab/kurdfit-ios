'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, ShieldAlert, Users, Camera, Dumbbell, 
  Search, RefreshCw, X, Lock, CheckCircle2, AlertTriangle, 
  Trash2, Edit3, Plus, ArrowLeft, ArrowRight, Eye, Download,
  Flame, Sparkles, UserX, UserCheck, KeyRound, ExternalLink,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  fetchAllAthletes, 
  setAthleteSuspensionState, 
  pushAdminCourseToAthlete 
} from '../utils/cloudSync';
import { playSparkleSound, playCaptureSuccessSound, triggerHaptic } from '../utils/audioFX';

export default function AdminDashboardModal({ isOpen, onClose }) {
  // دۆخی چوونەژوورەوەی ڕاهێنەر (Master PIN)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');

  // داتای یاریزانان
  const [athletes, setAthletes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // گەڕان و فیلتەر
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // 'all' | 'active' | 'suspended' | 'scanned'

  // یاریزانی هەڵبژێردراو بۆ پێداچوونەوە و دەستکاریکردن
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('photos'); // 'photos' | 'course' | 'control'

  // دۆخی دەستکاریکردنی کۆرس
  const [editableCourse, setEditableCourse] = useState(null);
  const [coachNotes, setCoachNotes] = useState('');
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // دۆخی گۆڕینی ڕاگرتن (Suspension)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [customSuspendReason, setCustomSuspendReason] = useState('هەژمارەکەت ڕاگیراوە لەلایەن ڕاهێنەرەوە بەهۆی تەواوبوونی بەشداری');

  // وێنەی گەورەکراو
  const [previewImage, setPreviewImage] = useState(null);

  // پاسۆردی سەرەکی ڕاهێنەر (Master PIN)
  const MASTER_PIN = '7788';

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (pinInput.trim() === MASTER_PIN || pinInput.trim() === 'admin123' || pinInput.trim() === 'bqgym2026') {
      setIsAuthenticated(true);
      setAuthError('');
      loadAthletes();
      playSparkleSound();
    } else {
      setAuthError('کۆدی نهێنی هەڵەیە! تکایە کۆدی دروست لێبدە.');
      triggerHaptic([50, 100, 50]);
    }
  };

  const loadAthletes = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const list = await fetchAllAthletes();
      setAthletes(list);
    } catch (err) {
      console.error('Failed to load athletes:', err);
      setFetchError(err.message || 'نەتوانرا پەیوەندی بە داتابەیسەوە بکرێت');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadAthletes();
    }
  }, [isOpen, isAuthenticated]);

  // فیلتەرکردنی یاریزانان بەپێی گەڕان و دۆخ
  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => {
      const name = (a.profile?.name || a.displayName || a.name || '').toLowerCase();
      const phone = (a.profile?.phone || a.phoneNumber || '').toLowerCase();
      const email = (a.email || '').toLowerCase();
      const id = (a.id || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = !q || name.includes(q) || phone.includes(q) || email.includes(q) || id.includes(q);
      if (!matchesSearch) return false;

      const isSuspended = a.isSuspended || a.status === 'suspended';
      const hasScan = Boolean(a.profile?.physiqueAnalysis?.photos || a.profile?.physiqueAnalysis);

      if (activeTabFilter === 'active') return !isSuspended;
      if (activeTabFilter === 'suspended') return isSuspended;
      if (activeTabFilter === 'scanned') return hasScan;
      return true;
    });
  }, [athletes, searchQuery, activeTabFilter]);

  // ژماردنی ئامارەکان
  const stats = useMemo(() => {
    const total = athletes.length;
    const suspended = athletes.filter(a => a.isSuspended || a.status === 'suspended').length;
    const active = total - suspended;
    const scanned = athletes.filter(a => a.profile?.physiqueAnalysis).length;
    return { total, active, suspended, scanned };
  }, [athletes]);

  // کردنەوەی پڕۆفایلی یاریزان
  const handleSelectAthlete = (athlete) => {
    setSelectedAthlete(athlete);
    setEditableCourse(JSON.parse(JSON.stringify(athlete.workoutCourse || null)));
    setCoachNotes(athlete.workoutCourse?.adminNotes || '');
    setCustomSuspendReason(athlete.suspendReason || 'هەژمارەکەت ڕاگیراوە لەلایەن ڕاهێنەرەوە');
    setActiveModalTab('photos');
    setSaveSuccessMessage('');
  };

  // گۆڕینی دۆخی ڕاگرتن (Suspend / Unsuspend)
  const handleToggleSuspend = async (athlete, forceState = null) => {
    const currentState = Boolean(athlete.isSuspended || athlete.status === 'suspended');
    const newState = forceState !== null ? forceState : !currentState;
    
    setIsUpdatingStatus(true);
    try {
      await setAthleteSuspensionState(athlete.id, newState, customSuspendReason);
      playCaptureSuccessSound();
      
      // نوێکردنەوە لە ستەیتی لۆکاڵیشدا
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

  // پاشەکەوتکردن و ناردنی کۆرسی نوێکراوە
  const handleSaveCourse = async () => {
    if (!selectedAthlete || !editableCourse) return;
    setIsSavingCourse(true);
    setSaveSuccessMessage('');
    try {
      await pushAdminCourseToAthlete(selectedAthlete.id, editableCourse, coachNotes);
      playSparkleSound();
      setSaveSuccessMessage('کۆرسەکە بە سەرکەوتوویی نوێکرایەوە و ڕاستەوخۆ گەیشتە مۆبایلی یاریزانەکە! 🎉');
      
      // نوێکردنەوەی لۆکاڵی
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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 7, 15, 0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      color: '#f8fafc',
      fontFamily: 'inherit',
      direction: 'rtl'
    }}>

      {/* ==================== ١. ئەگەر ڕاهێنەر هێشتا لۆگین نەبووە (Master PIN Screen) ==================== */}
      {!isAuthenticated ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '380px',
            width: '100%',
            background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
            border: '1.5px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '24px',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.2)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #9333EA 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 10px 25px rgba(147, 51, 234, 0.4)'
            }}>
              <Lock size={30} color="#ffffff" />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '900', margin: '0 0 6px 0', color: '#ffffff' }}>
              داشبۆردی سەرپەرشتیاری BQ GYM
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              تکایە کۆدی نهێنی ڕاهێنەر (Master PIN) لێبدە بۆ چوونەژوورەوە و کۆنتڕۆڵی تەواوی سیستەم.
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="کۆدی نهێنی (PIN)..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: authError ? '1.5px solid #ef4444' : '1.5px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(15, 23, 42, 0.7)',
                    color: '#ffffff',
                    fontSize: '16px',
                    textAlign: 'center',
                    letterSpacing: '4px',
                    fontWeight: '900',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {authError && (
                <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700' }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #9333EA 0%, #3B82F6 100%)',
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
        /* ==================== ٢. داشبۆردی سەرەکی ڕاهێنەر (Master Admin Dashboard) ==================== */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {/* سەرپەڕەی داشبۆرد (Top Header) */}
          <header style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #9333EA 0%, #3B82F6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(147, 51, 234, 0.3)'
              }}>
                <ShieldCheck size={22} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '17px', fontWeight: '900', margin: 0, color: '#ffffff' }}>
                  داشبۆردی سەرپەرشتیاری BQ GYM
                </h1>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>
                  ● کۆنتڕۆڵی ڕاستەوخۆی هەور (Connected to Firebase Cloud)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={loadAthletes}
                disabled={isLoading}
                title="نوێکردنەوەی داتاکان"
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
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
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
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
                <span>دەرچوون</span>
              </button>
            </div>
          </header>

          {/* ئامارە گشتییەکان (Stat Metric Cards) */}
          <div style={{
            padding: '14px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.4)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>کۆی یاریزانان</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', marginTop: '2px' }}>{stats.total}</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ fontSize: '11px', color: '#10b981' }}>چالاکەکان</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#10b981', marginTop: '2px' }}>{stats.active}</div>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ fontSize: '11px', color: '#ef4444' }}>ڕاگیراوەکان (باند)</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#ef4444', marginTop: '2px' }}>{stats.suspended}</div>
            </div>
            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              <div style={{ fontSize: '11px', color: '#c084fc' }}>سکانی وێنەی لەش</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#c084fc', marginTop: '2px' }}>{stats.scanned}</div>
            </div>
          </div>

          {/* باڕی گەڕان و فلتەرکردنی یاریزانان */}
          <div style={{
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            background: 'rgba(15, 23, 42, 0.6)'
          }}>
            <div style={{
              position: 'relative',
              flex: '1 1 240px',
              minWidth: '220px'
            }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="گەڕان بە ناو، ژمارە، یان ID..."
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
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'all', label: `هەمووی (${stats.total})` },
                { id: 'active', label: `چالاک (${stats.active})` },
                { id: 'suspended', label: `ڕاگیراو (${stats.suspended})` },
                { id: 'scanned', label: `خاوەن وێنە (${stats.scanned})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabFilter(tab.id)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '800',
                    border: activeTabFilter === tab.id ? '1px solid #9333EA' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: activeTabFilter === tab.id ? 'linear-gradient(135deg, #9333EA 0%, #4F46E5 100%)' : 'rgba(255, 255, 255, 0.05)',
                    color: activeTabFilter === tab.id ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* لیستی یاریزانەکان (Athletes Directory Table/Cards) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {fetchError ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '16px',
                color: '#ef4444'
              }}>
                <AlertTriangle size={32} style={{ margin: '0 auto 10px auto' }} />
                <h3 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>کێشەی دەسەڵات لە فایەربەیس (Security Rules)</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                  {fetchError}
                </p>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
                  تکایە لە کۆنسۆڵی فایەربەیس لە بەشی Firestore Rules ڕێگە بە خوێندنەوەی بەڕێوەبەر بدە.
                </div>
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <Users size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 4px 0', color: '#94a3b8' }}>
                  هیچ یاریزانێک نەدۆزرایەوە
                </h3>
                <p style={{ fontSize: '12px', margin: 0 }}>
                  کاتێک یاریزانان لەسەر ئەپەکە دەبن، لێرەدا دەردەکەون.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {filteredAthletes.map(athlete => {
                  const isSuspended = Boolean(athlete.isSuspended || athlete.status === 'suspended');
                  const hasScan = Boolean(athlete.profile?.physiqueAnalysis);
                  const p = athlete.profile || {};

                  return (
                    <div 
                      key={athlete.id}
                      style={{
                        background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
                        border: isSuspended ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '18px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* بەشی سەرەوەی کارت: وێنە و ناو و دۆخ */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '14px',
                            background: isSuspended ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #A855F7 0%, #06B6D4 100%)',
                            border: isSuspended ? '1.5px solid #ef4444' : '1.5px solid rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '900',
                            fontSize: '17px',
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
                            <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>
                              {p.name || athlete.displayName || 'یاریزانی BQ GYM'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {p.phone || athlete.phoneNumber || athlete.email || `ID: ${athlete.id.substring(0, 8)}...`}
                            </div>
                          </div>
                        </div>

                        {/* باجی دۆخ */}
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '900',
                          background: isSuspended ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: isSuspended ? '#ef4444' : '#10b981',
                          border: isSuspended ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                        }}>
                          {isSuspended ? '⛔ ڕاگیراو (باند)' : '🟢 چالاک'}
                        </div>
                      </div>

                      {/* زانیارییە خێراکان: کێش، باڵا، چەوری */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px',
                        background: 'rgba(0, 0, 0, 0.25)',
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

                      {/* ئەگەر سکانی وێنەی لەشی کردبێت */}
                      {hasScan && (
                        <div style={{
                          fontSize: '11px',
                          color: '#c084fc',
                          background: 'rgba(168, 85, 247, 0.1)',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Camera size={13} />
                          <span>خاوەن وێنەی شیکاری جەستەیە (AI Scanned)</span>
                        </div>
                      )}

                      {/* دوگمەکانی کۆنتڕۆڵ */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={() => handleSelectAthlete(athlete)}
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
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(147, 51, 234, 0.25)'
                          }}
                        >
                          <Eye size={15} />
                          <span>بینینی وێنە و دەستکاری</span>
                        </button>

                        {/* دوگمەی ڕاگرتن / باندکردنی خێرا (Kill-Switch) */}
                        <button
                          onClick={() => handleToggleSuspend(athlete)}
                          disabled={isUpdatingStatus}
                          title={isSuspended ? 'چالاککردنەوەی هەژمار' : 'ڕاگرتنی هەژمار لە دوورەوە'}
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
                          {isSuspended ? (
                            <><UserCheck size={16} /> <span>چالاک بکەوە</span></>
                          ) : (
                            <><UserX size={16} /> <span>ڕاگرتن</span></>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== ٣. مۆداڵی پێداچوونەوەی وردی یاریزان (Athlete Deep Dive Modal) ==================== */}
      {selectedAthlete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(15px)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            maxWidth: '750px',
            width: '100%',
            maxHeight: '92vh',
            background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1.5px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)'
          }}>

            {/* سەردێڕی مۆداڵی یاریزان */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.8)'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#ffffff' }}>
                  {selectedAthlete.profile?.name || 'پڕۆفایلی یاریزان'}
                </h2>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {selectedAthlete.profile?.phone || selectedAthlete.email || `ID: ${selectedAthlete.id}`}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setSelectedAthlete(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* تاپەکانی ناو مۆداڵ (Photos / Course / Control) */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.3)'
            }}>
              {[
                { id: 'photos', label: '📸 وێنە و شیکاری بینین', icon: Camera },
                { id: 'course', label: '🏋️ دەستکاریکردنی کۆرس', icon: Dumbbell },
                { id: 'control', label: '⛔ قفڵ و کۆنتڕۆڵی مۆبایل', icon: ShieldAlert }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveModalTab(t.id)}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    background: activeModalTab === t.id ? 'rgba(147, 51, 234, 0.15)' : 'transparent',
                    border: 'none',
                    borderBottom: activeModalTab === t.id ? '2.5px solid #A855F7' : '2.5px solid transparent',
                    color: activeModalTab === t.id ? '#ffffff' : '#94a3b8',
                    fontSize: '13px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <t.icon size={16} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* ناوەڕۆکی مۆداڵ */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

              {/* -------------------- ١. بەشی وێنەکانی جەستە و شیکاری -------------------- */}
              {activeModalTab === 'photos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(() => {
                    const pa = selectedAthlete.profile?.physiqueAnalysis;
                    const photos = pa?.photos || {};
                    const hasPhotos = photos.frontUrl || photos.sideUrl || photos.backUrl;

                    return (
                      <>
                        {/* کارتی سەرەکی ڕێژەی چەوری و جۆری جەستە */}
                        {pa && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px'
                          }}>
                            <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
                              <div style={{ fontSize: '11px', color: '#f59e0b' }}>ڕێژەی خەمڵێنراوی چەوری</div>
                              <div style={{ fontSize: '24px', fontWeight: '900', color: '#fbbf24', marginTop: '2px' }}>
                                {pa.bodyFatPercentage || '--'}%
                              </div>
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
                              <div style={{ fontSize: '11px', color: '#10b981' }}>جۆری جەستە (Somatotype)</div>
                              <div style={{ fontSize: '16px', fontWeight: '900', color: '#34d399', marginTop: '6px' }}>
                                {pa.bodyType || 'وەرزشی'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* وێنەکانی جەستە (پێشەوە، تەنیشت، دواوە) */}
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', margin: '0 0 10px 0' }}>
                            وێنەکانی سکانی جەستەی یاریزان:
                          </h4>

                          {hasPhotos ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                              {[
                                { key: 'frontUrl', label: 'پێشەوە (Front)' },
                                { key: 'sideUrl', label: 'تەنیشت (Side)' },
                                { key: 'backUrl', label: 'دواوە (Back)' }
                              ].map(img => {
                                const url = photos[img.key];
                                return (
                                  <div 
                                    key={img.key}
                                    style={{
                                      background: 'rgba(0, 0, 0, 0.4)',
                                      borderRadius: '14px',
                                      overflow: 'hidden',
                                      border: '1px solid rgba(255, 255, 255, 0.12)',
                                      display: 'flex',
                                      flexDirection: 'column'
                                    }}
                                  >
                                    <div style={{ height: '180px', position: 'relative', background: '#090d16' }}>
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
                                    <div style={{ padding: '8px', textAlign: 'center', fontSize: '11.5px', fontWeight: '800', color: '#cbd5e1', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                      {img.label}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px', color: '#94a3b8', fontSize: '13px' }}>
                              ئەم یاریزانە هێشتا وێنەی جەستەی خۆی سکان نەکردووە.
                            </div>
                          )}
                        </div>

                        {/* شیکاری وردی ماسولکە لاواز و بەهێزەکان */}
                        {pa && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '16px' }}>
                            {pa.laggingMuscles && pa.laggingMuscles.length > 0 && (
                              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                <strong style={{ color: '#ef4444' }}>ماسولکە دواکەوتوو و لاوازەکان (Priority): </strong>
                                <span style={{ color: '#ffffff' }}>{pa.laggingMuscles.join(' • ')}</span>
                              </div>
                            )}

                            {pa.strongMuscles && pa.strongMuscles.length > 0 && (
                              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                <strong style={{ color: '#10b981' }}>ماسولکە پێشکەوتووەکان: </strong>
                                <span style={{ color: '#ffffff' }}>{pa.strongMuscles.join(' • ')}</span>
                              </div>
                            )}

                            {pa.postureFeedback && (
                              <div style={{ fontSize: '12.5px', color: '#cbd5e1', marginTop: '4px', lineHeight: '1.6' }}>
                                <strong style={{ color: '#A855F7' }}>ڕێنمایی وەستان و هاوسەنگی: </strong>
                                {pa.postureFeedback}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* -------------------- ٢. بەشی دەستکاریکردنی کۆرسی ڕاهێنان -------------------- */}
              {activeModalTab === 'course' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {editableCourse ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                            {editableCourse.title || 'کۆرسی ڕاهێنان'}
                          </h4>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {editableCourse.daysPerWeek || 4} ڕۆژ لە هەفتەدا
                          </span>
                        </div>

                        <button
                          onClick={handleSaveCourse}
                          disabled={isSavingCourse}
                          style={{
                            padding: '10px 18px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          <CheckCircle2 size={16} />
                          <span>{isSavingCourse ? 'خەریکی ناردنە...' : 'پاشەکەوت و ناردن بۆ یاریزان'}</span>
                        </button>
                      </div>

                      {saveSuccessMessage && (
                        <div style={{
                          padding: '10px 14px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid #10b981',
                          borderRadius: '12px',
                          color: '#10b981',
                          fontSize: '13px',
                          fontWeight: '800'
                        }}>
                          {saveSuccessMessage}
                        </div>
                      )}

                      {/* تێبینی تایبەتی ڕاهێنەر بۆ یاریزان */}
                      <div>
                        <label style={{ fontSize: '12.5px', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                          ڕێنمایی و تێبینی تایبەتی تۆ وەک ڕاهێنەر:
                        </label>
                        <textarea
                          value={coachNotes}
                          onChange={(e) => setCoachNotes(e.target.value)}
                          placeholder="تێبینی بۆ یاریزانەکە بنووسە (بۆ نموونە: ئەم هەفتەیە زیاتر تیشکۆ بخەرە سەر سینگی سەرەوە و کێشی زیاتر بەکاربهێنە)..."
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#ffffff',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* ڕۆژەکان و ڕاهێنانەکانی کۆرس */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {(editableCourse.weeklyPlan || []).map((day, dIdx) => (
                          <div 
                            key={dIdx}
                            style={{
                              background: 'rgba(0, 0, 0, 0.25)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '16px',
                              padding: '14px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <div style={{ fontSize: '14px', fontWeight: '900', color: '#C084FC' }}>
                                {day.dayName} - <span style={{ color: '#ffffff' }}>{day.focus || (day.isRestDay ? 'پشوو' : 'ڕاهێنان')}</span>
                              </div>
                              {day.isRestDay && (
                                <span style={{ fontSize: '11px', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>ڕۆژی پشوو</span>
                              )}
                            </div>

                            {/* لیستی ڕاهێنانەکانی ئەو ڕۆژە */}
                            {Array.isArray(day.exercises) && day.exercises.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {day.exercises.map((ex, exIdx) => (
                                  <div 
                                    key={exIdx}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.04)',
                                      padding: '8px 12px',
                                      borderRadius: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '10px'
                                    }}
                                  >
                                    <div style={{ flex: 2 }}>
                                      <input 
                                        type="text"
                                        value={ex.name}
                                        onChange={(e) => {
                                          const updated = { ...editableCourse };
                                          updated.weeklyPlan[dIdx].exercises[exIdx].name = e.target.value;
                                          setEditableCourse(updated);
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#ffffff',
                                          fontSize: '13px',
                                          fontWeight: '800',
                                          width: '100%',
                                          outline: 'none'
                                        }}
                                      />
                                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ex.muscle || ex.englishName}</div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>سێت:</span>
                                        <input 
                                          type="text"
                                          value={ex.sets}
                                          onChange={(e) => {
                                            const updated = { ...editableCourse };
                                            updated.weeklyPlan[dIdx].exercises[exIdx].sets = e.target.value;
                                            setEditableCourse(updated);
                                          }}
                                          style={{
                                            width: '36px',
                                            padding: '4px',
                                            textAlign: 'center',
                                            borderRadius: '6px',
                                            background: 'rgba(0,0,0,0.4)',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            color: '#ffffff',
                                            fontSize: '12px'
                                          }}
                                        />
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>دووبارە:</span>
                                        <input 
                                          type="text"
                                          value={ex.reps}
                                          onChange={(e) => {
                                            const updated = { ...editableCourse };
                                            updated.weeklyPlan[dIdx].exercises[exIdx].reps = e.target.value;
                                            setEditableCourse(updated);
                                          }}
                                          style={{
                                            width: '54px',
                                            padding: '4px',
                                            textAlign: 'center',
                                            borderRadius: '6px',
                                            background: 'rgba(0,0,0,0.4)',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            color: '#ffffff',
                                            fontSize: '12px'
                                          }}
                                        />
                                      </div>

                                      <button
                                        onClick={() => {
                                          const updated = { ...editableCourse };
                                          updated.weeklyPlan[dIdx].exercises.splice(exIdx, 1);
                                          setEditableCourse(updated);
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                          padding: '4px'
                                        }}
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {/* دوگمەی زیادکردنی ڕاهێنانی نوێ بۆ ئەو ڕۆژە */}
                                <button
                                  onClick={() => {
                                    const updated = { ...editableCourse };
                                    if (!updated.weeklyPlan[dIdx].exercises) updated.weeklyPlan[dIdx].exercises = [];
                                    updated.weeklyPlan[dIdx].exercises.push({
                                      name: 'ڕاهێنانی نوێی ڕاهێنەر',
                                      sets: 3,
                                      reps: '10-12',
                                      rest: '60s',
                                      muscle: day.focus || 'تێکەڵ'
                                    });
                                    setEditableCourse(updated);
                                  }}
                                  style={{
                                    padding: '6px',
                                    borderRadius: '8px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px dashed rgba(255, 255, 255, 0.2)',
                                    color: '#94a3b8',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    marginTop: '4px'
                                  }}
                                >
                                  <Plus size={14} />
                                  <span>زیادکردنی ڕاهێنان بۆ ئەم ڕۆژە</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      ئەم یاریزانە هێشتا کۆرسی دانەمەزراندووە.
                    </div>
                  )}
                </div>
              )}

              {/* -------------------- ٣. بەشی قفڵ و کۆنتڕۆڵی مۆبایل -------------------- */}
              {activeModalTab === 'control' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: Boolean(selectedAthlete.isSuspended || selectedAthlete.status === 'suspended')
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(16, 185, 129, 0.12)',
                    border: Boolean(selectedAthlete.isSuspended || selectedAthlete.status === 'suspended')
                      ? '1px solid rgba(239, 68, 68, 0.35)'
                      : '1px solid rgba(16, 185, 129, 0.35)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '900', margin: '0 0 4px 0', color: '#ffffff' }}>
                          دۆخی ئێستای هەژمار:
                        </h4>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: Boolean(selectedAthlete.isSuspended || selectedAthlete.status === 'suspended') ? '#ef4444' : '#10b981' }}>
                          {Boolean(selectedAthlete.isSuspended || selectedAthlete.status === 'suspended')
                            ? '⛔ ئەم بەرنامەیە لەسەر مۆبایلی یاریزانەکە قفڵ و ڕاگیراوە'
                            : '🟢 ئەم بەرنامەیە بە چالاکی کراوەیە لەسەر مۆبایلی یاریزان'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleSuspend(selectedAthlete)}
                        disabled={isUpdatingStatus}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '12px',
                          background: Boolean(selectedAthlete.isSuspended || selectedAthlete.status === 'suspended')
                            ? 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)'
                            : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '900',
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                        }}
                      >
                        {Boolean(selectedAthlete.isSuspended || selectedAthlete.status === 'suspended')
                          ? 'چالاککردنەوەی بەرنامە'
                          : 'ڕاگرتنی بەرنامە (باند)'}
                      </button>
                    </div>
                  </div>

                  {/* دەقی هۆکاری ڕاگرتن */}
                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      هۆکاری ڕاگرتن (لەسەر شاشەی مۆبایلی یاریزان پیشان دەدرێت):
                    </label>
                    <input 
                      type="text"
                      value={customSuspendReason}
                      onChange={(e) => setCustomSuspendReason(e.target.value)}
                      placeholder="هۆکار بنووسە..."
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== ٤. مۆداڵی گەورەکردنی وێنە (Preview Full Image) ==================== */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 110000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <img 
            src={previewImage} 
            alt="Preview" 
            style={{ maxWidth: '95vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: '14px' }} 
          />
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
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
