'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PhoneInput from 'react-phone-number-input';
import DatePicker from 'react-datepicker';
import 'react-phone-number-input/style.css';
import 'react-datepicker/dist/react-datepicker.css';
import { ArrowLeft, Upload, Loader2, CheckCircle, User, Mail, Lock, Phone, Calendar, Stethoscope, Award, Building, FileText, Shield, Users, CreditCard, X } from 'lucide-react';

export default function DoctorRegistration() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeSection, setActiveSection] = useState(1);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState({
    accurate: false,
    credentials: false,
    guidelines: false,
    commission: false,
  });
  const [formData, setFormData] = useState({
    // Personal Info
    full_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    
    // Professional Info
    medical_license_number: '',
    specialization: '',
    custom_specialization: '', // For "Other" option
    years_of_experience: '',
    medical_degree: '',
    medical_school: '',
    graduation_year: '',
    
    // Practice Info
    has_clinic: false,
    clinic_name: '',
    clinic_address: '',
    hospital_affiliations: '',
    consultation_fee: '',
    
    // Documents
    passport_photo: null as File | null,
    medical_certificate: null as File | null,
    license_document: null as File | null,
    identity_proof: null as File | null,
    clinic_registration: null as File | null,
  });

  // State for existing documents (from database)
  const [existingDocuments, setExistingDocuments] = useState<any>({});
  const [additionalDocuments, setAdditionalDocuments] = useState<Array<{label: string, file: File}>>([]);

  // Load existing doctor data if in edit mode
  useEffect(() => {
    const loadDoctorData = async () => {
      if (isEditMode) {
        try {
          setLoading(true);
          const res = await fetch('/api/doctor/profile-data');
          if (res.ok) {
            const { data } = await res.json();
            setFormData(prev => ({
              ...prev,
              full_name: data.full_name || '',
              email: data.email || '',
              phone: data.phone || '',
              date_of_birth: data.date_of_birth || '',
              gender: data.gender || '',
              medical_license_number: data.medical_license_number || '',
              specialization: data.specialization || '',
              custom_specialization: data.custom_specialization || '',
              years_of_experience: data.years_of_experience || '',
              medical_degree: data.medical_degree || '',
              medical_school: data.medical_school || '',
              graduation_year: data.graduation_year || '',
              has_clinic: data.has_clinic || false,
              clinic_name: data.clinic_name || '',
              clinic_address: data.clinic_address || '',
              hospital_affiliations: data.hospital_affiliations || '',
              consultation_fee: data.consultation_fee || '',
            }));
            // Load existing documents
            if (data.documents) {
              setExistingDocuments(data.documents);
            }
          }
        } catch (err) {
          console.error('Error loading doctor data:', err);
          setError('Failed to load profile data');
        } finally {
          setLoading(false);
        }
      }
    };
    loadDoctorData();
  }, [isEditMode]);

  // Auto-dismiss error after 7 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleFileChange = (field: string, file: File | null) => {
    // Clean up old object URL if exists
    const oldFile = formData[field as keyof typeof formData] as File | null;
    if (oldFile instanceof File) {
      const oldUrl = URL.createObjectURL(oldFile);
      URL.revokeObjectURL(oldUrl);
    }
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  const handleFileRemove = (field: string) => {
    // Clean up object URL
    const file = formData[field as keyof typeof formData] as File | null;
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      URL.revokeObjectURL(url);
    }
    setFormData(prev => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required passport photo
    if (!formData.passport_photo) {
      setError('Please upload Passport Size Photo');
      return;
    }

    // Validate required documents
    if (!formData.medical_certificate) {
      setError('Please upload Medical Degree Certificate');
      return;
    }
    if (!formData.license_document) {
      setError('Please upload Medical License Document');
      return;
    }
    if (!formData.identity_proof) {
      setError('Please upload Identity Proof');
      return;
    }

    // Validate all terms are accepted
    if (!termsAccepted.accurate || !termsAccepted.credentials || 
        !termsAccepted.guidelines || !termsAccepted.commission) {
      setError('Please accept all Terms & Conditions');
      return;
    }

    setLoading(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add all text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && !(value instanceof File)) {
          submitData.append(key, value.toString());
        }
      });
      
      // Add files
      if (formData.medical_certificate) submitData.append('medical_certificate', formData.medical_certificate);
      if (formData.license_document) submitData.append('license_document', formData.license_document);
      if (formData.identity_proof) submitData.append('identity_proof', formData.identity_proof);
      if (formData.clinic_registration) submitData.append('clinic_registration', formData.clinic_registration);

      const res = await fetch('/api/doctor-register', {
        method: 'POST',
        body: submitData,
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Error submitting registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextSection = () => {
    setError('');
    // Validation for each section
    if (activeSection === 1) {
      // In edit mode, password is not required
      const passwordRequired = !isEditMode && !formData.password;
      if (!formData.full_name || !formData.email || passwordRequired || 
          !formData.phone || !formData.date_of_birth || !formData.gender) {
        setError('Please fill all required fields in Personal Information');
        return;
      }
    } else if (activeSection === 2) {
      if (!formData.medical_license_number || !formData.specialization || 
          !formData.years_of_experience || !formData.medical_degree || 
          !formData.medical_school || !formData.graduation_year) {
        setError('Please fill all required fields in Professional Information');
        return;
      }
    } else if (activeSection === 3) {
      if (!formData.consultation_fee) {
        setError('Please enter your consultation fee');
        return;
      }
    }
    
    if (activeSection < 4) setActiveSection(prev => prev + 1);
  };

  const prevSection = () => {
    setError('');
    if (activeSection > 1) setActiveSection(prev => prev - 1);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-10 text-center border border-white/20">
          <div className="w-24 h-24 bg-linear-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <CheckCircle className="w-14 h-14 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4 bg-linear-to-br from-green-600 to-emerald-600 bg-clip-text">
            Application Submitted!
          </h2>
          <p className="text-gray-600 mb-8">
            Thank you for registering as a doctor. Your application has been sent to our admin team for verification.
            You will receive an email notification within 3-4 business days with the approval status.
          </p>
          <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-inner">
            <p className="text-sm font-semibold text-blue-900 mb-3">
              🎉 What's next?
            </p>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Review patient consultation requests
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Earn ₹500-2000 per consultation
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Contribute to our medicine database
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Help patients make informed decisions
              </li>
            </ul>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-4 bg-linear-to-br from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e40af20_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#7c3aed20_0%,transparent_50%)]"></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-blue-500/10 rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 border border-purple-500/10 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/3 w-16 h-16 border border-emerald-500/10 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-white/10 bg-black/30 backdrop-blur-lg">
          <div className="max-w-6xl mx-auto px-6 py-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/register')}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center group-hover:border-white/20 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span className="text-sm hidden sm:inline">Back to Registration</span>
              </button>
              
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">MediAI Doctor</h1>
                  <p className="text-gray-400 text-xs">Professional Registration</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Panel - Progress & Benefits */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl h-full">
                {/* Progress Steps */}
                <div className="mb-10">
                  <h2 className="text-2xl font-bold text-white mb-6">Registration Progress</h2>
                  <div className="space-y-6">
                    {[
                      { number: 1, label: 'Personal Details', icon: User },
                      { number: 2, label: 'Professional Info', icon: Stethoscope },
                      { number: 3, label: 'Practice Setup', icon: Building },
                      { number: 4, label: 'Document Upload', icon: FileText },
                    ].map((step) => (
                      <div key={step.number} className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                          activeSection >= step.number 
                            ? 'bg-linear-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30' 
                            : 'bg-white/5 border border-white/10'
                        }`}>
                          <step.icon className={`w-5 h-5 ${
                            activeSection >= step.number ? 'text-white' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className={`font-medium ${
                            activeSection >= step.number ? 'text-white' : 'text-gray-400'
                          }`}>
                            Step {step.number}
                          </p>
                          <p className={`text-sm ${
                            activeSection >= step.number ? 'text-blue-300' : 'text-gray-500'
                          }`}>
                            {step.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits Card */}
                <div className="bg-linear-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-400" />
                    Why Join MediAI?
                  </h3>
                  <ul className="space-y-3">
                    {[
                      { text: 'Earn ₹500-2000 per consultation', icon: '💰' },
                      { text: 'Flexible remote consultations', icon: '⏱️' },
                      { text: 'Verified medical community', icon: '👨‍⚕️' },
                      { text: 'Contribute to medical database', icon: '📊' },
                    ].map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-lg">{benefit.icon}</span>
                        <span className="text-sm text-gray-300">{benefit.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Panel - Form */}
            <div className="lg:col-span-2">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Doctor Registration
                  </h1>
                  <p className="text-gray-300">
                    Join our elite network of medical professionals and transform healthcare
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Section 1: Personal Information */}
                  {activeSection === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Personal Information</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Full Name <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="text"
                              required
                              value={formData.full_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                              placeholder="Dr. John Smith"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Email <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="email"
                              required
                              value={formData.email}
                              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                              placeholder="doctor@example.com"
                            />
                          </div>
                        </div>

                        {/* Only show password field during initial registration, not in edit mode */}
                        {!isEditMode && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">
                              Password <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Phone <span className="text-red-400">*</span>
                          </label>
                          <PhoneInput
                            international
                            defaultCountry="IN"
                            value={formData.phone}
                            onChange={(value) => setFormData(prev => ({ ...prev, phone: value || '' }))}
                            className="phone-input-custom"
                            placeholder="+91 98765 43210"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Date of Birth <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
                            <DatePicker
                              selected={formData.date_of_birth ? new Date(formData.date_of_birth) : null}
                              onChange={(date: Date | null) => {
                                const selectedDate = date ? date.toISOString().split('T')[0] : '';
                                setFormData(prev => ({ ...prev, date_of_birth: selectedDate }));
                                
                                // Age validation (26+ years)
                                if (date) {
                                  const today = new Date();
                                  const birthDate = new Date(date);
                                  let age = today.getFullYear() - birthDate.getFullYear();
                                  const monthDiff = today.getMonth() - birthDate.getMonth();
                                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                    age--;
                                  }
                                  
                                  if (age < 26) {
                                    setError('Doctors must be at least 26 years old to register');
                                  } else {
                                    setError('');
                                  }
                                }
                              }}
                              dateFormat="dd/MM/yyyy"
                              placeholderText="Select date of birth"
                              showYearDropdown
                              showMonthDropdown
                              dropdownMode="select"
                              maxDate={new Date(new Date().getFullYear() - 26, new Date().getMonth(), new Date().getDate())}
                              yearDropdownItemNumber={100}
                              scrollableYearDropdown
                              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                              wrapperClassName="w-full"
                              required
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            ⚕️ Doctors must be at least 26 years old
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Gender <span className="text-red-400">*</span>
                          </label>
                          <select
                            required
                            value={formData.gender}
                            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white"
                          >
                            <option value="" className="bg-gray-900">Select gender</option>
                            <option value="male" className="bg-gray-900">Male</option>
                            <option value="female" className="bg-gray-900">Female</option>
                            <option value="other" className="bg-gray-900">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 2: Professional Information */}
                  {activeSection === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <Stethoscope className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Professional Information</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Medical License Number */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Medical License Number <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.medical_license_number}
                            onChange={(e) => setFormData(prev => ({ ...prev, medical_license_number: e.target.value }))}
                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                            placeholder="MCI-12345"
                          />
                        </div>

                        {/* Specialization Dropdown */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Specialization <span className="text-red-400">*</span>
                          </label>
                          <select
                            required
                            value={formData.specialization}
                            onChange={(e) => {
                              setFormData(prev => ({ 
                                ...prev, 
                                specialization: e.target.value,
                                custom_specialization: e.target.value === 'Other' ? prev.custom_specialization : ''
                              }));
                            }}
                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white"
                          >
                            <option value="" className="bg-gray-900">Select Specialization</option>
                            <option value="General Physician" className="bg-gray-900">General Physician</option>
                            <option value="Cardiology" className="bg-gray-900">Cardiology</option>
                            <option value="Neurology" className="bg-gray-900">Neurology</option>
                            <option value="Pediatrics" className="bg-gray-900">Pediatrics</option>
                            <option value="Orthopedics" className="bg-gray-900">Orthopedics</option>
                            <option value="Dermatology" className="bg-gray-900">Dermatology</option>
                            <option value="Psychiatry" className="bg-gray-900">Psychiatry</option>
                            <option value="Gynecology" className="bg-gray-900">Gynecology</option>
                            <option value="Obstetrics" className="bg-gray-900">Obstetrics</option>
                            <option value="Oncology" className="bg-gray-900">Oncology</option>
                            <option value="Clinical Pharmacology" className="bg-gray-900">Clinical Pharmacology</option>
                            <option value="Allergist" className="bg-gray-900">Allergist</option>
                            <option value="Immunology" className="bg-gray-900">Immunology</option>
                            <option value="Endocrinology" className="bg-gray-900">Endocrinology</option>
                            <option value="Gastroenterology" className="bg-gray-900">Gastroenterology</option>
                            <option value="Other" className="bg-gray-900">Other (specify below)</option>
                          </select>
                        </div>

                        {/* Custom Specialization Input (shown when "Other" is selected) */}
                        {formData.specialization === 'Other' && (
                          <div className="space-y-2 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-300">
                              Specify Your Specialization <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.custom_specialization}
                              onChange={(e) => setFormData(prev => ({ ...prev, custom_specialization: e.target.value }))}
                              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                              placeholder="Enter your specialization"
                            />
                          </div>
                        )}

                        {/* Years of Experience */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Years of Experience <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={formData.years_of_experience}
                            onChange={(e) => setFormData(prev => ({ ...prev, years_of_experience: e.target.value }))}
                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                            placeholder="5"
                          />
                        </div>

                        {/* Medical Degree */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Medical Degree <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.medical_degree}
                            onChange={(e) => setFormData(prev => ({ ...prev, medical_degree: e.target.value }))}
                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                            placeholder="MBBS, MD, etc."
                          />
                        </div>

                        {/* Medical School */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Medical School <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.medical_school}
                            onChange={(e) => setFormData(prev => ({ ...prev, medical_school: e.target.value }))}
                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                            placeholder="AIIMS, JIPMER"
                          />
                        </div>

                        {/* Graduation Year */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-300">
                            Graduation Year <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min="1950"
                            max={new Date().getFullYear().toString()}
                            value={formData.graduation_year}
                            onChange={(e) => setFormData(prev => ({ ...prev, graduation_year: e.target.value }))}
                            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                            placeholder="2015"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 3: Practice Information */}
                  {activeSection === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <Building className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Practice Information</h2>
                      </div>

                      <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={formData.has_clinic}
                                onChange={(e) => setFormData(prev => ({ ...prev, has_clinic: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-6 h-6 border-2 border-gray-400 rounded-lg peer-checked:bg-blue-500 peer-checked:border-blue-500 flex items-center justify-center">
                                {formData.has_clinic && (
                                  <CheckCircle className="w-4 h-4 text-white" />
                                )}
                              </div>
                            </div>
                            <span className="text-white font-medium">I have my own clinic</span>
                          </label>
                        </div>

                        {formData.has_clinic && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-300">Clinic Name</label>
                              <input
                                type="text"
                                value={formData.clinic_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, clinic_name: e.target.value }))}
                                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                                placeholder="Smith Medical Clinic"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-300">Clinic Address</label>
                              <input
                                type="text"
                                value={formData.clinic_address}
                                onChange={(e) => setFormData(prev => ({ ...prev, clinic_address: e.target.value }))}
                                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                                placeholder="123 Main St, City"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Hospital Affiliations</label>
                            <div className="relative">
                              <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="text"
                                value={formData.hospital_affiliations}
                                onChange={(e) => setFormData(prev => ({ ...prev, hospital_affiliations: e.target.value }))}
                                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                                placeholder="City General Hospital, etc."
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">
                              Consultation Fee (₹) <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                              <CreditCard className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="number"
                                required
                                min="100"
                                value={formData.consultation_fee}
                                onChange={(e) => setFormData(prev => ({ ...prev, consultation_fee: e.target.value }))}
                                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400"
                                placeholder="500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 4: Documents */}
                  {activeSection === 4 && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Document Verification</h2>
                      </div>

                      {/* Passport Size Photo - Mandatory */}
                      <div className="bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-4">
                          <span className="mr-2">📸</span>
                          Passport Size Photo <span className="text-red-400">* (Required)</span>
                        </label>
                        <div className="flex items-center gap-6">
                          {formData.passport_photo ? (
                            <div className="relative">
                              <img
                                src={URL.createObjectURL(formData.passport_photo)}
                                alt="Passport Photo"
                                className="w-32 h-32 rounded-lg object-cover border-4 border-blue-500/50"
                              />
                              <button
                                type="button"
                                onClick={() => handleFileRemove('passport_photo')}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-32 h-32 rounded-lg bg-linear-to-br from-blue-600/20 to-purple-600/20 border-2 border-dashed border-blue-500/50 flex items-center justify-center">
                              <User className="w-16 h-16 text-blue-400/50" />
                            </div>
                          )}
                          <div className="flex-1">
                            <input
                              type="file"
                              required
                              accept="image/*"
                              onChange={(e) => handleFileChange('passport_photo', e.target.files?.[0] || null)}
                              className="hidden"
                              id="passport_photo"
                            />
                            <label
                              htmlFor="passport_photo"
                              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-br from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 cursor-pointer transition-all shadow-lg"
                            >
                              <Upload className="w-5 h-5" />
                              {formData.passport_photo ? 'Change Photo' : 'Upload Passport Photo'}
                            </label>
                            {formData.passport_photo && (
                              <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                {formData.passport_photo.name}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              📋 Requirements: Clear passport size photo, white background preferred, JPEG/PNG format, max 5MB
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          { field: 'medical_certificate', label: 'Medical Degree Certificate', required: true, icon: '📜' },
                          { field: 'license_document', label: 'Medical License Document', required: true, icon: '📃' },
                          { field: 'identity_proof', label: 'Identity Proof (Aadhaar/Passport)', required: true, icon: '🪪' },
                          { field: 'clinic_registration', label: 'Clinic Registration (if applicable)', required: false, icon: '🏥' },
                        ].map(({ field, label, required, icon }) => {
                          const file = formData[field as keyof typeof formData] as File | null;
                          const fileUrl = file ? URL.createObjectURL(file) : null;
                          const isPdf = file?.type === 'application/pdf';
                          
                          return (
                            <div key={field} className="space-y-3">
                              <label className="block text-sm font-medium text-gray-300">
                                <span className="mr-2">{icon}</span>
                                {label} {required && <span className="text-red-400">*</span>}
                              </label>
                              <input
                                type="file"
                                required={required}
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                                className="hidden"
                                id={field}
                              />
                              
                              {!file ? (
                                <label
                                  htmlFor={field}
                                  className="cursor-pointer block border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-xl p-8 text-center transition-all group"
                                >
                                  <Upload className="w-10 h-10 text-gray-400 group-hover:text-blue-400 mx-auto mb-3 transition-colors" />
                                  <p className="text-blue-400 group-hover:text-blue-300 font-medium transition-colors">
                                    Click to upload
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">PDF or Image (max 10MB)</p>
                                </label>
                              ) : (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                                  {/* Preview */}
                                  {fileUrl && (
                                    <div className="mb-3">
                                      {isPdf ? (
                                        <div className="bg-black/30 rounded-lg p-4 text-center">
                                          <div className="w-16 h-16 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <FileText className="w-8 h-8 text-red-400" />
                                          </div>
                                          <p className="text-sm text-gray-300 mb-2">PDF Document</p>
                                          <a
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 text-xs underline"
                                          >
                                            Open Preview
                                          </a>
                                        </div>
                                      ) : (
                                        <img
                                          src={fileUrl}
                                          alt="Preview"
                                          className="w-full h-40 object-cover rounded-lg"
                                        />
                                      )}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                      isPdf ? 'bg-red-500/20' : 'bg-blue-500/20'
                                    }`}>
                                      {isPdf ? '📄' : '🖼️'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                      <p className="text-xs text-gray-400">
                                        {file.size < 1024 * 1024 
                                          ? `${(file.size / 1024).toFixed(1)} KB`
                                          : `${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <label
                                      htmlFor={field}
                                      className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg text-center cursor-pointer transition-colors"
                                    >
                                      Change
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleFileRemove(field)}
                                      className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded-lg transition-colors"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Terms */}
                      <div className="bg-linear-to-br from-gray-900/50 to-black/50 border border-white/10 rounded-xl p-6 mt-8">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-400" />
                          Terms & Conditions
                        </h3>
                        <div className="space-y-3">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={termsAccepted.accurate}
                              onChange={(e) => setTermsAccepted(prev => ({ ...prev, accurate: e.target.checked }))}
                              className="mt-1 w-4 h-4 rounded border-gray-600 bg-white/5 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                              I certify that all information provided is accurate and truthful
                            </span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={termsAccepted.credentials}
                              onChange={(e) => setTermsAccepted(prev => ({ ...prev, credentials: e.target.checked }))}
                              className="mt-1 w-4 h-4 rounded border-gray-600 bg-white/5 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                              I hold valid medical credentials and licenses
                            </span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={termsAccepted.guidelines}
                              onChange={(e) => setTermsAccepted(prev => ({ ...prev, guidelines: e.target.checked }))}
                              className="mt-1 w-4 h-4 rounded border-gray-600 bg-white/5 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                              I agree to follow MediAI's consultation guidelines
                            </span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={termsAccepted.commission}
                              onChange={(e) => setTermsAccepted(prev => ({ ...prev, commission: e.target.checked }))}
                              className="mt-1 w-4 h-4 rounded border-gray-600 bg-white/5 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                              Platform charges 20% commission on consultation fees
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-8 border-t border-white/10">
                    <button
                      type="button"
                      onClick={prevSection}
                      disabled={activeSection === 1}
                      className="px-6 py-3 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    
                    {activeSection < 4 ? (
                      <button
                        type="button"
                        onClick={nextSection}
                        className="px-8 py-3 bg-linear-to-br from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25"
                      >
                        Next Step
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-linear-to-br from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/25 flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Application'
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Snackbar Error Notification */}
      {error && (
        <div className="fixed top-6 right-6 z-50 animate-slideInRight">
          <div className="bg-linear-to-r from-red-500 to-red-600 text-white rounded-xl shadow-2xl p-4 pr-12 max-w-md border border-red-400">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Validation Error</h3>
                <p className="text-sm text-white/90">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-xl overflow-hidden">
              <div className="h-full bg-white/40 animate-shrink"></div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { 
            opacity: 0; 
            transform: translateX(100%);
          }
          to { 
            opacity: 1; 
            transform: translateX(0);
          }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-pulse { animation: pulse 3s ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideInRight { animation: slideInRight 0.4s ease-out; }
        .animate-shrink { animation: shrink 7s linear; }

        /* Phone Input Styles */
        .phone-input-custom {
          position: relative;
        }
        .phone-input-custom .PhoneInputInput {
          width: 100%;
          padding: 1rem 1rem 1rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s;
        }
        .phone-input-custom .PhoneInputInput:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .phone-input-custom .PhoneInputInput::placeholder {
          color: rgba(156, 163, 175, 0.6);
        }
        .phone-input-custom .PhoneInputCountry {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1;
          padding: 0;
          margin: 0;
          background: transparent;
          border: none;
        }
        .phone-input-custom .PhoneInputCountrySelect {
          background: transparent;
          border: none;
          color: white;
          padding: 0;
          margin: 0;
          cursor: pointer;
          outline: none;
        }
        .phone-input-custom .PhoneInputCountrySelect:focus {
          outline: none;
        }
        .phone-input-custom .PhoneInputCountryIcon {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 0.25rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .phone-input-custom .PhoneInputCountryIconImg {
          display: block;
          width: 100%;
          height: 100%;
        }
        .phone-input-custom .PhoneInputInput {
          padding-left: 3.5rem;
        }

        /* DatePicker Styles */
        .react-datepicker-wrapper {
          width: 100%;
        }
        .react-datepicker {
          font-family: inherit;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .react-datepicker__header {
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
          border-bottom: none;
          border-radius: 1rem 1rem 0 0;
          padding: 1rem;
        }
        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: white;
          font-weight: 600;
        }
        .react-datepicker__day {
          color: white;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        .react-datepicker__day:hover {
          background: rgba(59, 130, 246, 0.2);
          color: white;
        }
        .react-datepicker__day--selected {
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
          color: white;
          font-weight: bold;
        }
        .react-datepicker__day--keyboard-selected {
          background: rgba(59, 130, 246, 0.3);
          color: white;
        }
        .react-datepicker__day--disabled {
          color: rgba(156, 163, 175, 0.3);
        }
        .react-datepicker__month {
          background: #1e293b;
          padding: 0.5rem;
        }
        .react-datepicker__navigation {
          top: 1.2rem;
        }
        .react-datepicker__navigation-icon::before {
          border-color: white;
        }
        .react-datepicker__year-dropdown,
        .react-datepicker__month-dropdown {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
        }
        .react-datepicker__year-option,
        .react-datepicker__month-option {
          color: white;
          padding: 0.5rem;
        }
        .react-datepicker__year-option:hover,
        .react-datepicker__month-option:hover {
          background: rgba(59, 130, 246, 0.2);
        }
        .react-datepicker__year-option--selected,
        .react-datepicker__month-option--selected {
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
        }
      `}</style>
    </div>
  );
}