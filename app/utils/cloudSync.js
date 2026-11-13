import { db, storage } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * ئەپلۆدکردنی وێنەکانی جەستە بۆ Firebase Storage
 * ئەگەر لە هەر بارودۆخێک ستۆریج ڕێگەی نەدا، دەقاوپڕ لە فایەربەیس داتابەیس پاشەکەوت دەبێت
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
      
      // دڵنیابوونەوە لە فۆرماتی data_url
      const formattedData = base64Data.startsWith('data:') 
        ? base64Data 
        : `data:image/jpeg;base64,${base64Data}`;

      const uploadResult = await uploadString(storageRef, formattedData, 'data_url');
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      resultUrls[`${pose}Url`] = downloadUrl;
    } catch (storageErr) {
      console.warn(`Storage upload error for ${pose}, falling back to direct secure base64:`, storageErr.message);
      // ئەگەر فایەربەیس ستۆریج قفڵ بوو، وێنە کۆمپرێسکراوەکە دەستبەجێ بە سەلامەتی دەمێنێتەوە
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
    // هەوڵدانەوە بە setDoc لەگەڵ merge ئەگەر دۆکیومێنتەکە تەواو نەبوو
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
 * گوێگرتنی ڕاستەوخۆ (Realtime Listener) بۆ دۆخی قفڵبوونی مۆبایلی یاریزان
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
