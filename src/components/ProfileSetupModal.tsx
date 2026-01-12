import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SCHOOL_CONTEXT_OPTIONS = [
    "Elementary (Grades 1-5)",
    "Middle School - 1st Year (6th Grade)",
    "Middle School - 2nd Year (7th Grade)",
    "Middle School - 3rd Year (8th Grade)",
    "High School - 1st Year (9th Grade)",
    "High School - 2nd Year (10th Grade)",
    "High School - 3rd Year (11th Grade)",
    "High School - 4th Year (12th Grade)",
    "College / University",
    "Adult Learner"
];

const ProfileSetupModal: React.FC = () => {
    const { currentUser, isProfileComplete, updateProfileDetails, signOut } = useAuth();

    const [formData, setFormData] = useState({
        dateOfBirth: '',
        schoolContext: '',
        visualImpairment: false,
        adaptToAge: true,
    });

    const [loading, setLoading] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Logic: Render ONLY if user is logged in AND profile is incomplete
    if (!currentUser || isProfileComplete) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Basic Validation
        if (!formData.dateOfBirth) {
            setError('Please select your date of birth.');
            return;
        }
        if (!formData.schoolContext) {
            setError('Please select your school context.');
            return;
        }

        setLoading(true);
        try {
            await updateProfileDetails(formData);
            // Success is handled by context state update which will unmount this modal
        } catch (err: any) {
            console.error('Profile setup error:', err);
            setError(err.message || 'Failed to save profile details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        setError(null);
        setSigningOut(true);
        try {
            await signOut();
        } catch (err: any) {
            console.error('Sign out error:', err);
            setError(err.message || 'Failed to sign out. Please try again.');
        } finally {
            setSigningOut(false);
        }
    };

    const currentYear = new Date().getFullYear();

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="bg-indigo-600 px-6 py-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome to LexiAid!</h2>
                    <p className="text-indigo-100/90 text-xs mb-3">
                        Signed in as: {currentUser.email || 'Unknown'}
                    </p>
                    <p className="text-indigo-100 text-sm">
                        Please complete your profile so we can personalize your learning experience.
                    </p>
                </div>

                {/* content */}
                <div className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Date of Birth */}
                        <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Date of Birth <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                id="dob"
                                max={`${currentYear}-01-01`} // Basic future prevention
                                value={formData.dateOfBirth}
                                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                required
                            />
                        </div>

                        {/* School Context */}
                        <div>
                            <label htmlFor="schoolContext" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                School Context / Grade Level <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="schoolContext"
                                value={formData.schoolContext}
                                onChange={(e) => setFormData(prev => ({ ...prev, schoolContext: e.target.value }))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none"
                                required
                            >
                                <option value="" disabled>Select your current level</option>
                                {SCHOOL_CONTEXT_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Visual Impairment */}
                        <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center h-5">
                                <input
                                    id="visualImpairment"
                                    type="checkbox"
                                    checked={formData.visualImpairment}
                                    onChange={(e) => setFormData(prev => ({ ...prev, visualImpairment: e.target.checked }))}
                                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div className="ml-1 text-sm">
                                <label htmlFor="visualImpairment" className="font-medium text-gray-900 dark:text-gray-100">
                                    I have a visual impairment or blindness
                                </label>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                                    We'll optimize the interface for screen readers and accessibility.
                                </p>
                            </div>
                        </div>

                        {/* Adapt to Age */}
                        <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center h-5">
                                <input
                                    id="adaptToAge"
                                    type="checkbox"
                                    checked={formData.adaptToAge}
                                    onChange={(e) => setFormData(prev => ({ ...prev, adaptToAge: e.target.checked }))}
                                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div className="ml-1 text-sm">
                                <label htmlFor="adaptToAge" className="font-medium text-gray-900 dark:text-gray-100">
                                    Adapt AI answers to my age
                                </label>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                                    The AI will adjust complexity based on your birth date.
                                </p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || signingOut}
                            className={`w-full py-3 px-4 rounded-xl text-white font-medium shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] 
                ${loading
                                    ? 'bg-indigo-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving Profile...
                                </span>
                            ) : (
                                'Complete Setup'
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleSignOut}
                            disabled={loading || signingOut}
                            className="w-full py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 bg-white/70 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        >
                            {signingOut ? 'Signing Out...' : 'Sign Out'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileSetupModal;
