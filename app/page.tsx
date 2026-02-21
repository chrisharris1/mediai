// FILE: app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    
    if (token) {
      // User is logged in, redirect to dashboard
      router.push('/dashboard');
    } else {
      // User is not logged in, redirect to login
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-blue-50">
      {/* Loading State */}
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-linear-to-br from-blue-600 to-emerald-500 rounded-2xl rotate-3 animate-pulse"></div>
          <div className="absolute inset-0 bg-linear-to-br from-blue-500 to-emerald-400 rounded-2xl -rotate-3 animate-pulse delay-75"></div>
          <div className="absolute inset-2 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Brain className="w-10 h-10 text-blue-600 animate-pulse" />
          </div>
        </div>

        {/* Loading Text */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          MediAI
        </h1>
        <p className="text-slate-600 mb-6">
          Intelligent Healthcare Platform
        </p>

        {/* Spinner */}
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-slate-600 text-sm">Loading...</span>
        </div>
      </div>
    </div>
  );
}