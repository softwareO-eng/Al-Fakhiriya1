import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCtY9haS_-2GPhaccfbmOayA9-w98Dogus",
  authDomain: "probablyq-94d26.firebaseapp.com",
  projectId: "probablyq-94d26",
  storageBucket: "probablyq-94d26.firebasestorage.app",
  messagingSenderId: "98857862837",
  appId: "1:98857862837:web:afc2f165ffa2b35247e0fc",
  measurementId: "G-GGLTW4WSR1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
