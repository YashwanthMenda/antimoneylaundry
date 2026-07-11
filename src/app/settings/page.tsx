'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Settings, Shield, Bell, Database, Users, Key, Save, ChevronRight, Loader2 } from 'lucide-react';
import { getAllUserProfiles } from '@/lib/services/amlService';
import { useAuth } from '@/contexts/AuthContext';

const settingsSections = [
  { id: 'sec-detection', icon: Shield, title: 'Detection Engine', desc: 'Configure GNN model thresholds and alert sensitivity' },
  { id: 'sec-notifications', icon: Bell, title: 'Notifications & Alerts', desc: 'Email, SMS, and in-app alert preferences' },
  { id: 'sec-data', icon: Database, title: 'Data Sources', desc: 'Manage bank feed connections and Neo4j configuration' },
  { id: 'sec-users', icon: Users, title: 'User Management', desc: 'Investigator roles, permissions, and access control' },
  { id: 'sec-api', icon: Key, title: 'API & Integrations', desc: 'FIU-IND API keys, FATF data feeds, external services' },
];

const thresholds = [
  { id: 'th-critical', label: 'Critical Alert Threshold', value: 86, min: 70, max: 100, color: 'text-risk-critical' },
  { id: 'th-high', label: 'High Risk Threshold', value: 71, min: 50, max: 85, color: 'text-orange-400' },
  { id: 'th-medium', label: 'Medium Risk Threshold', value: 41, min: 20, max: 70, color: 'text-amber-400' },
  { id: 'th-smurfing', label: 'Smurfing Detection Limit (₹)', value: 200000, min: 100000, max: 500000, color: 'text-primary' },
];

const roleColors: Record<string, string> = {
  admin: 'bg-primary/10 text-primary border border-primary/20',
  senior_officer: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  analyst: 'bg-green-500/10 text-green-400 border border-green-500/20',
};

const roleLabels: Record<string, string> = {
  admin: 'Compliance Admin',
  senior_officer: 'Senior Officer',
  analyst: 'AML Analyst',
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('sec-detection');
  const [thresholdValues, setThresholdValues] = useState(
    Object.fromEntries(thresholds.map((t) => [t.id, t.value]))
  );
  const [saved, setSaved] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (activeSection === 'sec-users') {
      setUsersLoading(true);
      getAllUserProfiles().then((data) => {
        setUsers(data);
        setUsersLoading(false);
      });
    }
  }, [activeSection]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout>
      <div className="flex items-center gap-2 mb-6">
        <Settings size={18} className="text-primary" />
        <h1 className="text-lg font-bold text-foreground tracking-tight">System Settings</h1>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="card-elevated divide-y divide-border/50">
          {settingsSections.map((s) => {
            const SIcon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                  isActive ? 'bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <SIcon size={15} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>{s.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
                </div>
                <ChevronRight size={12} className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="xl:col-span-3 card-elevated p-6">
          {/* Detection Engine */}
          {activeSection === 'sec-detection' && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1">Detection Engine Thresholds</h2>
              <p className="text-xs text-muted-foreground mb-6">
                Adjust GNN model sensitivity. Changes take effect on the next detection cycle.
              </p>
              <div className="space-y-6">
                {thresholds.map((t) => (
                  <div key={t.id}>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-xs font-semibold ${t.color}`}>{t.label}</label>
                      <span className={`text-sm font-bold font-mono ${t.color}`}>
                        {t.id === 'th-smurfing'
                          ? `₹${thresholdValues[t.id].toLocaleString('en-IN')}`
                          : thresholdValues[t.id]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={t.min}
                      max={t.max}
                      value={thresholdValues[t.id]}
                      onChange={(e) =>
                        setThresholdValues((prev) => ({ ...prev, [t.id]: Number(e.target.value) }))
                      }
                      className="w-full accent-primary h-1.5 rounded-full bg-muted cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
                      <span>{t.id === 'th-smurfing' ? `₹${t.min.toLocaleString('en-IN')}` : t.min}</span>
                      <span>{t.id === 'th-smurfing' ? `₹${t.max.toLocaleString('en-IN')}` : t.max}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSave}
                className="mt-6 flex items-center gap-2 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                {saved ? (
                  <><span className="text-green-300">✓</span> Saved!</>
                ) : (
                  <><Save size={13} /> Save Thresholds</>
                )}
              </button>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'sec-notifications' && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1">Notification Preferences</h2>
              <p className="text-xs text-muted-foreground mb-6">Configure how and when you receive alerts.</p>
              <div className="space-y-4">
                {[
                  { id: 'notif-email', label: 'Email Alerts', desc: 'Critical alerts sent to institutional email', defaultOn: true },
                  { id: 'notif-sms', label: 'SMS Notifications', desc: 'High-priority alerts via SMS', defaultOn: false },
                  { id: 'notif-inapp', label: 'In-App Notifications', desc: 'Real-time browser notifications', defaultOn: true },
                  { id: 'notif-sar', label: 'SAR Deadline Reminders', desc: 'Reminders 48h before FIU-IND deadline', defaultOn: true },
                  { id: 'notif-escalation', label: 'Escalation Alerts', desc: 'Notify when cases are escalated to senior officer', defaultOn: true },
                ].map((n) => (
                  <div key={n.id} className="flex items-center justify-between py-3 border-b border-border/50">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{n.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{n.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={n.defaultOn} className="sr-only peer" />
                      <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Sources */}
          {activeSection === 'sec-data' && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1">Data Source Configuration</h2>
              <p className="text-xs text-muted-foreground mb-6">Manage bank feed connections and graph database settings.</p>
              <div className="space-y-4">
                {[
                  { label: 'Primary Bank Feed', value: 'HDFC Core Banking API', status: 'Connected', statusColor: 'text-green-400' },
                  { label: 'Neo4j Graph DB', value: 'neo4j://aml-graph.bank.in:7687', status: 'Connected', statusColor: 'text-green-400' },
                  { label: 'SWIFT Message Feed', value: 'SWIFT Alliance Gateway v7.4', status: 'Connected', statusColor: 'text-green-400' },
                  { label: 'Sanctions List (OFAC)', value: 'Auto-updated daily at 00:00 IST', status: 'Active', statusColor: 'text-blue-400' },
                  { label: 'FIU-IND API Endpoint', value: 'https://fiuindia.gov.in/api/v2/sar', status: 'Connected', statusColor: 'text-green-400' },
                ].map((ds, i) => (
                  <div key={`ds-${i}`} className="flex items-center justify-between py-3 border-b border-border/50">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{ds.label}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{ds.value}</p>
                    </div>
                    <span className={`text-[10px] font-semibold ${ds.statusColor}`}>{ds.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Management */}
          {activeSection === 'sec-users' && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1">User Management</h2>
              <p className="text-xs text-muted-foreground mb-6">
                Active investigators and compliance officers — managed via Supabase Auth.
              </p>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-primary">
                                  {u.full_name?.charAt(0) || '?'}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-foreground">{u.full_name || 'Unknown'}</span>
                              {u.id === user?.id && (
                                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">You</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-muted-foreground">{u.email}</td>
                          <td className="px-3 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColors[u.role] || 'bg-muted text-muted-foreground'}`}>
                              {roleLabels[u.role] || u.role}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-[10px] font-semibold ${u.is_active ? 'text-green-400' : 'text-muted-foreground'}`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* API & Integrations */}
          {activeSection === 'sec-api' && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1">API & Integrations</h2>
              <p className="text-xs text-muted-foreground mb-6">Manage external API keys and integration endpoints.</p>
              <div className="space-y-4">
                {[
                  { label: 'FIU-IND API Key', value: 'fiu_live_••••••••••••••••••••••••', status: 'Active' },
                  { label: 'FATF Data Feed Token', value: 'fatf_••••••••••••••••••••••••••••', status: 'Active' },
                  { label: 'Supabase Project URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https?:\/\//, '').split('.')[0] + '.supabase.co', status: 'Connected' },
                  { label: 'GNN Model Endpoint', value: 'https://ml.aml-bank.in/v2/predict', status: 'Active' },
                ].map((api, i) => (
                  <div key={`api-${i}`} className="flex items-center justify-between py-3 border-b border-border/50">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{api.label}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{api.value}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-green-400">{api.status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <button
                  onClick={() => signOut?.()}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                >
                  Sign Out of Platform
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
