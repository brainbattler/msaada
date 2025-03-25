import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, LogIn, AlertCircle, RefreshCw, HandHeart } from 'lucide-react';
import toast from 'react-hot-toast';

function generateCaptchaText() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let captcha = '';
  for (let i = 0; i < 6; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return captcha;
}

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaText, setCaptchaText] = useState('');
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  
  useEffect(() => {
    refreshCaptcha();
  }, []);

  const refreshCaptcha = () => {
    setCaptchaText(generateCaptchaText());
    setUserCaptchaInput('');
  };

  const validateForm = () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return false;
    }
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (userCaptchaInput.toLowerCase() !== captchaText.toLowerCase()) {
      toast.error('Incorrect CAPTCHA. Please try again.');
      refreshCaptcha();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back! You\'ve successfully logged in.');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Account created successfully! Please check your email.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Authentication error:', err);
    } finally {
      setLoading(false);
      refreshCaptcha();
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HandHeart className="h-12 w-12 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gray-900">Msaada</h1>
          </div>
          <p className="text-gray-600">Quick Loans Made Easy</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
            id="password"
            type="password"
            placeholder="******************"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Verify CAPTCHA
          </label>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-blue-50 p-3 rounded-lg text-center">
              <span className="font-mono text-xl tracking-wider select-none" style={{
                fontFamily: 'monospace',
                letterSpacing: '0.25em',
                fontStyle: 'italic',
                textDecoration: 'line-through',
                color: '#2563eb'
              }}>
                {captchaText}
              </span>
            </div>
            <button
              type="button"
              onClick={refreshCaptcha}
              className="p-2 text-blue-600 hover:text-blue-800"
              title="Refresh CAPTCHA"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            type="text"
            placeholder="Enter the characters above"
            value={userCaptchaInput}
            onChange={(e) => setUserCaptchaInput(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-4">
          <button
            className={`bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center gap-2 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                {isLogin ? 'Signing In...' : 'Creating Account...'}
              </div>
            ) : isLogin ? (
              <>
                <LogIn size={20} />
                Sign In
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Sign Up
              </>
            )}
          </button>

          <button
            type="button"
            className="text-sm text-emerald-600 hover:text-emerald-800"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
}