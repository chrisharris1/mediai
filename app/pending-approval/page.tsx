'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, Mail, LogOut } from 'lucide-react';

export default function PendingApproval() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // If user is approved, redirect to doctor dashboard
    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any).role;
      if (userRole === 'doctor') {
        router.push('/doctor-dashboard');
      } else if (userRole !== 'pending_doctor') {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Animated Clock Icon */}
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Application Under Review
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Thank you for submitting your doctor verification application! 
            Our admin team is currently reviewing your credentials.
          </p>

          {/* Timeline */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-blue-900 mb-4">What happens next?</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">Application Received</p>
                  <p className="text-sm text-blue-700">Your documents have been submitted successfully</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-yellow-900">Verification in Progress</p>
                  <p className="text-sm text-yellow-700">Admin is reviewing your credentials and certificates</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">Decision Notification</p>
                  <p className="text-sm text-gray-600">You'll receive an email within 3-4 business days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expected Timeline */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Expected Timeline</h3>
            <p className="text-2xl font-bold text-indigo-600">3-4 Business Days</p>
            <p className="text-sm text-gray-600 mt-1">We'll notify you via email once the review is complete</p>
          </div>

          {/* Important Information */}
          <div className="text-left space-y-3 text-sm text-gray-600">
            <p className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span>You'll receive an email notification when your application is approved or if additional information is needed.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Once approved, you'll gain access to the doctor dashboard and can start earning through consultations.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span>If you have any questions, please contact support@mediai.com</span>
            </p>
          </div>

          {/* Contact Support */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Need help? Contact us at{' '}
              <a href="mailto:support@mediai.com" className="text-indigo-600 hover:text-indigo-700 font-medium">
                support@mediai.com
              </a>
            </p>
          </div>
        </div>

        {/* Application ID */}
        <div className="mt-4 text-center text-sm text-gray-500">
          Application ID: {session?.user?.id || 'N/A'}
        </div>
      </div>
    </div>
  );
}
