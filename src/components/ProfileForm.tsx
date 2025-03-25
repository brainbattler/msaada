import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { User, Phone, MapPin, Briefcase, DollarSign, Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface ValidationErrors {
  full_name?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  monthly_income?: string;
}

export function ProfileForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    full_name: '',
    address: '',
    phone: '',
    date_of_birth: '',
    employment_status: 'employed',
    monthly_income: 0
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      if (!navigator.onLine) {
        toast.error('No internet connection. Please check your connection and try again.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User session expired. Please log in again.');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile data. Please try again.');
        return;
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('An unexpected error occurred while loading your profile.');
    }
  };

  const validateProfile = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!profile.full_name?.trim() || profile.full_name.length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters long';
    }

    if (!profile.phone?.trim() || profile.phone.length < 10) {
      newErrors.phone = 'Phone number must be at least 10 characters long';
    }

    if (!profile.address?.trim() || profile.address.length < 5) {
      newErrors.address = 'Address must be at least 5 characters long';
    }

    if (!profile.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required';
    } else {
      const birthDate = new Date(profile.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.date_of_birth = 'You must be at least 18 years old';
      }
    }

    if (!profile.monthly_income || profile.monthly_income <= 0) {
      newErrors.monthly_income = 'Monthly income must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfile()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setLoading(true);
    setSuccess(false);

    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const updates = {
        user_id: user.id,
        full_name: profile.full_name?.trim(),
        address: profile.address?.trim(),
        phone: profile.phone?.trim(),
        date_of_birth: profile.date_of_birth,
        employment_status: profile.employment_status,
        monthly_income: profile.monthly_income,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates, {
          onConflict: 'user_id'
        });

      if (error) {
        if (error.code === '23514') { // Check constraint violation
          toast.error('Please ensure all fields meet the minimum requirements');
        } else if (error.code === '23505') { // Unique constraint violation
          toast.error('This profile already exists');
        } else {
          throw error;
        }
        return;
      }
      
      setSuccess(true);
      toast.success('Profile updated successfully!');
      
      // Refresh profile data
      await fetchProfile();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Unable to update profile: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-blue-800">
        <h2 className="text-2xl font-bold text-white">Complete Your Profile</h2>
        <p className="text-blue-100 mt-2">Please provide your details to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="full_name">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  className={`shadow appearance-none border rounded w-full py-2 pl-10 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    errors.full_name ? 'border-red-500' : 'focus:border-blue-500'
                  }`}
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  value={profile.full_name || ''}
                  onChange={(e) => {
                    setProfile({ ...profile, full_name: e.target.value });
                    if (errors.full_name) {
                      setErrors({ ...errors, full_name: undefined });
                    }
                  }}
                  required
                />
              </div>
              {errors.full_name && (
                <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                Phone Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  className={`shadow appearance-none border rounded w-full py-2 pl-10 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    errors.phone ? 'border-red-500' : 'focus:border-blue-500'
                  }`}
                  id="phone"
                  type="tel"
                  placeholder="+254"
                  value={profile.phone || ''}
                  onChange={(e) => {
                    setProfile({ ...profile, phone: e.target.value });
                    if (errors.phone) {
                      setErrors({ ...errors, phone: undefined });
                    }
                  }}
                  required
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="date_of_birth">
                Date of Birth *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  className={`shadow appearance-none border rounded w-full py-2 pl-10 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    errors.date_of_birth ? 'border-red-500' : 'focus:border-blue-500'
                  }`}
                  id="date_of_birth"
                  type="date"
                  value={profile.date_of_birth || ''}
                  onChange={(e) => {
                    setProfile({ ...profile, date_of_birth: e.target.value });
                    if (errors.date_of_birth) {
                      setErrors({ ...errors, date_of_birth: undefined });
                    }
                  }}
                  required
                />
              </div>
              {errors.date_of_birth && (
                <p className="text-red-500 text-xs mt-1">{errors.date_of_birth}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="employment_status">
                Employment Status *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="shadow appearance-none border rounded w-full py-2 pl-10 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                  id="employment_status"
                  value={profile.employment_status || 'employed'}
                  onChange={(e) => setProfile({ ...profile, employment_status: e.target.value })}
                  required
                >
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="monthly_income">
                Monthly Income (KSH) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  className={`shadow appearance-none border rounded w-full py-2 pl-10 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    errors.monthly_income ? 'border-red-500' : 'focus:border-blue-500'
                  }`}
                  id="monthly_income"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="50000"
                  value={profile.monthly_income || ''}
                  onChange={(e) => {
                    setProfile({ ...profile, monthly_income: parseFloat(e.target.value) });
                    if (errors.monthly_income) {
                      setErrors({ ...errors, monthly_income: undefined });
                    }
                  }}
                  required
                />
              </div>
              {errors.monthly_income && (
                <p className="text-red-500 text-xs mt-1">{errors.monthly_income}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                Physical Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  className={`shadow appearance-none border rounded w-full py-2 pl-10 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    errors.address ? 'border-red-500' : 'focus:border-blue-500'
                  }`}
                  id="address"
                  rows={3}
                  placeholder="Enter your full address"
                  value={profile.address || ''}
                  onChange={(e) => {
                    setProfile({ ...profile, address: e.target.value });
                    if (errors.address) {
                      setErrors({ ...errors, address: undefined });
                    }
                  }}
                  required
                />
              </div>
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">{errors.address}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-gray-600">* Required fields</p>
          <div className="flex items-center gap-4">
            {success && (
              <span className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                Profile saved successfully!
              </span>
            )}
            <button
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline flex items-center gap-2 transition duration-150 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Saving...
                </div>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}