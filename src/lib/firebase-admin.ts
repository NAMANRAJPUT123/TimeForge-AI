import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const apps = getApps();
const app = apps.length === 0 ? initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
}) : apps[0];

const databaseId = process.env.FIREBASE_DATABASE_ID;

export const adminAuth = getAuth(app);
export const adminFirestore = databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);
