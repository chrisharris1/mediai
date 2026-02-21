'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles = [] }: ProtectedRouteProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Role-based routing for authenticated users
    if (status === 'authenticated' && session?.user) {
      const userRole = session.user.role;
      const currentPath = window.location.pathname;
      
      // Redirect doctors to doctor dashboard (unless already there or on allowed path)
      if (userRole === 'doctor' && !currentPath.includes('/doctor-dashboard')) {
        router.push('/doctor-dashboard');
        return;
      }
      
      // Redirect admin to admin dashboard (unless already on /dashboard or /admin)
      if (userRole === 'admin' && !currentPath.includes('/admin') && currentPath !== '/dashboard') {
        router.push('/admin');
        return;
      }
      
      // Redirect pending doctors to a waiting page
      if (userRole === 'pending_doctor' && !currentPath.includes('/pending-approval')) {
        router.push('/pending-approval');
        return;
      }
      
      // Check role-based access if specific roles are required
      if (allowedRoles.length > 0) {
        if (!allowedRoles.includes(userRole)) {
          // Redirect to appropriate dashboard based on role
          if (userRole === 'doctor') {
            router.push('/doctor-dashboard');
          } else if (userRole === 'admin') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        }
      }
    }
  }, [router, allowedRoles, status, session]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  // Only render children if authenticated
  if (status === 'authenticated') {
    return <>{children}</>;
  }

  return null;
}