'use client';

import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { MapPin, Upload, Layers, CalendarDays, Map, ArrowRight, Sparkles, Globe, Users } from 'lucide-react';
import { useEffect } from 'react';

export default function LandingPage() {
  const { user, loading, login } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  const features = [
    {
      icon: <Upload size={24} />,
      title: 'Upload Screenshots',
      description: 'Take screenshots from Google Maps or any app. Our AI reads and extracts every place name automatically.',
      color: 'bg-blue-50 text-blue-500',
    },
    {
      icon: <Layers size={24} />,
      title: 'Smart Grouping',
      description: 'Spots are auto-grouped by location using DBSCAN clustering. Drag and drop to fine-tune.',
      color: 'bg-purple-50 text-purple-500',
    },
    {
      icon: <CalendarDays size={24} />,
      title: 'Calendar Planning',
      description: 'Drag groups onto your travel dates. Routes are optimized for the shortest walking distance.',
      color: 'bg-green-50 text-green-500',
    },
    {
      icon: <Map size={24} />,
      title: 'Interactive Plan',
      description: 'Beautiful day-by-day timeline with interactive maps, checkboxes, and real-time collaboration.',
      color: 'bg-orange-50 text-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-gray-900">
            <MapPin size={22} className="text-blue-500" />
            TripPlanner
          </div>
          <button
            onClick={login}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full text-blue-600 text-xs font-medium mb-6">
            <Sparkles size={14} /> AI-Powered Trip Planning
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            From screenshots to
            <span className="text-blue-500"> perfect trip plans</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Upload your saved places from Google Maps. AI extracts locations, groups them by area,
            and creates an optimized day-by-day itinerary — in seconds.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={login}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 font-medium"
            >
              Start Planning <ArrowRight size={18} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
            <span className="flex items-center gap-1"><Globe size={14} /> Works for any country</span>
            <span className="flex items-center gap-1"><Users size={14} /> Real-time collaboration</span>
            <span>Free to use</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <div className="text-xs font-bold text-gray-400 mb-1">STEP {i + 1}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to plan your next trip?</h2>
          <p className="text-gray-500 mb-8">Sign in with Google and start in 30 seconds. No credit card needed.</p>
          <button
            onClick={login}
            className="px-8 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 font-medium text-lg"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-400" /> TripPlanner
          </div>
          <p>Built with Next.js + Firebase</p>
        </div>
      </footer>
    </div>
  );
}
