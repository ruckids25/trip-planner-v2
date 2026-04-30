'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthProvider';
import LoginButton from '@/components/auth/LoginButton';
import { MapPin, Sparkles, Globe, Users } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen flex">
      {/* Left: Info */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            <MapPin size={28} /> TripPlanner
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-4">Plan your perfect trip</h1>
          <p className="text-blue-100 text-lg mb-8">
            Upload screenshots from Google Maps, let AI extract places,
            auto-group by location, and create beautiful day-by-day plans.
          </p>
          <div className="space-y-4">
            {[
              { icon: Sparkles, text: 'AI-powered place extraction from screenshots' },
              { icon: Globe, text: 'Works for any country, any destination' },
              { icon: Users, text: 'Real-time collaboration with friends' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-blue-100">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-200 text-sm">Free to use. No credit card required.</p>
      </div>

      {/* Right: Login */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm text-center">
          <div className="lg:hidden flex items-center justify-center gap-2 text-2xl font-bold text-gray-900 mb-2">
            <MapPin size={28} className="text-blue-500" /> TripPlanner
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h2>
          <p className="text-gray-500 mb-8">Sign in to start planning your trip</p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      </div>
    </div>
  );
}
