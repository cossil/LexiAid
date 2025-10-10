import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { 
  User,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

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
  user: User;
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
            // Update last login asynchronously, don't let it block user setup
            setDoc(userDocRef, { lastLogin: new Date() }, { merge: true })
              .catch(err => console.error("[AuthContext] Failed to update lastLogin", err));
          } else {
            console.warn(`[AuthContext:onAuthStateChanged] User doc for ${user.uid} not found. Creating new doc.`);
            const newUserDocData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0],
              createdAt: new Date(),
              lastLogin: new Date(),
              preferences: DEFAULT_USER_PREFERENCES,
              gamification: { points: 0, streak: 0, level: 1, badges: [] }
            };
            await setDoc(userDocRef, newUserDocData);
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
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpCallback = useCallback(async (email: string, password: string, displayName: string): Promise<SignUpResult> => {
    let userCredential;
    let firestoreError = false;
    try {
      console.log('[AuthContext:signUpCallback] Starting user creation in Firebase Auth');
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('[AuthContext:signUpCallback] User created successfully in Firebase Auth');
      try {
        console.log('[AuthContext:signUpCallback] Setting displayName in Firebase Auth user profile');
        await updateProfile(userCredential.user, {
          displayName: displayName || userCredential.user.email?.split('@')[0]
        });
        console.log('[AuthContext:signUpCallback] DisplayName set successfully in Firebase Auth user profile');
      } catch (profileErr) {
        console.error('[AuthContext:signUpCallback] Error setting displayName in Firebase Auth:', profileErr);
      }
      try {
        const user = userCredential.user;
        console.log('[AuthContext:signUpCallback] Attempting to create user document in Firestore');
        await setDoc(doc(firestore, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName || user.email?.split('@')[0],
          createdAt: new Date(),
          lastLogin: new Date(),
          preferences: DEFAULT_USER_PREFERENCES,
          gamification: { points: 0, streak: 0, level: 1, badges: [] }
        });
        console.log('[AuthContext:signUpCallback] User document created successfully in Firestore');
      } catch (firestoreErr) {
        console.error('[AuthContext:signUpCallback] Firestore document creation failed:', firestoreErr);
        firestoreError = true;
      }
      if (firestoreError) {
        return {
          user: userCredential.user,
          partial: true,
          error: 'Created account but failed to set up user profile. Some features may be limited.'
        };
      }
      return { user: userCredential.user, partial: false };
    } catch (error) {
      console.error('[AuthContext:signUpCallback] Firebase Auth signup failed:', error);
      if (userCredential?.user) {
        try {
          console.log('[AuthContext:signUpCallback] Cleaning up auth user after error');
          await userCredential.user.delete();
        } catch (deleteError) {
          console.error('[AuthContext:signUpCallback] Error cleaning up auth user:', deleteError);
        }
      }
      throw error;
    }
  }, []); // Depends on module-level `auth`, `firestore`, `DEFAULT_USER_PREFERENCES`

  const signOutCallback = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const signInWithGoogleCallback = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log('[AuthContext:signInWithGoogleCallback] Attempting Google Sign-In via popup...');
      await signInWithPopup(auth, provider);
      console.log('[AuthContext:signInWithGoogleCallback] Google Sign-In popup initiated successfully.');
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
    await sendPasswordResetEmail(auth, email);
  }, []);

  const updateUserPreferencesCallback = useCallback(async (preferences: Partial<UserPreferences>) => {
    if (!currentUser) {
      throw new Error('No user logged in to update preferences');
    }
    const newPreferences = { ...userPreferences, ...preferences };
    // Ensure getAuthToken is not part of the preferences stored in Firestore
    const { getAuthToken, ...prefsToStore } = newPreferences;
    await setDoc(doc(firestore, 'users', currentUser.uid), { preferences: prefsToStore }, { merge: true });
    setUserPreferences(newPreferences); // Update local state with the full newPreferences object (including getAuthToken method)
    console.log('[AuthContext:updateUserPreferencesCallback] User preferences updated.');
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
