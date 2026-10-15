import { LandingNav } from '@/components/LandingNav';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <div className="pt-32 pb-24 max-w-4xl mx-auto px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 font-heading">Terms of Service</h1>
        
        <div className="prose prose-blue max-w-none text-gray-600">
          <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using InfraSoko, you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
          <p className="mb-4">
            InfraSoko provides project management and infrastructure tracking tools for teams and businesses. We reserve the right to modify or discontinue the service at any time.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. User Conduct</h2>
          <p className="mb-4">
            You agree not to use the service for any illegal or unauthorized purpose. You must not, in the use of the Service, violate any laws in your jurisdiction.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Termination</h2>
          <p className="mb-4">
            We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 font-heading">InfraSoko</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6 text-sm text-gray-500 mt-4 md:mt-0">
              <Link to="/privacy-policy" className="hover:text-gray-900">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-gray-900">Terms of Service</Link>
              <p>
                © {new Date().getFullYear()} InfraSoko. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
