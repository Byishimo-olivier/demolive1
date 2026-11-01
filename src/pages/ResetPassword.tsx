import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Spinner } from '../components/Spinner';
import { Lock, ArrowLeft, ArrowRight, ShieldCheck, Check, X } from 'lucide-react';
import { authApi } from '../lib/auth-api';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/BrandLogo';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({ token: token!, newPassword });
      toast.success('Password has been reset successfully');
      navigate('/login');
    } catch (error) {
      // Error is handled by axios interceptor
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { text: '8+ characters', met: newPassword.length >= 8 },
    { text: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
    { text: 'Lowercase letter', met: /[a-z]/.test(newPassword) },
    { text: 'Number', met: /\d/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  // Invalid token state
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-gray-500 mb-8">
            This password reset link is invalid or has expired.
          </p>
          <Button 
            onClick={() => navigate('/forgot-password')}
            className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
          >
            Request New Reset Link
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/" className="flex items-center gap-3">
              <BrandLogo onDark />
            </Link>
          </motion.div>

          {/* Main Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white font-heading leading-tight">
                Create a new
                <br />
                <span className="text-gray-500">secure password</span>
              </h1>
              <p className="mt-4 text-lg text-gray-400 max-w-md">
                Choose a strong password to keep your account protected. Make sure it's different from your previous passwords.
              </p>
            </motion.div>

            {/* Security tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Security Tips</p>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Use a mix of letters, numbers, and symbols</li>
                    <li>• Avoid using personal information</li>
                    <li>• Don't reuse passwords from other sites</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-500 text-sm"
          >
            Need help? Contact support@infrasoko.com
          </motion.p>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden flex items-center justify-center gap-2 mb-12"
          >
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="mb-8">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-gray-700" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 font-heading">
                Reset your password
              </h1>
              <p className="text-gray-500 mt-2">
                Enter your new password below
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                  New password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter your new password"
                    className="pl-10 h-11 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Password requirements */}
              <div className="grid grid-cols-2 gap-2">
                {passwordRequirements.map((req, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 text-xs p-2 rounded-lg transition-colors",
                      req.met 
                        ? "bg-gray-100 text-gray-700" 
                        : "bg-gray-50 text-gray-400"
                    )}
                  >
                    {req.met ? (
                      <Check className="h-3.5 w-3.5 text-gray-700" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-gray-300" />
                    )}
                    {req.text}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    className={cn(
                      "pl-10 h-11 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900",
                      confirmPassword && !passwordsMatch && "border-red-300 focus:border-red-500"
                    )}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <X className="h-3.5 w-3.5" />
                    Passwords do not match
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    Passwords match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                disabled={isLoading || !allRequirementsMet || !passwordsMatch}
              >
                {isLoading ? (
                  <>
                    <Spinner size="small" className="mr-2" />
                    Resetting password...
                  </>
                ) : (
                  <>
                    Reset password
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8">
              <Button
                variant="outline"
                className="w-full h-11 border-gray-200 hover:bg-gray-50 rounded-lg font-medium"
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
