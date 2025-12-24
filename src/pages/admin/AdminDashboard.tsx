import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BarChart3, Users, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { isAdminEmail } from '../../config/admin';
import { apiService } from '../../services/api';
import AdminOverview from './components/AdminOverview';
import AdminUsersTable from './components/AdminUsersTable';
import AdminFeedbackList from './components/AdminFeedbackList';

type TabId = 'overview' | 'users' | 'feedback';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquare className="w-4 h-4" /> },
];

const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { speakText, uiTtsEnabled, highContrast } = useAccessibility();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isVerifying, setIsVerifying] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  // Verify admin access on mount
  useEffect(() => {
    const verifyAccess = async () => {
      // Quick client-side check first
      if (!isAdminEmail(currentUser?.email)) {
        toast.error('Admin access required');
        navigate('/dashboard');
        return;
      }

      // Verify with backend (catches stale client code or unauthorized access)
      try {
        await apiService.getAdminStats();
        setIsVerifying(false);
      } catch (error: any) {
        console.error('Admin access verification failed:', error);
        if (error.response?.status === 403) {
          setAccessDenied(true);
          toast.error('You do not have admin access');
          // Delay redirect to show the error state
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          // Other errors - still allow access if client-side check passed
          setIsVerifying(false);
        }
      }
    };

    verifyAccess();
  }, [currentUser, navigate]);

  // Loading state while verifying
  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-400">Verifying admin access...</p>
      </div>
    );
  }

  // Access denied state
  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400 mb-4">You do not have permission to access the Admin Console.</p>
        <p className="text-gray-500 text-sm">Redirecting to dashboard...</p>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview />;
      case 'users':
        return <AdminUsersTable />;
      case 'feedback':
        return <AdminFeedbackList />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${highContrast ? 'bg-white' : 'bg-blue-600'}`}>
            <Shield className={`w-6 h-6 ${highContrast ? 'text-black' : 'text-white'}`} />
          </div>
          <h1 
            className="text-3xl font-bold text-white"
            onMouseEnter={() => handleHover('Admin Console')}
            onClick={() => handleHover('Admin Console')}
          >
            Admin Console
          </h1>
        </div>
        <p 
          className="text-gray-400"
          onMouseEnter={() => handleHover('Manage users, view statistics, and review feedback')}
          onClick={() => handleHover('Manage users, view statistics, and review feedback')}
        >
          Manage users, view statistics, and review feedback
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className={`flex gap-1 p-1 rounded-lg ${highContrast ? 'bg-gray-900' : 'bg-gray-800'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={() => handleHover(tab.label)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? highContrast
                    ? 'bg-white text-black'
                    : 'bg-blue-600 text-white'
                  : highContrast
                    ? 'text-white hover:bg-gray-800'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
