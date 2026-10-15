import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  ArrowRight, 
  Building2,
  Shield,
  Users
} from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        const res = await authApi.verifyEmail(token);
        if (res.success) {
          setStatus('success');
          setMessage(res.message || 'Your email has been verified!');
          toast.success('Email verified successfully. You can now log in.');
        } else {
          setStatus('error');
          setMessage(res.message || 'Verification failed.');
        }
      } catch (error: unknown) {
        setStatus('error');
        setMessage('Verification failed. The link may be expired or invalid.');
      }
    };
    verify();
  }, [token]);

  const handleGoToLogin = () => navigate('/login');

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
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                <Building2 className="h-5 w-5 text-gray-900" />
              </div>
              <span className="text-xl font-bold text-white font-heading">InfraSoko</span>
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
                Almost there!
              </h1>
              <p className="mt-4 text-lg text-gray-400 max-w-md">
                We're verifying your email to secure your account and unlock all features.
              </p>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {[
                { icon: Shield, text: 'Secure account access' },
                { icon: Users, text: 'Team collaboration' },
                { icon: Mail, text: 'Email notifications' },
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-gray-300">{feature.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-500 text-sm"
          >
            © {new Date().getFullYear()} InfraSoko. All rights reserved.
          </motion.p>
        </div>
      </div>

      {/* Right Column - Status */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-12">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 font-heading">InfraSoko</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            {/* Verifying State */}
            {status === 'verifying' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                  <Loader2 className="h-8 w-8 text-gray-600 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-heading mb-2">
                  Verifying your email
                </h2>
                <p className="text-gray-500">{message}</p>
              </motion.div>
            )}

            {/* Success State */}
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-heading mb-2">
                  Email verified!
                </h2>
                <p className="text-gray-500 mb-8">{message}</p>
                <Button
                  onClick={handleGoToLogin}
                  className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                >
                  Continue to sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* Error State */}
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                  <XCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-heading mb-2">
                  Verification failed
                </h2>
                <p className="text-gray-500 mb-8">{message}</p>
                <Button
                  onClick={handleGoToLogin}
                  className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                >
                  Go to sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
