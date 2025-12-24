import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Mail,
  Calendar,
  Clock,
  Trophy,
  Flame,
  Star,
  RefreshCw // Added RefreshCw
} from 'lucide-react';
import { apiService } from '../../../services/api';
import type { AdminUser } from '../../../types/admin';
import { useAccessibility } from '../../../contexts/AccessibilityContext';
import { toast } from 'react-hot-toast'; // Added toast

const AdminUsersTable: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); // Added syncing state
  const [error, setError] = useState<string | null>(null);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const { speakText, uiTtsEnabled } = useAccessibility();

  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  const fetchUsers = useCallback(async (token?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAdminUsers({ 
        limit: 20,
        page_token: token || undefined 
      });
      
      if (response.success) {
        setUsers(response.data.users);
        setHasMore(response.data.pagination.has_more);
        if (response.data.pagination.page_token) {
          setPageToken(response.data.pagination.page_token);
        }
      } else {
        setError('Failed to load users');
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSyncUsers = async () => {
    try {
      setSyncing(true);
      toast.loading('Syncing users...', { id: 'sync-users' });
      
      const response = await apiService.syncUsers();
      
      if (response.success) {
        toast.success(`Sync complete: ${response.data.fixed} profiles fixed, ${response.data.processed} processed`, { id: 'sync-users' });
        // Reload the table
        fetchUsers(null);
      } else {
        toast.error('Sync failed', { id: 'sync-users' });
      }
    } catch (error: any) {
      console.error('Error syncing users:', error);
      toast.error(`Sync error: ${error.message}`, { id: 'sync-users' });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleNextPage = () => {
    if (pageToken && hasMore) {
      setPageHistory(prev => [...prev, '']); // Store current position
      fetchUsers(pageToken);
    }
  };

  const handlePrevPage = () => {
    if (pageHistory.length > 0) {
      const newHistory = [...pageHistory];
      newHistory.pop();
      setPageHistory(newHistory);
      // Go back to first page for simplicity (token-based pagination doesn't support true back navigation)
      fetchUsers(null);
    }
  };

  const toggleUserExpand = (uid: string) => {
    setExpandedUser(expandedUser === uid ? null : uid);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-400">{error}</p>
        <button 
          onClick={() => fetchUsers()}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 
          className="text-2xl font-bold text-white flex items-center gap-2"
          onMouseEnter={() => handleHover('User Management')}
          onClick={() => handleHover('User Management')}
        >
          <Users className="w-6 h-6" />
          User Management
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSyncUsers}
            disabled={syncing || loading}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              syncing 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
            }`}
            title="Sync missing user profiles"
            onMouseEnter={() => handleHover('Sync missing user profiles')}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Users
          </button>
          <p className="text-gray-400 text-sm">
            Showing {users.length} users
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Sign In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Gamification
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <React.Fragment key={user.uid}>
                  <tr 
                    className="hover:bg-gray-750 cursor-pointer transition-colors"
                    onClick={() => toggleUserExpand(user.uid)}
                    onMouseEnter={() => handleHover(`${user.displayName || user.email}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {(user.displayName || user.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {user.displayName || 'No name'}
                          </div>
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.emailVerified 
                            ? 'bg-green-900/50 text-green-400' 
                            : 'bg-yellow-900/50 text-yellow-400'
                        }`}>
                          {user.emailVerified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                        {user.disabled && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-400">
                            <XCircle className="w-3 h-3" />
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        {formatDate(user.lastSignIn)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.profile?.gamification ? (
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Trophy className="w-4 h-4" />
                            {user.profile.gamification.points}
                          </span>
                          <span className="flex items-center gap-1 text-orange-400">
                            <Flame className="w-4 h-4" />
                            {user.profile.gamification.streak}
                          </span>
                          <span className="flex items-center gap-1 text-blue-400">
                            <Star className="w-4 h-4" />
                            Lv.{user.profile.gamification.level}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No data</span>
                      )}
                    </td>
                  </tr>
                  {/* Expanded Row */}
                  {expandedUser === user.uid && (
                    <tr className="bg-gray-750">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">User ID</p>
                            <p className="text-gray-300 font-mono text-xs break-all">{user.uid}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Phone</p>
                            <p className="text-gray-300">{user.phoneNumber || 'Not set'}</p>
                          </div>
                          {user.profile?.preferences && (
                            <>
                              <div>
                                <p className="text-gray-500">Font Family</p>
                                <p className="text-gray-300">{user.profile.preferences.fontFamily || 'Default'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">TTS Enabled</p>
                                <p className="text-gray-300">
                                  {user.profile.preferences.uiTtsEnabled ? 'Yes' : 'No'}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-700 px-6 py-3 flex items-center justify-between">
          <button
            onClick={handlePrevPage}
            disabled={pageHistory.length === 0}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              pageHistory.length === 0
                ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-500 text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-gray-400 text-sm">
            Page {pageHistory.length + 1}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!hasMore || loading}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              !hasMore || loading
                ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-500 text-white'
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersTable;
