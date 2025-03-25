import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { AuthForm } from './components/AuthForm';
import { LoanApplicationForm } from './components/LoanApplicationForm';
import { LoanList } from './components/LoanList';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileForm } from './components/ProfileForm';
import { ChatSupport } from './components/ChatSupport';
import { User } from '@supabase/supabase-js';
import { LogOut, UserCircle, MessageSquare, Home, FileText, Users, Settings, HandHeart } from 'lucide-react';
import { AdminState, UserProfile } from './types';
import { Toaster } from 'react-hot-toast';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [adminState, setAdminState] = useState<AdminState>({ isAdmin: false, profile: null });
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'home' | 'profile' | 'chat'>('home');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setAdminState({
        isAdmin: profile?.is_admin ?? false,
        profile: profile
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAdminState({ isAdmin: false, profile: null });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
        <Toaster position="top-right" />
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b bg-gradient-to-r from-emerald-600 to-green-500">
            <div className="flex items-center gap-3 text-white">
              <HandHeart className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Msaada</h1>
                <p className="text-sm text-emerald-100">
                  {adminState.isAdmin ? 'Admin Portal' : 'Quick Loans'}
                </p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setActiveSection('home')}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                    activeSection === 'home'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Home size={20} />
                  <span>{adminState.isAdmin ? 'Dashboard' : 'My Loans'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('profile')}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                    activeSection === 'profile'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <UserCircle size={20} />
                  <span>Profile</span>
                </button>
              </li>
              {!adminState.isAdmin && (
                <li>
                  <button
                    onClick={() => setActiveSection('chat')}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                      activeSection === 'chat'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <MessageSquare size={20} />
                    <span>Support</span>
                  </button>
                </li>
              )}
            </ul>
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeSection === 'home'
                    ? adminState.isAdmin
                      ? 'Admin Dashboard'
                      : 'My Loans'
                    : activeSection === 'profile'
                    ? 'My Profile'
                    : 'Customer Support'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {activeSection === 'home'
                    ? adminState.isAdmin
                      ? 'Manage loan applications and users'
                      : 'View and manage your loan applications'
                    : activeSection === 'profile'
                    ? 'Update your personal information'
                    : 'Get help from our support team'}
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-8">
            {activeSection === 'profile' ? (
              <ProfileForm />
            ) : activeSection === 'chat' && !adminState.isAdmin ? (
              <ChatSupport />
            ) : adminState.isAdmin ? (
              <AdminDashboard />
            ) : (
              <>
                <LoanApplicationForm />
                <LoanList />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;