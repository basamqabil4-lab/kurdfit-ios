'use client';
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, memo } from 'react';
import { Dumbbell, HeartPulse, Shield, Flame, Activity } from 'lucide-react';
import { getExerciseMediaUrl } from '../utils/exerciseMedia';

function renderAnatomicalPlaceholderIcon(muscle = '', exerciseName = '', iconSize = 24) {
  const hint = `${muscle} ${exerciseName}`.toLowerCase();
  if (hint.includes('سنگ') || hint.includes('chest') || hint.includes('pec') || hint.includes('bench') || hint.includes('fly')) {
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7c2.5-2 5.5-2.5 8-1.5 2.5-1 5.5-.5 8 1.5l-1.5 6.5c-2.2 1.2-4.5 1.5-6.5.5-2 1-4.3.7-6.5-.5L4 7z" />
        <line x1="12" y1="5.5" x2="12" y2="14" />
      </svg>
    );
  }
  if (hint.includes('پشت') || hint.includes('back') || hint.includes('lat') || hint.includes('row') || hint.includes('pulldown')) {
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 5l7 3 7-3-2 9-5 5-5-5-2-9z" />
        <line x1="12" y1="8" x2="12" y2="19" />
      </svg>
    );
  }
  if (hint.includes('قاچ') || hint.includes('ڕان') || hint.includes('سمت') || hint.includes('پوز') || hint.includes('leg') || hint.includes('squat') || hint.includes('quad') || hint.includes('ham') || hint.includes('glute') || hint.includes('calf')) {
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 4h3l1 8-1 8H8l-1-8 1-8z" />
        <path d="M13 4h3l1 8-1 8h-3l-1-8 1-8z" />
      </svg>
    );
  }
  if (hint.includes('شان') || hint.includes('shoulder') || hint.includes('delt')) {
    return <Shield size={iconSize} style={{ opacity: 0.85 }} />;
  }
  if (hint.includes('ورگ') || hint.includes('سک') || hint.includes('abs') || hint.includes('core') || hint.includes('plank') || hint.includes('crunch')) {
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="4" width="10" height="16" rx="3" />
        <line x1="12" y1="4" x2="12" y2="20" />
        <line x1="7" y1="9" x2="17" y2="9" />
        <line x1="7" y1="14" x2="17" y2="14" />
      </svg>
    );
  }
  if (hint.includes('کاردیۆ') || hint.includes('cardio') || hint.includes('bike') || hint.includes('walk') || hint.includes('run')) {
    return <HeartPulse size={iconSize} style={{ opacity: 0.85 }} />;
  }
  if (hint.includes('قۆڵ') || hint.includes('بایسێپس') || hint.includes('ترایسێپس') || hint.includes('bicep') || hint.includes('tricep') || hint.includes('curl')) {
    return <Activity size={iconSize} style={{ opacity: 0.85 }} />;
  }
  return <Flame size={iconSize} style={{ opacity: 0.8 }} />;
}

const ExerciseThumbnail = memo(function ExerciseThumbnail({
  exerciseId = '',
  exerciseName,
  muscle = '',
  onClick,
  size = 48,
  width = null,
  height = null,
  fit = 'cover',
  borderRadius = '12px',
  bg = null
}) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!exerciseId && !exerciseName) {
      setMediaUrl(null);
      setHasError(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    getExerciseMediaUrl(exerciseName, muscle, exerciseId)
      .then(url => {
        if (!isMounted) return;
        if (url) {
          setMediaUrl(url);
        } else {
          setMediaUrl(null);
          setHasError(true);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setMediaUrl(null);
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [exerciseId, exerciseName, muscle]);

  const finalWidth = width || `${size}px`;
  const finalHeight = height || `${size}px`;
  const numericHeight = height ? parseInt(height, 10) : (typeof size === 'number' ? size : 48);
  const isLarge = numericHeight >= 100 || (typeof size === 'number' && size >= 100) || width === '100%';
  const iconSize = Math.max(20, Math.min(48, Math.round(numericHeight * 0.26)));

  // کاتێک وێنەی ڕاهێنانەکە بە سەرکەوتوویی بار دەبێت پاشبنەمای سپی بەکاردێت بۆ جوان دەرکەوتنی جووڵەی GIF
  // بەڵام لە کاتی بارکردن یان نەبوونی وێنە، پاشبنەمای تۆخ و نەرم بەکاردێت تا بەتاڵ و سپی دەرنەکەوێت
  const containerBg = (mediaUrl && !hasError)
    ? (bg || (isLarge ? '#ffffff' : 'rgba(255, 255, 255, 0.05)'))
    : 'var(--card-subtle, rgba(255, 255, 255, 0.04))';

  return (
    <div
      onClick={onClick}
      style={{
        width: finalWidth,
        height: finalHeight,
        minWidth: width ? 'auto' : `${size}px`,
        borderRadius: borderRadius,
        background: containerBg,
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
        boxShadow: isLarge ? '0 4px 14px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.2)'
      }}
      title={exerciseName}
    >
      {isLoading ? (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'var(--card-subtle, rgba(255, 255, 255, 0.03))',
          color: 'var(--text-muted)'
        }}>
          <Dumbbell size={iconSize} style={{ opacity: 0.4 }} />
        </div>
      ) : mediaUrl && !hasError ? (
        <img
          src={mediaUrl}
          alt={exerciseName}
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: fit,
            display: 'block',
            padding: fit === 'contain' ? '4px' : '0'
          }}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          background: 'var(--card-subtle, rgba(255, 255, 255, 0.03))',
          color: 'var(--accent-primary, #6366f1)',
          padding: '8px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary, #38bdf8)' }}>
            {renderAnatomicalPlaceholderIcon(muscle, exerciseName, iconSize)}
          </div>
          {(isLarge || muscle) && (
            <span style={{
              fontSize: isLarge ? '11px' : '9px',
              color: 'var(--text-muted)',
              fontWeight: '700',
              textAlign: 'center',
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {muscle || exerciseName}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export default ExerciseThumbnail;
