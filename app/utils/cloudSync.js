import { db, storage } from '../../lib/firebase';
import { 
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, 
  getDocs, onSnapshot, query, orderBy 
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * ئەپلۆدکردنی وێنەکانی جەستە بۆ Firebase Storage
 */
export async function uploadPhysiquePhotos(userId, capturedImages = {}) {
  const resultUrls = {
    frontUrl: null,
    sideUrl: null,
    backUrl: null,
    uploadedAt: new Date().toISOString()
  };

  if (!userId || !capturedImages) return resultUrls;

  const poses = ['front', 'side', 'back'];
  for (const pose of poses) {
    const base64Data = capturedImages[pose];
    if (!base64Data) continue;

    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `physique_scans/${userId}/${timestamp}_${pose}.jpg`);
      
      const formattedData = base64Data.startsWith('data:') 
        ? base64Data 
        : `data:image/jpeg;base64,${base64Data}`;

      const uploadResult = await uploadString(storageRef, formattedData, 'data_url');
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      resultUrls[`${pose}Url`] = downloadUrl;
    } catch (storageErr) {
      console.warn(`Storage upload error for ${pose}, falling back to direct secure base64:`, storageErr.message);
      resultUrls[`${pose}Url`] = base64Data;
    }
  }

  return resultUrls;
}

/**
 * گۆڕینی دۆخی هەژماری یاریزان (ڕاگرتن / چالاککردنەوە لە دوورەوە)
 */
export async function setAthleteSuspensionState(athleteId, isSuspended, reason = '') {
  if (!athleteId) return false;
  try {
    const userRef = doc(db, 'users', athleteId);
    await updateDoc(userRef, {
      isSuspended: Boolean(isSuspended),
      status: isSuspended ? 'suspended' : 'active',
      suspendReason: reason || (isSuspended ? 'هەژمارەکەت ڕاگیراوە لەلایەن ڕاهێنەرەوە' : ''),
      suspendedAt: isSuspended ? new Date().toISOString() : null,
      lastAdminAction: new Date().toISOString()
    });
    return true;
  } catch (e) {
    console.error('Error setting athlete suspension:', e);
    try {
      await setDoc(doc(db, 'users', athleteId), {
        isSuspended: Boolean(isSuspended),
        status: isSuspended ? 'suspended' : 'active',
        suspendReason: reason || (isSuspended ? 'هەژمارەکەت ڕاگیراوە لەلایەن ڕاهێنەرەوە' : ''),
        lastAdminAction: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err2) {
      console.error('Final update error:', err2);
      throw err2;
    }
  }
}

/**
 * نوێکردنەوە و دەستکاریکردنی کۆرسی یاریزان لە لایەن ڕاهێنەرەوە
 */
export async function pushAdminCourseToAthlete(athleteId, newWorkoutCourse, coachNotes = '') {
  if (!athleteId || !newWorkoutCourse) return false;
  try {
    const userRef = doc(db, 'users', athleteId);
    await updateDoc(userRef, {
      workoutCourse: {
        ...newWorkoutCourse,
        adminNotes: coachNotes || '',
        updatedByAdmin: true,
        lastAdminUpdate: new Date().toISOString()
      },
      lastAdminAction: new Date().toISOString()
    });
    return true;
  } catch (e) {
    console.error('Error pushing course to athlete:', e);
    try {
      await setDoc(doc(db, 'users', athleteId), {
        workoutCourse: {
          ...newWorkoutCourse,
          adminNotes: coachNotes || '',
          updatedByAdmin: true,
          lastAdminUpdate: new Date().toISOString()
        }
      }, { merge: true });
      return true;
    } catch (err2) {
      throw err2;
    }
  }
}

/**
 * هێنانی تەواوی لیستی یاریزانەکان بۆ ناو داشبۆردی ڕاهێنەر
 */
export async function fetchAllAthletes() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const athletes = [];
    usersSnap.forEach(d => {
      const data = d.data();
      athletes.push({
        id: d.id,
        ...data
      });
    });
    return athletes;
  } catch (e) {
    console.error('Error fetching athletes list:', e);
    throw e;
  }
}

/**
 * گوێگرتنی ڕاستەوخۆ (Realtime Live Listener) بۆ تەواوی یاریزانەکان لە داشبۆرد
 */
export function subscribeToAllAthletes(onAthletesChange) {
  try {
    return onSnapshot(collection(db, 'users'), (snap) => {
      const list = [];
      snap.forEach(d => {
        list.push({
          id: d.id,
          ...d.data()
        });
      });
      onAthletesChange(list);
    }, (err) => {
      console.warn('Realtime athletes subscription warning:', err.message);
    });
  } catch (e) {
    console.warn('subscribeToAllAthletes error:', e);
    return () => {};
  }
}

/**
 * گوێگرتنی ڕاستەوخۆ بۆ دۆخی قفڵبوونی مۆبایلی یاریزان
 */
export function subscribeToAthleteStatus(userId, onStatusChange) {
  if (!userId) return () => {};
  try {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onStatusChange({
          isSuspended: Boolean(data.isSuspended || data.status === 'suspended'),
          suspendReason: data.suspendReason || '',
          updatedWorkoutCourse: data.workoutCourse?.updatedByAdmin ? data.workoutCourse : null
        });
      }
    }, (err) => {
      console.warn('Realtime status subscription warning:', err.message);
    });
  } catch (e) {
    console.warn('Subscription setup error:', e);
    return () => {};
  }
}

// =========================================================================
// بەڕێوەبردنی ئەدمینەکان و ڕۆڵەکان (Admin & Role Management)
// =========================================================================

export const DEFAULT_SUPER_ADMIN = {
  id: 'admin_master_01',
  name: 'سەرپەرشتیاری گشتی (Super Admin)',
  email: 'admin@bqgym.com',
  pin: '7788',
  role: 'super_admin',
  permissions: {
    canManageAdmins: true,
    canSuspend: true,
    canEditCourse: true,
    canViewPhotos: true
  },
  createdAt: '2026-01-01T00:00:00.000Z'
};

export async function fetchAdminsList() {
  try {
    const snap = await getDocs(collection(db, 'admins'));
    const list = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() });
    });
    // ئەگەر لیستی ئەدمین لە فایەربەیس خاڵی بوو، سوپەر ئەدمینی پێشوەختە دادەنێین
    if (list.length === 0) {
      list.push(DEFAULT_SUPER_ADMIN);
      try {
        await setDoc(doc(db, 'admins', DEFAULT_SUPER_ADMIN.id), DEFAULT_SUPER_ADMIN);
      } catch (e) {}
    }
    return list;
  } catch (e) {
    console.warn('fetchAdminsList fallback to local:', e.message);
    let local = [];
    try {
      local = JSON.parse(localStorage.getItem('bq_admins_list') || '[]');
    } catch {}
    if (!local.length) local = [DEFAULT_SUPER_ADMIN];
    return local;
  }
}

export async function saveAdminAccount(adminData) {
  if (!adminData || !adminData.id) return false;
  try {
    await setDoc(doc(db, 'admins', adminData.id), adminData, { merge: true });
  } catch (e) {
    console.warn('Cloud save admin warning:', e.message);
  }
  // هەروەها پاشەکەوتکردن لە لۆکاڵ ستۆریج
  try {
    const list = await fetchAdminsList();
    const existingIdx = list.findIndex(a => a.id === adminData.id);
    if (existingIdx >= 0) list[existingIdx] = adminData;
    else list.push(adminData);
    localStorage.setItem('bq_admins_list', JSON.stringify(list));
  } catch {}
  return true;
}

export async function deleteAdminAccount(adminId) {
  if (!adminId || adminId === 'admin_master_01') return false;
  try {
    await deleteDoc(doc(db, 'admins', adminId));
  } catch (e) {
    console.warn('Cloud delete admin warning:', e.message);
  }
  try {
    const list = await fetchAdminsList();
    const filtered = list.filter(a => a.id !== adminId);
    localStorage.setItem('bq_admins_list', JSON.stringify(filtered));
  } catch {}
  return true;
}
