// Safe Storage Manager with QuotaExceededError protection and automatic cleanup
export const safeStorage = {
  getItem(key, fallback = null) {
    if (typeof window === 'undefined') return fallback;
    try {
      const val = window.localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch (err) {
      console.warn(`[safeStorage] Error reading '${key}':`, err);
      return fallback;
    }
  },

  getJSON(key, fallback = null) {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  setItem(key, value) {
    if (typeof window === 'undefined') return false;
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      window.localStorage.setItem(key, stringValue);
      return true;
    } catch (err) {
      if (
        err.name === 'QuotaExceededError' ||
        err.code === 22 ||
        err.code === 1014 ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      ) {
        console.warn(`[safeStorage] Storage quota exceeded while saving '${key}'. Attempting emergency pruning...`);
        this.pruneExpendableData();
        try {
          window.localStorage.setItem(key, stringValue);
          return true;
        } catch (retryErr) {
          console.error(`[safeStorage] Critical: Storage full after pruning. Could not save '${key}'.`, retryErr);
          return false;
        }
      }
      console.warn(`[safeStorage] Unexpected error setting '${key}':`, err);
      return false;
    }
  },

  removeItem(key) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[safeStorage] Error removing '${key}':`, err);
    }
  },

  // پاککردنەوەی کەشی کاتی و داتا کەم‌گرنگەکان لە کاتی پڕبوونی بیرگەدا
  pruneExpendableData() {
    if (typeof window === 'undefined') return;
    const expendablePrefixes = [
      'temp_', 'cached_audio_', 'voice_preview_', 'exercise_search_cache_', 'thumb_cache_'
    ];

    try {
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && expendablePrefixes.some(prefix => k.startsWith(prefix))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => window.localStorage.removeItem(k));
      console.log(`[safeStorage] Successfully pruned ${keysToRemove.length} temporary cache items.`);
    } catch (e) {
      console.warn('[safeStorage] Pruning failed:', e);
    }
  },

  // هەناردەکردنی سەرجەم داتاکان بۆ یاریزان (Backup JSON)
  exportFullBackup() {
    if (typeof window === 'undefined') return null;
    try {
      const dump = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k) dump[k] = window.localStorage.getItem(k);
      }
      return JSON.stringify(dump, null, 2);
    } catch (e) {
      console.error('[safeStorage] Export backup failed:', e);
      return null;
    }
  }
};

// Protect window.localStorage.setItem globally against crashes
if (typeof window !== 'undefined' && window.localStorage) {
  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = function (key, value) {
    try {
      originalSetItem(key, value);
    } catch (err) {
      if (
        err.name === 'QuotaExceededError' ||
        err.code === 22 ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      ) {
        safeStorage.pruneExpendableData();
        try {
          originalSetItem(key, value);
        } catch (retryErr) {
          console.warn(`[safeStorage] Failed to save key "${key}" even after cleanup.`, retryErr);
        }
      } else {
        throw err;
      }
    }
  };
}
