import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { Pill, LogIn, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (profile: Profile) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .eq('password_plain', password)
        .maybeSingle();

      if (dbError) {
        setError('Database connection error. Please try again.');
        return;
      }
      if (!data) {
        setError('Invalid username or password');
        return;
      }
      onLogin(data as Profile);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 shadow-lg shadow-emerald-600/30">
            <Pill className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">HomeoPOS</h1>
          <p className="text-slate-400 mt-1 text-sm">Cloud POS & Inventory ERP</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-700/50">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your workspace</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/40 border border-red-700/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter your username"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          <div className="mt-6 pt-5 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Default Accounts</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { user: 'owner', pass: 'owner123', label: 'Owner / Admin' },
                { user: 'factory1', pass: 'factory123', label: 'Factory 1 Mgr' },
                { user: 'factory2', pass: 'factory123', label: 'Factory 2 Mgr' },
                { user: 'salesman', pass: 'sales123', label: 'Salesman' },
              ].map(d => (
                <button
                  key={d.user}
                  type="button"
                  onClick={() => { setUsername(d.user); setPassword(d.pass); setError(''); }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors text-left"
                >
                  <span className="font-mono text-emerald-400">{d.user}</span>
                  <span className="block text-slate-500 text-[10px]">{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
