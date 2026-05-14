'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import Header from '@/components/ui/Header';
import {
  getAllUsers,
  getAllTrips,
  getSpots,
  getGroups,
  getDayMetas,
  getAllApiUsage,
} from '@/lib/firestore';
import { Trip, Spot, Group, DayMeta, SPOT_TYPE_CONFIG, GROUP_COLORS } from '@/types';
import {
  Shield, ChevronLeft, MapPin, Calendar, Map as MapIcon, Activity,
  ExternalLink, Hotel, ChevronDown, ChevronRight,
} from 'lucide-react';

const ADMIN_EMAIL = 'ruckids@gmail.com';
const ACCENT = '#4F46E5';

interface UserRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  lastLoginAt?: { toMillis?: () => number };
  createdAt?: { toMillis?: () => number };
}

interface TripDetail extends Trip {
  spots: Spot[];
  groups: Group[];
  dayMetas: DayMeta[];
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const { user: me } = useAuthContext();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [trips, setTrips] = useState<TripDetail[]>([]);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [openTrip, setOpenTrip] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (me && me.email !== ADMIN_EMAIL) router.push('/dashboard');
  }, [me, router]);

  // Load this user + their trips + each trip's full subcollections
  useEffect(() => {
    if (!me || me.email !== ADMIN_EMAIL) return;

    async function load() {
      setLoading(true);
      try {
        const [allUsers, allTrips, apiLogs] = await Promise.all([
          getAllUsers(),
          getAllTrips(),
          getAllApiUsage(),
        ]);

        const found = (allUsers as unknown as UserRecord[]).find((u) => u.uid === uid);
        setUser(found ?? null);

        const userTrips = allTrips.filter((t) => t.ownerId === uid);

        const tripsDetail: TripDetail[] = await Promise.all(
          userTrips.map(async (t) => {
            const [s, g, m] = await Promise.all([
              getSpots(t.id),
              getGroups(t.id),
              getDayMetas(t.id),
            ]);
            return { ...t, spots: s, groups: g, dayMetas: m };
          }),
        );
        // Sort newest first
        tripsDetail.sort((a, b) => {
          const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
          const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setTrips(tripsDetail);
        setApiCallCount(apiLogs.filter((l) => l.userId === uid).length);
      } catch (err) {
        console.error('[admin user detail] load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [me, uid]);

  const stats = useMemo(() => ({
    totalTrips: trips.length,
    totalSpots: trips.reduce((sum, t) => sum + t.spots.length, 0),
    totalDays: trips.reduce((sum, t) => {
      const days = Math.ceil((+new Date(t.endDate) - +new Date(t.startDate)) / 86400000) + 1;
      return sum + Math.max(1, days);
    }, 0),
  }), [trips]);

  if (!me || me.email !== ADMIN_EMAIL) {
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
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>กำลังโหลดข้อมูลผู้ใช้...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <Header />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
          <Link href="/admin" style={backLink}><ChevronLeft size={16} /> กลับ Admin</Link>
          <div style={{ marginTop: 24, padding: 32, textAlign: 'center', background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 16, fontWeight: 600 }}>ไม่พบผู้ใช้</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>UID: {uid}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <Header />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 48px' }}>
        <Link href="/admin" style={backLink}><ChevronLeft size={16} /> กลับ Admin</Link>

        {/* ── User profile header ────────────────── */}
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            padding: 20,
            marginTop: 14,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" style={{ width: 64, height: 64, borderRadius: '50%' }} referrerPolicy="no-referrer" />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: 'var(--text-muted)', fontWeight: 700,
            }}>{(user.displayName || user.email || '?').charAt(0).toUpperCase()}</div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-head)' }}>
              {user.displayName || 'ไม่ระบุชื่อ'}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'monospace' }}>UID: {user.uid}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, flex: 1, minWidth: 240 }}>
            <Stat icon={<MapIcon size={14} />} label="ทริป" value={stats.totalTrips} />
            <Stat icon={<MapPin size={14} />} label="สถานที่" value={stats.totalSpots} />
            <Stat icon={<Calendar size={14} />} label="วัน" value={stats.totalDays} />
            <Stat icon={<Activity size={14} />} label="API" value={apiCallCount} />
          </div>
        </div>

        {/* ── Trip list ──────────────────────────── */}
        <p className="section-label" style={{ marginBottom: 10 }}>
          ทริปทั้งหมด ({trips.length})
        </p>

        {trips.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 14 }}>
            ผู้ใช้คนนี้ยังไม่ได้สร้างทริป
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {trips.map((trip, i) => {
            const isOpen = openTrip === trip.id;
            const color = GROUP_COLORS[i % GROUP_COLORS.length];
            const totalDays = Math.max(
              1,
              Math.ceil((+new Date(trip.endDate) - +new Date(trip.startDate)) / 86400000) + 1,
            );
            return (
              <div
                key={trip.id}
                style={{
                  background: 'white',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${isOpen ? ACCENT : 'var(--border)'}`,
                  overflow: 'hidden',
                  transition: 'border-color .15s',
                }}
              >
                {/* Trip row (clickable header) */}
                <button
                  onClick={() => setOpenTrip((prev) => (prev === trip.id ? null : trip.id))}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `${color}18`, color, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>
                    {(trip as Trip & { emoji?: string }).emoji ?? '🗺️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {trip.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      <span>{trip.country}</span>
                      <Dot />
                      <span>{totalDays} วัน</span>
                      <Dot />
                      <span>{trip.spots.length} จุด</span>
                      {trip.isShared && (
                        <>
                          <Dot />
                          <span style={{ color: 'var(--green)', fontWeight: 600 }}>แชร์อยู่</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/trips/${trip.id}/plan`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: 'var(--text-muted)', display: 'flex', padding: 6, borderRadius: 6,
                      textDecoration: 'none',
                    }}
                    aria-label="เปิดทริป"
                  >
                    <ExternalLink size={14} />
                  </Link>
                  <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                </button>

                {/* Expanded — days + spots */}
                {isOpen && <TripBody trip={trip} totalDays={totalDays} />}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TripBody — when a trip row expands, render days + spots
   ───────────────────────────────────────────────────────────── */
function TripBody({ trip, totalDays }: { trip: TripDetail; totalDays: number }) {
  const days = Array.from({ length: totalDays }, (_, dayIdx) => {
    const date = new Date(trip.startDate);
    date.setDate(date.getDate() + dayIdx);
    const dayGroups = trip.groups.filter((g) => g.assignedDay === dayIdx);
    const spotIds = dayGroups.flatMap((g) => g.spotIds);
    const spots = trip.spots
      .filter((s) => spotIds.includes(s.id))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    const meta = trip.dayMetas.find((m) => m.dayIdx === dayIdx);
    return { dayIdx, date, area: meta?.area ?? '', hotel: meta?.hotelName ?? '', spots };
  });

  // Spots not assigned to any day (orphans)
  const assignedIds = new Set(days.flatMap((d) => d.spots.map((s) => s.id)));
  const orphans = trip.spots.filter((s) => !assignedIds.has(s.id));

  return (
    <div style={{ background: 'var(--bg)', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'grid', gap: 10 }}>
        {days.map((day) => (
          <div key={day.dayIdx} style={{ background: 'white', borderRadius: 10, border: '1px solid var(--border)', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                background: GROUP_COLORS[day.dayIdx % GROUP_COLORS.length],
                color: 'white', fontSize: 11, fontWeight: 700,
                padding: '2px 8px', borderRadius: 99,
              }}>
                วันที่ {day.dayIdx + 1}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {day.date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              {day.area && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>· {day.area}</span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{day.spots.length} จุด</span>
            </div>
            {day.hotel && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, padding: '6px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                <Hotel size={12} /> {day.hotel}
              </div>
            )}
            {day.spots.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>— ไม่มีสถานที่ —</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {day.spots.map((spot, i) => <SpotRow key={spot.id} spot={spot} index={i} />)}
              </div>
            )}
          </div>
        ))}

        {orphans.length > 0 && (
          <div style={{ background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A', padding: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>
              ⚠️ สถานที่ที่ยังไม่ได้จัดเข้าวัน ({orphans.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {orphans.map((spot, i) => <SpotRow key={spot.id} spot={spot} index={i} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SpotRow({ spot, index }: { spot: Spot; index: number }) {
  const tc = SPOT_TYPE_CONFIG[spot.type] || SPOT_TYPE_CONFIG.other;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'var(--bg)',
        borderRadius: 6,
        fontSize: 13,
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: spot.checked ? 'var(--green)' : tc.color,
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, flexShrink: 0,
      }}>{index + 1}</span>
      <span style={{ fontSize: 14 }}>{tc.emoji}</span>
      <span style={{
        flex: 1, minWidth: 0,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        textDecoration: spot.checked ? 'line-through' : 'none',
        color: spot.checked ? 'var(--text-muted)' : 'var(--text-primary)',
      }}>{spot.name}</span>
      {spot.timeOverride && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{spot.timeOverride}</span>
      )}
      <a
        href={`https://maps.google.com/?q=${spot.lat},${spot.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}
        aria-label="เปิดใน Google Maps"
      >
        <ExternalLink size={11} />
      </a>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={{
      background: 'var(--bg)',
      borderRadius: 10,
      padding: '8px 10px',
      textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text-muted)', marginBottom: 2 }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.3 }}>{label}</span>
      </div>
      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function Dot() {
  return <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border)' }} />;
}

const backLink: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textDecoration: 'none',
};
