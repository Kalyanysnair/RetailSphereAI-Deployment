import React, { useState } from 'react';
import { User, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleSignInButton } from './GoogleSignInButton';
import { SignupCredentials, SignupValidationErrors, SignupFormProps } from '../../types/auth';
import { Logo } from '../common/Logo';

export const validatePhoneNumber = (phone: string): string | null => {
  const clean = phone.trim().replace(/[\s-()]/g, '');
  if (!clean) {
    return 'Phone number is required';
  }
  const digits = clean.replace(/\+/g, '');
  if (!/^\+?[0-9]{10,15}$/.test(clean)) {
    return 'Please enter a valid 10 to 15 digit phone number';
  }

  // Rejects all identical repeating digits like 0000000000, 1111111111, 9999999999
  if (/^(\d)\1+$/.test(digits)) {
    return 'Please enter a valid active phone number (repeating digits like 1111111111 are invalid)';
  }

  // Rejects sequential dummy patterns
  if (digits === '1234567890' || digits === '0123456789' || digits === '9876543210' || digits === '01234567890') {
    return 'Please enter a valid active phone number';
  }

  // Standard 10-digit Indian mobile numbers must start with 6, 7, 8, or 9
  if (digits.length === 10 && !/^[6-9]\d{9}$/.test(digits)) {
    return '10-digit mobile numbers must start with 6, 7, 8, or 9 (e.g. 9778237180)';
  }

  return null;
};

export const SignupForm: React.FC<SignupFormProps> = ({ onSubmit, isLoading = false }) => {
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState<SignupCredentials>({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<SignupValidationErrors>({});
  const [internalLoading, setInternalLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: SignupValidationErrors = {};

    const usernameTrim = credentials.username.trim();
    if (!usernameTrim) {
      newErrors.username = 'User Name / Full Name is required';
    } else if (usernameTrim.length < 2) {
      newErrors.username = 'Name must be at least 2 characters long';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(usernameTrim)) {
      newErrors.username = 'Name must contain letters only (e.g. Alex Smith)';
    }

    const emailTrim = credentials.email.trim();
    if (!emailTrim) {
      newErrors.email = 'Email address is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailTrim)) {
      newErrors.email = 'Please enter a valid email address (e.g. name@domain.com)';
    }

    const phoneErr = validatePhoneNumber(credentials.phone);
    if (phoneErr) {
      newErrors.phone = phoneErr;
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!credentials.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (credentials.password !== credentials.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setInternalLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(credentials);
      } else {
        const { signupUser } = await import('../../services/api');
        await signupUser({
          full_name: credentials.username,
          email: credentials.email,
          phone: credentials.phone.trim(),
          password: credentials.password
        });
      }
      navigate('/login', {
        state: {
          registeredEmail: credentials.email,
          message: 'Account created successfully! Please login with your credentials.',
        },
      });
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please try again.';
      setErrors({ general: msg });
    } finally {
      setInternalLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'phone') {
      const clean = value.trim().replace(/[\s-()]/g, '');
      const digits = clean.replace(/\+/g, '');
      if (digits.length >= 10) {
        const err = validatePhoneNumber(value);
        setErrors((prev) => ({ ...prev, phone: err || undefined }));
      } else if (errors.phone) {
        setErrors((prev) => ({ ...prev, phone: undefined }));
      }
    } else if (errors[name as keyof SignupValidationErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const err = validatePhoneNumber(value);
      setErrors((prev) => ({ ...prev, phone: err || undefined }));
    }
  };

  const isSubmitting = isLoading || internalLoading;

  return (
    <div className="w-full animate-fadeIn space-y-3.5 text-[#2C241D]">
      {/* Brand Header Inside Card */}
      <div className="text-left space-y-1">
        <Logo to="/" size="lg" />
        <p className="text-[11px] text-[#6B5C4D] font-extrabold pt-1">
          Create your account to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 w-full" noValidate>
        {errors.general && (
          <div className="p-2.5 text-[11px] text-rose-800 bg-rose-50 border border-rose-300 rounded-xl font-bold">
            {errors.general}
          </div>
        )}

        {/* User Name Input Box with Spacious Padding */}
        <div>
          <label className="block text-[11px] font-extrabold text-[#5C4E42] mb-1">
            User Name / Full Name
          </label>
          <div className={`relative flex items-center bg-white/45 hover:bg-white/55 focus-within:bg-white/70 backdrop-blur-md border rounded-2xl overflow-hidden transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)] ${
            errors.username
              ? 'border-rose-400 focus-within:border-rose-600 focus-within:ring-2 focus-within:ring-rose-500/20'
              : 'border-white/75 focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/25'
          }`}>
            <input
              type="text"
              name="username"
              placeholder="Enter full name"
              value={credentials.username}
              onChange={handleChange}
              autoComplete="username"
              required
              className="w-full py-2.5 px-3.5 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#7A6C5E]/75 bg-transparent focus:outline-none"
            />
            <div className="pr-3.5 text-[#38A132] pointer-events-none">
              <User className="w-4 h-4" />
            </div>
          </div>
          {errors.username && (
            <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.username}</p>
          )}
        </div>

        {/* Email Address Input Box with Spacious Padding */}
        <div>
          <label className="block text-[11px] font-extrabold text-[#5C4E42] mb-1">
            Email Address
          </label>
          <div className={`relative flex items-center bg-white/45 hover:bg-white/55 focus-within:bg-white/70 backdrop-blur-md border rounded-2xl overflow-hidden transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)] ${
            errors.email
              ? 'border-rose-400 focus-within:border-rose-600 focus-within:ring-2 focus-within:ring-rose-500/20'
              : 'border-white/75 focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/25'
          }`}>
            <input
              type="email"
              name="email"
              placeholder="name@retailsphere.ai"
              value={credentials.email}
              onChange={handleChange}
              autoComplete="email"
              required
              className="w-full py-2.5 px-3.5 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#7A6C5E]/75 bg-transparent focus:outline-none"
            />
            <div className="pr-3.5 text-[#38A132] pointer-events-none">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          {errors.email && (
            <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.email}</p>
          )}
        </div>

        {/* Phone Number Input Box with Spacious Padding */}
        <div>
          <label className="block text-[11px] font-extrabold text-[#5C4E42] mb-1">
            Phone Number
          </label>
          <div className={`relative flex items-center bg-white/45 hover:bg-white/55 focus-within:bg-white/70 backdrop-blur-md border rounded-2xl overflow-hidden transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)] ${
            errors.phone
              ? 'border-rose-400 focus-within:border-rose-600 focus-within:ring-2 focus-within:ring-rose-500/20'
              : 'border-white/75 focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/25'
          }`}>
            <input
              type="tel"
              name="phone"
              placeholder="+91 9778237180"
              value={credentials.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="tel"
              required
              className="w-full py-2.5 px-3.5 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#7A6C5E]/75 bg-transparent focus:outline-none"
            />
            <div className={`pr-3.5 pointer-events-none ${errors.phone ? 'text-rose-600' : 'text-[#38A132]'}`}>
              <Phone className="w-4 h-4" />
            </div>
          </div>
          {errors.phone && (
            <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.phone}</p>
          )}
        </div>

        {/* Password & Confirm Password Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-extrabold text-[#5C4E42] mb-1">
              Password
            </label>
            <div className="relative flex items-center bg-white/45 hover:bg-white/55 focus-within:bg-white/70 backdrop-blur-md border border-white/75 rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/25 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)]">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={credentials.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                className="w-full py-2.5 px-3.5 text-xs text-[#2C241D] font-bold placeholder-[#7A6C5E]/75 bg-transparent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pr-3 text-[#5C4E42] hover:text-[#2C241D] focus:outline-none transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-[#5C4E42] mb-1">
              Confirm Password
            </label>
            <div className="relative flex items-center bg-white/45 hover:bg-white/55 focus-within:bg-white/70 backdrop-blur-md border border-white/75 rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/25 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)]">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm"
                value={credentials.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
                className="w-full py-2.5 px-3.5 text-xs text-[#2C241D] font-bold placeholder-[#7A6C5E]/75 bg-transparent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="pr-3 text-[#5C4E42] hover:text-[#2C241D] focus:outline-none transition-colors cursor-pointer"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Sign Up Button with Glowing Glass Gradient */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-gradient-to-r from-[#48A63E] via-[#38A132] to-[#2E8B29] hover:from-[#3D9634] hover:to-[#267722] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-[#38A132]/30 hover:shadow-[#38A132]/45 border border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-1 cursor-pointer active:scale-[0.99]"
        >
          {isSubmitting ? 'Creating account...' : 'Sign Up'}
        </button>

        {/* Divider without background, soft light black text font */}
        <div className="relative my-3 flex items-center justify-center">
          <div className="border-t border-[#6B5C4D]/25 w-full" />
          <span className="px-3 text-[10px] font-extrabold text-[#5C4E42] uppercase tracking-wider whitespace-nowrap">
            or continue with
          </span>
          <div className="border-t border-[#6B5C4D]/25 w-full" />
        </div>

        {/* Firebase Google Sign In Button in Glass Theme */}
        <GoogleSignInButton
          text="Sign up with Google"
          className="w-full py-3 bg-white/45 hover:bg-white/65 backdrop-blur-md border border-white/75 text-[#4A3E32] font-extrabold text-xs sm:text-sm rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)] flex items-center justify-center gap-2 transition-all cursor-pointer"
        />

        {/* Login link */}
        <div className="pt-1 text-center">
          <p className="text-[11px] text-[#5C4E42] font-bold">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-extrabold text-[#38A132] hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};
