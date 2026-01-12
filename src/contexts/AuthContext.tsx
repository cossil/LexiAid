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



  // Profile Setup Fields (Root level in Firestore, but mapped here for convenience if needed, 
  // though typically these aren't preferences. We will track completion separately)

  getAuthToken?: (forceRefresh?: boolean) => Promise<string>;
}

// Result of checking if profile is complete
export interface ProfileStatus {
  isProfileComplete: boolean;
  missingFields: string[];
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
  isProfileComplete: boolean; // New flag
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  updateProfileDetails: (details: { dateOfBirth: string; visualImpairment: boolean; schoolContext: string; adaptToAge: boolean }) => Promise<void>; // New method
  getAuthToken: (forceRefresh?: boolean) => Promise<string>;
}

// Create auth context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(true); // Default true to avoid flash, will check on load
  const [loading, setLoading] = useState(true);

  // Effect to handle auth state changes & fetch user-specific data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Ensure token is fresh, helps with timing issues on initial load
          await user.getIdToken(true);

          console.log(`[AuthContext:onAuthStateChanged] Fetching user profile for ${user.uid} via API.`);

          let userData: any = null;
          try {
            // apiService.getUserProfile() returns the user data directly (already extracts response.data.data)
            const profileData = await apiService.getUserProfile();
            if (profileData && Object.keys(profileData).length > 0) {
              userData = profileData;
              console.log('[AuthContext] DEBUG: User Data from API:', JSON.stringify(userData));
            }
          } catch (apiError) {
            console.warn('[AuthContext] API profile fetch failed, using defaults or partial data:', apiError);
            // If API fails (e.g. 404 if user not init yet, though unlikely with Google Sign In flow changes), 
            // we will treat as incomplete.
          }

          if (userData) {
            setUserPreferences(userData.preferences || DEFAULT_USER_PREFERENCES);

            // Check for mandatory profile fields
            const hasDOB = !!userData.dateOfBirth;
            const hasSchool = !!userData.schoolContext;

            console.log(`[AuthContext] DEBUG: hasDOB=${hasDOB}, hasSchool=${hasSchool}`);

            const complete = hasDOB && hasSchool;
            setIsProfileComplete(complete);
            console.log(`[AuthContext] Profile completion status: ${complete}`);

          } else {
            console.warn(`[AuthContext:onAuthStateChanged] No user data returned from API. Using defaults.`);
            setUserPreferences(DEFAULT_USER_PREFERENCES);
            setIsProfileComplete(false);
          }
          setCurrentUser(user);
        } catch (error) {
          console.error('[AuthContext:onAuthStateChanged] Error processing user state:', error);
          // Fallback
          setCurrentUser(user);
          setUserPreferences(DEFAULT_USER_PREFERENCES);
        } finally {
          setLoading(false);
        }
      } else {
        // No user / user signed out
        setCurrentUser(null);
        setUserPreferences(DEFAULT_USER_PREFERENCES);
        setIsProfileComplete(true);
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

  const updateProfileDetailsCallback = useCallback(async (details: { dateOfBirth: string; visualImpairment: boolean; schoolContext: string; adaptToAge: boolean }) => {
    if (!currentUser) throw new Error('No user logged in');

    try {
      await apiService.updateUserProfile(details);
      // We assume success means it's done. Update local state immediately.
      setIsProfileComplete(true);
      console.log('[AuthContext] Profile details updated. Marked complete.');
    } catch (error) {
      console.error('[AuthContext] Failed to update profile details:', error);
      throw error;
    }
  }, [currentUser]);

  const enhancedPreferences = useMemo(() => ({
    ...userPreferences,
    getAuthToken: getAuthTokenCallback,
  }), [userPreferences, getAuthTokenCallback]);

  const value = useMemo(() => ({
    currentUser,
    userPreferences: enhancedPreferences,
    loading,
    isProfileComplete,
    signIn: signInCallback,
    signUp: signUpCallback,
    signOut: signOutCallback,
    deleteAccount: deleteAccountCallback,
    signInWithGoogle: signInWithGoogleCallback,
    resetPassword: resetPasswordCallback,
    updateUserPreferences: updateUserPreferencesCallback,
    updateProfileDetails: updateProfileDetailsCallback,
    getAuthToken: getAuthTokenCallback,
  }), [
    currentUser,
    enhancedPreferences,
    loading,
    isProfileComplete,
    signInCallback,
    signUpCallback,
    signOutCallback,
    deleteAccountCallback,
    signInWithGoogleCallback,
    resetPasswordCallback,
    updateUserPreferencesCallback,
    updateProfileDetailsCallback,
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
