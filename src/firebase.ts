import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseAppletConfig);
export const db = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
