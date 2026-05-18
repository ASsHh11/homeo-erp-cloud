import { useState, useEffect } from 'react';
import type { Profile } from './lib/types';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Header from './components/Header';
import OwnerDashboard from './components/OwnerDashboard';
import FactoryManager from './components/FactoryManager';
import SalesmanTerminal from './components/SalesmanTerminal';

function AppContent() {
  const [user, setUser] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('homeopos_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('homeopos_user');
      }
    }
    setInitializing(false);
  }, []);

  const handleLogin = (profile: Profile) => {
    setUser(profile);
    localStorage.setItem('homeopos_user', JSON.stringify(profile));
  };

  const handleSwitchProfile = (profile: Profile) => {
    setUser(profile);
    localStorage.setItem('homeopos_user', JSON.stringify(profile));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('homeopos_user');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} onSwitchProfile={handleSwitchProfile} onLogout={handleLogout} />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <ErrorBoundary>
          {user.role === 'owner' && <OwnerDashboard />}
          {(user.role === 'factory1' || user.role === 'factory2') && <FactoryManager user={user} />}
          {user.role === 'salesman' && <SalesmanTerminal user={user} />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
