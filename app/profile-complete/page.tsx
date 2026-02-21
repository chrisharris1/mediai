'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import PhoneInput from 'react-phone-number-input';
import DatePicker from 'react-datepicker';
import 'react-phone-number-input/style.css';
import 'react-datepicker/dist/react-datepicker.css';
import { ArrowLeft, Save, Plus, X, Upload, Loader2, User, Phone, Mail, Calendar, MapPin, Briefcase, Heart, Droplet, Ruler, Scale, Shield, FileText, AlertTriangle, Stethoscope, Pill, CheckCircle, ChevronRight, Activity } from 'lucide-react';

interface ProfileFormData {
  // Personal Information
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  occupation: string;
  profile_photo?: File;
  profile_photo_url?: string;
  
  // Emergency Contact
  emergency_contact_name: string;
  emergency_contact_number: string;
  
  // Medical Information
  blood_type: string;
  height: string;
  weight: string;
  insurance_provider: string;
  insurance_policy_number: string;
  allergies: Array<string | { name: string; added_at: string; updated_at: string }>;
  current_medications: Array<string | { name: string; added_at: string; updated_at: string }>;
  family_medical_history: string;
  past_medical_history: string;
  
  // Identification
  identification_type: string;
  identification_number: string;
  identification_document?: File;
  
  // Consent
  consent_treatment: boolean;
  consent_privacy: boolean;
  consent_disclosure: boolean;
}

export default function ComprehensiveProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    occupation: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    blood_type: '',
    height: '',
    weight: '',
    insurance_provider: '',
    insurance_policy_number: '',
    allergies: [],
    current_medications: [],
    family_medical_history: '',
    past_medical_history: '',
    identification_type: 'Birth Certificate',
    identification_number: '',
    consent_treatment: false,
    consent_privacy: false,
    consent_disclosure: false,
  });
  
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: User, color: 'from-blue-600 to-indigo-700' },
    { id: 'emergency', label: 'Emergency', icon: Heart, color: 'from-red-600 to-rose-700' },
    { id: 'medical', label: 'Medical', icon: Stethoscope, color: 'from-emerald-600 to-green-700' },
    { id: 'identification', label: 'Identification', icon: Shield, color: 'from-amber-600 to-orange-700' },
    { id: 'consent', label: 'Consent', icon: FileText, color: 'from-purple-600 to-pink-700' },
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      setProfileData(prev => ({
        ...prev,
        full_name: session.user?.name || '',
        email: session.user?.email || '',
      }));
      fetchProfile();
    }
  }, [status, session, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile/comprehensive');
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setIsEditMode(true);
          setProfileData(prev => ({
            ...prev,
            full_name: data.profile.full_name || prev.full_name,
            email: data.profile.email || prev.email,
            phone: data.profile.phone || '',
            date_of_birth: data.profile.date_of_birth || '',
            gender: data.profile.gender || '',
            address: data.profile.address || '',
            occupation: data.profile.occupation || '',
            profile_photo_url: data.profile.profile_photo_url || '',
            emergency_contact_name: data.profile.emergency_contact_name || '',
            emergency_contact_number: data.profile.emergency_contact_number || '',
            blood_type: data.profile.medical_info?.blood_type || '',
            height: data.profile.medical_info?.height || '',
            weight: data.profile.medical_info?.weight || '',
            insurance_provider: data.profile.medical_info?.insurance_provider || '',
            insurance_policy_number: data.profile.medical_info?.insurance_policy_number || '',
            allergies: data.profile.medical_info?.allergies || [],
            current_medications: data.profile.medical_info?.current_medications || [],
            family_medical_history: data.profile.medical_info?.family_medical_history || '',
            past_medical_history: data.profile.medical_info?.past_medical_history || '',
            identification_type: data.profile.identification?.type || 'Aadhaar Card',
            identification_number: data.profile.identification?.number || '',
            consent_treatment: true,
            consent_privacy: true,
            consent_disclosure: true,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.consent_treatment || !profileData.consent_privacy || !profileData.consent_disclosure) {
      setShowConsentError(true);
      setActiveSection('consent');
      return;
    }

    setSaving(true);

    try {
      let profilePhotoUrl = profileData.profile_photo_url || '';
      if (profileData.profile_photo) {
        const formData = new FormData();
        formData.append('file', profileData.profile_photo);

        const uploadRes = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          profilePhotoUrl = uploadData.url;
        } else {
          alert('Failed to upload profile photo');
          setSaving(false);
          return;
        }
      }

      let documentUrl = '';
      if (profileData.identification_document) {
        const formData = new FormData();
        formData.append('file', profileData.identification_document);

        const uploadRes = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          documentUrl = uploadData.url;
        } else {
          alert('Failed to upload identification document');
          setSaving(false);
          return;
        }
      }

      const profileDataToSend = {
        ...profileData,
        identification_document_url: documentUrl,
        profile_photo_url: profilePhotoUrl,
      };
      
      delete (profileDataToSend as any).identification_document;
      delete (profileDataToSend as any).profile_photo;

      const res = await fetch('/api/profile/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileDataToSend),
      });

      if (res.ok) {
        alert('Profile saved successfully!');
        router.push('/dashboard');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (category: 'allergies' | 'current_medications', value: string, clearInput: () => void) => {
    if (!value.trim()) return;
    
    const itemName = value.trim();
    if (!profileData[category].some(item => 
      typeof item === 'string' ? item === itemName : item.name === itemName
    )) {
      setProfileData(prev => ({
        ...prev,
        [category]: [...prev[category], itemName]
      }));
      clearInput();
    }
  };

  const removeItem = (category: 'allergies' | 'current_medications', index: number) => {
    setProfileData(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const calculateBMI = () => {
    if (profileData.height && profileData.weight) {
      const heightInMeters = Number(profileData.height) / 100;
      const weight = Number(profileData.weight);
      if (heightInMeters > 0 && weight > 0) {
        return weight / (heightInMeters * heightInMeters);
      }
    }
    return null;
  };

  const bmi = calculateBMI();
  const bmiCategory = bmi ? 
    bmi < 18.5 ? 'Underweight' :
    bmi < 25 ? 'Normal' :
    bmi < 30 ? 'Overweight' : 'Obese'
  : null;

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-300 text-lg">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-linear-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    {isEditMode ? 'Edit Health Profile' : 'Complete Health Profile'}
                  </h1>
                  <p className="text-sm text-gray-400">
                    {isEditMode ? 'Update your health information' : 'Complete your medical profile'}
                  </p>
                </div>
              </div>
            </div>
            
            {isEditMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium border border-emerald-500/30">
                <CheckCircle className="w-4 h-4" />
                Edit Mode
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Navigation */}
        <div className="flex overflow-x-auto pb-4 mb-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all shrink-0 ${
                activeSection === section.id
                  ? `bg-linear-to-br ${section.color} text-white shadow-lg`
                  : 'bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              <section.icon className="w-5 h-5" />
              {section.label}
              {activeSection === section.id && (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              {activeSection === 'personal' && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Personal Information</h2>
                      <p className="text-sm text-gray-400">Your basic details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 items-center gap-2">
                        <User className="w-4 h-4" />
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        readOnly
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl opacity-75"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone Number *
                      </label>
                      <PhoneInput
                        international
                        defaultCountry="IN"
                        value={profileData.phone}
                        onChange={(value) => setProfileData(prev => ({ ...prev, phone: value || '' }))}
                        className="w-full"
                        placeholder="+91 99999 99999"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date of Birth *
                      </label>
                      <DatePicker
                        selected={profileData.date_of_birth ? new Date(profileData.date_of_birth) : null}
                        onChange={(date: Date | null) => setProfileData(prev => ({ ...prev, date_of_birth: date ? date.toISOString().split('T')[0] : '' }))}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select date of birth"
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                        maxDate={new Date()}
                        yearDropdownItemNumber={100}
                        scrollableYearDropdown
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        wrapperClassName="w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Gender *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['male', 'female', 'other'].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setProfileData(prev => ({ ...prev, gender: g }))}
                            className={`px-4 py-3 rounded-xl border transition-all ${
                              profileData.gender === g
                                ? 'border-blue-500 bg-linear-to-br from-blue-500/20 to-indigo-500/20 text-white'
                                : 'border-white/10 hover:border-blue-500/50 text-gray-300 hover:text-white'
                            }`}
                          >
                            <span className="capitalize">{g}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Occupation
                      </label>
                      <input
                        type="text"
                        value={profileData.occupation}
                        onChange={(e) => setProfileData(prev => ({ ...prev, occupation: e.target.value }))}
                        placeholder="Software Engineer"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2 items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Address *
                      </label>
                      <textarea
                        value={profileData.address}
                        onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter your full address"
                        rows={3}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Profile Photo */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-300 mb-4">
                      Profile Photo <span className="text-gray-400">(Optional)</span>
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        {(profileData.profile_photo || profileData.profile_photo_url) ? (
                          <>
                            <img
                              src={profileData.profile_photo ? URL.createObjectURL(profileData.profile_photo) : profileData.profile_photo_url}
                              alt="Profile"
                              className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500/30"
                            />
                            <button
                              type="button"
                              onClick={() => setProfileData(prev => ({ ...prev, profile_photo: undefined, profile_photo_url: undefined }))}
                              className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-linear-to-br from-blue-900/30 to-indigo-900/30 border-2 border-blue-500/20 flex items-center justify-center">
                            <User className="w-10 h-10 text-blue-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProfileData(prev => ({ ...prev, profile_photo: e.target.files?.[0] }))}
                          className="hidden"
                          id="profile-photo-upload"
                        />
                        <label
                          htmlFor="profile-photo-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 cursor-pointer transition-opacity"
                        >
                          <Upload className="w-4 h-4" />
                          {profileData.profile_photo || profileData.profile_photo_url ? 'Change Photo' : 'Upload Photo'}
                        </label>
                        <p className="text-xs text-gray-400 mt-2">Square image, at least 400x400px</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-8 pt-6 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveSection('emergency')}
                      className="px-6 py-3 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                    >
                      Next: Emergency Contact <ChevronRight className="inline ml-2 w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {activeSection === 'emergency' && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-linear-to-br from-red-600 to-rose-700 rounded-xl flex items-center justify-center">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Emergency Contact</h2>
                      <p className="text-sm text-gray-400">Important contact for emergencies</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        value={profileData.emergency_contact_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                        placeholder="Guardian's name"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Contact Number *
                      </label>
                      <PhoneInput
                        international
                        defaultCountry="IN"
                        value={profileData.emergency_contact_number}
                        onChange={(value) => setProfileData(prev => ({ ...prev, emergency_contact_number: value || '' }))}
                        className="w-full"
                        placeholder="+91 99999 99999"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveSection('personal')}
                      className="px-6 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
                    >
                      ← Back to Personal
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('medical')}
                      className="px-6 py-3 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                    >
                      Next: Medical Info <ChevronRight className="inline ml-2 w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Medical Information */}
              {activeSection === 'medical' && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-linear-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Medical Information</h2>
                      <p className="text-sm text-gray-400">Important health details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2 items-center gap-2">
                        <Droplet className="w-4 h-4" />
                        Blood Type *
                      </label>
                      <select
                        value={profileData.blood_type}
                        onChange={(e) => setProfileData(prev => ({ ...prev, blood_type: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        required
                      >
                        <option value="" className="bg-gray-900">Select blood type</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                          <option key={type} value={type} className="bg-gray-900">{type}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2 items-center gap-2">
                          <Ruler className="w-4 h-4" />
                          Height (cm)
                        </label>
                        <input
                          type="number"
                          value={profileData.height}
                          onChange={(e) => setProfileData(prev => ({ ...prev, height: e.target.value }))}
                          placeholder="170"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2 items-center gap-2">
                          <Scale className="w-4 h-4" />
                          Weight (kg)
                        </label>
                        <input
                          type="number"
                          value={profileData.weight}
                          onChange={(e) => setProfileData(prev => ({ ...prev, weight: e.target.value }))}
                          placeholder="70"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Insurance Provider
                      </label>
                      <input
                        type="text"
                        value={profileData.insurance_provider}
                        onChange={(e) => setProfileData(prev => ({ ...prev, insurance_provider: e.target.value }))}
                        placeholder="Ex: BlueCross"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Policy Number
                      </label>
                      <input
                        type="text"
                        value={profileData.insurance_policy_number}
                        onChange={(e) => setProfileData(prev => ({ ...prev, insurance_policy_number: e.target.value }))}
                        placeholder="ABC123456"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Allergies */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Allergies (if any)
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('allergies', newAllergy, () => setNewAllergy('')))}
                        placeholder="Type allergy and press Enter"
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => addItem('allergies', newAllergy, () => setNewAllergy(''))}
                        className="px-4 bg-linear-to-br from-red-600 to-rose-700 text-white rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {profileData.allergies.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {profileData.allergies.map((allergy, index) => {
                          const allergyName = typeof allergy === 'string' ? allergy : allergy.name;
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-xl group"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                                  <AlertTriangle className="w-4 h-4 text-red-400" />
                                </div>
                                <span className="font-medium">{allergyName}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem('allergies', index)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Medications */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Current Medications
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('current_medications', newMedication, () => setNewMedication('')))}
                        placeholder="Type medication and press Enter"
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => addItem('current_medications', newMedication, () => setNewMedication(''))}
                        className="px-4 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {profileData.current_medications.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {profileData.current_medications.map((med, index) => {
                          const medName = typeof med === 'string' ? med : med.name;
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl group"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                  <Pill className="w-4 h-4 text-blue-400" />
                                </div>
                                <span className="font-medium">{medName}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem('current_medications', index)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Family Medical History (if relevant)
                      </label>
                      <textarea
                        value={profileData.family_medical_history}
                        onChange={(e) => setProfileData(prev => ({ ...prev, family_medical_history: e.target.value }))}
                        placeholder="Ex: Mother had breast cancer"
                        rows={3}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Past Medical History
                      </label>
                      <textarea
                        value={profileData.past_medical_history}
                        onChange={(e) => setProfileData(prev => ({ ...prev, past_medical_history: e.target.value }))}
                        placeholder="Previous surgeries, major illnesses, etc."
                        rows={3}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveSection('emergency')}
                      className="px-6 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
                    >
                      ← Back to Emergency
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('identification')}
                      className="px-6 py-3 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                    >
                      Next: Identification <ChevronRight className="inline ml-2 w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Identification */}
              {activeSection === 'identification' && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-linear-to-br from-amber-600 to-orange-700 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Identification & Verification</h2>
                      <p className="text-sm text-gray-400">Verify your identity</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Identification Type
                      </label>
                      <select
                        value={profileData.identification_type}
                        onChange={(e) => setProfileData(prev => ({ ...prev, identification_type: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="Aadhaar Card" className="bg-gray-900">Aadhaar Card</option>
                        <option value="Passport" className="bg-gray-900">Passport</option>
                        <option value="Driver's License" className="bg-gray-900">Driver's License</option>
                        <option value="Birth Certificate" className="bg-gray-900">Birth Certificate</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Identification Number *
                      </label>
                      <input
                        type="text"
                        value={profileData.identification_number}
                        onChange={(e) => setProfileData(prev => ({ ...prev, identification_number: e.target.value }))}
                        placeholder="123456789012"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Identification Document (Optional)
                      </label>
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-amber-500/50 transition-colors">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setProfileData(prev => ({ ...prev, identification_document: e.target.files?.[0] }))}
                          className="hidden"
                          id="id-upload"
                        />
                        <label htmlFor="id-upload" className="cursor-pointer text-amber-400 hover:text-amber-300 font-medium block text-lg">
                          Click to upload document
                        </label>
                        {profileData.identification_document && (
                          <p className="text-emerald-400 mt-2 font-medium">
                            ✓ {profileData.identification_document.name}
                          </p>
                        )}
                        <p className="text-sm text-gray-400 mt-2">PNG, JPG, or PDF up to 10MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveSection('medical')}
                      className="px-6 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
                    >
                      ← Back to Medical
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('consent')}
                      className="px-6 py-3 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                    >
                      Next: Consent <ChevronRight className="inline ml-2 w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Consent */}
              {activeSection === 'consent' && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-linear-to-br from-purple-600 to-pink-700 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Consent & Privacy</h2>
                      <p className="text-sm text-gray-400">Required agreements</p>
                    </div>
                  </div>

                  {showConsentError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="text-red-400 text-sm">
                        ❌ Please accept all consent forms to continue
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl border transition-all ${
                      profileData.consent_treatment 
                        ? 'border-emerald-500 bg-linear-to-br from-emerald-500/10 to-green-500/10'
                        : 'border-white/10 hover:border-emerald-500/50'
                    }`}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileData.consent_treatment}
                          onChange={(e) => {
                            setProfileData(prev => ({ ...prev, consent_treatment: e.target.checked }));
                            setShowConsentError(false);
                          }}
                          className="w-5 h-5 text-emerald-600 mt-0.5"
                          required
                        />
                        <div>
                          <p className="font-medium text-white mb-1">Consent to Treatment</p>
                          <p className="text-sm text-gray-300">
                            I consent to treatment and understand the information provided will be used for medical purposes.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${
                      profileData.consent_privacy 
                        ? 'border-emerald-500 bg-linear-to-br from-emerald-500/10 to-green-500/10'
                        : 'border-white/10 hover:border-emerald-500/50'
                    }`}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileData.consent_privacy}
                          onChange={(e) => {
                            setProfileData(prev => ({ ...prev, consent_privacy: e.target.checked }));
                            setShowConsentError(false);
                          }}
                          className="w-5 h-5 text-emerald-600 mt-0.5"
                          required
                        />
                        <div>
                          <p className="font-medium text-white mb-1">Privacy Policy Agreement</p>
                          <p className="text-sm text-gray-300">
                            I acknowledge that I have reviewed and agree to the <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${
                      profileData.consent_disclosure 
                        ? 'border-emerald-500 bg-linear-to-br from-emerald-500/10 to-green-500/10'
                        : 'border-white/10 hover:border-emerald-500/50'
                    }`}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileData.consent_disclosure}
                          onChange={(e) => {
                            setProfileData(prev => ({ ...prev, consent_disclosure: e.target.checked }));
                            setShowConsentError(false);
                          }}
                          className="w-5 h-5 text-emerald-600 mt-0.5"
                          required
                        />
                        <div>
                          <p className="font-medium text-white mb-1">Information Disclosure Consent</p>
                          <p className="text-sm text-gray-300">
                            I consent to the use and disclosure of my health information for treatment, payment, and healthcare operations.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveSection('identification')}
                      className="px-6 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
                    >
                      ← Back to Identification
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 bg-linear-to-br from-emerald-600 to-green-700 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 inline mr-2" />
                          {isEditMode ? 'Update Profile' : 'Complete Profile'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Right Column - Summary & Progress */}
          <div className="space-y-6">
            {/* Profile Summary */}
            <div className="bg-linear-to-br from-gray-900/20 to-gray-800/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Profile Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Personal Info</span>
                  <span className={`font-medium ${profileData.full_name && profileData.phone && profileData.date_of_birth ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {profileData.full_name && profileData.phone && profileData.date_of_birth ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Emergency Contact</span>
                  <span className={`font-medium ${profileData.emergency_contact_name && profileData.emergency_contact_number ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {profileData.emergency_contact_name && profileData.emergency_contact_number ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Medical Info</span>
                  <span className={`font-medium ${profileData.blood_type ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {profileData.blood_type ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Identification</span>
                  <span className={`font-medium ${profileData.identification_number ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {profileData.identification_number ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Consent</span>
                  <span className={`font-medium ${profileData.consent_treatment && profileData.consent_privacy && profileData.consent_disclosure ? 'text-emerald-400' : 'text-red-400'}`}>
                    {profileData.consent_treatment && profileData.consent_privacy && profileData.consent_disclosure ? 'Accepted' : 'Required'}
                  </span>
                </div>
              </div>

              {/* Health Metrics */}
              {profileData.height && profileData.weight && bmi && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Health Metrics</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-400">{profileData.height}</div>
                      <div className="text-xs text-gray-400">cm</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">{profileData.weight}</div>
                      <div className="text-xs text-gray-400">kg</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-400">{bmi ? bmi.toFixed(1) : '-'}</div>
                      <div className="text-xs text-gray-400">BMI</div>
                    </div>
                  </div>
                  {bmiCategory && (
                    <div className="mt-2 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        bmiCategory === 'Normal' ? 'bg-emerald-500/20 text-emerald-400' :
                        bmiCategory === 'Underweight' ? 'bg-blue-500/20 text-blue-400' :
                        bmiCategory === 'Overweight' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {bmiCategory}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-linear-to-br from-emerald-900/20 to-green-900/20 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Medical Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-gray-300">Allergies</span>
                  </div>
                  <span className="font-bold text-white">{profileData.allergies.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300">Medications</span>
                  </div>
                  <span className="font-bold text-white">{profileData.current_medications.length}</span>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-linear-to-br from-amber-900/20 to-orange-900/20 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Important Notes
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></div>
                  <span className="text-sm text-gray-300">All information is encrypted and secure</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt=2 shrink-0"></div>
                  <span className="text-sm text-gray-300">Complete profile for better health insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></div>
                  <span className="text-sm text-gray-300">Update regularly for accurate records</span>
                </li>
              </ul>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full px-6 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
            >
              Cancel & Return to Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
