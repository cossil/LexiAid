// Firebase configuration for AI Tutor
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration - these values would come from your Firebase project
// In production, these would be loaded from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore with the named database
// The second parameter should be a string, not an object
export const firestore = getFirestore(
  app,
  // Connect to the named database we created
  // Fallback to the specific dev database id if env var is missing/default, matching backend logic
  import.meta.env.VITE_FIREBASE_DATABASE_NAME || 'ai-tutor-dev-457802'
);

export const storage = getStorage(app);

export default app;
