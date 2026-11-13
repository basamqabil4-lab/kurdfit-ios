import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDD94pYeffR2b-ol445hXs-ajk9QGOGRsY",
  authDomain: "gym-01-9e96a.firebaseapp.com",
  projectId: "gym-01-9e96a",
  storageBucket: "gym-01-9e96a.firebasestorage.app",
  messagingSenderId: "789631419495",
  appId: "1:789631419495:web:17b4e781720dc8baaec0c2"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };
