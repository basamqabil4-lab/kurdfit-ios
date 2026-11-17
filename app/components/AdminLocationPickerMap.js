'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { Search, Crosshair, Sun, Moon, MapPin } from 'lucide-react';
import {
  DEFAULT_MAP_CENTER,
  MAP_TILE_URLS,
  MAP_TILE_ATTRIBUTION,
  createPartnerPinHtml
} from '../utils/mapHelpers';

export default function AdminLocationPickerMap({
  lat = DEFAULT_MAP_CENTER.lat,
  lng = DEFAULT_MAP_CENTER.lng,
  category = 'gym',
  isFeaturedVip = false,
  initialTheme = 'dark',
  onPickCoordinates
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);
  const onPickRef = useRef(onPickCoordinates);

  const [mapTheme, setMapTheme] = useState(initialTheme === 'light' ? 'light' : 'dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');

  useEffect(() => {
    setMapTheme(initialTheme === 'light' ? 'light' : 'dark');
  }, [initialTheme]);

  useEffect(() => {
    onPickRef.current = onPickCoordinates;
  }, [onPickCoordinates]);

  const parsedLat = String(lat ?? '').trim() !== '' ? Number(lat) : NaN;
  const parsedLng = String(lng ?? '').trim() !== '' ? Number(lng) : NaN;
  const safeLat = Number.isFinite(parsedLat) && Math.abs(parsedLat) <= 90 ? parsedLat : DEFAULT_MAP_CENTER.lat;
  const safeLng = Number.isFinite(parsedLng) && Math.abs(parsedLng) <= 180 ? parsedLng : DEFAULT_MAP_CENTER.lng;

  // دامەزراندنی نەخشەی Leaflet لە ناو مۆداڵی ئەدمیندا
  useEffect(() => {
    let isCancelled = false;

    const initMap = async () => {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import('leaflet')).default || (await import('leaflet'));
      if (isCancelled || !containerRef.current) return;

      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: [safeLat, safeLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      const tileLayer = L.tileLayer(MAP_TILE_URLS[mapTheme], {
        maxZoom: 19,
        attribution: MAP_TILE_ATTRIBUTION
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: 'bq-custom-pin-wrapper',
        html: createPartnerPinHtml({ category, isFeaturedVip, isSelected: true }),
        iconSize: [48, 56],
        iconAnchor: [24, 52]
      });

      const marker = L.marker([safeLat, safeLng], {
        draggable: true,
        icon: pinIcon
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        if (onPickRef.current) {
          onPickRef.current(
            Math.round(pos.lat * 1000000) / 1000000,
            Math.round(pos.lng * 1000000) / 1000000
          );
        }
      });

      map.on('click', (e) => {
        const clickedLat = Math.round(e.latlng.lat * 1000000) / 1000000;
        const clickedLng = Math.round(e.latlng.lng * 1000000) / 1000000;
        marker.setLatLng([clickedLat, clickedLng]);
        if (onPickRef.current) {
          onPickRef.current(clickedLat, clickedLng);
        }
      });

      mapRef.current = map;
      tileLayerRef.current = tileLayer;
      markerRef.current = marker;

      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 250);
    };

    initMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
        tileLayerRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // گۆڕینی دیمەنی ڕووناک / تاریک بێ لەدەستدانی پۆینتەکە
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

  // نوێکردنەوەی پۆینت و ڕەنگی پین لە کاتی گۆڕینی پۆل یان VIP یان lat/lng
  useEffect(() => {
    const marker = markerRef.current;
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!marker || !map || !L) return;

    marker.setLatLng([safeLat, safeLng]);
    marker.setIcon(
      L.divIcon({
        className: 'bq-custom-pin-wrapper',
        html: createPartnerPinHtml({ category, isFeaturedVip, isSelected: true }),
        iconSize: [48, 56],
        iconAnchor: [24, 52]
      })
    );
  }, [safeLat, safeLng, category, isFeaturedVip]);

  const handleNominatimSearch = async (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    setGpsStatus('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'ckb,ar,en' }
      });
      const json = await res.json();
      setSearchResults(Array.isArray(json) ? json : []);
      if (!Array.isArray(json) || json.length === 0) {
        setGpsStatus('هیچ ناونیشانێک نەدۆزرایەوە، دەتوانیت ڕاستەوخۆ پەنجە بنێیتە سەر نەخشەکە.');
      }
    } catch {
      setGpsStatus('گەڕانی سەرهێڵ بەردەست نییە، تکایە پینەکە بە دەست لەسەر نەخشەکە دابنێ.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item) => {
    const nextLat = Math.round(Number(item.lat) * 1000000) / 1000000;
    const nextLng = Math.round(Number(item.lon) * 1000000) / 1000000;
    const cityHint = item.address?.city || item.address?.town || item.address?.state || '';
    const addressHint = item.display_name ? item.display_name.split(',').slice(0, 2).join(', ').trim() : '';

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([nextLat, nextLng]);
      mapRef.current.flyTo([nextLat, nextLng], 15, { duration: 0.7 });
    }
    if (onPickRef.current) {
      onPickRef.current(nextLat, nextLng, cityHint, addressHint);
    }
    setSearchResults([]);
  };

  const handleLocateAdmin = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('GPS لەسەر ئەم ئامێرە پشتگیری نەکراوە.');
      return;
    }
    setGpsStatus('خەریکی دیاریکردنی شوێنەکەت...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const nextLng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([nextLat, nextLng]);
          mapRef.current.flyTo([nextLat, nextLng], 16, { duration: 0.7 });
        }
        if (onPickRef.current) {
          onPickRef.current(nextLat, nextLng);
        }
        setGpsStatus('');
      },
      () => {
        setGpsStatus('مۆڵەتی GPS نەدرا، پینەکە ڕاستەوخۆ لەسەر نەخشە بجوڵێنە.');
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  const isLight = mapTheme === 'light';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* باڕی گەڕانی ناوخۆیی Nominatim + دوگمەی شوێنی ئێستام */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px', display: 'flex', gap: '6px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleNominatimSearch();
              }
            }}
            placeholder="گەڕان بۆ ناونیشان یان گەڕەک (نموونە: 100m Erbil)..."
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: '#fff',
              fontSize: '12.5px'
            }}
          />
          <button
            type="button"
            onClick={handleNominatimSearch}
            disabled={isSearching}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.2)',
              border: '1px solid rgba(6, 182, 212, 0.45)',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Search size={14} />
            <span>{isSearching ? '...' : 'گەڕان'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleLocateAdmin}
          style={{
            padding: '9px 12px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.16)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Crosshair size={14} />
          <span>شوێنی ئێستام</span>
        </button>
      </div>

      {searchResults.length > 0 && (
        <div style={{
          background: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '12px',
          maxHeight: '140px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {searchResults.map((res, idx) => (
            <button
              key={res.place_id || idx}
              type="button"
              onClick={() => handleSelectSearchResult(res)}
              style={{
                textAlign: 'right',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                color: '#e2e8f0',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <MapPin size={13} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <span>{res.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {gpsStatus && (
        <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '700' }}>{gpsStatus}</div>
      )}

      {/* نەخشەی تەفاعولی هەڵبژاردنی پۆینت لە ناو مۆداڵی ئەدمیندا */}
      <div
        className={isLight ? 'bq-map-light' : 'bq-map-dark'}
        style={{
          position: 'relative',
          width: '100%',
          height: '250px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.16)'
        }}
      >
        <div ref={containerRef} dir="ltr" style={{ width: '100%', height: '100%' }} />

        {/* دوگمەی گۆڕینی دیمەنی ڕووناک / تاریک */}
        <button
          type="button"
          onClick={() => setMapTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            padding: '7px 10px',
            borderRadius: '11px',
            background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.88)',
            border: isLight ? '1px solid rgba(15,23,42,0.15)' : '1px solid rgba(255,255,255,0.2)',
            color: isLight ? '#0f172a' : '#ffffff',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
          }}
          title="گۆڕینی ڕووناکی نەخشە"
        >
          {isLight ? <Moon size={14} /> : <Sun size={14} color="#fbbf24" />}
          <span>{isLight ? 'تاریک' : 'ڕووناک'}</span>
        </button>

        {/* ئاماژەی ڕێنمایی لە خوارەوەی نەخشەکە */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            right: '8px',
            zIndex: 1000,
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '10px',
              background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.85)',
              color: isLight ? '#0f172a' : '#e2e8f0',
              fontSize: '10.5px',
              fontWeight: '700',
              border: '1px solid rgba(148,163,184,0.25)'
            }}
          >
            پەنجە بنێە سەر نەخشە یان پینەکە ڕابکێشە
          </span>
          <span
            dir="ltr"
            style={{
              padding: '4px 9px',
              borderRadius: '10px',
              background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.85)',
              color: '#38bdf8',
              fontSize: '10.5px',
              fontWeight: '800',
              border: '1px solid rgba(56,189,248,0.35)'
            }}
          >
            {safeLat.toFixed(5)}, {safeLng.toFixed(5)}
          </span>
        </div>
      </div>
    </div>
  );
}
