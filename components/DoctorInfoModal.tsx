'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Stethoscope, Award, Building, FileText, Calendar, MapPin, Mail, Phone, CheckCircle, Download, Eye, Shield } from 'lucide-react';

interface DoctorInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorEmail: string;
}

export default function DoctorInfoModal({ isOpen, onClose, doctorEmail }: DoctorInfoModalProps) {
  const [doctorData, setDoctorData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && doctorEmail) {
      fetchDoctorInfo();
    }
  }, [isOpen, doctorEmail]);

  const fetchDoctorInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/doctor/public-profile?email=${encodeURIComponent(doctorEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setDoctorData(data.data);
      } else {
        setError('Failed to load doctor information');
      }
    } catch (error) {
      console.error('Error fetching doctor info:', error);
      setError('Error loading doctor information');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-linear-to-br from-gray-900 to-black border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl my-8 relative">
        {/* Header */}
        <div className="bg-linear-to-br from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Stethoscope className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">Doctor Profile</h2>
              <p className="text-blue-100">Verified Medical Professional</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <p className="text-red-300">{error}</p>
            </div>
          ) : doctorData ? (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Full Name</p>
                    <p className="text-white font-medium">{doctorData.full_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Email</p>
                    <p className="text-white font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {doctorData.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Phone</p>
                    <p className="text-white font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {doctorData.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Gender</p>
                    <p className="text-white font-medium capitalize">{doctorData.gender}</p>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  Professional Credentials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Medical License Number</p>
                    <p className="text-white font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-400" />
                      {doctorData.medical_license_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Specialization</p>
                    <p className="text-white font-medium">
                      {doctorData.specialization}
                      {doctorData.custom_specialization && ` (${doctorData.custom_specialization})`}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Experience</p>
                    <p className="text-white font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {doctorData.years_of_experience} years
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Medical Degree</p>
                    <p className="text-white font-medium">{doctorData.medical_degree}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Medical School</p>
                    <p className="text-white font-medium">{doctorData.medical_school}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Graduation Year</p>
                    <p className="text-white font-medium">{doctorData.graduation_year}</p>
                  </div>
                </div>
              </div>

              {/* Practice Information */}
              {doctorData.has_clinic && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-emerald-400" />
                    Practice Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Clinic Name</p>
                      <p className="text-white font-medium">{doctorData.clinic_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Clinic Address</p>
                      <p className="text-white font-medium flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                        <span>{doctorData.clinic_address}</span>
                      </p>
                    </div>
                    {doctorData.hospital_affiliations && (
                      <div className="md:col-span-2">
                        <p className="text-gray-400 text-sm mb-1">Hospital Affiliations</p>
                        <p className="text-white font-medium">{doctorData.hospital_affiliations}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Consultation Fee */}
              <div className="bg-linear-to-br from-emerald-900/20 to-green-900/20 border border-emerald-500/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-2">Consultation Fee</h3>
                <p className="text-3xl font-bold text-emerald-400">₹{doctorData.consultation_fee}</p>
                <p className="text-gray-400 text-sm mt-1">per consultation</p>
              </div>

              {/* Verified Documents */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-400" />
                  Verified Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {doctorData.documents?.passport_photo && (
                    <a
                      href={doctorData.documents.passport_photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors group"
                    >
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">Passport Photo</p>
                        <p className="text-gray-400 text-xs">Verified ✓</p>
                      </div>
                      <Eye className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                    </a>
                  )}
                  
                  {doctorData.documents?.medical_certificate && (
                    <a
                      href={doctorData.documents.medical_certificate}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors group"
                    >
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Award className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">Medical Degree</p>
                        <p className="text-gray-400 text-xs">Verified ✓</p>
                      </div>
                      <Eye className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                    </a>
                  )}
                  
                  {doctorData.documents?.license_document && (
                    <a
                      href={doctorData.documents.license_document}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors group"
                    >
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">Medical License</p>
                        <p className="text-gray-400 text-xs">Verified ✓</p>
                      </div>
                      <Eye className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors" />
                    </a>
                  )}
                  
                  {doctorData.documents?.identity_proof && (
                    <a
                      href={doctorData.documents.identity_proof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors group"
                    >
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">Identity Proof</p>
                        <p className="text-gray-400 text-xs">Verified ✓</p>
                      </div>
                      <Eye className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
                    </a>
                  )}
                </div>
              </div>

              {/* Verification Status */}
              <div className="bg-linear-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-white font-semibold">Verified by MediAI Admin</p>
                    <p className="text-gray-400 text-sm">
                      This doctor has been verified and approved on{' '}
                      {doctorData.approved_at ? new Date(doctorData.approved_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-linear-to-br from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
