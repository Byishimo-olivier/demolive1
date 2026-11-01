import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  ArrowRight,
  FolderKanban,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectApi } from '../lib/project-api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'motion/react';
import { getErrorMessage } from '@/utils/error-handler';
import { BrandLogo } from '@/components/BrandLogo';

export default function AcceptProjectInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string>('Processing your invitation...');
  const [projectId, setProjectId] = useState<string | null>(null);
  const navigate = useNavigate();
  // An invitation can only be accepted once, so never send it twice
  const attempted = useRef(false);

  useEffect(() => {
    const accept = async () => {

      if (authLoading) return; // Wait for auth to load

    // If not logged in, redirect to login and preserve invitation URL
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

      if (!token) {
        setStatus('error');
        setMessage('Invalid invitation link. No token provided.');
        return;
      }
      if (attempted.current) return;
      attempted.current = true;

      try {
        const res = await projectApi.acceptInvitation(token);
        setProjectId(res?.data?.projectId ?? null);
        setStatus('success');
        setMessage(
          res?.data?.projectName
            ? `You have joined ${res.data.projectName}.`
            : 'You have successfully joined the project!'
        );
        toast.success('Invitation accepted');
      } catch (err: unknown) {
        console.error(err);
        setStatus('error');
        setMessage(getErrorMessage(err, 'Failed to accept invitation. The link may be expired or invalid.'));
        toast.error('Failed to accept invitation');
      }
    };
    accept();
  }, [token, user, authLoading, navigate]);

  const handleNavigateToDashboard = () => navigate('/dashboard');
  const handleNavigateToProjects = () => navigate(projectId ? `/projects/${projectId}` : '/projects');

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
                Join your team
              </h1>
              <p className="mt-4 text-lg text-gray-400 max-w-md">
                You've been invited to collaborate on a project. Let's get you set up!
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
                { icon: FolderKanban, text: 'Access project resources' },
                { icon: Users, text: 'Collaborate with team members' },
                { icon: Clock, text: 'Real-time updates' },
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
            {/* Pending State */}
            {status === 'pending' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                  <Loader2 className="h-8 w-8 text-gray-600 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-heading mb-2">
                  Processing invitation
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
                  Welcome to the team!
                </h2>
                <p className="text-gray-500 mb-8">{message}</p>
                <div className="w-full space-y-3">
                  <Button
                    onClick={handleNavigateToProjects}
                    className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                  >
                    {projectId ? 'Open project' : 'View projects'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNavigateToDashboard}
                    className="w-full h-11 border-gray-200 hover:bg-gray-50 rounded-lg font-medium"
                  >
                    Go to dashboard
                  </Button>
                </div>
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
                  Invitation failed
                </h2>
                <p className="text-gray-500 mb-8">{message}</p>
                <Button
                  onClick={handleNavigateToDashboard}
                  className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                >
                  Go to dashboard
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
