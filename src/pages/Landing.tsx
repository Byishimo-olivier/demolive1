import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, BarChart3, FileText, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingNav } from '@/components/LandingNav';
import { motion } from 'motion/react';

const stats = [
  { value: '100%', label: 'Cloud-Native Platform' },
  { value: '0', label: 'Day Onboarding' },
  { value: 'Unlimited', label: 'Projects Capacity' },
  { value: '24/7', label: 'Priority Support' },
];

const features = [
  {
    icon: Building2,
    title: 'Project Management',
    description: 'End-to-end oversight of infrastructure projects with real-time tracking and milestone management.',
  },
  {
    icon: BarChart3,
    title: 'Financial Control',
    description: 'Complete budget visibility with automated tracking, variance analysis, and forecasting tools.',
  },
  {
    icon: FileText,
    title: 'Document Hub',
    description: 'Centralized document management with version control, approvals, and secure sharing.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Streamlined communication across stakeholders with role-based access and notifications.',
  },
];

const testimonials = [
  {
    quote: "Our platform is designed to transform how you manage your infrastructure portfolio with unmatched clarity.",
    author: "Built for Operations",
    role: "Director of Operations",
    company: "Focus on ROI",
  },
  {
    quote: "Reduce project delays with a platform that understands infrastructure complexity without adding more complexity.",
    author: "Built for Leadership",
    role: "CEO & Execs",
    company: "Data-Driven Approach",
  },
  {
    quote: "Everything you need to keep teams aligned and executing perfectly across multiple project phases.",
    author: "Built for Managers",
    role: "Project Manager",
    company: "Seamless Workflows",
  },
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero Section */}
      <section className="pt-32 pb-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-sm font-medium text-blue-700 tracking-wide uppercase mb-4"
            >
              Infrastructure Project Management
            </motion.p>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] tracking-tight font-heading"
            >
              Build infrastructure
              <br />
              <span className="text-gray-400">with confidence</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 text-xl text-gray-600 leading-relaxed max-w-2xl"
            >
              The modern platform for infrastructure teams. Manage projects, track budgets, 
              and collaborate seamlessly—all in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                className="h-12 px-8 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
              >
                Start free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/features')}
                className="h-12 px-8 border-gray-300 hover:bg-gray-50 rounded-lg font-medium"
              >
                See how it works
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 text-sm text-gray-500"
            >
              No credit card required · 14-day free trial · Cancel anytime
            </motion.p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl md:text-5xl font-bold text-gray-900 font-heading">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-gray-900 font-heading"
            >
              Everything you need to deliver projects on time and on budget
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-gray-200 rounded-2xl overflow-hidden">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white p-10 hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 font-heading">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                <Link
                  to="/features"
                  className="inline-flex items-center mt-6 text-sm font-medium text-gray-900 hover:text-blue-700 transition-colors"
                >
                  Learn more
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm font-medium text-gray-500 tracking-wide uppercase mb-4"
          >
            Designed for infrastructure professionals
          </motion.p>
          
          <div className="grid lg:grid-cols-3 gap-8 mt-12">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white p-8 rounded-2xl border border-gray-200"
              >
                <blockquote className="text-lg text-gray-700 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-gray-900 rounded-3xl p-12 md:p-16 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-white font-heading"
            >
              Ready to transform your project delivery?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto"
            >
              Sign up today and experience the future of infrastructure project management.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                className="h-12 px-8 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-medium"
              >
                Start free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 border-gray-700 text-black hover:text-white hover:bg-gray-800 rounded-lg font-medium"
              >
                Schedule a demo
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900 font-heading">InfraSoko</span>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Modern infrastructure project management for teams that build.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link to="/features" className="hover:text-gray-900">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-gray-900">Pricing</Link></li>
                <li><a href="#" className="hover:text-gray-900">Integrations</a></li>
                <li><a href="#" className="hover:text-gray-900">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">About</a></li>
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
                <li><a href="#" className="hover:text-gray-900">Careers</a></li>
                <li><Link to="/contact" className="hover:text-gray-900">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link to="/privacy-policy" className="hover:text-gray-900">Privacy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-gray-900">Terms</Link></li>
                <li><a href="#" className="hover:text-gray-900">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} InfraSoko. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Twitter</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">LinkedIn</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
