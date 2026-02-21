'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { authService } from '@/lib/authService';
import { Eye, EyeOff, User, Mail, Lock, Shield } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'patient' as 'patient' | 'doctor',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('Please agree to the Terms & Conditions');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const result = await authService.register(
        formData.email,
        formData.password,
        fullName,
        formData.role
      );

      if (result.success) {
        // After successful registration, automatically log in with NextAuth
        const signInResult = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          router.push('/dashboard');
          router.refresh();
        } else {
          router.push('/login?registered=true');
        }
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err: any) {
      setError('Google signup failed. Please try again.');
      setLoading(false);
    }
  };

  const handleLinkedInSignup = async () => {
    setLoading(true);
    setError('');
    try {
      await signIn('linkedin', { callbackUrl: '/dashboard' });
    } catch (err: any) {
      setError('LinkedIn signup failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black">
      {/* Animated Medical Background */}
      <div className="absolute inset-0 bg-linear-to-br from-gray-900 via-black to-gray-900">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e40af20_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#7c3aed20_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#333_1px,transparent_1px)] bg-size-[60px_60px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(-45deg,#333_1px,transparent_1px)] bg-size-[60px_60px]"></div>
        </div>

        {/* Floating Medical Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 border border-blue-500/10 rounded-full animate-float"></div>
          <div className="absolute bottom-20 right-20 w-56 h-56 border border-purple-500/10 rounded-full animate-float-delayed"></div>
          <div className="absolute top-1/3 right-1/4 w-40 h-40 border border-emerald-500/10 rounded-full animate-float-slow"></div>
          <div className="absolute bottom-1/3 left-1/4 w-32 h-32 border border-cyan-500/10 rounded-full animate-float-delayed-2"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-blue-500/5 rounded-full animate-pulse-slow"></div>
        </div>

        {/* Particle Effect */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/20 rounded-full animate-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        {/* DNA Helix Animation */}
        <div className="absolute top-1/2 right-1/4 transform -translate-y-1/2 opacity-20">
          <div className="relative w-48 h-96">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-linear-to-b from-blue-500/30 via-transparent to-purple-500/30 animate-dna"></div>
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-0.5 bg-blue-400/30 rounded-full animate-dna-node"
                style={{
                  left: '50%',
                  top: `${i * 20}px`,
                  transform: `translateX(${i % 2 === 0 ? '-16px' : '16px'})`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4 py-8 sm:p-6">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          
          {/* Left Panel - Brand */}
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* MediAI Logo */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-24 h-24 bg-black/40 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                <img 
                  src="/Mediailogo.png" 
                  alt="MediAI Logo" 
                  className="w-20 h-20 object-contain"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">
                  <span className="text-blue-400">Medi</span>
                  <span className="text-purple-400">AI</span>
                </h1>
                <p className="text-gray-400 text-sm font-light mt-1">Intelligent Healthcare Platform</p>
              </div>
            </div>

            {/* Premium Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 mb-8">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Enterprise-Grade Security</span>
            </div>

            {/* Main Heading */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Join The Future
              <span className="block text-transparent bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text">
                Of Healthcare
              </span>
            </h2>

            {/* Description */}
            <p className="text-gray-400 text-lg mb-10 max-w-xl">
              Create your account and experience AI-powered healthcare with advanced clinical decision support.
            </p>
          </div>

          {/* Right Panel - Registration Form */}
          <div className="w-full max-w-md lg:w-[480px]">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
              
              {/* Form Header */}
              <div className="mb-5">
                <h3 className="text-xl font-bold text-white mb-1">Create Account</h3>
                <p className="text-gray-300 text-sm">Join MediAI today</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      First Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400 text-sm"
                        placeholder="John"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400 text-sm"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400 text-sm"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400 text-sm"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">I am a</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, role: 'patient' }))}
                      className={`px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                        formData.role === 'patient'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      Patient
                    </button>
                    <Link
                      href="/doctor-register"
                      className="px-3 py-2 rounded-xl font-medium text-sm transition-all bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-blue-500 text-center flex items-center justify-center"
                    >
                      Doctor
                    </Link>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Doctors require verification. <Link href="/doctor-register" className="text-blue-400 hover:underline">Apply here</Link>
                  </p>
                </div>

                {/* Terms & Conditions */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-white/5 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-xs text-gray-300">
                    I agree to the{' '}
                    <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">
                      Terms & Conditions
                    </Link>
                  </label>
                </div>

                {/* Create Account Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 bg-linear-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating account...</span>
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-transparent text-xs text-gray-400">Or continue with</span>
                  </div>
                </div>
              </div>

              {/* Social Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleGoogleSignup}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm">Google</span>
                </button>

                <button
                  onClick={handleLinkedInSignup}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5" fill="#0A66C2" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span className="text-sm">LinkedIn</span>
                </button>
              </div>

              {/* Login Link */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-center text-gray-400 text-xs">
                  Already have an account?{' '}
                  <Link href="/login" className="text-white hover:text-blue-400 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-40px) rotate(180deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(60px) rotate(-180deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.2); }
        }
        @keyframes float-delayed-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(40px) rotate(90deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.05); }
        }
        @keyframes particle {
          0% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
        @keyframes dna {
          0% { transform: translateY(-100%) rotate(0deg); }
          100% { transform: translateY(100%) rotate(360deg); }
        }
        @keyframes dna-node {
          0%, 100% { background-color: rgba(59, 130, 246, 0.3); }
          50% { background-color: rgba(168, 85, 247, 0.3); }
        }
        
        .animate-float { animation: float 25s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 30s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 35s ease-in-out infinite; }
        .animate-float-delayed-2 { animation: float-delayed-2 28s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-particle { animation: particle linear infinite; }
        .animate-dna { animation: dna 20s linear infinite; }
        .animate-dna-node { animation: dna-node 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

