'use client';
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Minimize2,
  Maximize2,
  ExternalLink,
  Clipboard,
  Search,
  Trash2,
  Heart,
  Headphones,
  Info,
  Plus
} from 'lucide-react';

// پریسێتە سەلمێندراو و بەردەستەکانی یوتیوب (بێ کۆپیڕایت و قەدەغەکردنی Embed)
const PRESET_YOUTUBE_TRACKS = [
  {
    id: 'preset_ncs_2025',
    videoId: 'BtZYzytgLNw',
    title: 'Ultimate Workout Music Mix 2025 (NCS)',
    subtitle: 'Gym Motivation • EDM & Trap',
    category: 'gym'
  },
  {
    id: 'preset_ncs_69',
    videoId: 'Adw4zZENLiQ',
    title: 'Best NCS Workout Music Mix #69',
    subtitle: 'Heavy Lifting & High Energy',
    category: 'gym'
  },
  {
    id: 'preset_ncs_beats',
    videoId: 'rUP6Ugfvl2Q',
    title: 'Best Training & Cardio Beats (NCS)',
    subtitle: 'Cardio & Endurance Rhythm',
    category: 'cardio'
  },
  {
    id: 'preset_lofi_focus',
    videoId: 'rFZHOHl-L8A',
    title: 'Lofi Girl — Beats to Relax / Focus',
    subtitle: 'Recovery & Stretching Radio',
    category: 'focus'
  }
];

const SAVED_STORAGE_KEY = 'app_yt_saved_v1';
const LAST_TRACK_STORAGE_KEY = 'app_yt_last_v1';

/**
 * شیکارکردنی هەموو شێوازەکانی لینکی یوتیوب یان ناسنامەی ڤیدیۆ/پلەیلیست
 */
export function parseYouTubeInput(rawInput) {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) return null;

  // ناسنامەی ڤیدیۆی ڕاستەوخۆ (١١ پیت/ژمارە)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { type: 'video', videoId: trimmed, listId: null };
  }

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate) && /(youtube\.com|youtu\.be)/i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    const isYouTube =
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('youtube-nocookie.com');

    if (isYouTube) {
      const listId = url.searchParams.get('list');
      let videoId = url.searchParams.get('v');

      if (!videoId && host.includes('youtu.be')) {
        videoId = url.pathname.replace(/^\//, '').split('/')[0];
      }
      if (!videoId) {
        const pathMatch = url.pathname.match(/\/(?:shorts|embed|live|v)\/([a-zA-Z0-9_-]{11})/);
        if (pathMatch) videoId = pathMatch[1];
      }

      if (videoId && /^[a-zA-Z0-9_-]{11}/.test(videoId)) {
        return { type: 'video', videoId: videoId.slice(0, 11), listId: listId || null };
      }
      if (listId) {
        return { type: 'playlist', videoId: null, listId };
      }
    }
  } catch {
    // لینک نییە — وەک گەڕان مامەڵەی لەگەڵ دەکرێت
  }

  return { type: 'search', query: trimmed };
}

function getTrackWatchUrl(track) {
  if (!track) return 'https://www.youtube.com';
  if (track.videoId && track.listId) {
    return `https://www.youtube.com/watch?v=${track.videoId}&list=${encodeURIComponent(track.listId)}`;
  }
  if (track.videoId) {
    return `https://www.youtube.com/watch?v=${track.videoId}`;
  }
  if (track.listId) {
    return `https://www.youtube.com/playlist?list=${encodeURIComponent(track.listId)}`;
  }
  return 'https://www.youtube.com';
}

function getTrackThumb(track) {
  if (track?.videoId) {
    return `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
  }
  return null;
}

function getYouTubeEmbedUrl(track, useNoCookie = false) {
  if (!track) return '';
  const host = useNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    enablejsapi: '1'
  });

  if (typeof window !== 'undefined') {
    const origin = window.location?.origin || '';
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
      params.set('origin', origin);
    }
  }

  if (track.videoId) {
    if (track.listId) {
      params.set('listType', 'playlist');
      params.set('list', track.listId);
    }
    return `${host}/embed/${track.videoId}?${params.toString()}`;
  }

  if (track.listId) {
    params.set('listType', 'playlist');
    params.set('list', track.listId);
    return `${host}/embed/videoseries?${params.toString()}`;
  }

  return '';
}

function ensureYouTubeIframeApi() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    if (window.YT && typeof window.YT.Player === 'function') {
      resolve(window.YT);
      return;
    }

    if (!Array.isArray(window.__bqYtApiCallbacks)) {
      window.__bqYtApiCallbacks = [];
    }
    window.__bqYtApiCallbacks.push(resolve);

    const prevReady = window.onYouTubeIframeAPIReady;
    if (!window.__bqYtApiHooked) {
      window.__bqYtApiHooked = true;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === 'function') {
          try { prevReady(); } catch {}
        }
        const cbs = window.__bqYtApiCallbacks || [];
        window.__bqYtApiCallbacks = [];
        cbs.forEach(cb => {
          try { cb(window.YT || null); } catch {}
        });
      };
    }

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }

    setTimeout(() => {
      if (window.YT && typeof window.YT.Player === 'function') {
        resolve(window.YT);
      } else {
        resolve(null);
      }
    }, 5500);
  });
}

/**
 * پەخشکەری بەردەوامی یوتیوب و مینی پلەیەری سەر شاشە بۆ BQ GYM
 */
export default function YouTubeMediaPlayer({
  isExpanded,
  onExpand,
  onMinimize,
  onCloseAll,
  currentLangConfig
}) {
  const lang = currentLangConfig?.code || 'ku';
  const isRtl = currentLangConfig?.dir === 'rtl';

  const [savedTracks, setSavedTracks] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(SAVED_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
    return [];
  });

  const [activeTrack, setActiveTrack] = useState(null);

  const [urlInput, setUrlInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [embedErrorCode, setEmbedErrorCode] = useState(null);
  const [useNoCookie, setUseNoCookie] = useState(false);
  const [fallbackRawIframe, setFallbackRawIframe] = useState(false);
  const [showBgTip, setShowBgTip] = useState(false);

  const ytHostRef = useRef(null);
  const playerRef = useRef(null);
  const retriedNoCookieRef = useRef(false);

  const copy = useMemo(() => {
    if (lang === 'en') {
      return {
        title: 'YouTube Gym Player',
        subtitle: 'Video & workout music across all tabs',
        placeholder: 'Paste YouTube link or search workout music...',
        pasteBtn: 'Paste',
        playUrlBtn: 'Play',
        searchBtn: 'Search on YouTube',
        presetsTitle: 'Workout & Focus Mixes',
        savedTitle: 'Your Saved Links',
        emptyHint: 'Choose a workout mix below or paste any YouTube link to start playing.',
        playingNow: 'Playing inside BQ GYM',
        pausedNow: 'Paused',
        bgInfoTitle: 'iPhone Background & PiP Tip',
        bgInfoBody:
          'iOS Background Audio mode is enabled in this build. If YouTube pauses when you exit the app or lock your iPhone, tap Fullscreen → Picture-in-Picture (PiP) or press Play in iPhone Control Center / Lock Screen.',
        embedBlockedTitle: 'This video blocked in-app playback',
        embedBlockedDesc: 'The uploader restricted embedding for this video (Error %s). You can open it directly in YouTube.',
        openInYt: 'Open in YouTube',
        searchOpenedHint: 'YouTube search opened — copy any video link and paste it above.',
        savedToast: 'Added to your playlist!',
        invalidPaste: 'Clipboard is empty or cannot be read automatically — paste manually.'
      };
    }
    if (lang === 'ar') {
      return {
        title: 'مشغّل يوتيوب للتمارين',
        subtitle: 'فيديو وموسيقى مستمرة أثناء استخدام التطبيق',
        placeholder: 'الصق رابط يوتيوب أو ابحث عن موسيقى تمارين...',
        pasteBtn: 'لصق',
        playUrlBtn: 'تشغيل',
        searchBtn: 'بحث في يوتيوب',
        presetsTitle: 'ميكسات الجيم والتركيز',
        savedTitle: 'روابطك المحفوظة',
        emptyHint: 'اختر ميكس تمارين أدناه أو الصق أي رابط يوتيوب للتشغيل.',
        playingNow: 'يعمل داخل BQ GYM',
        pausedNow: 'متوقف مؤقتاً',
        bgInfoTitle: 'ملاحظة التشغيل في الخلفية على الآيفون',
        bgInfoBody:
          'تم تفعيل وضع الصوت في الخلفية لنظام iOS. قد يوقف يوتيوب الصوت تلقائياً عند الخروج من التطبيق؛ لتفادي ذلك استخدم ملء الشاشة ← صورة داخل صورة (PiP) أو اضغط تشغيل من مركز التحكم / شاشة القفل.',
        embedBlockedTitle: 'هذا الفيديو يمنع التشغيل المضمّن',
        embedBlockedDesc: 'قيّد صاحب الفيديو التشغيل داخل التطبيقات (خطأ %s). يمكنك فتحه في يوتيوب مباشرة.',
        openInYt: 'فتح في يوتيوب',
        searchOpenedHint: 'تم فتح بحث يوتيوب — انسخ رابط أي فيديو والصقه هنا.',
        savedToast: 'تمت الإضافة إلى قائمتك!',
        invalidPaste: 'الحافظة فارغة — الصق الرابط يدوياً في الخانة.'
      };
    }
    if (lang === 'fa') {
      return {
        title: 'پخش‌کننده یوتیوب تمرین',
        subtitle: 'پخش مداوم موزیک و ویدیو در همه بخش‌ها',
        placeholder: 'لینک یوتیوب را بچسبانید یا جستجو کنید...',
        pasteBtn: 'چسباندن',
        playUrlBtn: 'پخش',
        searchBtn: 'جستجو در یوتیوب',
        presetsTitle: 'میکس‌های باشگاه و تمرکز',
        savedTitle: 'لیست ذخیره‌شده شما',
        emptyHint: 'یکی از میکس‌های زیر را انتخاب کنید یا لینک یوتیوب وارد کنید.',
        playingNow: 'در حال پخش در BQ GYM',
        pausedNow: 'متوقف شده',
        bgInfoTitle: 'نکته پخش پس‌زمینه در آیفون',
        bgInfoBody:
          'حالت صدای پس‌زمینه iOS فعال شده است. اگر یوتیوب هنگام خروج یا قفل صفحه متوقف شد، تمام‌صفحه ← تصویر در تصویر (PiP) را بزنید یا از Control Center دکمه Play را لمس کنید.',
        embedBlockedTitle: 'این ویدیو پخش درون‌برنامه‌ای را بسته است',
        embedBlockedDesc: 'صاحب ویدیو امکان Embed را غیرفعال کرده است (کد %s). می‌توانید مستقیم در یوتیوب باز کنید.',
        openInYt: 'باز کردن در یوتیوب',
        searchOpenedHint: 'جستجوی یوتیوب باز شد — لینک ویدیو را کپی و اینجا وارد کنید.',
        savedToast: 'به لیست شما اضافه شد!',
        invalidPaste: 'کلیپ‌بورد خالی است — لینک را دستی وارد کنید.'
      };
    }
    return {
      title: 'پەخشکەری یوتیوب',
      subtitle: 'مۆسیقا و ڤیدیۆی بەردەوام لە کاتی ڕاهێناندا',
      placeholder: 'لینکی یوتیوب لێرە دابنێ یان بگەڕێ...',
      pasteBtn: 'پیست',
      playUrlBtn: 'پەخشکردن',
      searchBtn: 'گەڕان لە یوتیوب',
      presetsTitle: 'میکسی جیم و تەرکیز',
      savedTitle: 'لیستە پاشەکەوتکراوەکانت',
      emptyHint: 'یەکێک لە میکسەکانی خوارەوە هەڵبژێرە یان هەر لینکێکی یوتیوب لێرە دابنێ.',
      playingNow: 'کار دەکات لەناو BQ GYM',
      pausedNow: 'وەستاوە (Pause)',
      bgInfoTitle: 'تێبینی کارکردن لە باکگراوندی ئایفۆن',
      bgInfoBody:
        'مۆدی دەنگی باکگراوندی iOS چالاک کراوە. ئەگەر لە کاتی دەرچوون لە ئەپەکە یان قفڵکردنی شاشە یوتیوب دەنگەکەی وەستاند، ڤیدیۆکە بخەرە شاشەی بچووک (Picture-in-Picture) یان لە Lock Screen / Control Center دوگمەی Play دابگرە.',
      embedBlockedTitle: 'ئەم ڤیدیۆیە ڕێگە بە پەخشکردن لەناو ئەپ نادات',
      embedBlockedDesc: 'خاوەنی ڤیدیۆکە Embedـکردنی ڕاگرتووە (کۆدی %s). دەتوانیت ڕاستەوخۆ لە یوتیوب بیکەیتەوە.',
      openInYt: 'کردنەوە لە یوتیوب',
      searchOpenedHint: 'گەڕانی یوتیوب کرایەوە — لینکی هەر ڤیدیۆیەک کۆپی بکە و لێرە پیستی بکە.',
      savedToast: 'زیادکرا بۆ لیستەکەت!',
      invalidPaste: 'کلیپبۆرد بەتاڵە — لینکەکە بە دەست بنووسە یان پیستی بکە.'
    };
  }, [lang]);

  const allQueue = useMemo(() => {
    const merged = [...savedTracks];
    PRESET_YOUTUBE_TRACKS.forEach((p) => {
      if (!merged.some((item) => item.videoId && item.videoId === p.videoId)) {
        merged.push(p);
      }
    });
    return merged;
  }, [savedTracks]);

  // پاشەکەوتکردنی دوایین تراک و لیستەکان
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedTracks));
      }
    } catch {}
  }, [savedTracks]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (activeTrack) {
          localStorage.setItem(LAST_TRACK_STORAGE_KEY, JSON.stringify(activeTrack));
        } else {
          localStorage.removeItem(LAST_TRACK_STORAGE_KEY);
        }
      }
    } catch {}
  }, [activeTrack]);

  // نوێکردنەوەی MediaSession بۆ کۆنترۆڵکردن لە Lock Screen و Control Center
  const stepTrackRef = useRef(null);
  stepTrackRef.current = (delta) => {
    if (!allQueue.length) return;
    const idx = allQueue.findIndex((t) =>
      (activeTrack?.videoId && t.videoId === activeTrack.videoId) ||
      (activeTrack?.listId && t.listId === activeTrack.listId)
    );
    const baseIdx = idx >= 0 ? idx : 0;
    const nextIdx = (baseIdx + delta + allQueue.length) % allQueue.length;
    selectTrack(allQueue[nextIdx]);
  };

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !activeTrack) return;
    try {
      const thumb = getTrackThumb(activeTrack);
      if (typeof window !== 'undefined' && typeof window.MediaMetadata === 'function') {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: activeTrack.title || 'BQ GYM YouTube',
          artist: activeTrack.subtitle || 'BQ GYM',
          album: 'YouTube Player',
          artwork: thumb ? [{ src: thumb, sizes: '480x360', type: 'image/jpeg' }] : []
        });
      }
      navigator.mediaSession.setActionHandler('play', () => {
        try { playerRef.current?.playVideo?.(); } catch {}
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        try { playerRef.current?.pauseVideo?.(); } catch {}
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        stepTrackRef.current?.(-1);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        stepTrackRef.current?.(1);
      });
    } catch {}
  }, [activeTrack]);

  // دروستکردن و بەڕێوەبردنی YouTube IFrame Player API لەناو یەک DOM node بێ Reload لە کاتی Minimizing
  useEffect(() => {
    const hostEl = ytHostRef.current;
    if (!activeTrack || !hostEl) {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      if (hostEl) hostEl.innerHTML = '';
      setIsPlaying(false);
      return;
    }

    let cancelled = false;
    setEmbedErrorCode(null);
    setFallbackRawIframe(false);

    const mountPlayer = async () => {
      const YT = await ensureYouTubeIframeApi();
      if (cancelled || !ytHostRef.current) return;

      if (!YT || typeof YT.Player !== 'function') {
        setFallbackRawIframe(true);
        setIsPlaying(true);
        return;
      }

      try {
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      } catch {}

      ytHostRef.current.innerHTML = '';
      const targetDiv = document.createElement('div');
      targetDiv.style.width = '100%';
      targetDiv.style.height = '100%';
      ytHostRef.current.appendChild(targetDiv);

      const playerVars = {
        autoplay: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        fs: 1,
        enablejsapi: 1
      };

      const origin = typeof window !== 'undefined' ? (window.location?.origin || '') : '';
      if (origin.startsWith('http://') || origin.startsWith('https://')) {
        playerVars.origin = origin;
      }

      if (activeTrack.listId) {
        playerVars.listType = 'playlist';
        playerVars.list = activeTrack.listId;
      }

      const config = {
        width: '100%',
        height: '100%',
        host: useNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
        playerVars,
        events: {
          onReady: (ev) => {
            if (cancelled) return;
            try {
              const iframe = ev.target?.getIframe?.();
              if (iframe) {
                iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
                iframe.setAttribute('allowfullscreen', 'true');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
              }
              ev.target?.playVideo?.();
            } catch {}
          },
          onStateChange: (ev) => {
            if (cancelled) return;
            const state = ev?.data;
            if (state === 1) {
              setIsPlaying(true);
              setEmbedErrorCode(null);
            } else if (state === 2 || state === 0) {
              setIsPlaying(false);
            }
          },
          onError: (ev) => {
            if (cancelled) return;
            const code = ev?.data || 150;
            if (!retriedNoCookieRef.current && !useNoCookie) {
              retriedNoCookieRef.current = true;
              setUseNoCookie(true);
              return;
            }
            setIsPlaying(false);
            setEmbedErrorCode(code);
          }
        }
      };

      if (activeTrack.videoId) {
        config.videoId = activeTrack.videoId;
      }

      try {
        playerRef.current = new YT.Player(targetDiv, config);
      } catch {
        setFallbackRawIframe(true);
      }
    };

    mountPlayer();

    return () => {
      cancelled = true;
    };
  }, [activeTrack, useNoCookie]);

  // پاککردنەوە تەنها لە کاتی داخستنی تەواوی کۆمپۆنێنت
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, []);

  const showToast = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const selectTrack = (track) => {
    retriedNoCookieRef.current = false;
    setUseNoCookie(false);
    setEmbedErrorCode(null);
    setActiveTrack(track);
  };

  const handleTogglePlayPause = (e) => {
    if (e) e.stopPropagation();
    const player = playerRef.current;
    if (!player) return;
    try {
      const state = typeof player.getPlayerState === 'function' ? player.getPlayerState() : (isPlaying ? 1 : 2);
      if (state === 1) {
        player.pauseVideo?.();
        setIsPlaying(false);
      } else {
        player.playVideo?.();
        setIsPlaying(true);
      }
    } catch {}
  };

  const handleStepTrack = (delta) => {
    stepTrackRef.current?.(delta);
  };

  const handleSubmitInput = async (overrideRaw) => {
    const raw = typeof overrideRaw === 'string' ? overrideRaw : urlInput;
    const parsed = parseYouTubeInput(raw);
    if (!parsed) return;

    if (parsed.type === 'search') {
      const query = encodeURIComponent(parsed.query);
      window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
      showToast(copy.searchOpenedHint);
      return;
    }

    const newTrack = {
      id: `custom_${parsed.videoId || parsed.listId}_${Date.now()}`,
      videoId: parsed.videoId || null,
      listId: parsed.listId || null,
      title: parsed.videoId ? `YouTube Video (${parsed.videoId})` : `YouTube Playlist`,
      subtitle: parsed.listId ? 'Playlist Queue' : 'Custom Link'
    };

    selectTrack(newTrack);
    setUrlInput('');

    // هێنانی ناوی ڕاستەقینەی ڤیدیۆکە بە oEmbed ئەگەر بەردەست بێت
    try {
      const targetUrl = getTrackWatchUrl(newTrack);
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`);
      if (res.ok) {
        const info = await res.json();
        if (info?.title) {
          const enriched = {
            ...newTrack,
            title: info.title,
            subtitle: info.author_name || newTrack.subtitle
          };
          setActiveTrack(enriched);
          setSavedTracks((prev) => {
            const filtered = prev.filter((item) => !(item.videoId && item.videoId === enriched.videoId));
            return [enriched, ...filtered].slice(0, 15);
          });
          showToast(copy.savedToast);
          return;
        }
      }
    } catch {}

    setSavedTracks((prev) => {
      const filtered = prev.filter((item) => !(item.videoId && item.videoId === newTrack.videoId));
      return [newTrack, ...filtered].slice(0, 15);
    });
    showToast(copy.savedToast);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrlInput(text.trim());
          const parsed = parseYouTubeInput(text.trim());
          if (parsed && parsed.type !== 'search') {
            handleSubmitInput(text.trim());
          }
          return;
        }
      }
      showToast(copy.invalidPaste);
    } catch {
      showToast(copy.invalidPaste);
    }
  };

  const handleStopAndClose = (e) => {
    if (e) e.stopPropagation();
    try { playerRef.current?.stopVideo?.(); } catch {}
    setActiveTrack(null);
    setIsPlaying(false);
    setEmbedErrorCode(null);
    onCloseAll?.();
  };

  const handleToggleFavorite = (track) => {
    if (!track) return;
    setSavedTracks((prev) => {
      const exists = prev.some((t) =>
        (track.videoId && t.videoId === track.videoId) ||
        (track.listId && !track.videoId && t.listId === track.listId)
      );
      if (exists) {
        return prev.filter((t) =>
          !((track.videoId && t.videoId === track.videoId) ||
            (track.listId && !track.videoId && t.listId === track.listId))
        );
      }
      return [{ ...track, id: track.id || `fav_${Date.now()}` }, ...prev].slice(0, 15);
    });
  };

  const isCurrentSaved = Boolean(
    activeTrack &&
    savedTracks.some((t) =>
      (activeTrack.videoId && t.videoId === activeTrack.videoId) ||
      (activeTrack.listId && !activeTrack.videoId && t.listId === activeTrack.listId)
    )
  );

  // ئەگەر نە کراوەتەوە و نە هیچ تراکێک دیاریکراوە، هیچی نیشان مەدە
  if (!isExpanded && !activeTrack) {
    return null;
  }

  const parsedInputPreview = parseYouTubeInput(urlInput);
  const inputIsUrl = Boolean(parsedInputPreview && parsedInputPreview.type !== 'search');

  const outerStyle = isExpanded
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(env(safe-area-inset-top, 0px), 44px) 12px 16px 12px',
        background: 'rgba(0, 0, 0, 0.78)'
      }
    : {
        position: 'fixed',
        bottom: 'calc(98px + max(env(safe-area-inset-bottom, 0px), 30px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '456px',
        zIndex: 1950,
        pointerEvents: 'auto'
      };

  const cardStyle = isExpanded
    ? {
        width: '100%',
        maxWidth: '460px',
        maxHeight: 'calc(100dvh - max(env(safe-area-inset-top, 0px), 44px) - 24px)',
        overflowY: 'auto',
        padding: '16px',
        borderRadius: '24px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
        color: 'var(--text-main)',
        direction: isRtl ? 'rtl' : 'ltr',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }
    : {
        width: '100%',
        padding: '8px 10px',
        borderRadius: '18px',
        background: 'var(--card-bg)',
        border: '1.5px solid rgba(239, 68, 68, 0.45)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.42), 0 0 18px rgba(239, 68, 68, 0.16)',
        direction: isRtl ? 'rtl' : 'ltr'
      };

  const mediaRowStyle = isExpanded
    ? { width: '100%', flexShrink: 0 }
    : { display: 'flex', alignItems: 'center', gap: '10px', width: '100%' };

  const videoSlotStyle = isExpanded
    ? {
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        minHeight: '196px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#05050a',
        border: '1px solid var(--border-color)'
      }
    : {
        position: 'relative',
        width: '72px',
        height: '42px',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#05050a',
        flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.12)',
        cursor: 'pointer'
      };

  const rawEmbedSrc = activeTrack && fallbackRawIframe ? getYouTubeEmbedUrl(activeTrack, useNoCookie) : '';

  return (
    <div
      style={outerStyle}
      onClick={
        isExpanded
          ? (e) => {
              if (e.target === e.currentTarget) {
                if (activeTrack) onMinimize?.();
                else onCloseAll?.();
              }
            }
          : undefined
      }
    >
      <div style={cardStyle}>
        {/* سەردێڕ تەنها لە دۆخی فراواندا */}
        {isExpanded && (
          <div key="yt-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #FF0000 0%, #DC2626 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#ffffff">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: '900', color: 'var(--text-main)' }}>
                  {copy.title}
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {copy.subtitle}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {activeTrack && (
                <button
                  type="button"
                  onClick={onMinimize}
                  className="liquid-pill"
                  style={{
                    width: '34px',
                    height: '34px',
                    padding: 0,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-main)'
                  }}
                  title="Minimize"
                >
                  <Minimize2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={activeTrack ? onMinimize : onCloseAll}
                className="liquid-pill"
                style={{
                  width: '34px',
                  height: '34px',
                  padding: 0,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-main)'
                }}
                title="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ڕیزە جێگیرەکەی ڤیدیۆ (هەرگیز Unmount نابێت لە کاتی بچووککردنەوە و گەورەکردنەوەدا) */}
        <div key="yt-media-row" style={mediaRowStyle}>
          <div key="yt-video-slot" style={videoSlotStyle} onClick={!isExpanded ? onExpand : undefined}>
            <div ref={ytHostRef} style={{ width: '100%', height: '100%', display: fallbackRawIframe ? 'none' : 'block' }} />

            {fallbackRawIframe && rawEmbedSrc && (
              <iframe
                src={rawEmbedSrc}
                title={activeTrack?.title || 'YouTube Video'}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              />
            )}

            {/* شاشەی بەتاڵ کاتێک هیچ ڤیدیۆیەک هەڵنەبژێردراوە */}
            {!activeTrack && isExpanded && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  textAlign: 'center',
                  background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.16), rgba(5, 5, 12, 0.96))'
                }}
              >
                <Headphones size={34} style={{ color: '#ef4444', marginBottom: '10px' }} />
                <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#e2e8f0', lineHeight: '1.6', maxWidth: '300px' }}>
                  {copy.emptyHint}
                </div>
              </div>
            )}

            {/* ئەگەر خاوەنی ڤیدیۆکە Embedـی بلۆک کردبوو */}
            {embedErrorCode && isExpanded && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  textAlign: 'center',
                  background: 'rgba(10, 12, 22, 0.94)',
                  gap: '8px'
                }}
              >
                <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#fca5a5' }}>{copy.embedBlockedTitle}</div>
                <div style={{ fontSize: '11.5px', color: '#cbd5e1', lineHeight: '1.5' }}>
                  {copy.embedBlockedDesc.replace('%s', String(embedErrorCode))}
                </div>
                <button
                  type="button"
                  onClick={() => window.open(getTrackWatchUrl(activeTrack), '_blank')}
                  style={{
                    marginTop: '4px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#ff0000',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ExternalLink size={14} />
                  <span>{copy.openInYt}</span>
                </button>
              </div>
            )}
          </div>

          {/* زانیاری و دوگمەکانی Mini-Bar تەنها کاتێک بچووک کراوەتەوە */}
          {!isExpanded && activeTrack && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div onClick={onExpand} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: '800',
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {activeTrack.title}
                </div>
                <div style={{ fontSize: '10.5px', color: isPlaying ? '#ef4444' : 'var(--text-muted)', fontWeight: '700' }}>
                  {isPlaying ? copy.playingNow : copy.pausedNow}
                </div>
              </div>

              <button
                type="button"
                onClick={handleTogglePlayPause}
                className="liquid-pill"
                style={{
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  borderRadius: '10px',
                  background: '#ff0000',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              </button>

              <button
                type="button"
                onClick={onExpand}
                className="liquid-pill"
                style={{
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  flexShrink: 0
                }}
                aria-label="Expand YouTube Player"
              >
                <Maximize2 size={14} />
              </button>

              <button
                type="button"
                onClick={handleStopAndClose}
                className="liquid-pill"
                style={{
                  width: '30px',
                  height: '30px',
                  padding: 0,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  flexShrink: 0
                }}
                aria-label="Stop and Close"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ناوەڕۆکی فراوان (کۆنترۆڵەکان، گەڕان/لینک، لیستی مۆسیقا) */}
        {isExpanded && (
          <div key="yt-expanded-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* دوگمەکانی کۆنترۆڵ کاتێک ڤیدیۆ هەیە */}
            {activeTrack && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '14px',
                  background: 'var(--card-subtle)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeTrack.title}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    {activeTrack.subtitle || 'YouTube'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleStepTrack(-1)}
                    className="liquid-pill"
                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}
                    title="Previous"
                  >
                    <SkipBack size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleTogglePlayPause}
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      borderRadius: '12px',
                      background: '#ff0000',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
                    }}
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepTrack(1)}
                    className="liquid-pill"
                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}
                    title="Next"
                  >
                    <SkipForward size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(activeTrack)}
                    className="liquid-pill"
                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isCurrentSaved ? '#ef4444' : 'var(--text-muted)' }}
                    title="Save"
                  >
                    <Heart size={15} fill={isCurrentSaved ? '#ef4444' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(getTrackWatchUrl(activeTrack), '_blank')}
                    className="liquid-pill"
                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}
                    title={copy.openInYt}
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* خانەی دانانی لینکی یوتیوب یان گەڕان */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitInput();
                }}
                placeholder={copy.placeholder}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  minWidth: 0
                }}
              />
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="liquid-pill"
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                  color: 'var(--text-main)'
                }}
                title={copy.pasteBtn}
              >
                <Clipboard size={14} />
                <span>{copy.pasteBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSubmitInput()}
                disabled={!urlInput.trim()}
                style={{
                  padding: '10px 13px',
                  borderRadius: '12px',
                  border: 'none',
                  background: urlInput.trim() ? 'linear-gradient(135deg, #FF0000 0%, #DC2626 100%)' : 'var(--card-subtle)',
                  color: urlInput.trim() ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: urlInput.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0
                }}
              >
                {inputIsUrl ? <Plus size={14} /> : <Search size={14} />}
                <span>{inputIsUrl ? copy.playUrlBtn : copy.searchBtn}</span>
              </button>
            </div>

            {statusMessage && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.14)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10B981',
                  fontSize: '11.5px',
                  fontWeight: '800'
                }}
              >
                {statusMessage}
              </div>
            )}

            {/* زانیاری دەربارەی کارکردنی باکگراوند لە ئایفۆن */}
            <div
              style={{
                borderRadius: '14px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                padding: '10px 12px'
              }}
            >
              <button
                type="button"
                onClick={() => setShowBgTip((prev) => !prev)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: '800'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={14} />
                  <span>{copy.bgInfoTitle}</span>
                </span>
                <span>{showBgTip ? '▲' : '▼'}</span>
              </button>
              {showBgTip && (
                <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  {copy.bgInfoBody}
                </p>
              )}
            </div>

            {/* لیستە پاشەکەوتکراوەکانی بەکارهێنەر */}
            {savedTracks.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {copy.savedTitle} ({savedTracks.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {savedTracks.map((item) => {
                    const isActiveItem =
                      (activeTrack?.videoId && item.videoId === activeTrack.videoId) ||
                      (activeTrack?.listId && !activeTrack.videoId && item.listId === activeTrack.listId);
                    const thumb = getTrackThumb(item);
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '14px',
                          background: isActiveItem ? 'rgba(239, 68, 68, 0.14)' : 'var(--card-subtle)',
                          border: isActiveItem ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid var(--border-color)'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => selectTrack(item)}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            textAlign: isRtl ? 'right' : 'left'
                          }}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={item.title}
                              style={{ width: '48px', height: '32px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: '48px', height: '32px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                              <Play size={14} />
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {item.subtitle || 'YouTube'}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSavedTracks((prev) => prev.filter((x) => x.id !== item.id))
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: '#ef4444',
                            flexShrink: 0
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* میکسە ئامادەکانی جیم و تەرکیز */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {copy.presetsTitle}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PRESET_YOUTUBE_TRACKS.map((preset) => {
                  const isActivePreset = activeTrack?.videoId === preset.videoId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectTrack(preset)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '14px',
                        background: isActivePreset ? 'rgba(239, 68, 68, 0.14)' : 'var(--card-subtle)',
                        border: isActivePreset ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: isRtl ? 'right' : 'left'
                      }}
                    >
                      <img
                        src={getTrackThumb(preset)}
                        alt={preset.title}
                        style={{ width: '56px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {preset.title}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {preset.subtitle}
                        </div>
                      </div>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isActivePreset ? '#ff0000' : 'var(--border-color)',
                          color: isActivePreset ? '#ffffff' : 'var(--text-main)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isActivePreset && isPlaying ? <Pause size={13} /> : <Play size={13} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
