'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/ui/Header';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { useUserTrips } from '@/hooks/useTrip';
import { useToast } from '@/components/ui/Toast';
import { createTrip, deleteTrip } from '@/lib/firestore';
import { Plus, MapPin, Trash2, Calendar, ChevronRight } from 'lucide-react';
import { Trip } from '@/types';

function DashboardContent() {
  const { user } = useAuthContext();
  const { trips, loading, refresh } = useUserTrips(user?.uid);
  const { toast } = useToast();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', country: '', startDate: '', endDate: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.title || !form.country || !form.startDate || !form.endDate || !user) return;
    setCreating(true);
    try {
      const id = await createTrip({
        title: form.title,
        country: form.country,
        startDate: form.startDate,
        endDate: form.endDate,
        ownerId: user.uid,
      });
      toast('Trip created!', 'success');
      setShowNew(false);
      setForm({ title: '', country: '', startDate: '', endDate: '' });
      router.push(`/trips/${id}/upload`);
    } catch {
      toast('Failed to create trip', 'error');
    }
    setCreating(false);
  };

  const handleDelete = async (trip: Trip) => {
    if (!confirm(`Delete "${trip.title}"? This cannot be undone.`)) return;
    try {
      await deleteTrip(trip.id);
      toast('Trip deleted', 'info');
      refresh();
    } catch {
      toast('Failed to delete trip', 'error');
    }
  };

  const dayCount = (start: string, end: string) => {
    const d = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
    return Math.max(1, Math.ceil(d) + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
            <p className="text-sm text-gray-500 mt-1">Plan and manage your travel adventures</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus size={18} /> New Trip
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map(i => (
              <div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon={<MapPin size={28} />}
            title="No trips yet"
            description="Create your first trip to start planning your adventure"
            action={
              <button
                onClick={() => setShowNew(true)}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium text-sm"
              >
                Create First Trip
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trips.map(trip => (
              <div
                key={trip.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => router.push(`/trips/${trip.id}/upload`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{trip.title}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin size={14} /> {trip.country}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(trip); }}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {trip.startDate} — {trip.endDate}
                    </span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{dayCount(trip.startDate, trip.endDate)} days</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create New Trip">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name</label>
            <input
              type="text"
              placeholder="e.g. Tokyo Adventure 2026"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              type="text"
              placeholder="e.g. Japan"
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !form.title || !form.country || !form.startDate || !form.endDate}
            className="w-full py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Trip'}
          </button>
        </div>
      </Modal>
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
