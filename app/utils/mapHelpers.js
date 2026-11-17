// Shared Constants, Geo Math, Tile URLs, SVG Pins, and OSRM Helpers for In-App Commercial Map

export const DEFAULT_MAP_CENTER = { lat: 36.1911, lng: 44.0092 }; // Erbil, Kurdistan

export const MAP_TILE_URLS = {
  dark: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  light: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
};

export const MAP_TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

export const PARTNER_CATEGORIES = {
  gym: {
    id: 'gym',
    color: '#06b6d4',
    bgTint: 'rgba(6, 182, 212, 0.16)',
    borderTint: 'rgba(6, 182, 212, 0.45)',
    labelKu: 'هۆڵەکان',
    labelEn: 'Gyms',
    labelAr: 'الصالات',
    labelFa: 'باشگاه‌ها',
    emoji: '🏋️'
  },
  restaurant: {
    id: 'restaurant',
    color: '#10b981',
    bgTint: 'rgba(16, 185, 129, 0.16)',
    borderTint: 'rgba(16, 185, 129, 0.45)',
    labelKu: 'خواردنگەکان',
    labelEn: 'Healthy Food',
    labelAr: 'المطاعم الصحية',
    labelFa: 'رستوران سالم',
    emoji: '🥗'
  },
  supplement: {
    id: 'supplement',
    color: '#f59e0b',
    bgTint: 'rgba(245, 158, 11, 0.16)',
    borderTint: 'rgba(245, 158, 11, 0.45)',
    labelKu: 'سەپلیمێنت',
    labelEn: 'Supplements',
    labelAr: 'المكملات',
    labelFa: 'مکمل‌ها',
    emoji: '💊'
  }
};

export function getCategoryMeta(category = 'gym') {
  return PARTNER_CATEGORIES[category] || PARTNER_CATEGORIES.gym;
}

export function getCategoryLabel(category = 'gym', lang = 'ku') {
  const meta = getCategoryMeta(category);
  if (lang === 'en') return meta.labelEn;
  if (lang === 'ar') return meta.labelAr;
  if (lang === 'fa') return meta.labelFa;
  return meta.labelKu;
}

/**
 * Haversine distance in kilometers between two lat/lng coordinates.
 */
export function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const aLat = Number(lat1);
  const aLng = Number(lng1);
  const bLat = Number(lat2);
  const bLng = Number(lng2);
  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c * 100) / 100;
}

function getCategoryGlyphSvg(category) {
  if (category === 'restaurant') {
    return '<path d="M12 6c3.5 0 6 2.5 6 6s-2.5 6-6 6-6-2.5-6-6c0-2 1-4 3-5l1 2c-1 .8-1.5 1.8-1.5 3a3.5 3.5 0 0 0 7 0c0-2-1.5-3.5-3.5-3.5V6z" fill="#ffffff"/>';
  }
  if (category === 'supplement') {
    return '<rect x="8.5" y="7" width="7" height="10" rx="2.5" stroke="#ffffff" stroke-width="2" fill="none"/><line x1="8.5" y1="12" x2="15.5" y2="12" stroke="#ffffff" stroke-width="2"/>';
  }
  // Gym dumbbell SVG
  return '<path d="M6.5 10.5v3M8.5 9v6M15.5 9v6M17.5 10.5v3M8.5 12h7" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>';
}

/**
 * Generates custom color-coded SVG pin HTML with pulsing gold VIP halo for featured sponsors.
 */
export function createPartnerPinHtml({ category = 'gym', isFeaturedVip = false, isSelected = false } = {}) {
  const meta = getCategoryMeta(category);
  const size = isFeaturedVip ? (isSelected ? 48 : 44) : (isSelected ? 40 : 34);
  const ringBorder = isFeaturedVip ? '#fbbf24' : '#ffffff';
  const strokeWidth = isFeaturedVip ? 2.5 : 2;
  const glyph = getCategoryGlyphSvg(category);

  const vipHalo = isFeaturedVip
    ? `<div class="vip-pin-halo" style="position:absolute;top:44%;left:50%;width:${size + 26}px;height:${size + 26}px;border-radius:50%;background:radial-gradient(circle, rgba(245,158,11,0.55) 0%, rgba(251,191,36,0.18) 55%, rgba(245,158,11,0) 75%);border:2px solid rgba(251,191,36,0.7);pointer-events:none;"></div>
       <div style="position:absolute;top:-7px;right:-4px;background:linear-gradient(135deg,#fbbf24,#d97706);color:#0f172a;font-size:9px;font-weight:900;padding:1px 4px;border-radius:999px;border:1.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.45);z-index:3;">★</div>`
    : '';

  return `
    <div style="position:relative;width:${size}px;height:${size + 8}px;display:flex;align-items:center;justify-content:center;cursor:pointer;transform:${isSelected ? 'scale(1.12)' : 'scale(1)'};transition:transform 0.2s ease;">
      ${vipHalo}
      <svg width="${size}" height="${size + 8}" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:relative;z-index:2;filter:drop-shadow(0 5px 10px rgba(0,0,0,0.45));">
        <path d="M18 2C9.716 2 3 8.716 3 17C3 27.5 18 42 18 42C18 42 33 27.5 33 17C33 8.716 26.284 2 18 2Z" fill="${meta.color}" stroke="${ringBorder}" stroke-width="${strokeWidth}"/>
        <circle cx="18" cy="17" r="10.5" fill="rgba(15,23,42,0.28)"/>
        <g transform="translate(6, 5)">
          ${glyph}
        </g>
      </svg>
    </div>
  `;
}

export function createUserGpsPinHtml() {
  return `
    <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
      <div class="gps-blue-halo" style="position:absolute;top:50%;left:50%;width:32px;height:32px;border-radius:50%;background:rgba(59,130,246,0.38);border:1.5px solid rgba(59,130,246,0.65);"></div>
      <div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(37,99,235,0.65);position:relative;z-index:2;"></div>
    </div>
  `;
}

/**
 * Formats an OSRM step maneuver into a readable localized instruction string.
 */
export function formatOsrmStepInstruction(step, lang = 'ku') {
  if (!step || !step.maneuver) {
    return lang === 'en' ? 'Continue toward destination' : 'بەردەوام بە بەرەو شوێنەکە';
  }
  const type = String(step.maneuver.type || '').toLowerCase();
  const mod = String(step.maneuver.modifier || '').toLowerCase();
  const roadName = String(step.name || '').trim();
  const roadSuffix = roadName ? (lang === 'en' ? ` onto ${roadName}` : ` بەرەو ${roadName}`) : '';

  if (type === 'arrive') {
    return lang === 'en' ? 'Arrive at destination' : 'گەیشتیتە شوێنەکە';
  }

  let dirText = '';
  if (mod.includes('slight left')) dirText = lang === 'en' ? 'Bear left' : 'کەمێک بە لای چەپدا بڕۆ';
  else if (mod.includes('slight right')) dirText = lang === 'en' ? 'Bear right' : 'کەمێک بە لای ڕاستدا بڕۆ';
  else if (mod.includes('left')) dirText = lang === 'en' ? 'Turn left' : 'بپێچەرەوە لای چەپ';
  else if (mod.includes('right')) dirText = lang === 'en' ? 'Turn right' : 'بپێچەرەوە لای ڕاست';
  else if (mod.includes('uturn')) dirText = lang === 'en' ? 'Make a U-turn' : 'بسووڕێرەوە (U-turn)';
  else dirText = lang === 'en' ? 'Continue straight' : 'ڕاستەخۆ بەردەوام بە';

  const distM = Math.round(Number(step.distance) || 0);
  const distTag = distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`;
  return `${dirText}${roadSuffix}${distM > 0 ? ` (${distTag})` : ''}`;
}
