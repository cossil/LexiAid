import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { 
  User,
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification // Import sendEmailVerification
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { apiService } from '../services/api';

// Default user preferences for accessibility
const DEFAULT_USER_PREFERENCES = {
  fontSize: 16,
  fontFamily: 'OpenDyslexic',
  lineSpacing: 1.5,
  wordSpacing: 1.2,
  textColor: '#000000',
  backgroundColor: '#f8f9fa',
  highContrast: false,
  uiTtsEnabled: true,
  ttsVoice: 'en-US-Wavenet-D',
  ttsSpeed: 1.0,
  ttsPitch: 0,
  cloudTtsEnabled: false,
  cloudTtsVoice: 'en-US-Neural2-F'
};

// Type for user preferences
export interface UserPreferences {
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  wordSpacing: number;
  textColor: string;
  backgroundColor: string;
  highContrast: boolean;
  uiTtsEnabled: boolean;
  ttsVoice: string;
  ttsSpeed: number;
  ttsPitch: number;
  cloudTtsEnabled: boolean;
  cloudTtsVoice: string;
  ttsDelay?: number; // Delay in milliseconds before TTS is triggered on hover/focus
  
  // Answer Formulation preferences
  answerFormulationAutoPause?: boolean; // Auto-pause dictation when user pauses speaking
  answerFormulationPauseDuration?: number; // Duration in seconds before auto-pause triggers
  answerFormulationSessionsCompleted?: number; // Number of completed sessions
  answerFormulationAutoPauseSuggestionDismissed?: boolean; // Whether user dismissed the auto-pause tip
  answerFormulationOnboardingCompleted?: boolean; // Whether user completed guided practice
  
  getAuthToken?: (forceRefresh?: boolean) => Promise<string>;
}

// Define result type for signup
interface SignUpResult {
  user: User | null;
  partial: boolean;
  error?: string;
}

// Define the shape of our auth context
export interface AuthContextType {
  currentUser: User | null;
  userPreferences: UserPreferences;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  getAuthToken: (forceRefresh?: boolean) => Promise<string>;
}

// Create auth context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = useState(true);

  // Effect to handle auth state changes & fetch user-specific data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Ensure token is fresh, helps with timing issues on initial load
          await user.getIdToken(true);

          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            console.log(`[AuthContext:onAuthStateChanged] User doc found for ${user.uid}. Loading preferences.`);
            const userData = userDoc.data();
            setUserPreferences(userData.preferences || DEFAULT_USER_PREFERENCES);
            // Removed direct Firestore write for lastLogin as per backend architecture refactor
          } else {
            console.warn(`[AuthContext:onAuthStateChanged] User doc for ${user.uid} not found. Using defaults.`);
            // We do NOT create the doc here anymore. It should have been created by the backend on signup.
            // If it's missing, it might be a legacy user or sync issue.
            setUserPreferences(DEFAULT_USER_PREFERENCES);
          }
          setCurrentUser(user);
        } catch (error) {
          console.error('[AuthContext:onAuthStateChanged] Error processing user state:', error);
          // Fallback: set user but with default prefs if Firestore interaction fails
          setCurrentUser(user);
          setUserPreferences(DEFAULT_USER_PREFERENCES);
        } finally {
          setLoading(false);
        }
      } else {
        // No user / user signed out
        setCurrentUser(null);
        setUserPreferences(DEFAULT_USER_PREFERENCES);
        setLoading(false);
      }
    });
    return unsubscribe; // Cleanup subscription
  }, []); // Empty dependency array: runs once on mount and cleans up on unmount

  const getAuthTokenCallback = useCallback(async (forceRefresh: boolean = true): Promise<string> => {
    if (!currentUser) {
      // It's possible this gets called transiently before currentUser is set, or after logout
      // Depending on app flow, might throw, or return empty/null if handled by caller
      console.warn('[AuthContext:getAuthTokenCallback] Attempted to get token without a current user.');
      throw new Error('User not authenticated to get token.');
    }
    console.log(`[AuthContext] Getting auth token, forceRefresh: ${forceRefresh}`);
    return currentUser.getIdToken(forceRefresh);
  }, [currentUser]);

  const signInCallback = useCallback(async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Check email verification
    if (!userCredential.user.emailVerified) {
      await firebaseSignOut(auth);
      throw new Error('Please verify your email address before logging in.');
    }

    // Initialize profile just in case (e.g., legacy user or sync issue)
    try {
      await apiService.initializeUser();
    } catch (err) {
      console.warn('[AuthContext] Failed to auto-initialize user on login:', err);
      // We don't block login here, as the user exists in Auth and is verified.
      // The profile might already exist, or the backend call failed.
    }
  }, []);

  const signUpCallback = useCallback(async (email: string, password: string, displayName: string): Promise<SignUpResult> => {
    try {
      console.log('[AuthContext:signUpCallback] Starting Server-First user creation');
      
      // 1. Create User on Backend (This enforces schema and creates Firestore doc)
      await apiService.createUser({ 
        email, 
        password, 
        display_name: displayName 
      });
      console.log('[AuthContext:signUpCallback] Backend user creation successful');

      // 2. Sign In to establish session (required to send verification email)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 3. Send Verification Email
      await sendEmailVerification(userCredential.user);
      
      // 4. Sign Out immediately (enforce verification before access)
      await firebaseSignOut(auth);
      console.log('[AuthContext:signUpCallback] Verification email sent, user signed out');

      return { user: null, partial: false }; // Return null user to indicate "not logged in"
    } catch (error: any) {
      console.error('[AuthContext:signUpCallback] Signup failed:', error);
      return { 
        user: null, 
        partial: false, 
        error: error.response?.data?.message || error.message || 'Signup failed' 
      };
    }
  }, []);

  const signOutCallback = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const deleteAccountCallback = useCallback(async () => {
    if (!currentUser) return;
    try {
        console.log('[AuthContext:deleteAccountCallback] Requesting account deletion via API');
        await apiService.deleteUser();
        // Force client-side signout just in case
        await firebaseSignOut(auth);
        console.log('[AuthContext:deleteAccountCallback] Account deleted successfully');
    } catch (error) {
        console.error('[AuthContext:deleteAccountCallback] Error deleting account:', error);
        throw error;
    }
  }, [currentUser]);

  const signInWithGoogleCallback = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log('[AuthContext:signInWithGoogleCallback] Attempting Google Sign-In via popup...');
      await signInWithPopup(auth, provider);
      console.log('[AuthContext:signInWithGoogleCallback] Google Sign-In popup initiated successfully.');
      
      // Initialize profile for Google users (prevents "Ghost User" issue)
      try {
        console.log('[AuthContext] Initializing Google user profile...');
        await apiService.initializeUser();
        console.log('[AuthContext] Google user profile initialized.');
      } catch (err) {
        console.error('[AuthContext] Failed to initialize Google user profile:', err);
        // We log but don't throw, allowing the user to proceed (worst case: default profile loading in components)
      }

    } catch (error: any) {
      console.error('[AuthContext:signInWithGoogleCallback] Error during Google Sign-In popup:', error);
      if (error.code) {
        console.error('[AuthContext] Firebase Error Code (signInWithPopup):', error.code);
      }
      if (error.message) {
        console.error('[AuthContext] Firebase Error Message (signInWithPopup):', error.message);
      }
      throw error;
    }
  }, []);

  const resetPasswordCallback = useCallback(async (email: string) => {
    console.log('[AuthContext:resetPasswordCallback] Sending password reset email via Client SDK');
    await sendPasswordResetEmail(auth, email);
    console.log('[AuthContext:resetPasswordCallback] Password reset email sent');
  }, []);

  const updateUserPreferencesCallback = useCallback(async (preferences: Partial<UserPreferences>) => {
    if (!currentUser) {
      throw new Error('No user logged in to update preferences');
    }
    const newPreferences = { ...userPreferences, ...preferences };
    // Ensure getAuthToken is not part of the preferences sent to API
    const { getAuthToken, ...prefsToStore } = newPreferences;
    
    try {
        await apiService.updateUserProfile({ preferences: prefsToStore });
        setUserPreferences(newPreferences); // Update local state
        console.log('[AuthContext:updateUserPreferencesCallback] User preferences updated via API.');
    } catch (error) {
        console.error('[AuthContext:updateUserPreferencesCallback] Failed to update preferences:', error);
        // We might want to throw here so the UI knows it failed
        throw error; 
    }
  }, [currentUser, userPreferences]);

  const enhancedPreferences = useMemo(() => ({
    ...userPreferences,
    getAuthToken: getAuthTokenCallback,
  }), [userPreferences, getAuthTokenCallback]);

  const value = useMemo(() => ({
    currentUser,
    userPreferences: enhancedPreferences,
    loading,
    signIn: signInCallback,
    signUp: signUpCallback,
    signOut: signOutCallback,
    deleteAccount: deleteAccountCallback,
    signInWithGoogle: signInWithGoogleCallback,
    resetPassword: resetPasswordCallback,
    updateUserPreferences: updateUserPreferencesCallback,
    getAuthToken: getAuthTokenCallback,
  }), [
    currentUser,
    enhancedPreferences,
    loading,
    signInCallback,
    signUpCallback,
    signOutCallback,
    deleteAccountCallback,
    signInWithGoogleCallback,
    resetPasswordCallback,
    updateUserPreferencesCallback,
    getAuthTokenCallback
  ]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
