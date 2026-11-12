'use client';
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, memo } from 'react';
import { Dumbbell } from 'lucide-react';
import { getExerciseMediaUrl } from '../utils/exerciseMedia';

const ExerciseThumbnail = memo(function ExerciseThumbnail({
  exerciseName,
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
    if (!exerciseName) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    getExerciseMediaUrl(exerciseName)
      .then(url => {
        if (!isMounted) return;
        if (url) {
          setMediaUrl(url);
        } else {
          setHasError(true);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [exerciseName]);

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
          <Dumbbell size={iconSize} style={{ opacity: 0.7 }} />
          {isLarge && exerciseName && (
            <span style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontWeight: '700',
              textAlign: 'center',
              maxWidth: '85%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {exerciseName}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export default ExerciseThumbnail;
