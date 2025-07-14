import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAXCC6dygX5nEC6X1YN5TrPcLpAWRfa-Lc",
  authDomain: "menurefettorio.firebaseapp.com",
  projectId: "menurefettorio",
  storageBucket: "menurefettorio.firebasestorage.app",
  messagingSenderId: "220710526157",
  appId: "1:220710526157:web:c85fcf3c914d993ae7dd84",
  measurementId: "G-LZK5WNEM38"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "europe-west1");

// Set auth persistence to LOCAL
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('[Firebase] Auth persistence set to LOCAL');
  })
  .catch((error) => {
    console.error('[Firebase] Error setting auth persistence:', error);
  });

// Debug log for auth state changes
auth.onAuthStateChanged((user) => {
  console.log('[Firebase] Auth state changed:', user ? {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    isAnonymous: user.isAnonymous,
  } : 'User logged out');
});

export default app;