'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface Doctor {
  _id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  medical_license_number: string;
  specialization: string;
  years_of_experience: number;
  medical_degree: string;
  medical_school: string;
  graduation_year: number;
  has_clinic: boolean;
  clinic_name?: string;
  clinic_address?: string;
  hospital_affiliations: string;
  consultation_fee: number;
  rating?: number;
}

export default function DoctorsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDoctor, setHoveredDoctor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/doctors/list');
      const data = await response.json();
      if (data.success) {
        setDoctors(data.doctors);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch = doctor.full_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSpec = selectedSpecialization
      ? doctor.specialization
          ?.toLowerCase()
          .includes(selectedSpecialization.toLowerCase())
      : true;
    return matchesSearch && matchesSpec;
  });

  const handleConsultationRequest = (doctorId: string) => {
    router.push(`/consultations/new?doctorId=${doctorId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 py-12 px-4 relative overflow-hidden">
      {/* Animated Medical Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e40af20_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#7c3aed20_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#333_1px,transparent_1px)] bg-size-[60px_60px]"></div>
        </div>
        
        {/* Floating Medical Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 border border-blue-500/10 rounded-full animate-float"></div>
          <div className="absolute bottom-20 right-20 w-56 h-56 border border-purple-500/10 rounded-full animate-float-delayed"></div>
          <div className="absolute top-1/3 right-1/4 w-40 h-40 border border-emerald-500/10 rounded-full animate-float-slow"></div>
          <div className="absolute bottom-1/3 left-1/4 w-32 h-32 border border-cyan-500/10 rounded-full animate-float"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-blue-500/5 rounded-full animate-pulse-slow"></div>
        </div>

        {/* Particle Effect */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
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
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Back Button */}
          <div className="flex justify-start mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-gray-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
          
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white">
              Available Doctors
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Find and consult with our verified healthcare professionals
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search by Name
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search doctors..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Specialization
              </label>
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="" className="bg-gray-900">All Specializations</option>
                <option value="general" className="bg-gray-900">General Physician</option>
                <option value="cardiology" className="bg-gray-900">Cardiology</option>
                <option value="dermatology" className="bg-gray-900">Dermatology</option>
                <option value="pediatrics" className="bg-gray-900">Pediatrics</option>
                <option value="orthopedics" className="bg-gray-900">Orthopedics</option>
              </select>
            </div>
          </div>
        </div>

        {/* Doctors Grid */}
        {filteredDoctors.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">😔</div>
            <h3 className="text-2xl font-semibold text-gray-300 mb-2">
              No doctors found
            </h3>
            <p className="text-gray-500">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor._id}
                className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 hover:border-white/20 transition-all duration-300 transform hover:-translate-y-1"
                onMouseEnter={() => setHoveredDoctor(doctor._id)}
                onMouseLeave={() => setHoveredDoctor(null)}
              >
                {/* Doctor Card */}
                <div className="p-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {doctor.full_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">
                        {doctor.full_name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {doctor.specialization || 'General Physician'}
                      </p>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < Math.floor(doctor.rating || 4)
                              ? 'text-yellow-400'
                              : 'text-gray-600'
                          }
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-400">
                      {doctor.rating?.toFixed(1) || '4.0'}
                    </span>
                  </div>

                  {/* Quick Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span>💼</span>
                      <span>{doctor.years_of_experience || 0} years experience</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span>💰</span>
                      <span>₹{doctor.consultation_fee || 500} consultation fee</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span>🎓</span>
                      <span>{doctor.medical_degree}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span>🏥</span>
                      <span>{doctor.hospital_affiliations}</span>
                    </div>
                  </div>

                  {/* Request Button */}
                  <button
                    onClick={() => handleConsultationRequest(doctor._id)}
                    className="w-full py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition font-semibold shadow-lg hover:shadow-blue-500/50"
                  >
                    Request Consultation
                  </button>
                </div>

                {/* Hover Tooltip (Snackbar) */}
                {hoveredDoctor === doctor._id && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-linear-to-br from-gray-900 to-gray-800 border border-white/20 text-white rounded-lg shadow-2xl p-4 z-10 animate-fadeIn">
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                      <div className="border-8 border-transparent border-t-gray-900"></div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg border-b border-white/20 pb-2">
                        {doctor.full_name}
                      </h4>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-400">Specialization:</span>
                          <span>{doctor.specialization || 'General'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-400">Experience:</span>
                          <span>{doctor.years_of_experience || 0} years</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-400">Education:</span>
                          <span>{doctor.medical_degree} from {doctor.medical_school}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-400">License:</span>
                          <span>{doctor.medical_license_number}</span>
                        </div>

                        {doctor.has_clinic && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-400">Clinic:</span>
                            <span>{doctor.clinic_name}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-400">Rating:</span>
                          <span>
                            {doctor.rating?.toFixed(1) || '4.0'} ⭐
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-400">Fee:</span>
                          <span>₹{doctor.consultation_fee || 500}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-400">Hospital:</span>
                          <span>{doctor.hospital_affiliations}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-blue-300 mb-3 flex items-center gap-2">
            <span>📋</span>
            <span>How It Works</span>
          </h3>
          <ol className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="font-bold text-blue-400">1.</span>
              <span>Browse available doctors and hover over their cards for more details</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-400">2.</span>
              <span>Click "Request Consultation" to book an appointment</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-400">3.</span>
              <span>Doctor will review and accept/schedule your consultation</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-400">4.</span>
              <span>You'll receive notifications with meeting details</span>
            </li>
          </ol>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
        
        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(-5deg);
          }
        }
        
        @keyframes float-slow {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(1.1) rotate(10deg);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }
        
        @keyframes particle {
          0% {
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(1);
            opacity: 0;
          }
        }
        
        .animate-float {
          animation: float 25s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 30s ease-in-out infinite;
          animation-delay: 1s;
        }
        
        .animate-float-slow {
          animation: float-slow 35s ease-in-out infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        
        .animate-particle {
          animation: particle linear infinite;
        }
      `}</style>
    </div>
  );
}
