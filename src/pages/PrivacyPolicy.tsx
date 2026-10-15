import { LandingNav } from '@/components/LandingNav';
import { Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <div className="pt-32 pb-24 max-w-4xl mx-auto px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 font-heading">Privacy Policy</h1>
        
        <div className="prose prose-blue max-w-none text-gray-600">
          <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information that you provide directly to us, including when you create an account,
            update your profile, use our services, or communicate with us.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to operate, maintain, and provide the features and functionality
            of the service, as well as to communicate directly with you.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Data Security</h2>
          <p className="mb-4">
            We care about the security of your information and use commercially reasonable safeguards to
            preserve the integrity and security of all information we collect and that we share with our service providers.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us at alabastaking56@gmail.com or visit our <Link to="/contact" className="text-blue-600 hover:underline">Contact page</Link>.
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
