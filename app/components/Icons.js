'use client';
import React from 'react';

// ==================== ئایکۆنە دڵڕفێن و ناسکەکان (Delicate Precision SVG Icons) ====================
export function ProfilePic({ gender = 'male', size = 48 }) {
  const isFemale = gender === 'female' || gender === 'مێ' || gender === 'ئافرەت';

  return (
    <div style={{
      width: size + 'px',
      height: size + 'px',
      borderRadius: '50%',
      background: 'var(--accent-gradient)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 22px var(--accent-glow), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
      border: '1.5px solid rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(10px)',
      color: '#ffffff'
    }}>
      <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </div>
  );
}

export function SettingsIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

export function BellIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
    </svg>
  );
}

export function TargetIcon({ size = 22, color = "var(--accent-primary)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2"></path>
    </svg>
  );
}

export function EditIcon({ size = 15, color = "#2563eb" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
    </svg>
  );
}

export function TrashIcon({ size = 16, color = "#EF4444" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  );
}



export function AntigravityLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="url(#agy_grad)" strokeWidth="2" strokeDasharray="4 2" />
      <path d="M12 4L16 12L12 10L8 12L12 4Z" fill="url(#agy_grad)" />
      <path d="M12 20L8 12L12 14L16 12L12 20Z" fill="url(#agy_grad)" opacity="0.75" />
      <circle cx="12" cy="12" r="2" fill="#00D2FF" />
      <defs>
        <linearGradient id="agy_grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D2FF" />
          <stop offset="0.5" stopColor="#9333EA" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function GeminiSparkleIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z" fill="url(#gemini_glow_grad)" />
      <defs>
        <linearGradient id="gemini_glow_grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4E82EE" />
          <stop offset="0.5" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#D96570" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function DeepSeekLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="url(#deepseek_grad)" strokeWidth="1.8" />
      <path d="M7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12Z" fill="url(#deepseek_grad)" />
      <circle cx="12" cy="12" r="2.2" fill="#ffffff" />
      <defs>
        <linearGradient id="deepseek_grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function CameraScanIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"></path>
      <circle cx="12" cy="12" r="3.5"></circle>
    </svg>
  );
}

export function WaterDropIcon({ size = 22, color = "#38BDF8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
      <path d="M12 8a4 4 0 0 0-4 4" strokeWidth="1.5" strokeLinecap="round"></path>
    </svg>
  );
}

export function HealthCrossIcon({ size = 18, color = "var(--color-carbs)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
      <path d="M12 9v6M9 12h6"></path>
    </svg>
  );
}

export function MaleIcon({ size = 16, color = "#ffffff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="14" r="5"></circle>
      <line x1="19" y1="5" x2="13.6" y2="10.4"></line>
      <polyline points="15 5 19 5 19 9"></polyline>
    </svg>
  );
}

export function FemaleIcon({ size = 16, color = "#ffffff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="5"></circle>
      <line x1="12" y1="14" x2="12" y2="21"></line>
      <line x1="9" y1="18" x2="15" y2="18"></line>
    </svg>
  );
}

export function SearchIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7.5"></circle>
      <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
    </svg>
  );
}

export function ChevronLeftIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}

export function ChevronRightIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}

export function SendIcon({ size = 18, color = "#ffffff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}

export function AiNavIcon({ active }) {
  return (
    <svg width={active ? "26" : "20"} height={active ? "26" : "20"} viewBox="0 0 24 24" fill="none" stroke={active ? "#ffffff" : "currentColor"} strokeWidth={active ? "2.3" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" stroke={active ? "#ffffff" : "currentColor"} strokeDasharray="3 2" />
      <path d="M12 5L15 12L12 10.5L9 12L12 5Z" fill={active ? "#ffffff" : "currentColor"} />
      <path d="M12 19L9 12L12 13.5L15 12L12 19Z" fill={active ? "#ffffff" : "currentColor"} opacity="0.8" />
    </svg>
  );
}

export function MoreNavIcon({ active }) {
  return (
    <svg width={active ? "25" : "20"} height={active ? "25" : "20"} viewBox="0 0 24 24" fill="none" stroke={active ? "#ffffff" : "currentColor"} strokeWidth={active ? "2.3" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="2" fill={active ? "#ffffff" : "none"} fillOpacity={active ? "0.3" : "0"} />
      <rect x="14" y="3" width="7" height="7" rx="2" fill={active ? "#ffffff" : "none"} fillOpacity={active ? "0.3" : "0"} />
      <rect x="14" y="14" width="7" height="7" rx="2" fill={active ? "#ffffff" : "none"} fillOpacity={active ? "0.3" : "0"} />
      <rect x="3" y="14" width="7" height="7" rx="2" fill={active ? "#ffffff" : "none"} fillOpacity={active ? "0.3" : "0"} />
    </svg>
  );
}

// ==================== ئایکۆنە ناسکەکانی هێڵی خوارەوە (Bottom Nav SVGs) ====================
export function HomeNavIcon({ active }) {
  return (
    <svg width={active ? "26" : "20"} height={active ? "26" : "20"} viewBox="0 0 24 24" fill="none" stroke={active ? "#ffffff" : "currentColor"} strokeWidth={active ? "2.3" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9.5 9-7 9 7v10a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5z"></path>
      <path d="M9 21v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7"></path>
    </svg>
  );
}

export function WorkoutNavIcon({ active }) {
  return (
    <svg width={active ? "26" : "20"} height={active ? "26" : "20"} viewBox="0 0 24 24" fill="none" stroke={active ? "#ffffff" : "currentColor"} strokeWidth={active ? "2.3" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 4v16M17.5 4v16M2 8.5v7M22 8.5v7M6.5 12h11"></path>
      <circle cx="4.25" cy="12" r="1.5" fill={active ? "#ffffff" : "currentColor"}></circle>
      <circle cx="19.75" cy="12" r="1.5" fill={active ? "#ffffff" : "currentColor"}></circle>
    </svg>
  );
}

export function NutritionNavIcon({ active }) {
  return (
    <svg width={active ? "26" : "20"} height={active ? "26" : "20"} viewBox="0 0 24 24" fill="none" stroke={active ? "#ffffff" : "currentColor"} strokeWidth={active ? "2.3" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
      <path d="M7 2v20"></path>
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
    </svg>
  );
}

export function AddNavIcon({ active }) {
  return (
    <svg width={active ? "28" : "22"} height={active ? "28" : "22"} viewBox="0 0 24 24" fill="none" stroke={active ? "#ffffff" : "currentColor"} strokeWidth={active ? "2.5" : "2.0"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5"></circle>
      <line x1="12" y1="8" x2="12" y2="16"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
  );
}

export function ProfileNavIcon({ active }) {
  return (
    <svg width={active ? "26" : "20"} height={active ? "26" : "20"} viewBox="0 0 24 24" fill="none" stroke={active ? "#ffffff" : "currentColor"} strokeWidth={active ? "2.3" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

export function UIIcon({ name, size = 16, color = "currentColor" }) {
  if (name === 'Home') {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
  }
  if (name === 'Target') {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;
  }
  if (name === 'Dumbbell') {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.4 14.4l-4.8-4.8"></path><path d="M10.8 18.2l-3.6-3.6 2.4-2.4 3.6 3.6z"></path><path d="M18.2 10.8l-3.6-3.6-2.4 2.4 3.6 3.6z"></path><path d="M8.4 20.6l-3.6-3.6c-.8-.8-.8-2 0-2.8l1.4-1.4 6.4 6.4-1.4 1.4c-.8.8-2 .8-2.8 0z"></path><path d="M20.6 8.4l-3.6-3.6c-.8-.8-2-.8-2.8 0l-1.4 1.4 6.4 6.4 1.4-1.4c.8-.8.8-2 0-2.8z"></path></svg>;
  }
  if (name === 'History') {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>;
  }
  if (name === 'Check') {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  }
  if (name === 'Fire') {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>;
  }
  if (name === 'ImageGallery') {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
  }
  return null;
}
