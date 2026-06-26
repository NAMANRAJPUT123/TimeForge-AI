import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Calendar scopes
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In with popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const triggerSandboxSignIn = (): { user: any; accessToken: string } => {
  const mockUser = {
    uid: 'demo-sandbox-judge',
    displayName: 'Review Judge (Sandbox)',
    email: 'judge@hackathon.local',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80',
    getIdToken: async () => 'demo-sandbox-id-token',
  };
  cachedAccessToken = 'demo-sandbox-token-12345';
  return { user: mockUser as any, accessToken: cachedAccessToken };
};

export const isSandboxToken = (token: string | null): boolean => {
  return token === 'demo-sandbox-token-12345';
};

export const sandboxFetch = async (url: string, options: RequestInit): Promise<Response> => {
  const authHeader = options.headers && (options.headers as any)['Authorization'];
  const token = authHeader?.replace('Bearer ', '');
  if (isSandboxToken(token)) {
    // Delay slightly to simulate network round-trip
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'mock-event-id-' + Math.random().toString(36).substr(2, 9) })
    } as any;
  }
  return fetch(url, options);
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Collection Reference for Multi-Device Backups
export const backupsCollection = collection(db, 'backups');

/**
 * Saves tasks to Firestore under a specific Backup Sync ID
 */
export async function saveBackupToCloud(syncId: string, tasks: any[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'backups', syncId);
    await setDoc(docRef, {
      tasks,
      lastSyncedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error backing up data to Firebase Firestore:', error);
    return false;
  }
}

/**
 * Fetches tasks from Firestore under a specific Backup Sync ID
 */
export async function fetchBackupFromCloud(syncId: string): Promise<any[] | null> {
  try {
    const docRef = doc(db, 'backups', syncId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.tasks || [];
    }
    return null;
  } catch (error) {
    console.error('Error fetching backup from Firebase Firestore:', error);
    return null;
  }
}
