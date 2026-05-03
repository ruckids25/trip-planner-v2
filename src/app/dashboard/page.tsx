'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useUserTrips } from '@/hooks/useTrip';
import { createTrip } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { Trip } from '@/types';
import BottomNav from '@/components/ui/BottomNav';
import CollabAvatars from '@/components/ui/CollabAvatars';
import { IconPlus, IconChevRight, IconX } from '@/components/ui/Icons';

const TRIP_EMOJIS = ['🗾','🇹🇭','🗼','⛩️','🏔️','🌏','🏝️','🌄','🎡','🏙️','🌃','🎌','🌺','🍜','🚂'];
const DAY_COLORS = ['#4F46E5','#0891B2','#059669','#D97706','#DC2626','#7C3AED','#DB2777'];

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'สวัสดีตอนเช้า ☀️';
  if (h < 17) return 'สวัสดีตอนบ่าย 🌤️';
  if (h < 19) return 'สวัสดีตอนเย็น 🌇';
  return 'สวัสดีตอนค่ำ 🌙';
}

function daysBetween(a: string, b: string) {
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return Math.max(1, Math.ceil(d) + 1);
}

function thaiShortDate(iso: string) {
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const d = new Date(iso);
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function trippEmoji(t: Trip) {
  return (t as Trip & { emoji?: string }).emoji ?? TRIP_EMOJIS[t.title.charCodeAt(0) % TRIP_EMOJIS.length];
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardInner />
    </AuthGuard>
  );
}

function DashboardInner() {
  const { user } = useAuthContext();
  const { trips } = useUserTrips(user?.uid);
  const router = useRouter();
  const { toast } = useToast();

  const [showNew, setShowNew] = useState(false);

  const { featured, others } = useMemo(() => {
    if (!trips || trips.length === 0) return { featured: null as Trip | null, others: [] as Trip[] };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = [...trips]
      .filter((t) => new Date(t.startDate) >= today)
      .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
    if (upcoming.length > 0) {
      const head = upcoming[0];
      return { featured: head, others: trips.filter((t) => t.id !== head.id) };
    }
    return { featured: trips[0] ?? null, others: trips.slice(1) };
  }, [trips]);

  return (
    <>

      <div className="app-page">
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', background: 'white', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{greet()}</p>
              <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text-primary)' }}>
                ทริปของฉัน
              </h1>
            </div>
            <button
              className="btn-primary"
              onClick={() => setShowNew(true)}
              style={{ padding: '8px 16px', fontSize: 13, borderRadius: 99, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <IconPlus /> สร้างทริป
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 16px 0' }}>
          {featured && (
            <div style={{ marginBottom: 16 }}>
              <p className="section-label" style={{ marginBottom: 10 }}>ทริปถัดไป</p>
              <FeaturedCard trip={featured} onOpen={() => router.push(`/trips/${featured.id}/plan`)} />
            </div>
          )}

          <p className="section-label" style={{ marginBottom: 10 }}>ทริปทั้งหมด</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!featured && others.length === 0 && <EmptyHero onCreate={() => setShowNew(true)} />}
            {others.map((trip, idx) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}/plan`}
                className="card"
                style={{
                  padding: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: `${DAY_COLORS[idx % DAY_COLORS.length]}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  {trippEmoji(trip)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {trip.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {daysBetween(trip.startDate, trip.endDate)} วัน
                    </span>
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{trip.country}</span>
                    {trip.collaborators && trip.collaborators.length > 1 && (
                      <>
                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border)' }} />
                        <CollabAvatars
                          users={trip.collaborators.map((uid, i) => ({
                            id: uid,
                            name: uid.slice(0, 1).toUpperCase(),
                            color: DAY_COLORS[i % DAY_COLORS.length],
                          }))}
                          size={18}
                        />
                      </>
                    )}
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  <IconChevRight />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />

      <NewTripSheet
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={async (form) => {
          if (!user) {
            toast('กรุณาเข้าสู่ระบบก่อน', 'error');
            return;
          }
          try {
            const id = await createTrip({
              title: form.title,
              country: form.country || 'ไทย',
              startDate: form.startDate,
              endDate: form.endDate,
              ownerId: user.uid,
            });
            toast('สร้างทริปแล้ว!', 'success');
            setShowNew(false);
            router.push(`/trips/${id}/upload`);
          } catch (err) {
            console.error(err);
            toast('สร้างทริปไม่สำเร็จ', 'error');
          }
        }}
      />
    </>
  );
}

function FeaturedCard({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const accent = 'var(--accent)';
  const days = daysBetween(trip.startDate, trip.endDate);
  // Compute days-until on the client only — keeps SSR + render pure
  const [daysUntil, setDaysUntil] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot init from Date.now() (impure during render)
    setDaysUntil(Math.ceil((+new Date(trip.startDate) - Date.now()) / 86400000));
  }, [trip.startDate]);
  const emoji = trippEmoji(trip);

  return (
    <div
      className="card"
      onClick={onOpen}
      style={{
        background: `linear-gradient(135deg, ${accent}15, ${accent}05)`,
        border: '1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)',
        cursor: 'pointer',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span
              style={{
                background: accent,
                color: 'white',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 99,
              }}
            >
              {daysUntil === null
                ? 'ทริปของคุณ'
                : daysUntil > 0
                ? 'กำลังมา'
                : daysUntil === 0
                ? 'วันนี้!'
                : 'อยู่ระหว่างทริป'}
            </span>
            {daysUntil !== null && daysUntil > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{daysUntil} วัน</span>
            )}
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-head)' }}>{trip.title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span style={{ fontSize: 16 }}>{emoji}</span>
            <span style={{ lineHeight: 1 }}>{trip.country}</span>
          </p>
        </div>
        <div style={{ fontSize: 36 }}>{emoji}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <CollabAvatars
          users={(trip.collaborators || []).map((uid, i) => ({
            id: uid,
            name: uid.slice(0, 1).toUpperCase(),
            color: DAY_COLORS[i % DAY_COLORS.length],
          }))}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{days} วัน</span>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {thaiShortDate(trip.startDate)} – {thaiShortDate(trip.endDate)}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyHero({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px dashed var(--border)',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>ยังไม่มีทริป</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        เริ่มสร้างทริปแรกของคุณกันเลย
      </p>
      <button className="btn-primary" onClick={onCreate}>
        <IconPlus /> สร้างทริปใหม่
      </button>
    </div>
  );
}

interface NewTripForm {
  title: string;
  country: string;
  startDate: string;
  endDate: string;
  emoji: string;
}

function NewTripSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (f: NewTripForm) => void;
}) {
  const [form, setForm] = useState<NewTripForm>({
    title: '',
    country: '',
    startDate: '',
    endDate: '',
    emoji: '🗾',
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const valid = form.title && form.startDate && form.endDate;

  return (
    <>
      <div className={`sheet-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`bottom-sheet ${open ? 'open' : ''}`}>
        <div className="sheet-handle" />
        <div style={{ padding: '20px 20px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)' }}>สร้างทริปใหม่</h2>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
            >
              <IconX />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>ไอคอนทริป</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    border: `2px solid ${showEmojiPicker ? 'var(--accent)' : 'var(--border)'}`,
                    background: 'var(--bg)',
                    fontSize: 28,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'border-color .15s',
                    flexShrink: 0,
                  }}
                >
                  {form.emoji}
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>กดเพื่อเลือก emoji สำหรับทริป</span>
              </div>
              {showEmojiPicker && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {TRIP_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        setForm((f) => ({ ...f, emoji: e }));
                        setShowEmojiPicker(false);
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 22,
                        background: form.emoji === e ? 'var(--accent-light)' : 'var(--bg)',
                        outline: form.emoji === e ? '2px solid var(--accent)' : 'none',
                        transition: 'all .1s',
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>ชื่อทริป *</label>
              <input
                className="input"
                placeholder="เช่น โตเกียว ซากุระ 2026"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>ประเทศ</label>
              <input
                className="input"
                placeholder="เช่น Japan"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>วันออกเดินทาง</label>
                <input
                  className="input"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>วันกลับ</label>
                <input
                  className="input"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={() => valid && onCreate(form)}
              disabled={!valid}
            >
              สร้างทริป
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 6,
};
