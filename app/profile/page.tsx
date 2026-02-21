'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to comprehensive profile page
    router.push('/profile-complete');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-xl text-gray-600">Redirecting to profile...</div>
    </div>
  );
}

