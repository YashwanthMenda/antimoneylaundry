'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import {
  LayoutDashboard, AlertTriangle, FolderOpen, FileText,
  Network, Users, Settings, ChevronLeft, ChevronRight, Bell, Shield, FilePlus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';


interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badgeKey?: string;
  group: string;
}

const navItems: NavItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard, group: 'MONITORING' },
  { id: 'nav-alerts', label: 'Alerts', href: '/alerts', icon: AlertTriangle, badgeKey: 'alerts', group: 'MONITORING' },
  { id: 'nav-cases', label: 'Case Management', href: '/case-investigation-detail', icon: FolderOpen, badgeKey: 'cases', group: 'INVESTIGATION' },
  { id: 'nav-file-case', label: 'File a Case', href: '/file-a-case', icon: FilePlus, group: 'INVESTIGATION' },
  { id: 'nav-network', label: 'Network Graph', href: '/network', icon: Network, group: 'INVESTIGATION' },
  { id: 'nav-sar', label: 'SAR Reports', href: '/sar-reports', icon: FileText, badgeKey: 'sar', group: 'COMPLIANCE' },
  { id: 'nav-entities', label: 'Entities', href: '/entities', icon: Users, group: 'COMPLIANCE' },
  { id: 'nav-settings', label: 'Settings', href: '/settings', icon: Settings, group: 'SYSTEM' },
];

const groups = ['MONITORING', 'INVESTIGATION', 'COMPLIANCE', 'SYSTEM'];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({ alerts: 0, cases: 0, sar: 0 });
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    const supabase = createClient();

    async function loadBadges() {
      const [alertsRes, casesRes, sarRes] = await Promise.all([
        supabase.from('alerts').select('*', { count: 'exact', head: true }).in('alert_status', ['New', 'Escalated']),
        supabase.from('cases').select('*', { count: 'exact', head: true }).in('case_status', ['Open', 'Investigating']),
        supabase.from('sar_reports').select('*', { count: 'exact', head: true }).in('sar_status', ['Draft', 'Pending Review']),
      ]);
      setBadges({
        alerts: alertsRes.count ?? 0,
        cases: casesRes.count ?? 0,
        sar: sarRes.count ?? 0,
      });
    }

    loadBadges();

    const channel = supabase
      .channel('sidebar_badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, loadBadges)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, loadBadges)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sar_reports' }, loadBadges)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getBadge = (item: NavItem): number => {
    if (!item.badgeKey) return 0;
    return badges[item.badgeKey] || 0;
  };

  return (
    <aside
      className="relative flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ease-in-out shrink-0"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border overflow-hidden">
        <div className="shrink-0">
          <AppLogo size={28} />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate tracking-tight">AntiMoneyLaundry</span>
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">AML Platform</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={`group-${group}`} className="mb-2">
              {!collapsed && (
                <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {group}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const badge = getBadge(item);

                return (
                  <div key={item.id} className="relative group px-2 mb-0.5">
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 ${
                        isActive
                          ? 'bg-primary/10 text-primary' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && (
                        <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                      )}
                      {!collapsed && badge > 0 && (
                        <span className="ml-auto text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">
                          {badge}
                        </span>
                      )}
                      {collapsed && badge > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </Link>
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-card border border-border rounded text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 shadow-lg">
                        {item.label}{badge > 0 ? ` (${badge})` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* User profile */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Shield size={14} className="text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate capitalize">
                {user?.user_metadata?.role?.replace('_', ' ') || 'Analyst'}
              </p>
            </div>
          )}
          {!collapsed && (
            <Bell size={14} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
          )}
        </div>
      </div>
    </aside>
  );
}