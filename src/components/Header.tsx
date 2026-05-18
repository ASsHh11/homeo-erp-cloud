import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Role } from '../lib/types';
import { ROLE_LABELS } from '../lib/types';
import { Pill, LogOut, ChevronDown } from 'lucide-react';

interface HeaderProps {
  user: Profile;
  onSwitchProfile: (profile: Profile) => void;
  onLogout: () => void;
}

export default function Header({ user, onSwitchProfile, onLogout }: HeaderProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isOwner = user.role === 'owner';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isOwner) fetchProfiles();
  }, [isOwner]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('role');
    if (data) setProfiles(data as Profile[]);
  };

  const handleSwitch = async (username: string) => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
    if (data) {
      onSwitchProfile(data as Profile);
      localStorage.setItem('homeopos_user', JSON.stringify(data));
    }
    setDropdownOpen(false);
    setLoading(false);
  };

  const roleOrder: Role[] = ['owner', 'factory1', 'factory2', 'salesman'];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Pill className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 hidden sm:block">HomeoPOS</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Profile Switcher - ONLY visible for owner */}
          {isOwner && (
            <div className="relative" ref={ref}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                  {user.full_name.charAt(0)}
                </div>
                <span className="hidden sm:inline text-slate-700 font-medium">{user.full_name}</span>
                <span className="hidden md:inline text-slate-400 text-xs">({ROLE_LABELS[user.role]})</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50">
                  <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Profile Switcher
                  </div>
                  {roleOrder.map(role => {
                    const p = profiles.find(pr => pr.role === role);
                    if (!p) return null;
                    return (
                      <button
                        key={p.username}
                        onClick={() => handleSwitch(p.username)}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                          p.username === user.username ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          p.username === user.username ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">{p.full_name}</div>
                          <div className="text-[11px] text-slate-400">{ROLE_LABELS[p.role]}</div>
                        </div>
                        {p.username === user.username && (
                          <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Non-owner: just show name/role badge */}
          {!isOwner && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                {user.full_name.charAt(0)}
              </div>
              <span className="hidden sm:inline text-slate-700 font-medium">{user.full_name}</span>
              <span className="hidden md:inline text-slate-400 text-xs">({ROLE_LABELS[user.role]})</span>
            </div>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
