import React, { useState, useEffect } from 'react';
import { Users, FileText, MessageSquare, AlertCircle, CheckCircle, Clock, Bug, Accessibility, Lightbulb } from 'lucide-react';
import { apiService } from '../../../services/api';
import type { AdminStats } from '../../../types/admin';
import { useAccessibility } from '../../../contexts/AccessibilityContext';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => {
  const { speakText, uiTtsEnabled } = useAccessibility();

  const handleHover = () => {
    if (uiTtsEnabled) {
      speakText(`${title}: ${value}${subtitle ? `. ${subtitle}` : ''}`);
    }
  };

  return (
    <div 
      className={`bg-gray-800 rounded-lg p-6 border-l-4 ${color}`}
      onMouseEnter={handleHover}
      onClick={handleHover}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value.toLocaleString()}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full bg-gray-700`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface StatusBreakdownProps {
  title: string;
  data: Record<string, number>;
  colorMap: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
}

const StatusBreakdown: React.FC<StatusBreakdownProps> = ({ title, data, colorMap, iconMap }) => {
  const { speakText, uiTtsEnabled } = useAccessibility();
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  const handleHover = (label: string, count: number) => {
    if (uiTtsEnabled) {
      speakText(`${label}: ${count}`);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => {
          const percentage = total > 0 ? (value / total) * 100 : 0;
          return (
            <div 
              key={key} 
              className="flex items-center gap-3"
              onMouseEnter={() => handleHover(key, value)}
              onClick={() => handleHover(key, value)}
            >
              {iconMap?.[key] && <span className="text-gray-400">{iconMap[key]}</span>}
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300 capitalize">{key}</span>
                  <span className="text-gray-400">{value}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colorMap[key] || 'bg-blue-500'} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { speakText, uiTtsEnabled } = useAccessibility();

  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiService.getAdminStats();
        if (response.success) {
          setStats(response.data);
        } else {
          setError('Failed to load statistics');
        }
      } catch (err: any) {
        console.error('Error fetching admin stats:', err);
        setError(err.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
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
      </div>
    );
  }

  if (!stats) return null;

  const documentStatusColors: Record<string, string> = {
    processed: 'bg-green-500',
    processing: 'bg-yellow-500',
    pending: 'bg-blue-500',
    failed: 'bg-red-500',
  };

  const documentStatusIcons: Record<string, React.ReactNode> = {
    processed: <CheckCircle className="w-4 h-4" />,
    processing: <Clock className="w-4 h-4" />,
    pending: <Clock className="w-4 h-4" />,
    failed: <AlertCircle className="w-4 h-4" />,
  };

  const feedbackStatusColors: Record<string, string> = {
    new: 'bg-blue-500',
    reviewed: 'bg-yellow-500',
    resolved: 'bg-green-500',
  };

  const feedbackTypeColors: Record<string, string> = {
    bug: 'bg-red-500',
    accessibility: 'bg-purple-500',
    suggestion: 'bg-cyan-500',
    other: 'bg-gray-500',
  };

  const feedbackTypeIcons: Record<string, React.ReactNode> = {
    bug: <Bug className="w-4 h-4" />,
    accessibility: <Accessibility className="w-4 h-4" />,
    suggestion: <Lightbulb className="w-4 h-4" />,
    other: <MessageSquare className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 
          className="text-2xl font-bold text-white"
          onMouseEnter={() => handleHover('System Overview')}
          onClick={() => handleHover('System Overview')}
        >
          System Overview
        </h2>
        <p 
          className="text-gray-400 text-sm"
          onMouseEnter={() => handleHover(`Last updated: ${new Date(stats.generated_at).toLocaleString()}`)}
          onClick={() => handleHover(`Last updated: ${new Date(stats.generated_at).toLocaleString()}`)}
        >
          Last updated: {new Date(stats.generated_at).toLocaleString()}
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={stats.users.total}
          icon={<Users className="w-6 h-6 text-blue-400" />}
          color="border-blue-500"
        />
        <StatCard
          title="Total Documents"
          value={stats.documents.total}
          icon={<FileText className="w-6 h-6 text-green-400" />}
          color="border-green-500"
        />
        <StatCard
          title="Feedback Reports"
          value={stats.feedback.total}
          icon={<MessageSquare className="w-6 h-6 text-purple-400" />}
          color="border-purple-500"
          subtitle={`${stats.feedback.by_status.new} new`}
        />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusBreakdown
          title="Document Status"
          data={stats.documents.by_status}
          colorMap={documentStatusColors}
          iconMap={documentStatusIcons}
        />
        <StatusBreakdown
          title="Feedback Status"
          data={stats.feedback.by_status}
          colorMap={feedbackStatusColors}
        />
        <StatusBreakdown
          title="Feedback Types"
          data={stats.feedback.by_type}
          colorMap={feedbackTypeColors}
          iconMap={feedbackTypeIcons}
        />
      </div>
    </div>
  );
};

export default AdminOverview;
