import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/auth-api';
import { getErrorMessage } from '@/utils/error-handler';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Upload, 
  X, 
  ArrowRight, 
  Building2, 
  Users, 
  Mail,
  Lock,
  User,
  Check
} from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import * as z from 'zod';
import { motion } from 'motion/react';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  fullName: z.string().min(2, 'Full name is required'),
});

type RegisterFormValues = z.infer<typeof formSchema>;

export function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const companyInvitationToken = params.get('companyInvitationToken');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setPreviewUrl(null);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      if (companyInvitationToken) {
        await authApi.registerWithCompanyInvitation({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          companyInvitationToken,
        });
      } else {
        await authApi.register({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          profilePicture: profilePicture || undefined,
        });
      }
      
      setIsSuccess(true);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create account'));
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    'Unlimited project management',
    'Real-time team collaboration',
    'Financial tracking & reports',
    'Document management',
  ];

  const InvitationBanner = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Users className="h-4 w-4 text-blue-700" />
        </div>
        <div>
          <p className="font-medium text-blue-900 text-sm">You've been invited!</p>
          <p className="text-sm text-blue-700 mt-0.5">
            Complete your registration to join the team.
          </p>
        </div>
      </div>
    </motion.div>
  );

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
                Start building
                <br />
                <span className="text-gray-500">better infrastructure</span>
              </h1>
              <p className="mt-4 text-lg text-gray-400 max-w-md">
                  Join our early access program to deliver projects on time and on budget.
              </p>
            </motion.div>

            {/* Benefits list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-300">{benefit}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-6"
          >
            {[
              { value: '10K+', label: 'Users' },
              { value: '500+', label: 'Companies' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-2xl font-bold text-white font-heading">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Column - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden flex items-center justify-center gap-2 mb-12"
          >
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 font-heading">InfraSoko</span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {isSuccess ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-heading mb-4">
                  Check your email
                </h2>
                <div className="text-gray-600 mb-8 space-y-4">
                  <p>
                    We've sent a verification link to your email address.
                  </p>
                  <p className="p-4 bg-orange-50 text-orange-800 rounded-lg text-sm border border-orange-100">
                    <strong>Important:</strong> You must verify your email address before you can use the platform.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                >
                  Return to login
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 font-heading">
                    Create your account
                  </h1>
                  <p className="text-gray-500 mt-2">
                    Enter your information to get started
                  </p>
                </div>

                {companyInvitationToken && <InvitationBanner />}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Full name
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input 
                                placeholder="John Doe" 
                                className="pl-10 h-11 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Email address
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input 
                                placeholder="name@example.com" 
                                className="pl-10 h-11 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input 
                                type="password" 
                                placeholder="Create a strong password"
                                className="pl-10 h-11 bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-gray-500 mt-1">
                            Must be 8+ characters with uppercase, lowercase, and number
                          </p>
                        </FormItem>
                      )}
                    />

                    {/* Profile Picture Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Profile photo <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <div className="flex items-center gap-4">
                        {previewUrl ? (
                          <div className="relative">
                            <img
                              src={previewUrl}
                              alt="Profile preview"
                              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={removeProfilePicture}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <label className="flex-1 cursor-pointer">
                          <div className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors text-center">
                            <Upload className="h-4 w-4 inline-block mr-2" />
                            {previewUrl ? 'Change photo' : 'Upload photo'}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
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
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create account
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">
                        Already have an account?
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-11 mt-6 border-gray-200 hover:bg-gray-50 rounded-lg font-medium"
                    onClick={() => navigate('/login')}
                  >
                    Sign in instead
                  </Button>
                </div>

                <p className="mt-8 text-center text-sm text-gray-500">
                  By creating an account, you agree to our{' '}
                  <a href="#" className="font-medium text-gray-700 hover:text-gray-900 underline underline-offset-2">
                    Terms
                  </a>{' '}
                  and{' '}
                  <a href="#" className="font-medium text-gray-700 hover:text-gray-900 underline underline-offset-2">
                    Privacy Policy
                  </a>
                </p>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
