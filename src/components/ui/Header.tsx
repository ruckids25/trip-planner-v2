'use client';

import Link from 'next/link';
import { useAuthContext } from '@/components/auth/AuthProvider';
import UserMenu from '@/components/auth/UserMenu';
import { MapPin } from 'lucide-react';

export default function Header() {
  const { user } = useAuthContext();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-lg text-gray-900 hover:text-blue-600 transition-colors">
          <MapPin size={22} className="text-blue-500" />
          <span>TripPlanner</span>
        </Link>
        {user && <UserMenu />}
      </div>
    </header>
  );
}
