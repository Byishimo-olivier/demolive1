import React, { useState } from 'react';
import { LandingNav } from '@/components/LandingNav';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BrandLogo } from '@/components/BrandLogo';

export function Contact() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name');
    const email = formData.get('email');
    const subject = formData.get('subject');
    const message = formData.get('message');

    const mailtoLink = `mailto:alabastaking56@gmail.com?subject=${encodeURIComponent(`Contact Form: ${subject}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
    
    window.location.href = mailtoLink;

    setTimeout(() => {
      setLoading(false);
      toast.success('Opening your email client...');
      (e.target as HTMLFormElement).reset();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <div className="pt-32 pb-24 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-heading">Contact Us</h1>
          <p className="text-xl text-gray-600">
            Have questions about InfraSoko? We're here to help. Fill out the form below and our team will get back to you as soon as possible.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="How can we help?"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Tell us about your project..."
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 text-lg">
                {loading ? 'Sending...' : (
                  <>
                    <Send className="mr-2 h-5 w-5" /> Send Message
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="space-y-8 lg:pl-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-6">
                <h3 className="text-lg font-medium text-gray-900">Email us</h3>
                <p className="mt-2 text-base text-gray-600">
                  Our friendly team is here to help.
                  <br />
                  <a href="mailto:ndaganothierry@gmail.com" className="text-blue-600 hover:text-blue-500">ndaganothierry@gmail.com</a>
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-6">
                <h3 className="text-lg font-medium text-gray-900">Visit us</h3>
                <p className="mt-2 text-base text-gray-600">
                  Come say hello at our HQ.
                  <br />
                  6112 KN 4 avenue 
                  <br />
                  Nyarugenge, Kigali
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-6">
                <h3 className="text-lg font-medium text-gray-900">Call us</h3>
                <p className="mt-2 text-base text-gray-600">
                  Mon-Fri from 8am to 5pm.
                  <br />
                  <a href="tel:+250785230859" className="text-blue-600 hover:text-blue-500">+250 785230859</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BrandLogo />
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
