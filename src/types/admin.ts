/**
 * TypeScript interfaces for Admin API responses
 */

// ============ ADMIN STATS ============

export interface AdminStatsResponse {
  success: boolean;
  data: AdminStats;
}

export interface AdminStats {
  users: {
    total: number;
    with_documents: number;
  };
  documents: {
    total: number;
    by_status: {
      processed: number;
      processing: number;
      failed: number;
      pending: number;
    };
  };
  feedback: {
    total: number;
    by_status: {
      new: number;
      reviewed: number;
      resolved: number;
    };
    by_type: {
      bug: number;
      accessibility: number;
      suggestion: number;
      other: number;
    };
  };
  generated_at: string;
  error?: string;
}

// ============ ADMIN USERS ============

export interface AdminUsersParams {
  limit?: number;
  page_token?: string;
}

export interface AdminUsersResponse {
  success: boolean;
  data: {
    users: AdminUser[];
    pagination: {
      page_token: string | null;
      has_more: boolean;
      returned: number;
    };
  };
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: string | null;
  lastSignIn: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  profile?: {
    preferences: Record<string, any>;
    gamification: {
      points: number;
      level: number;
      streak: number;
      badges?: string[];
    };
  };
}

// ============ ADMIN FEEDBACK ============

export interface AdminFeedbackParams {
  limit?: number;
  offset?: number;
  status?: 'new' | 'reviewed' | 'resolved';
  type?: 'bug' | 'accessibility' | 'suggestion' | 'other';
}

export interface AdminFeedbackResponse {
  success: boolean;
  data: {
    feedback: AdminFeedbackItem[];
    pagination: {
      total: number | null;
      limit: number;
      offset: number;
      returned: number;
    };
  };
}

export interface AdminFeedbackItem {
  id: string;
  user_id: string;
  email: string;
  type: string;
  description: string;
  browser_info: string;
  status: string;
  created_at: string;
}
