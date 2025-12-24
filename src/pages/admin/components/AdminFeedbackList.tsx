import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  AlertCircle, 
  Bug, 
  Accessibility, 
  Lightbulb,
  Clock,
  CheckCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Monitor
} from 'lucide-react';
import { apiService } from '../../../services/api';
import type { AdminFeedbackItem, AdminFeedbackParams } from '../../../types/admin';
import { useAccessibility } from '../../../contexts/AccessibilityContext';

const ITEMS_PER_PAGE = 10;

// Badge component for status and type
interface BadgeProps {
  variant: 'status' | 'type';
  value: string;
}

const Badge: React.FC<BadgeProps> = ({ variant, value }) => {
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-900/50 text-blue-400 border-blue-500';
      case 'reviewed':
        return 'bg-yellow-900/50 text-yellow-400 border-yellow-500';
      case 'resolved':
        return 'bg-green-900/50 text-green-400 border-green-500';
      default:
        return 'bg-gray-900/50 text-gray-400 border-gray-500';
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bug':
        return 'bg-red-900/50 text-red-400 border-red-500';
      case 'accessibility':
        return 'bg-purple-900/50 text-purple-400 border-purple-500';
      case 'suggestion':
        return 'bg-cyan-900/50 text-cyan-400 border-cyan-500';
      default:
        return 'bg-gray-900/50 text-gray-400 border-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bug':
        return <Bug className="w-3 h-3" />;
      case 'accessibility':
        return <Accessibility className="w-3 h-3" />;
      case 'suggestion':
        return <Lightbulb className="w-3 h-3" />;
      default:
        return <MessageSquare className="w-3 h-3" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return <Clock className="w-3 h-3" />;
      case 'reviewed':
        return <CheckCircle className="w-3 h-3" />;
      case 'resolved':
        return <Archive className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const styles = variant === 'status' ? getStatusStyles(value) : getTypeStyles(value);
  const icon = variant === 'status' ? getStatusIcon(value) : getTypeIcon(value);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles}`}>
      {icon}
      {value}
    </span>
  );
};

const AdminFeedbackList: React.FC = () => {
  const [feedback, setFeedback] = useState<AdminFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [filters, setFilters] = useState<AdminFeedbackParams>({
    limit: ITEMS_PER_PAGE,
    offset: 0,
  });
  const { speakText, uiTtsEnabled } = useAccessibility();

  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAdminFeedback({
        ...filters,
        offset,
      });
      
      if (response.success) {
        setFeedback(response.data.feedback);
        setTotal(response.data.pagination.total);
      } else {
        setError('Failed to load feedback');
      }
    } catch (err: any) {
      console.error('Error fetching feedback:', err);
      setError(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleFilterChange = (key: keyof AdminFeedbackParams, value: string | undefined) => {
    setOffset(0); // Reset to first page when filter changes
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleNextPage = () => {
    if (total === null || offset + ITEMS_PER_PAGE < total) {
      setOffset(prev => prev + ITEMS_PER_PAGE);
    }
  };

  const handlePrevPage = () => {
    setOffset(prev => Math.max(0, prev - ITEMS_PER_PAGE));
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
  const totalPages = total !== null ? Math.ceil(total / ITEMS_PER_PAGE) : 1;

  if (loading && feedback.length === 0) {
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
          onClick={fetchFeedback}
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 
          className="text-2xl font-bold text-white flex items-center gap-2"
          onMouseEnter={() => handleHover('Feedback Reports')}
          onClick={() => handleHover('Feedback Reports')}
        >
          <MessageSquare className="w-6 h-6" />
          Feedback Reports
        </h2>
        
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value as any)}
            className="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
          
          <select
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value as any)}
            className="bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="bug">Bug</option>
            <option value="accessibility">Accessibility</option>
            <option value="suggestion">Suggestion</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedback.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No feedback reports found</p>
          </div>
        ) : (
          feedback.map((item) => (
            <div 
              key={item.id} 
              className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
              onMouseEnter={() => handleHover(`Feedback from ${item.email}: ${item.description.substring(0, 50)}`)}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{item.email}</p>
                    <p className="text-gray-500 text-sm">{formatDate(item.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="type" value={item.type} />
                  <Badge variant="status" value={item.status} />
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <p className="text-gray-300 whitespace-pre-wrap">{item.description}</p>
              </div>

              {/* Browser Info */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Monitor className="w-4 h-4" />
                <span>{item.browser_info}</span>
              </div>

              {/* Footer with ID */}
              <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-600 font-mono">ID: {item.id}</span>
                <span className="text-xs text-gray-600 font-mono">User: {item.user_id.substring(0, 8)}...</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {feedback.length > 0 && (
        <div className="bg-gray-800 rounded-lg px-6 py-3 flex items-center justify-between">
          <button
            onClick={handlePrevPage}
            disabled={offset === 0}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              offset === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-gray-400 text-sm">
            Page {currentPage} {total !== null && `of ${totalPages}`}
            {total !== null && ` (${total} total)`}
          </span>
          <button
            onClick={handleNextPage}
            disabled={total !== null && offset + ITEMS_PER_PAGE >= total}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              total !== null && offset + ITEMS_PER_PAGE >= total
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackList;
