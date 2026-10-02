import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, type UserCredential, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export interface FirebaseGoogleUser {
  email: string;
  displayName: string;
  photoURL?: string | null;
  uid: string;
  idToken: string;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey.trim().length > 0 &&
    !firebaseConfig.apiKey.includes('Dummy') &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error('Google Sign-In is not configured. Please ensure Firebase environment variables (VITE_FIREBASE_API_KEY, etc.) are set in Vercel.');
  }

  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  if (!authInstance) {
    authInstance = getAuth(appInstance);
  }
  return authInstance;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProviderInstance) {
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({ prompt: 'select_account' });
  }
  return googleProviderInstance;
}

export async function signInWithGoogleFirebase(): Promise<FirebaseGoogleUser> {
  if (!isFirebaseConfigured()) {
    throw new Error('Google Sign-In is not configured. Please ensure Firebase environment variables (VITE_FIREBASE_API_KEY, etc.) are set in Vercel.');
  }

  const auth = getFirebaseAuth();
  const provider = getGoogleProvider();

  const result: UserCredential = await signInWithPopup(auth, provider);
  const user = result.user;
  const idToken = await user.getIdToken();

  return {
    email: user.email || '',
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Google User'),
    photoURL: user.photoURL,
    uid: user.uid,
    idToken: idToken,
  };
}
