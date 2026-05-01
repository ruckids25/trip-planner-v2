'use client';

import { useState, useEffect, useMemo } from 'react';
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
  TrendingUp, Image, MapPin, Calendar,
} from 'lucide-react';

const ADMIN_EMAIL = 'ruckids@gmail.com';

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

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────

function AdminContent() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [trips, setTrips] = useState<TripWithSpots[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiUsageLog[]>([]);
  // Auth guard — only admin
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch all data
  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;

    async function load() {
      setLoading(true);
      try {
        const [usersData, tripsData, logsData] = await Promise.all([
          getAllUsers(),
          getAllTrips(),
          getAllApiUsage(),
        ]);

        setUsers(usersData as unknown as UserData[]);
        setApiLogs(logsData);

        // Fetch spot counts for each trip
        const tripsWithSpots = await Promise.all(
          tripsData.map(async (t) => {
            const spotCount = await getSpotCountForTrip(t.id);
            return { ...t, spotCount };
          })
        );
        setTrips(tripsWithSpots);
      } catch (err) {
        console.error('Admin data fetch error:', err);
      }
      setLoading(false);
    }

    load();
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

  // ── Chart Data: Daily API Usage ──

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
  // ── Chart Data: API Split ──

  const apiSplit = useMemo(() => [
    { name: 'Vision OCR', value: stats.visionCalls, cost: stats.visionCost },
    { name: 'Places Search', value: stats.placesCalls, cost: stats.placesCost },
  ], [stats]);

  const PIE_COLORS = ['#3B82F6', '#F59E0B'];

  // ── Chart Data: User Activity ──

  const userActivity = useMemo(() => {
    const userTrips: Record<string, number> = {};
    const userSpots: Record<string, number> = {};

    trips.forEach(t => {
      userTrips[t.ownerId] = (userTrips[t.ownerId] || 0) + 1;
      userSpots[t.ownerId] = (userSpots[t.ownerId] || 0) + t.spotCount;
    });

    return users.map(u => ({
      name: u.displayName || u.email || u.uid,
      email: u.email,
      photoURL: u.photoURL,
      trips: userTrips[u.uid] || 0,
      spots: userSpots[u.uid] || 0,
      lastActive: formatDate(u.lastLoginAt),
      apiCalls: apiLogs.filter(l => l.userId === u.uid).length,
    }));
  }, [users, trips, apiLogs]);
  // ── Loading / Auth ──

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Shield size={32} className="text-red-400" />
          <p className="text-gray-500 text-sm">Admin access only</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading admin data...</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">TripPlanner usage & API analytics</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users size={20} className="text-white" />} label="Total Users" value={stats.totalUsers} color="bg-blue-500" />
          <StatCard icon={<Map size={20} className="text-white" />} label="Total Trips" value={stats.totalTrips} color="bg-green-500" />
          <StatCard icon={<MapPin size={20} className="text-white" />} label="Total Spots" value={stats.totalSpots} color="bg-purple-500" />
          <StatCard icon={<Activity size={20} className="text-white" />} label="API Calls" value={stats.totalApiCalls} sub={`Vision: ${stats.visionCalls} | Places: ${stats.placesCalls}`} color="bg-orange-500" />
        </div>
        {/* Cost Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<DollarSign size={20} className="text-white" />} label="Total Est. Cost" value={`$${stats.totalCost.toFixed(2)}`} color="bg-red-500" />
          <StatCard icon={<Eye size={20} className="text-white" />} label="Vision API Cost" value={`$${stats.visionCost.toFixed(2)}`} sub={`${stats.visionCalls} calls @ $0.0015/call`} color="bg-blue-400" />
          <StatCard icon={<TrendingUp size={20} className="text-white" />} label="Places API Cost" value={`$${stats.placesCost.toFixed(2)}`} sub={`${stats.placesCalls} calls @ $0.017/call`} color="bg-amber-500" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily API Usage Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              Daily API Usage (Last 14 days)
            </h3>
            {dailyUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="vision" name="Vision OCR" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="places" name="Places Search" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No API usage data yet</div>
            )}
          </div>
          {/* API Split Pie Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Image size={16} className="text-purple-500" />
              API Call Distribution
            </h3>
            {stats.totalApiCalls > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={apiSplit}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {apiSplit.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => {
                    const item = apiSplit.find(a => a.name === name);
                    return [`${val} calls ($${item?.cost.toFixed(2)})`, name];
                  }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            )}
          </div>
        </div>
        {/* Daily Cost Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-green-500" />
            Daily Cost Trend (USD)
          </h3>
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
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No cost data yet</div>
          )}
        </div>
        {/* User Table */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            Users ({users.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">User</th>
                  <th className="text-center py-3 px-3 text-gray-500 font-medium">Trips</th>
                  <th className="text-center py-3 px-3 text-gray-500 font-medium">Spots</th>
                  <th className="text-center py-3 px-3 text-gray-500 font-medium">API Calls</th>
                  <th className="text-right py-3 px-3 text-gray-500 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {userActivity.map((u, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">{u.name.charAt(0)}</div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-3 text-gray-700">{u.trips}</td>
                    <td className="text-center py-3 px-3 text-gray-700">{u.spots}</td>
                    <td className="text-center py-3 px-3 text-gray-700">{u.apiCalls}</td>
                    <td className="text-right py-3 px-3 text-gray-400">{u.lastActive}</td>
                  </tr>
                ))}
                {userActivity.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Recent API Calls */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-orange-500" />
            Recent API Calls (Last 50)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Time</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">User</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Endpoint</th>
                  <th className="text-right py-3 px-3 text-gray-500 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {apiLogs.slice(0, 50).map((log, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 text-gray-400 text-xs">
                      {formatDateTime(log.timestamp as { toMillis?: () => number })}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">{log.userEmail || log.userId}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.endpoint === 'vision' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {log.endpoint === 'vision' ? <Eye size={10} /> : <MapPin size={10} />}
                        {log.endpoint === 'vision' ? 'Vision OCR' : 'Places Search'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-500">${(log.estimatedCost || 0).toFixed(4)}</td>
                  </tr>
                ))}
                {apiLogs.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">No API calls logged yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return <AdminContent />;
}