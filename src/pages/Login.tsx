import { ArrowRight, Lock, Mail, MailWarning } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../lib/auth-api';
import { getErrorMessage, isEmailNotVerifiedError } from '../utils/error-handler';
import { motion } from 'motion/react';
import { BrandLogo } from '@/components/BrandLogo';

export function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Set when the account exists but its email address hasn't been verified
  const [needsVerification, setNeedsVerification] = useState(searchParams.get('verify') === 'required');
  const [isResending, setIsResending] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast.success('Successfully logged in!');
    } catch (error) {
      if (isEmailNotVerifiedError(error)) {
        setNeedsVerification(true);
      } else if ((error as { response?: { status?: number } })?.response?.status !== 401) {
        // 401 (wrong credentials) is already shown by the axios interceptor
        toast.error(getErrorMessage(error, 'Failed to sign in'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Enter your email address first');
      return;
    }
    setIsResending(true);
    try {
      const res = await authApi.resendVerification(email);
      toast.success(res.message || 'Verification email sent. Check your inbox.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not send the verification email'));
    } finally {
      setIsResending(false);
    }
  };

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
                Welcome back
              </h1>
              <p className="mt-4 text-lg text-gray-400 max-w-md">
                Sign in to access your projects, track progress, and collaborate with your team.
              </p>
            </motion.div>

            {/* Features list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {[
                'Real-time project tracking',
                'Team collaboration tools',
                'Financial oversight & reporting',
              ].map((feature, index) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <p className="text-gray-300 mb-4">
              "InfraSoko has transformed how we manage our infrastructure projects. The clarity it brings is unmatched."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold">
                JM
              </div>
              <div>
                <p className="font-medium text-white text-sm">John Mugabo</p>
                <p className="text-sm text-gray-500">Project Manager, BuildCo</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Column - Login Form */}
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
              <h1 className="text-2xl font-bold text-gray-900 font-heading">
                Sign in to your account
              </h1>
              <p className="text-gray-500 mt-2">
                Enter your credentials to continue
              </p>
            </div>

            {needsVerification && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <MailWarning className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Verify your email address</p>
                      <p className="text-sm text-amber-800 mt-1">
                        Your account's email address isn't verified yet. Open the link we emailed you, or send a
                        new one{email ? ` to ${email}` : ' (enter your email below first)'}.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="border-amber-300 bg-white hover:bg-amber-100 text-amber-900"
                    >
                      {isResending && <Spinner size="small" className="mr-2" />}
                      Resend verification email
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10 h-11 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10 h-11 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner size="small" className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                {/* <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    Don't have an account?
                  </span>
                </div> */}
              </div>

              {/* <Button
                variant="outline"
                className="w-full h-11 mt-6 border-gray-200 hover:bg-gray-50 rounded-lg font-medium"
                onClick={() => navigate('/register')}
              >
                Create an account
              </Button> */}
            </div>

            <p className="mt-8 text-center text-sm text-gray-500">
              By signing in, you agree to our{' '}
              <a href="#" className="font-medium text-gray-700 hover:text-gray-900 underline underline-offset-2">
                Terms
              </a>{' '}
              and{' '}
              <a href="#" className="font-medium text-gray-700 hover:text-gray-900 underline underline-offset-2">
                Privacy Policy
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
