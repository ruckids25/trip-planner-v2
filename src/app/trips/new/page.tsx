'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTripPage() {
  const router = useRouter();
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);
  return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Redirecting...</p></div>;
}
