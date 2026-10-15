import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Star, Shield, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'motion/react';

export function CTASection() {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-grade security protocols'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized for performance'
    },
    {
      icon: CheckCircle2,
      title: '99.9% Uptime',
      description: 'Reliable infrastructure'
    }
  ];

  const [activeGlow] = useState(0);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
      className="relative bg-gradient-to-br from-blue-900 to-blue-800 text-white py-24 overflow-hidden"
      aria-label="Call to action"
    >
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 bg-blue-900/50 pointer-events-none"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 pointer-events-none"
        animate={{ y: [0, 30, 0] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 pointer-events-none"
        animate={{ y: [0, -30, 0] }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 md:gap-12 items-center">
          {/* Left Column */}
          <motion.div
            initial={{ x: -60, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.7, type: 'spring' }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center rounded-full bg-blue-800/50 px-5 py-2 mb-8 shadow-sm"
            >
              <span className="text-base font-medium text-blue-200">
                Limited Time Offer
              </span>
            </motion.div>
            <motion.h2
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-4xl md:text-5xl font-bold mb-8 leading-tight"
              style={{ lineHeight: 1.1 }}
            >
              Start transforming your{' '}
              <span className="text-blue-200">project management</span> today
            </motion.h2>
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl"
            >
              Sign up today and be among the first to streamline your infrastructure projects
            </motion.p>
            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 mb-8"
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.7 }}
            >
              <motion.div whileHover={{ scale: 1.07, boxShadow: '0 0 16px #fff' }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="text-lg bg-white text-blue-900 hover:bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200 shadow-md"
                  onClick={() => navigate('/register')}
                  aria-label="Start 14-day free trial"
                >
                  Start 14-day free trial
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.07, boxShadow: '0 0 16px #fff' }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base border-white text-black hover:bg-white/10 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
                  aria-label="Schedule demo"
                >
                  Schedule demo
                </Button>
              </motion.div>
            </motion.div>
            {/* Trial Info */}
            <motion.p
              className="mt-4 text-sm text-blue-200"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              No credit card required · Cancel anytime · Free onboarding support
            </motion.p>
          </motion.div>
          {/* Right Column */}
          <motion.div
            initial={{ x: 60, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.7, type: 'spring' }}
            className="relative"
          >
            <motion.div
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-blue-100"
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.7, type: 'spring' }}
            >
              {/* Benefits Grid */}
              <motion.div
                className="grid gap-6"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.15 }
                  }
                }}
              >
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  const isActive = index === activeGlow;
                  return (
                    <motion.div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors focus-within:ring-2 focus-within:ring-blue-200 relative"
                      tabIndex={0}
                      aria-label={benefit.title}
                      title={benefit.title}
                      initial={{ y: 40, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + index * 0.1, duration: 0.7, type: 'spring' }}
                      whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
                      animate={
                        isActive
                          ? { boxShadow: [
                              '0 0 0px #fff',
                              '0 0 16px #fff',
                              '0 0 0px #fff'
                            ],
                            transition: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }
                          }
                          : { boxShadow: '0 0 0px #fff' }
                      }
                    >
                      <motion.div
                        className="p-2 rounded-lg bg-blue-500/20"
                        whileHover={{ rotate: [0, 10, -10, 0], scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Icon className="h-6 w-6 text-blue-200" aria-hidden="true" />
                      </motion.div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {benefit.title}
                        </h3>
                        <p className="text-blue-200">
                          {benefit.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
              {/* Enterprise Badge (no glow) */}
              <motion.div
                className="mt-8 p-4 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-400/20 backdrop-blur-lg border border-blue-100"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.7 }}
              >
                <div className="flex items-center justify-between">
                  <Shield className="h-8 w-8 text-blue-200" aria-hidden="true" />
                  <div>
                    <h4 className="font-semibold">Enterprise Ready</h4>
                    <p className="text-sm text-blue-200">
                      Advanced features for large teams
                    </p>
                  </div>
                  <motion.div whileHover={{ scale: 1.1 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-200 hover:text-white hover:bg-white/10 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                      aria-label="Learn more about enterprise features"
                    >
                      Learn more
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
            {/* Decorative Elements */}
            <motion.div
              className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-400/30 rounded-full blur-xl pointer-events-none"
              animate={{ y: [0, 20, 0] }}
              transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
              aria-hidden="true"
            />
            <motion.div
              className="absolute -left-4 -top-4 w-32 h-32 bg-blue-300/30 rounded-full blur-xl pointer-events-none"
              animate={{ y: [0, -20, 0] }}
              transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
              aria-hidden="true"
            />
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
