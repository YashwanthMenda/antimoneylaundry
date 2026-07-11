'use client';

import React, { useEffect, useState } from 'react';
import { Search, Bell, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Topbar() {
  const [searchVal, setSearchVal] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Update time every minute
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    // Load new alert count
    const supabase = createClient();
    supabase?.from('alerts')?.select('*', { count: 'exact', head: true })?.eq('alert_status', 'New')?.then(({ count }) => { if (count !== null) setAlertCount(count); });

    const channel = supabase?.channel('topbar_alerts')?.on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        supabase?.from('alerts')?.select('*', { count: 'exact', head: true })?.eq('alert_status', 'New')?.then(({ count }) => { if (count !== null) setAlertCount(count); });
      })?.subscribe();

    return () => {
      clearInterval(timer);
      supabase?.removeChannel(channel);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router?.push('/sign-up-login-screen');
      router?.refresh();
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 bg-muted border border-border rounded-md px-3 py-1.5 w-72">
        <Search size={14} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="Search accounts, cases, alerts… ⌘K"
          value={searchVal}
          onChange={(e) => setSearchVal(e?.target?.value)}
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
        />
      </div>
      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-risk-low animate-pulse" />
          <span className="text-xs text-muted-foreground font-mono">LIVE</span>
        </div>

        {/* Last updated */}
        {currentTime && (
          <span className="text-xs text-muted-foreground font-mono hidden md:block">
            {currentTime}
          </span>
        )}

        <button
          onClick={() => router?.refresh()}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150"
          aria-label="Refresh data"
        >
          <RefreshCw size={16} />
        </button>

        {/* Notifications */}
        <button
          className="relative p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {alertCount !== null && alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">{alertCount > 9 ? '9+' : alertCount}</span>
            </span>
          )}
        </button>

        {/* User + Sign Out */}
        {user && (
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-semibold text-foreground leading-tight">
                {user?.user_metadata?.full_name || user?.email?.split('@')?.[0]}
              </p>
              <p className="text-[9px] text-muted-foreground capitalize">
                {user?.user_metadata?.role?.replace('_', ' ') || 'analyst'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}