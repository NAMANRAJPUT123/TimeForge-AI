import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

const apps = getApps();
const app = apps.length === 0 ? initializeApp({
  projectId: firebaseConfig.projectId,
}) : apps[0];

export const adminAuth = getAuth(app);
export const adminFirestore = getFirestore(app);
