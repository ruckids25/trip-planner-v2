'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import AuthGuard from '@/components/auth/AuthGuard';
import EmptyState from '@/components/ui/EmptyState';
import { useUserTrips } from '@/hooks/useTrip';
import { useToast } from '@/components/ui/Toast';
import { createTrip, deleteTrip } from '@/lib/firestore';
import { MapPin, Plus, Trash2, ChevronRight, LogOut } from 'lucide-react';
import { Trip } from '@/types';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const TRIP_EMOJIS = ['🗼','🌸','⛩️','🏯','🗾','🌊','🗻','🎌','🍜','🍣','🏝️','🎆'];
const DAY_COLORS = ['#4F46E5','#0891B2','#059669','#D97706','#DC2626','#7C3AED','#DB2777','#EA580C'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'อรุณสวัสดิ์';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

function dayCount(start: string, end: string) {
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}

function TripCard({ trip, onClick, onDelete }: { trip: Trip; onClick: () => void; onDelete: () => void }) {
  const days = dayCount(trip.startDate, trip.endDate);
  const colorIdx = trip.title.charCodeAt(0) % DAY_COLORS.length;
  const color = DAY_COLORS[colorIdx];
  const emoji = TRIP_EMOJIS[trip.title.charCodeAt(0) % TRIP_EMOJIS.length];

  return (
    <div
      onClick={onClick}
      className="group relative flex items-center gap-4 bg-white rounded-2xl border border-[var(--border)] p-4 cursor-pointer hover:shadow-md transition-all"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Color bar */}
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: color }}/>
      {/* Emoji */}
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: `${color}18` }}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[var(--text-primary)] truncate" style={{ fontFamily: 'var(--font-head)' }}>
          {trip.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <MapPin size={11}/>{trip.country}
          </span>
          <span className="text-[var(--border)]">·</span>
          <span className="text-xs text-[var(--text-muted)]">{days} วัน</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{trip.startDate} — {trip.endDate}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-muted)] hover:text-[var(--red)] transition-all"
        >
          <Trash2 size={15}/>
        </button>
        <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors"/>
      </div>
    </div>
  );
}

function NewTripModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', country: '', startDate: '', endDate: '', emoji: '🗼' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.title || !form.country || !form.startDate || !form.endDate || !user) return;
    setCreating(true);
    try {
      const id = await createTrip({
        title: form.emoji + ' ' + form.title,
        country: form.country,
        startDate: form.startDate,
        endDate: form.endDate,
        ownerId: user.uid,
      });
      toast('สร้างทริปแล้ว!', 'success');
      setForm({ title: '', country: '', startDate: '', endDate: '', emoji: '🗼' });
      onClose();
      onCreated(id);
    } catch {
      toast('เกิดข้อผิดพลาด', 'error');
    }
    setCreating(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl p-6 z-10"
        style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="w-9 h-1 bg-[var(--border)] rounded-full mx-auto mb-5 md:hidden"/>
        <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'var(--font-head)' }}>สร้างทริปใหม่</h2>

        {/* Emoji picker */}
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">ไอคอนทริป</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {TRIP_EMOJIS.map(e => (
            <button key={e} onClick={() => setForm(f => ({...f, emoji: e}))}
              className="w-10 h-10 rounded-xl text-xl transition-all"
              style={{
                background: form.emoji === e ? 'var(--accent-light)' : 'var(--bg)',
                border: form.emoji === e ? '2px solid var(--accent)' : '2px solid transparent',
              }}>
              {e}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <input
            type="text" placeholder="ชื่อทริป เช่น Tokyo Adventure 2026"
            value={form.title}
            onChange={e => setForm(f => ({...f, title: e.target.value}))}
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <input
            type="text" placeholder="ประเทศ เช่น Japan"
            value={form.country}
            onChange={e => setForm(f => ({...f, country: e.target.value}))}
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">วันเริ่มต้น</label>
              <input type="date" value={form.startDate}
                onChange={e => setForm(f => ({...f, startDate: e.target.value}))}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">วันสิ้นสุด</label>
              <input type="date" value={form.endDate}
                onChange={e => setForm(f => ({...f, endDate: e.target.value}))}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>
          <button onClick={handleCreate}
            disabled={creating || !form.title || !form.country || !form.startDate || !form.endDate}
            className="btn-primary w-full mt-1">
            {creating ? 'กำลังสร้าง...' : 'สร้างทริป'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuthContext();
  const { trips, loading, refresh } = useUserTrips(user?.uid);
  const { toast } = useToast();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);

  const handleDelete = async (trip: Trip) => {
    if (!confirm(`ลบ "${trip.title}"? ไม่สามารถกู้คืนได้`)) return;
    try {
      await deleteTrip(trip.id);
      toast('ลบทริปแล้ว', 'info');
      refresh();
    } catch {
      toast('เกิดข้อผิดพลาด', 'error');
    }
  };

  const firstName = user?.displayName?.split(' ')[0] || 'นักเดินทาง';
  const featuredTrip = trips[0];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="bg-white border-b border-[var(--border)] px-5 pt-safe-top pb-4 sticky top-0 z-10"
        style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase">{getGreeting()}</p>
            <h1 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-head)' }}>
              {firstName} ✈️
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}>
              <Plus size={16}/> ทริปใหม่
            </button>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full border-2 border-[var(--border)] cursor-pointer"
                onClick={() => signOut(auth)}/>
            ) : (
              <button onClick={() => signOut(auth)}
                className="w-9 h-9 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                <LogOut size={16}/>
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-24">

        {/* Featured trip gradient card */}
        {!loading && featuredTrip && (
          <div
            onClick={() => router.push(`/trips/${featuredTrip.id}/plan`)}
            className="relative rounded-3xl p-5 cursor-pointer overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #0891B2 100%)',
              boxShadow: '0 8px 32px rgba(79,70,229,.35)',
            }}
          >
            <div className="absolute top-0 right-0 text-8xl opacity-20 select-none leading-none translate-x-4 -translate-y-2">
              {TRIP_EMOJIS[featuredTrip.title.charCodeAt(0) % TRIP_EMOJIS.length]}
            </div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">ทริปล่าสุด</p>
            <h2 className="text-white text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-head)' }}>
              {featuredTrip.title}
            </h2>
            <div className="flex items-center gap-3">
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {featuredTrip.country}
              </span>
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {dayCount(featuredTrip.startDate, featuredTrip.endDate)} วัน
              </span>
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {featuredTrip.startDate}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1 text-white/80 text-sm font-semibold">
              <span>ดูแผนทริป</span>
              <ChevronRight size={16}/>
            </div>
          </div>
        )}

        {/* All trips */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">ทริปทั้งหมด</p>
            <span className="text-xs text-[var(--text-muted)]">{trips.length} ทริป</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-[var(--border)]"/>
              ))}
            </div>
          ) : trips.length === 0 ? (
            <EmptyState
              icon={<MapPin size={28}/>}
              title="ยังไม่มีทริป"
              description="สร้างทริปแรกของคุณเพื่อเริ่มวางแผนการเดินทาง"
              action={
                <button onClick={() => setShowNew(true)} className="btn-primary text-sm px-5 py-2.5">
                  สร้างทริปแรก
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {trips.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onClick={() => router.push(`/trips/${trip.id}/plan`)}
                  onDelete={() => handleDelete(trip)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <NewTripModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(id) => router.push(`/trips/${id}/upload`)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
