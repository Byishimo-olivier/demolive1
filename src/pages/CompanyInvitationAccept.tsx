import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { companiesApi } from '@/lib/companies-api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { 
  CheckCircle2, 
  XCircle, 
  Users, 
  ArrowRight,
  Briefcase,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { BrandLogo } from '@/components/BrandLogo';

export default function CompanyInvitationAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, refreshUserCompanies, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Loading...');

  useEffect(() => {
    const acceptInvitation = async () => {
      // Wait for authentication to load
      if (authLoading) {
        setStatus('loading');
        setMessage('Checking authentication...');
        return;
      }

      // Validate token first
      if (!token) {
        setStatus('error');
        setMessage('Invalid invitation link. No token provided.');
        return;
      }

      // Check if user is authenticated
      if (!user) {
        setStatus('error');
        setMessage('You must be logged in to accept an invitation. Please log in first.');
        return;
      }

      // Start processing
      setStatus('processing');
      setMessage('Accepting invitation...');

      try {
        const response = await companiesApi.acceptInvitation(token);
        
        if (response.success) {
          setStatus('success');
          setMessage(response.message || 'You have successfully joined the company!');
          toast.success('Welcome to the company!');
          
          // Refresh user's company list
          await refreshUserCompanies(response.data?.companyId);
        } else {
          setStatus('error');
          setMessage(response.message || 'Failed to accept invitation. Please try again.');
        }
      } catch (error: any) {
        console.error('Error accepting invitation:', error);
        
        // Handle specific error cases
        if (error.response?.status === 400) {
          setMessage('Invalid or expired invitation token.');
        } else if (error.response?.status === 409) {
          setMessage('You are already a member of this company.');
        } else if (error.response?.status === 404) {
          setMessage('Invitation not found or has expired.');
        } else {
          setMessage('Failed to accept invitation. Please try again later.');
        }
        
        setStatus('error');
        toast.error('Failed to accept invitation');
      }
    };

    acceptInvitation();
  }, [token, user, authLoading, refreshUserCompanies]);

  const handleGoToDashboard = () => navigate('/dashboard');
  // Come back here after signing in so the invitation is accepted
  const handleGoToLogin = () => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);

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
                Join your
                <br />
                <span className="text-gray-500">organization</span>
              </h1>
              <p className="mt-4 text-lg text-gray-400 max-w-md">
                You've been invited to join a company on InfraSoko. Accept to start collaborating.
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
                { icon: Briefcase, text: 'Access company projects' },
                { icon: Users, text: 'Collaborate with team' },
                { icon: Shield, text: 'Secure workspace' },
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
              <BrandLogo />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            {/* Loading/Processing State */}
            {(status === 'loading' || status === 'processing') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                  <Spinner size="large" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-heading mb-2">
                  {status === 'loading' ? 'Loading...' : 'Processing invitation'}
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
                  Welcome aboard!
                </h2>
                <p className="text-gray-500 mb-8">{message}</p>
                <Button
                  onClick={handleGoToDashboard}
                  className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                >
                  Go to dashboard
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
                  Unable to accept invitation
                </h2>
                <p className="text-gray-500 mb-8">{message}</p>
                <div className="w-full space-y-3">
                  {!user ? (
                    <Button
                      onClick={handleGoToLogin}
                      className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                    >
                      Sign in to continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleGoToDashboard}
                        className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                      >
                        Go to dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleGoToLogin}
                        className="w-full h-11 border-gray-200 hover:bg-gray-50 rounded-lg font-medium"
                      >
                        Try different account
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
