import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingNav } from '@/components/LandingNav';
import { 
  Building2, 
  BarChart3, 
  Users, 
  Clock, 
  Shield, 
  FileText, 
  Bell,
  Calendar,
  FolderKanban,
  Gauge,
  DollarSign,
  GitBranch,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { BrandLogo } from '@/components/BrandLogo';

const featureCategories = [
  {
    id: 'project-management',
    name: 'Project Management',
    icon: Building2,
    description: 'Complete project lifecycle management from planning to completion.',
    features: [
      {
        name: 'Project Dashboard',
        description: 'A centralized view of all projects with real-time status updates, KPIs, and quick actions.',
        icon: Gauge,
      },
      {
        name: 'Timeline & Milestones',
        description: 'Visual timeline management with dependencies, critical path analysis, and milestone tracking.',
        icon: Calendar,
      },
      {
        name: 'Task Management',
        description: 'Create, assign, and track tasks with priorities, due dates, and progress indicators.',
        icon: FolderKanban,
      },
      {
        name: 'Resource Allocation',
        description: 'Optimize team and equipment allocation across multiple projects with capacity planning.',
        icon: Users,
      },
    ],
  },
  {
    id: 'financial',
    name: 'Financial Control',
    icon: DollarSign,
    description: 'End-to-end budget management and financial tracking.',
    features: [
      {
        name: 'Budget Tracking',
        description: 'Real-time budget monitoring with variance analysis and automated alerts for overruns.',
        icon: BarChart3,
      },
      {
        name: 'Cost Forecasting',
        description: 'AI-powered cost predictions based on historical data and current project velocity.',
        icon: Gauge,
      },
      {
        name: 'Invoice Management',
        description: 'Streamlined invoice processing with approval workflows and payment tracking.',
        icon: FileText,
      },
      {
        name: 'Financial Reports',
        description: 'Comprehensive financial reporting with customizable dashboards and export options.',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'collaboration',
    name: 'Team Collaboration',
    icon: Users,
    description: 'Tools that bring teams together and keep everyone aligned.',
    features: [
      {
        name: 'Real-time Updates',
        description: 'Instant notifications and updates keep all stakeholders informed of project changes.',
        icon: Bell,
      },
      {
        name: 'Document Sharing',
        description: 'Secure document management with version control, comments, and approval workflows.',
        icon: FileText,
      },
      {
        name: 'Role-based Access',
        description: 'Granular permissions ensure the right people have access to the right information.',
        icon: Shield,
      },
      {
        name: 'Activity Timeline',
        description: 'Complete audit trail of all project activities, changes, and communications.',
        icon: Clock,
      },
    ],
  },
  {
    id: 'reporting',
    name: 'Reporting & Analytics',
    icon: BarChart3,
    description: 'Data-driven insights to make better decisions.',
    features: [
      {
        name: 'Custom Dashboards',
        description: 'Build personalized dashboards with the metrics that matter most to your team.',
        icon: Gauge,
      },
      {
        name: 'Automated Reports',
        description: 'Schedule and automate report generation and distribution to stakeholders.',
        icon: FileText,
      },
      {
        name: 'Performance Analytics',
        description: 'Track team and project performance with benchmarking and trend analysis.',
        icon: BarChart3,
      },
      {
        name: 'Export & Integration',
        description: 'Export data in multiple formats and integrate with your existing tools.',
        icon: GitBranch,
      },
    ],
  },
];

const highlights = [
  'Reduce project delays by up to 40%',
  'Cut administrative overhead by 60%',
  'Improve budget accuracy by 35%',
  'Real-time visibility across all projects',
];

export function Features() {
  const [activeCategory, setActiveCategory] = useState(featureCategories[0]);

  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero Section */}
      <section className="pt-32 pb-20 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-sm font-medium text-blue-700 tracking-wide uppercase mb-4"
            >
              Platform Features
            </motion.p>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight font-heading"
            >
              Powerful tools for
              <br />
              <span className="text-gray-400">modern infrastructure teams</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 text-xl text-gray-600 leading-relaxed"
            >
              Everything you need to plan, execute, and deliver infrastructure projects 
              successfully. Built for teams that demand excellence.
            </motion.p>
          </div>

          {/* Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 flex flex-wrap gap-4"
          >
            {highlights.map((highlight) => (
              <div
                key={highlight}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full"
              >
                <Check className="h-4 w-4 text-gray-700" />
                <span className="text-sm font-medium text-gray-700">{highlight}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-16">
            {featureCategories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory.id === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all",
                    isActive
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {category.name}
                </button>
              );
            })}
          </div>

          {/* Active Category */}
          <motion.div
            key={activeCategory.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 font-heading">
                {activeCategory.name}
              </h2>
              <p className="mt-2 text-lg text-gray-600">
                {activeCategory.description}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-px bg-gray-200 rounded-2xl overflow-hidden">
              {activeCategory.features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                
                return (
                  <motion.div
                    key={feature.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-white p-8 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                      <FeatureIcon className="h-5 w-5 text-gray-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.name}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* All Features Grid */}
      <section className="py-24 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-heading">
              Complete feature overview
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              A comprehensive look at everything InfraSoko offers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureCategories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-gray-200 p-8"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-6">
                  <category.icon className="h-6 w-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 font-heading mb-2">
                  {category.name}
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  {category.description}
                </p>
                <ul className="space-y-3">
                  {category.features.map((feature) => (
                    <li key={feature.name} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature.name}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-heading">
                The difference is clear
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                See how InfraSoko transforms your project management workflow.
              </p>
            </div>

            <div className="space-y-6">
              {/* Before */}
              <div className="p-6 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                <p className="text-sm font-medium text-gray-500 mb-4">Without InfraSoko</p>
                <ul className="space-y-3">
                  {[
                    'Scattered spreadsheets',
                    'Endless email chains',
                    'Missed deadlines',
                    'Budget overruns',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* After */}
              <div className="p-6 bg-white rounded-xl border-2 border-gray-900">
                <p className="text-sm font-medium text-gray-900 mb-4">With InfraSoko</p>
                <ul className="space-y-3">
                  {[
                    'Centralized project hub',
                    'Real-time collaboration',
                    'On-time delivery',
                    'Budget control',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-900">
                      <Check className="h-4 w-4 text-gray-900" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-gray-900 rounded-3xl p-12 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white font-heading">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
              Start your 14-day free trial today. No credit card required.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-12 px-8 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-medium"
              >
                Start free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Link to="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 border-gray-700 text-white hover:bg-gray-800 rounded-lg font-medium"
                >
                  View pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BrandLogo />
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
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
