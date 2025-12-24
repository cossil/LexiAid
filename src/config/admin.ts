/**
 * Admin Configuration
 * 
 * Contains the list of admin emails and helper functions for admin access control.
 * Note: This is a client-side check for UX purposes only.
 * The backend @require_admin decorator is the source of truth for security.
 */

export const ADMIN_EMAILS: string[] = [
  'cossil@gmail.com',
  'cossil@lexiaid.com',
];

/**
 * Check if an email address belongs to an admin user.
 * Used for conditional UI rendering (hiding/showing admin links).
 * 
 * @param email - The email address to check
 * @returns true if the email is in the admin list
 */
export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};
