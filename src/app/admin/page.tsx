'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import Header from '@/components/ui/Header';
import { getAllUsers, getAllTrips, getAllApiUsage, getSpotCountForTrip } from '@/lib/firestore';
import { ApiUsageLog, Trip } from '@/types';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Shield, Users, Map, Eye, DollarSign, Activity,
  TrendingUp, Image as ImageIcon, MapPin, Calendar, RefreshCw,
} from 'lucide-react';

const ADMIN_EMAIL = 'ruckids@gmail.com';
const ACCENT = '#4F46E5';

interface UserData {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  lastLoginAt?: { toMillis?: () => number };
}

interface TripWithSpots extends Trip {
  spotCount: number;
}

type TabKey = 'overview' | 'users' | 'logs';

// ── Helpers ──────────────────────────────────────────

function formatDate(ts?: { toMillis?: () => number }): string {
  if (!ts?.toMillis) return '-';
  return new Date(ts.toMillis()).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  });
}

function formatDateTime(ts?: { toMillis?: () => number }): string {
  if (!ts?.toMillis) return '-';
  return new Date(ts.toMillis()).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function getDayKey(ts?: { toMillis?: () => number }): string {
  if (!ts?.toMillis) return 'unknown';
  const d = new Date(ts.toMillis());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

// ── Components ───────────────────────────────────────

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        padding: 18,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: `${accent}18`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-head)', lineHeight: 1.2, color: 'var(--text-primary)' }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        padding: 20,
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-head)',
        }}
      >
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────

function AdminContent() {
  const { user } = useAuthContext();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [trips, setTrips] = useState<TripWithSpots[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiUsageLog[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Auth guard — only admin
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const load = useCallback(async (isRefresh = false) => {
    if (!user || user.email !== ADMIN_EMAIL) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [usersData, tripsData, logsData] = await Promise.all([
        getAllUsers(),
        getAllTrips(),
        getAllApiUsage(),
      ]);
      setUsers(usersData as unknown as UserData[]);
      setApiLogs(logsData);
      const tripsWithSpots = await Promise.all(
        tripsData.map(async (t) => {
          const spotCount = await getSpotCountForTrip(t.id);
          return { ...t, spotCount };
        })
      );
      setTrips(tripsWithSpots);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount when user resolves
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Computed Stats ──

  const stats = useMemo(() => {
    const visionCalls = apiLogs.filter(l => l.endpoint === 'vision');
    const placesCalls = apiLogs.filter(l => l.endpoint === 'places');
    const totalCost = apiLogs.reduce((sum, l) => sum + (l.estimatedCost || 0), 0);
    const totalSpots = trips.reduce((sum, t) => sum + t.spotCount, 0);
    return {
      totalUsers: users.length,
      totalTrips: trips.length,
      totalSpots,
      visionCalls: visionCalls.length,
      placesCalls: placesCalls.length,
      totalApiCalls: apiLogs.length,
      totalCost,
      visionCost: visionCalls.reduce((s, l) => s + (l.estimatedCost || 0), 0),
      placesCost: placesCalls.reduce((s, l) => s + (l.estimatedCost || 0), 0),
    };
  }, [apiLogs, users, trips]);

  // ── Chart data ──

  const dailyUsage = useMemo(() => {
    const map: Record<string, { date: string; vision: number; places: number; cost: number }> = {};
    apiLogs.forEach(log => {
      const day = getDayKey(log.timestamp as { toMillis?: () => number });
      if (!map[day]) map[day] = { date: day, vision: 0, places: 0, cost: 0 };
      if (log.endpoint === 'vision') map[day].vision++;
      else map[day].places++;
      map[day].cost += log.estimatedCost || 0;
    });
    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map(d => ({ ...d, dateLabel: formatShortDate(d.date), cost: Math.round(d.cost * 100) / 100 }));
  }, [apiLogs]);

  const apiSplit = useMemo(() => [
    { name: 'Vision OCR', value: stats.visionCalls, cost: stats.visionCost },
    { name: 'Places Search', value: stats.placesCalls, cost: stats.placesCost },
  ], [stats]);

  const PIE_COLORS = [ACCENT, '#F59E0B'];

  const userActivity = useMemo(() => {
    const userTrips: Record<string, number> = {};
    const userSpots: Record<string, number> = {};
    trips.forEach(t => {
      userTrips[t.ownerId] = (userTrips[t.ownerId] || 0) + 1;
      userSpots[t.ownerId] = (userSpots[t.ownerId] || 0) + t.spotCount;
    });
    return users.map(u => ({
      uid: u.uid,
      name: u.displayName || u.email || u.uid,
      email: u.email,
      photoURL: u.photoURL,
      trips: userTrips[u.uid] || 0,
      spots: userSpots[u.uid] || 0,
      lastActive: formatDate(u.lastLoginAt),
      apiCalls: apiLogs.filter(l => l.userId === u.uid).length,
    }));
  }, [users, trips, apiLogs]);

  // ── Auth / Loading ──

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Shield size={32} color="var(--red)" />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>เฉพาะผู้ดูแลระบบ</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32,
              border: `3px solid ${ACCENT}`, borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin .7s linear infinite',
            }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>กำลังโหลดข้อมูล admin...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <Header />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 48px' }}>
        {/* ── Page header ─────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${ACCENT}, var(--accent-dark))`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-head)' }}>Admin Dashboard</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trip Planner usage &amp; API analytics</p>
            </div>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: refreshing ? 0.6 : 1 }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
            {refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรช'}
            {lastUpdated && !refreshing && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                · {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'white',
            border: '1px solid var(--border)',
            padding: 4,
            borderRadius: 'var(--radius-sm)',
            marginBottom: 20,
            width: 'fit-content',
            maxWidth: '100%',
            overflowX: 'auto',
          }}
        >
          {([
            { key: 'overview', label: 'ภาพรวม', icon: <Activity size={14} /> },
            { key: 'users', label: `ผู้ใช้ (${users.length})`, icon: <Users size={14} /> },
            { key: 'logs', label: `บันทึก API (${apiLogs.length})`, icon: <Calendar size={14} /> },
          ] as { key: TabKey; label: string; icon: React.ReactNode }[]).map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  fontFamily: 'var(--font-body)',
                  background: active ? ACCENT : 'transparent',
                  color: active ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background .15s, color .15s',
                }}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ─────────────────────────── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Summary stats — 4 cards */}
            <div>
              <p className="section-label" style={{ marginBottom: 8 }}>สรุปการใช้งาน</p>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <StatCard icon={<Users size={20} />} label="ผู้ใช้ทั้งหมด" value={stats.totalUsers} accent={ACCENT} />
                <StatCard icon={<Map size={20} />} label="ทริปทั้งหมด" value={stats.totalTrips} accent="#10B981" />
                <StatCard icon={<MapPin size={20} />} label="สถานที่ทั้งหมด" value={stats.totalSpots} accent="#7C3AED" />
                <StatCard
                  icon={<Activity size={20} />}
                  label="API calls"
                  value={stats.totalApiCalls}
                  sub={`Vision ${stats.visionCalls} · Places ${stats.placesCalls}`}
                  accent="#F59E0B"
                />
              </div>
            </div>

            {/* Cost breakdown — 3 cards */}
            <div>
              <p className="section-label" style={{ marginBottom: 8 }}>ค่าใช้จ่าย API (ประมาณการ)</p>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <StatCard icon={<DollarSign size={20} />} label="ค่าใช้จ่ายรวม" value={`$${stats.totalCost.toFixed(2)}`} accent="#EF4444" />
                <StatCard
                  icon={<Eye size={20} />}
                  label="Vision OCR"
                  value={`$${stats.visionCost.toFixed(2)}`}
                  sub={`${stats.visionCalls} calls @ $0.0015`}
                  accent={ACCENT}
                />
                <StatCard
                  icon={<TrendingUp size={20} />}
                  label="Places Search"
                  value={`$${stats.placesCost.toFixed(2)}`}
                  sub={`${stats.placesCalls} calls @ $0.017`}
                  accent="#F59E0B"
                />
              </div>
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
              <div style={{ gridColumn: 'span 2 / span 2', minWidth: 0 }} className="admin-chart-wide">
                <SectionCard title="Daily API Usage (14 วันล่าสุด)" icon={<Activity size={16} color={ACCENT} />}>
                  {dailyUsage.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={dailyUsage}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="vision" name="Vision OCR" fill={ACCENT} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="places" name="Places Search" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart label="ยังไม่มีข้อมูลการใช้งาน API" height={260} />
                  )}
                </SectionCard>
              </div>
              <SectionCard title="สัดส่วน API" icon={<ImageIcon size={16} color="#7C3AED" />}>
                {stats.totalApiCalls > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={apiSplit}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={88}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {apiSplit.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(val, name) => {
                          const item = apiSplit.find(a => a.name === name);
                          return [`${val} calls ($${item?.cost.toFixed(2)})`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label="ยังไม่มีข้อมูล" height={260} />
                )}
              </SectionCard>
            </div>

            <SectionCard title="Daily Cost Trend (USD)" icon={<DollarSign size={16} color="#10B981" />}>
              {dailyUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(val) => [`$${Number(val).toFixed(3)}`, 'Cost']} />
                    <Line type="monotone" dataKey="cost" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="ยังไม่มีข้อมูลค่าใช้จ่าย" height={200} />
              )}
            </SectionCard>
          </div>
        )}

        {tab === 'users' && (
          <SectionCard title={`ผู้ใช้ (${users.length})`} icon={<Users size={16} color={ACCENT} />}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={th}>ผู้ใช้</th>
                    <th style={{ ...th, textAlign: 'center' }}>ทริป</th>
                    <th style={{ ...th, textAlign: 'center' }}>สถานที่</th>
                    <th style={{ ...th, textAlign: 'center' }}>API calls</th>
                    <th style={{ ...th, textAlign: 'right' }}>ใช้ล่าสุด</th>
                    <th style={{ ...th, textAlign: 'right', width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {userActivity.map((u, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => router.push(`/admin/users/${u.uid}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {u.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} referrerPolicy="no-referrer" />
                          ) : (
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, color: 'var(--text-muted)',
                            }}>{u.name.charAt(0)}</div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>{u.trips}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{u.spots}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{u.apiCalls}</td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--text-muted)' }}>{u.lastActive}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <Link
                          href={`/admin/users/${u.uid}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: ACCENT,
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ดู →
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {userActivity.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>ยังไม่มีผู้ใช้</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {tab === 'logs' && (
          <SectionCard title={`บันทึก API ล่าสุด (${Math.min(apiLogs.length, 50)})`} icon={<Calendar size={16} color="#F59E0B" />}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={th}>เวลา</th>
                    <th style={th}>ผู้ใช้</th>
                    <th style={th}>Endpoint</th>
                    <th style={{ ...th, textAlign: 'right' }}>ค่าใช้จ่าย</th>
                  </tr>
                </thead>
                <tbody>
                  {apiLogs.slice(0, 50).map((log, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...td, fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatDateTime(log.timestamp as { toMillis?: () => number })}
                      </td>
                      <td style={{ ...td, color: 'var(--text-primary)' }}>{log.userEmail || log.userId}</td>
                      <td style={td}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                          background: log.endpoint === 'vision' ? `${ACCENT}18` : '#FEF3C7',
                          color: log.endpoint === 'vision' ? ACCENT : '#92400E',
                        }}>
                          {log.endpoint === 'vision' ? <Eye size={10} /> : <MapPin size={10} />}
                          {log.endpoint === 'vision' ? 'Vision OCR' : 'Places'}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right', color: 'var(--text-secondary)' }}>
                        ${(log.estimatedCost || 0).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                  {apiLogs.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>ยังไม่มี API call</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </main>

      {/* Make the wide chart panel actually span 2 cols on lg+ */}
      <style>{`
        @media (max-width: 720px) {
          .admin-chart-wide { grid-column: span 1 / span 1 !important; }
        }
      `}</style>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px',
  color: 'var(--text-muted)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.3,
};

const td: React.CSSProperties = {
  padding: '12px',
  verticalAlign: 'middle',
};

function EmptyChart({ label, height }: { label: string; height: number }) {
  return (
    <div style={{
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-muted)',
      fontSize: 13,
    }}>
      {label}
    </div>
  );
}

export default function AdminPage() {
  return <AdminContent />;
}
