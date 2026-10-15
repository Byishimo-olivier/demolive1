import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  DollarSign, 
  BarChart3, 
  MessageSquare, 
  Shield, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'motion/react';

const benefits = [
  {
    icon: Clock,
    title: 'Accelerate Delivery',
    description: 'Automate repetitive tasks and streamline workflows for faster project delivery.',
    metric: 'Faster',
    metricLabel: 'Project Delivery',
    color: 'blue'
  },
  {
    icon: DollarSign,
    title: 'Optimize Resources',
    description: 'Improve resource allocation and minimize waste across all your projects.',
    metric: 'Smarter',
    metricLabel: 'Resource Allocation',
    color: 'green'
  },
  {
    icon: BarChart3,
    title: 'Real-Time Visibility',
    description: 'Make data-driven decisions with instant insights into project performance.',
    metric: '100%',
    metricLabel: 'Visibility',
    color: 'purple'
  },
  {
    icon: MessageSquare,
    title: 'Seamless Collaboration',
    description: 'Keep all stakeholders aligned with modern communication tools.',
    metric: 'Unified',
    metricLabel: 'Team Alignment',
    color: 'orange'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade security protocols to protect your sensitive project data.',
    metric: '99.9%',
    metricLabel: 'Uptime',
    color: 'red'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized performance ensures your team stays productive at all times.',
    metric: '<100ms',
    metricLabel: 'Response Time',
    color: 'yellow'
  }
];

const colorClasses = {
  blue: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/25' },
  green: { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-600', gradient: 'from-green-500 to-emerald-600', glow: 'shadow-green-500/25' },
  purple: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-500 to-violet-600', glow: 'shadow-purple-500/25' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600', gradient: 'from-orange-500 to-amber-600', glow: 'shadow-orange-500/25' },
  red: { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-600', gradient: 'from-red-500 to-rose-600', glow: 'shadow-red-500/25' },
  yellow: { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-600', gradient: 'from-yellow-500 to-amber-500', glow: 'shadow-yellow-500/25' },
};

export function BenefitsSection() {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7 }}
      className="py-24 bg-white relative overflow-hidden"
      aria-label="Benefits section"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
          animate={{ scale: [1.1, 1, 1.1], rotate: [0, -90, 0] }}
          transition={{ repeat: Infinity, duration: 15, ease: 'easeInOut' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200/50 mb-6"
          >
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Why Choose Us</span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 font-heading mb-6">
            Transform your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              infrastructure management
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the power of modern project management with features designed to streamline your operations
          </p>
        </motion.div>

        {/* Benefits grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            const colors = colorClasses[benefit.color as keyof typeof colorClasses];
            
            return (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 40, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden"
              >
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                
                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-6 shadow-lg ${colors.glow}`}
                >
                  <Icon className="h-7 w-7 text-white" />
                </motion.div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 font-heading mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {benefit.description}
                </p>

                {/* Metric */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.light}`}>
                    <CheckCircle2 className={`h-4 w-4 ${colors.text}`} />
                    <span className={`font-bold ${colors.text}`}>{benefit.metric}</span>
                  </div>
                  <span className="text-gray-500 text-sm">{benefit.metricLabel}</span>
                </div>

                {/* Corner decoration */}
                <div className={`absolute -right-8 -bottom-8 w-24 h-24 bg-gradient-to-br ${colors.gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center mt-16"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-500/25 rounded-xl"
            >
              Start Transforming Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
          <p className="mt-4 text-gray-500">
            Join the <span className="font-semibold text-gray-700">early access</span> program and build the future with us
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}
