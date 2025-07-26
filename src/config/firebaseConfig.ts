// src/config/firebaseConfig.ts
// Firebase configuration for the application
import Constants from 'expo-constants';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Get env variables from expo config
const extra = Constants.expoConfig?.extra || {};

const firebaseConfig = {
  apiKey: extra.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: extra.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: extra.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: extra.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check if all required environment variables are set
const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID'
];

for (const envVar of requiredEnvVars) {
  if (!extra[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth (default, in-memory persistence)
const auth = getAuth(app);

// Export the services that will be used
export { db, auth };