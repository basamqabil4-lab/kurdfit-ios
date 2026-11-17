'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  X, Sun, Moon, Navigation, Phone, Copy, Check, Clock, MapPin,
  Crosshair, Sparkles, ArrowLeft, ArrowRight, Route
} from 'lucide-react';
import {
  fetchCommercialLocations,
  subscribeToCommercialLocations,
  readLocalCommercialLocations
} from '../utils/cloudSync';
import {
  DEFAULT_MAP_CENTER,
  MAP_TILE_URLS,
  MAP_TILE_ATTRIBUTION,
  PARTNER_CATEGORIES,
  getCategoryMeta,
  getCategoryLabel,
  calculateDistanceKm,
  createPartnerPinHtml,
  createUserGpsPinHtml,
  formatOsrmStepInstruction
} from '../utils/mapHelpers';

export default function CommercialPartnerMap({
  onClose,
  appTheme = 'dark',
  language = 'ku',
  currentLangConfig = { code: 'ku', dir: 'rtl' }
}) {
  const isEn = currentLangConfig?.code === 'en' || language === 'en';
  const isRtl = currentLangConfig?.dir !== 'ltr';

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const leafletRef = useRef(null);
  const watchIdRef = useRef(null);
  const activeRouteStepsRef = useRef([]);

  const [mapTheme, setMapTheme] = useState(appTheme === 'light' ? 'light' : 'dark');
  const [locations, setLocations] = useState(() => readLocalCommercialLocations());
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'gym' | 'restaurant' | 'supplement'
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [gpsWarning, setGpsWarning] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState('');

  // دۆخی ڕێنیشاندەری ڕاستەوخۆ لە ناو ئەپدا (In-App Live Route HUD)
  const [navState, setNavState] = useState({
    active: false,
    loading: false,
    destination: null,
    remainingKm: null,
    etaMinutes: null,
    nextInstruction: '',
    isOfflineFallback: false
  });

  // هاوکاتکردنی دیمەنی نەخشە لەگەڵ گۆڕانی ثیمی سەرەکی ئەپ
  useEffect(() => {
    setMapTheme(appTheme === 'light' ? 'light' : 'dark');
  }, [appTheme]);

  // وەرگرتن و گوێگرتنی ڕاستەوخۆ لە شوێنە بازرگانییەکان (Firestore + Cache)
  useEffect(() => {
    let mounted = true;
    fetchCommercialLocations().then((list) => {
      if (mounted && Array.isArray(list)) setLocations(list);
    });
    const unsub = subscribeToCommercialLocations((liveList) => {
      if (mounted && Array.isArray(liveList)) setLocations(liveList);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // وەرگرتنی شوێنی سەرەتایی GPS
  const requestUserLocation = useCallback((flyToUser = false) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsWarning(isEn ? 'GPS unavailable on this device.' : 'GPS لەسەر ئەم ئامێرە کار ناکات.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(next);
        setGpsWarning('');
        if (flyToUser && mapRef.current) {
          mapRef.current.flyTo([next.lat, next.lng], 15, { duration: 0.7 });
        }
      },
      () => {
        setGpsWarning(isEn ? 'Enable GPS for live distance & routing' : 'بۆ بینینی دووری و ڕێنیشاندەر مۆڵەتی GPS بدە');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isEn]);

  useEffect(() => {
    requestUserLocation(false);
  }, [requestUserLocation]);

  // دامەزراندنی نەخشەی Leaflet
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import('leaflet')).default || (await import('leaflet'));
      if (cancelled || !containerRef.current) return;

      leafletRef.current = L;
      const initialCenter = userCoords || (locations[0] ? { lat: locations[0].lat, lng: locations[0].lng } : DEFAULT_MAP_CENTER);

      const map = L.map(containerRef.current, {
        center: [initialCenter.lat, initialCenter.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      const tiles = L.tileLayer(MAP_TILE_URLS[mapTheme], {
        maxZoom: 19,
        attribution: MAP_TILE_ATTRIBUTION
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      const routeGroup = L.layerGroup().addTo(map);

      map.on('click', () => {
        setSelectedPartner(null);
      });

      mapRef.current = map;
      tileLayerRef.current = tiles;
      markersLayerRef.current = markersGroup;
      routeLayerRef.current = routeGroup;

      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 250);
    };

    init();

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
        tileLayerRef.current = null;
        markersLayerRef.current = null;
        routeLayerRef.current = null;
        userMarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // گۆڕینی خێرای تایلەکانی نەخشە لە نێوان Dark و Light Mode
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(MAP_TILE_URLS[mapTheme], {
      maxZoom: 19,
      attribution: MAP_TILE_ATTRIBUTION
    }).addTo(map);
  }, [mapTheme]);

  // فلتەر و ڕیزبەندی شوێنەکان بەپێی پۆل و دووری GPS
  const filteredLocations = useMemo(() => {
    const base = selectedCategory === 'all'
      ? locations
      : locations.filter(loc => loc.category === selectedCategory);

    return base
      .map((loc) => ({
        ...loc,
        distanceKm: userCoords ? calculateDistanceKm(userCoords.lat, userCoords.lng, loc.lat, loc.lng) : null
      }))
      .sort((a, b) => {
        if (a.isFeaturedVip !== b.isFeaturedVip) return a.isFeaturedVip ? -1 : 1;
        if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
        return 0;
      });
  }, [locations, selectedCategory, userCoords]);

  // نیشاندانی پینی یاریزان لەسەر نەخشە
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !userCoords) return;

    const icon = L.divIcon({
      className: 'bq-gps-user-pin',
      html: createUserGpsPinHtml(),
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
        icon,
        zIndexOffset: 900
      }).addTo(map);
    }
  }, [userCoords]);

  // کێشانی هەموو پینە ڕەنگاوڕەنگەکان و پینی VIP لەسەر نەخشە
  useEffect(() => {
    const L = leafletRef.current;
    const group = markersLayerRef.current;
    const map = mapRef.current;
    if (!L || !group || !map) return;

    group.clearLayers();

    filteredLocations.forEach((loc) => {
      const isSelected = selectedPartner?.id === loc.id;
      const pinSize = loc.isFeaturedVip ? (isSelected ? 48 : 44) : (isSelected ? 40 : 34);
      const markerIcon = L.divIcon({
        className: 'bq-partner-pin',
        html: createPartnerPinHtml({
          category: loc.category,
          isFeaturedVip: loc.isFeaturedVip,
          isSelected
        }),
        iconSize: [pinSize, pinSize + 8],
        iconAnchor: [pinSize / 2, pinSize + 4]
      });

      const marker = L.marker([loc.lat, loc.lng], {
        icon: markerIcon,
        zIndexOffset: loc.isFeaturedVip ? 600 : (isSelected ? 500 : 100)
      });

      marker.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        setSelectedPartner(loc);
        map.flyTo([loc.lat, loc.lng], Math.max(map.getZoom(), 14), { duration: 0.55 });
      });

      marker.addTo(group);
    });
  }, [filteredLocations, selectedPartner]);

  const handleStopRoute = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
    activeRouteStepsRef.current = [];
    setNavState({
      active: false,
      loading: false,
      destination: null,
      remainingKm: null,
      etaMinutes: null,
      nextInstruction: '',
      isOfflineFallback: false
    });
  }, []);

  // دۆزینەوەی ڕێڕەوی ڕاستەقینە بە OSRM لە ناو ئەپدا + کێشانی هێڵی ڕێگا + watchPosition
  const handleStartInAppNavigation = async (partner) => {
    if (!partner) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const routeGroup = routeLayerRef.current;
    if (!L || !map || !routeGroup) return;

    const getOrigin = () =>
      new Promise((resolve) => {
        if (userCoords) {
          resolve(userCoords);
          return;
        }
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserCoords(coords);
              resolve(coords);
            },
            () => resolve(DEFAULT_MAP_CENTER),
            { enableHighAccuracy: true, timeout: 7000 }
          );
        } else {
          resolve(DEFAULT_MAP_CENTER);
        }
      });

    setNavState((prev) => ({
      ...prev,
      active: true,
      loading: true,
      destination: partner,
      nextInstruction: isEn ? 'Calculating in-app route...' : 'خەریکی دیاریکردنی ڕێگا لە ناو ئەپدا...'
    }));

    const origin = await getOrigin();
    routeGroup.clearLayers();

    let routeCoordsLatLng = [
      [origin.lat, origin.lng],
      [partner.lat, partner.lng]
    ];
    let totalKm = calculateDistanceKm(origin.lat, origin.lng, partner.lat, partner.lng) || 0;
    let etaMinutes = Math.max(1, Math.round((totalKm / 40) * 60));
    let nextInstruction = isEn ? 'Head directly toward destination' : 'ڕاستەخۆ بەرەو شوێنەکە بڕۆ';
    let isOfflineFallback = true;

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${partner.lng},${partner.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(osrmUrl);
      if (res.ok) {
        const data = await res.json();
        const route = data?.routes?.[0];
        if (route?.geometry?.coordinates?.length > 1) {
          routeCoordsLatLng = route.geometry.coordinates.map(([cLng, cLat]) => [cLat, cLng]);
          totalKm = Math.round(((Number(route.distance) || 0) / 1000) * 100) / 100;
          etaMinutes = Math.max(1, Math.round((Number(route.duration) || 60) / 60));
          const steps = route.legs?.[0]?.steps || [];
          activeRouteStepsRef.current = steps;
          const firstStep = steps.length > 1 ? steps[1] : steps[0];
          nextInstruction = formatOsrmStepInstruction(firstStep, isEn ? 'en' : 'ku');
          isOfflineFallback = false;
        }
      }
    } catch {
      isOfflineFallback = true;
    }

    const catColor = getCategoryMeta(partner.category).color;
    // هێڵی درەوشاوەی دەرەوە + هێڵی سەرەکی ناوەوە
    L.polyline(routeCoordsLatLng, {
      color: catColor,
      weight: 10,
      opacity: 0.28,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(routeGroup);

    L.polyline(routeCoordsLatLng, {
      color: isOfflineFallback ? '#f59e0b' : catColor,
      weight: 5,
      opacity: 0.95,
      dashArray: isOfflineFallback ? '8, 8' : undefined,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(routeGroup);

    try {
      const bounds = L.latLngBounds(routeCoordsLatLng);
      map.fitBounds(bounds, { padding: [70, 90] });
    } catch {}

    setNavState({
      active: true,
      loading: false,
      destination: partner,
      remainingKm: totalKm,
      etaMinutes,
      nextInstruction,
      isOfflineFallback
    });

    // چاودێریکردنی جوڵەی ڕاستەوخۆ بە GPS
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const liveCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(liveCoords);

          const remKm = calculateDistanceKm(liveCoords.lat, liveCoords.lng, partner.lat, partner.lng) || 0;
          const speedKmh = pos.coords.speed && pos.coords.speed > 1.5 ? (pos.coords.speed * 3.6) : 38;
          const remEta = Math.max(1, Math.round((remKm / speedKmh) * 60));

          let updatedStepText = nextInstruction;
          if (remKm < 0.08) {
            updatedStepText = isEn ? 'You have arrived!' : 'گەیشتیتە شوێنەکە 🎉';
          } else if (activeRouteStepsRef.current.length > 0) {
            let closestIdx = 0;
            let bestDist = Infinity;
            activeRouteStepsRef.current.forEach((st, idx) => {
              const loc = st?.maneuver?.location;
              if (Array.isArray(loc) && loc.length >= 2) {
                const d = calculateDistanceKm(liveCoords.lat, liveCoords.lng, loc[1], loc[0]);
                if (d !== null && d < bestDist) {
                  bestDist = d;
                  closestIdx = idx;
                }
              }
            });
            const nextStep = activeRouteStepsRef.current[Math.min(closestIdx + 1, activeRouteStepsRef.current.length - 1)];
            if (nextStep) {
              updatedStepText = formatOsrmStepInstruction(nextStep, isEn ? 'en' : 'ku');
            }
          }

          setNavState((prev) =>
            prev.active
              ? {
                  ...prev,
                  remainingKm: remKm,
                  etaMinutes: remEta,
                  nextInstruction: updatedStepText
                }
              : prev
          );
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    }
  };

  const handleCopyDiscountCode = async (partner) => {
    if (!partner?.discountCode) return;
    try {
      await navigator.clipboard.writeText(partner.discountCode);
    } catch {
      try {
        const el = document.createElement('textarea');
        el.value = partner.discountCode;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      } catch {}
    }
    setCopiedCodeId(partner.id);
    setTimeout(() => setCopiedCodeId(''), 2200);
  };

  const getPhoneHref = (rawPhone = '') => {
    const cleaned = String(rawPhone || '').replace(/[^\d+]/g, '');
    if (!cleaned) return null;
    if (cleaned.startsWith('+')) {
      return `https://wa.me/${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith('00')) {
      return `https://wa.me/${cleaned.slice(2)}`;
    }
    return `tel:${cleaned}`;
  };

  const isLightMap = mapTheme === 'light';
  const glassSurface = isLightMap ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.92)';
  const glassText = isLightMap ? '#0f172a' : '#ffffff';
  const glassSubtle = isLightMap ? '#475569' : '#94a3b8';
  const glassBorder = isLightMap ? '1px solid rgba(15, 23, 42, 0.14)' : '1px solid rgba(255, 255, 255, 0.16)';

  const countsByCat = useMemo(() => {
    return {
      all: locations.length,
      gym: locations.filter(l => l.category === 'gym').length,
      restaurant: locations.filter(l => l.category === 'restaurant').length,
      supplement: locations.filter(l => l.category === 'supplement').length
    };
  }, [locations]);

  return (
    <div
      className={isLightMap ? 'bq-map-light' : 'bq-map-dark'}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
        background: isLightMap ? '#f1f5f9' : '#0b1120',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* نەخشەی تەواو-شاشەی ناوخۆیی Leaflet */}
      <div ref={containerRef} dir="ltr" style={{ width: '100%', height: '100%', position: 'relative' }} />

      {/* ==================== باڕی سەرەوە و HUDی ڕێنیشاندەر ==================== */}
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          position: 'absolute',
          top: 'max(env(safe-area-inset-top, 0px), 12px)',
          left: '12px',
          right: '12px',
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none'
        }}
      >
        {/* دێڕی یەکەم: داخستن + ناونیشان + گۆڕینی دیمەن + شوێنەکەم */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={() => {
              handleStopRoute();
              if (onClose) onClose();
            }}
            style={{
              padding: '9px 13px',
              borderRadius: '14px',
              background: glassSurface,
              border: glassBorder,
              color: glassText,
              fontSize: '12.5px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
              backdropFilter: 'blur(12px)'
            }}
          >
            {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
            <span>{isEn ? 'Back' : 'گەڕانەوە'}</span>
          </button>

          <div
            style={{
              padding: '8px 14px',
              borderRadius: '14px',
              background: glassSurface,
              border: glassBorder,
              color: glassText,
              fontSize: '12.5px',
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <MapPin size={15} color="#f59e0b" />
            <span>{isEn ? 'Partners Map' : 'نەخشەی هاوبەشەکان'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => requestUserLocation(true)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '13px',
                background: glassSurface,
                border: glassBorder,
                color: '#3b82f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
                backdropFilter: 'blur(12px)'
              }}
              title={isEn ? 'My Location' : 'شوێنی ئێستام'}
            >
              <Crosshair size={17} />
            </button>

            <button
              type="button"
              onClick={() => setMapTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '13px',
                background: glassSurface,
                border: glassBorder,
                color: isLightMap ? '#0f172a' : '#fbbf24',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
                backdropFilter: 'blur(12px)'
              }}
              title={isLightMap ? 'Dark Map' : 'Light Map'}
              aria-label="Toggle map theme"
            >
              {isLightMap ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </div>

        {/* فیلتەرە سەرەکییەکان یان Navigation HUD لە کاتی ڕێنیشاندەردا */}
        {navState.active ? (
          <div
            style={{
              pointerEvents: 'auto',
              padding: '12px 14px',
              borderRadius: '18px',
              background: isLightMap ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.95)',
              border: `1.5px solid ${getCategoryMeta(navState.destination?.category).color}`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(14px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: getCategoryMeta(navState.destination?.category).bgTint,
                    color: getCategoryMeta(navState.destination?.category).color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Route size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '900', color: glassText }}>
                    {navState.nextInstruction}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: glassSubtle }}>
                    {navState.destination?.name} {navState.isOfflineFallback ? (isEn ? '• Direct Offline Line' : '• هێڵی ئۆفلاین') : ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStopRoute}
                style={{
                  padding: '7px 12px',
                  borderRadius: '11px',
                  background: 'rgba(239, 68, 68, 0.16)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#ef4444',
                  fontSize: '11.5px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {isEn ? 'Stop Route' : 'داخستنی ڕێڕەو'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12px', fontWeight: '800' }}>
              <span style={{ color: '#06b6d4', background: 'rgba(6, 182, 212, 0.14)', padding: '4px 10px', borderRadius: '9px' }}>
                📍 {navState.remainingKm !== null ? `${navState.remainingKm} km` : '...'}
              </span>
              <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.14)', padding: '4px 10px', borderRadius: '9px' }}>
                ⏱️ {navState.etaMinutes !== null ? `${navState.etaMinutes} ${isEn ? 'min' : 'خولەک'}` : '...'}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="hide-scrollbar"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              gap: '7px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none'
            }}
          >
            {[
              { id: 'all', label: isEn ? 'All' : 'هەمووی', dot: '#a855f7', count: countsByCat.all },
              { id: 'gym', label: getCategoryLabel('gym', isEn ? 'en' : 'ku'), dot: PARTNER_CATEGORIES.gym.color, count: countsByCat.gym },
              { id: 'restaurant', label: getCategoryLabel('restaurant', isEn ? 'en' : 'ku'), dot: PARTNER_CATEGORIES.restaurant.color, count: countsByCat.restaurant },
              { id: 'supplement', label: getCategoryLabel('supplement', isEn ? 'en' : 'ku'), dot: PARTNER_CATEGORIES.supplement.color, count: countsByCat.supplement }
            ].map((pill) => {
              const active = selectedCategory === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedCategory(pill.id)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '14px',
                    background: active ? pill.dot : glassSurface,
                    color: active ? '#ffffff' : glassText,
                    border: active ? `1.5px solid ${pill.dot}` : glassBorder,
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(12px)',
                    flexShrink: 0
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: active ? '#ffffff' : pill.dot }} />
                  <span>{pill.label} ({pill.count})</span>
                </button>
              );
            })}
          </div>
        )}

        {gpsWarning && !navState.active && (
          <div style={{
            pointerEvents: 'none',
            alignSelf: 'center',
            padding: '4px 10px',
            borderRadius: '10px',
            background: glassSurface,
            border: glassBorder,
            color: '#f59e0b',
            fontSize: '11px',
            fontWeight: '700'
          }}>
            {gpsWarning}
          </div>
        )}
      </div>

      {/* ==================== کاتێک هیچ هاوبەشێک تۆمار نەکراوە ==================== */}
      {filteredLocations.length === 0 && !selectedPartner && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '16px',
            right: '16px',
            zIndex: 1100,
            padding: '16px 18px',
            borderRadius: '20px',
            background: glassSurface,
            border: glassBorder,
            color: glassText,
            textAlign: 'center',
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(14px)'
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: '900', marginBottom: '4px' }}>
            {isEn ? 'No partners listed in this category yet' : 'تا ئێستا هیچ شوێنێکی هاوبەش لەم بەشەدا زیاد نەکراوە'}
          </div>
          <div style={{ fontSize: '11.5px', color: glassSubtle }}>
            {isEn
              ? 'Admins can pin Gyms, Healthy Restaurants & Supplement Stores inside the Admin Dashboard.'
              : 'ئەدمین دەتوانێت هۆڵ و خواردنگەی تەندروست و فرۆشگای سەپلیمێنت لە پانێڵی ئەدمینەوە زیاد بکات.'}
          </div>
        </div>
      )}

      {/* ==================== کارتی خێرای نزیکترین هاوبەشەکان کاتێک پینێک دیاری نەکراوە ==================== */}
      {filteredLocations.length > 0 && !selectedPartner && !navState.active && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="hide-scrollbar"
          style={{
            position: 'absolute',
            bottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
            left: '12px',
            right: '12px',
            zIndex: 1100,
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            padding: '4px 2px',
            scrollbarWidth: 'none'
          }}
        >
          {filteredLocations.map((loc) => {
            const catMeta = getCategoryMeta(loc.category);
            return (
              <div
                key={loc.id}
                onClick={() => {
                  setSelectedPartner(loc);
                  if (mapRef.current) {
                    mapRef.current.flyTo([loc.lat, loc.lng], 15, { duration: 0.6 });
                  }
                }}
                style={{
                  minWidth: '220px',
                  maxWidth: '240px',
                  padding: '12px 14px',
                  borderRadius: '18px',
                  background: glassSurface,
                  border: loc.isFeaturedVip ? '1.5px solid #f59e0b' : glassBorder,
                  color: glassText,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
                  backdropFilter: 'blur(14px)',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '900',
                    padding: '2px 7px',
                    borderRadius: '8px',
                    background: catMeta.bgTint,
                    color: catMeta.color
                  }}>
                    {catMeta.emoji} {getCategoryLabel(loc.category, isEn ? 'en' : 'ku')}
                  </span>
                  {loc.isFeaturedVip && (
                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.16)', padding: '2px 6px', borderRadius: '8px' }}>
                      ★ VIP
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {loc.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: glassSubtle, fontWeight: '700' }}>
                  <span>{loc.city || loc.address || (isEn ? 'Partner' : 'هاوبەش')}</span>
                  {loc.distanceKm !== null && <span style={{ color: catMeta.color }}>{loc.distanceKm} km</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== کارتی خوارەوەی وردەکاری هاوبەش (Bottom Partner Detail Card) ==================== */}
      {selectedPartner && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute',
            bottom: 'max(env(safe-area-inset-bottom, 0px), 14px)',
            left: '12px',
            right: '12px',
            zIndex: 1150,
            maxWidth: '520px',
            margin: '0 auto',
            padding: '16px 18px',
            borderRadius: '24px',
            background: glassSurface,
            border: selectedPartner.isFeaturedVip ? '1.5px solid #f59e0b' : glassBorder,
            color: glassText,
            boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '900',
                  padding: '3px 9px',
                  borderRadius: '9px',
                  background: getCategoryMeta(selectedPartner.category).bgTint,
                  color: getCategoryMeta(selectedPartner.category).color,
                  border: `1px solid ${getCategoryMeta(selectedPartner.category).borderTint}`
                }}>
                  {getCategoryMeta(selectedPartner.category).emoji} {getCategoryLabel(selectedPartner.category, isEn ? 'en' : 'ku')}
                </span>
                {selectedPartner.isFeaturedVip && (
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: '900',
                    padding: '3px 9px',
                    borderRadius: '9px',
                    background: 'rgba(245, 158, 11, 0.18)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Sparkles size={11} />
                    <span>VIP Sponsor</span>
                  </span>
                )}
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: glassText }}>
                {selectedPartner.name}
              </h3>
              <div style={{ fontSize: '12px', color: glassSubtle, marginTop: '2px' }}>
                {[selectedPartner.city, selectedPartner.address].filter(Boolean).join(' • ')}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPartner(null)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isLightMap ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: glassText,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '12px', fontWeight: '700', color: glassSubtle }}>
            {selectedPartner.workingHours && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} color={getCategoryMeta(selectedPartner.category).color} />
                <span>{selectedPartner.workingHours}</span>
              </span>
            )}
            {userCoords && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: getCategoryMeta(selectedPartner.category).color }}>
                <MapPin size={13} />
                <span>
                  {calculateDistanceKm(userCoords.lat, userCoords.lng, selectedPartner.lat, selectedPartner.lng)} km
                </span>
              </span>
            )}
          </div>

          {/* بۆکسی کۆدی داشکاندن بە یەک کلیک کۆپی دەکرێت */}
          {(selectedPartner.discountCode || selectedPartner.discountText) && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '14px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px dashed rgba(245, 158, 11, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#f59e0b' }}>
                  🎁 {selectedPartner.discountText || (isEn ? 'Exclusive Athlete Promo' : 'ئۆفەری تایبەت بۆ یاریزانانی BQ GYM')}
                </div>
                {selectedPartner.discountCode && (
                  <div style={{ fontSize: '11.5px', fontWeight: '900', color: glassText, marginTop: '2px' }}>
                    {isEn ? 'Promo Code:' : 'کۆدی داشکاندن:'}{' '}
                    <span dir="ltr" style={{ letterSpacing: '0.8px', color: '#f59e0b' }}>{selectedPartner.discountCode}</span>
                  </div>
                )}
              </div>

              {selectedPartner.discountCode && (
                <button
                  type="button"
                  onClick={() => handleCopyDiscountCode(selectedPartner)}
                  style={{
                    padding: '7px 11px',
                    borderRadius: '10px',
                    background: '#f59e0b',
                    border: 'none',
                    color: '#0f172a',
                    fontSize: '11.5px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedCodeId === selectedPartner.id ? <Check size={13} /> : <Copy size={13} />}
                  <span>
                    {copiedCodeId === selectedPartner.id
                      ? (isEn ? 'Copied!' : 'کۆپی کرا')
                      : (isEn ? 'Copy Code' : 'کۆپیکردن')}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* دوگمەکانی پەیوەندی و پیشاندانی ڕێگا لە ناو ئەپدا */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {selectedPartner.phoneOrWhatsapp && getPhoneHref(selectedPartner.phoneOrWhatsapp) && (
              <a
                href={getPhoneHref(selectedPartner.phoneOrWhatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: isLightMap ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                  border: glassBorder,
                  color: glassText,
                  fontSize: '12.5px',
                  fontWeight: '800',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Phone size={15} color="#10b981" />
                <span>{isEn ? 'Call / WhatsApp' : 'پەیوەندی'}</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => handleStartInAppNavigation(selectedPartner)}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${getCategoryMeta(selectedPartner.category).color} 0%, #3b82f6 100%)`,
                border: 'none',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                boxShadow: '0 6px 20px rgba(59, 130, 246, 0.35)'
              }}
            >
              <Navigation size={16} />
              <span>{isEn ? 'Navigate In-App' : 'پیشاندانی ڕێگا لە ناو ئەپ'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
