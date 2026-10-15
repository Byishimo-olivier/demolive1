import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { TrendingUp, Users, Zap, Award } from 'lucide-react';

export function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  
  const stats = [
    { value: 100, label: 'Platform Uptime Target', suffix: '%', icon: TrendingUp, color: 'blue' },
    { value: 24, label: 'Support Available', suffix: '/7', icon: Award, color: 'green' },
    { value: 0, label: 'Day Onboarding', suffix: '', icon: Zap, color: 'purple' },
    { value: 10, label: 'Unlimited Projects', suffix: '+', icon: Users, color: 'orange' }, // The animation goes to this value
  ];

  useEffect(() => {
    if (isInView) {
      setCounts(stats.map((stat) => stat.value));
    }
  }, [isInView]);

  function formatNumber(num: number): string {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + 'k';
    return num.toString();
  }

  const colorClasses = {
    blue: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-100', text: 'text-blue-600', glow: 'shadow-blue-500/25' },
    green: { bg: 'from-green-500 to-emerald-600', light: 'bg-green-100', text: 'text-green-600', glow: 'shadow-green-500/25' },
    purple: { bg: 'from-purple-500 to-violet-600', light: 'bg-purple-100', text: 'text-purple-600', glow: 'shadow-purple-500/25' },
    orange: { bg: 'from-orange-500 to-amber-600', light: 'bg-orange-100', text: 'text-orange-600', glow: 'shadow-orange-500/25' },
  };

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
      className="py-24 relative overflow-hidden"
      aria-label="Key statistics"
    >
      {/* Creative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Floating orbs */}
      <motion.div
        className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"
        animate={{ 
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"
        animate={{ 
          x: [0, -80, 0],
          y: [0, -60, 0],
        }}
        transition={{ repeat: Infinity, duration: 15, ease: 'easeInOut' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Built for Scale
          </motion.span>
          <h2 className="text-3xl md:text-4xl font-bold text-white font-heading mb-4">
            Engineered for <span className="text-gradient">excellence</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A platform designed from the ground up to handle your most complex projects.
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.15 }
            }
          }}
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const colors = colorClasses[stat.color as keyof typeof colorClasses];
            
            return (
              <motion.div
                key={stat.label}
                variants={{
                  hidden: { opacity: 0, y: 40, scale: 0.9 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                whileHover={{ 
                  scale: 1.05, 
                  y: -8,
                  transition: { type: 'spring', stiffness: 400 }
                }}
                className="group relative"
              >
                <div className={`relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden`}>
                  {/* Gradient corner accent */}
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colors.bg} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
                  
                  {/* Icon */}
                  <motion.div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.bg} flex items-center justify-center mb-6 shadow-lg ${colors.glow}`}
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </motion.div>

                  {/* Counter */}
                  <motion.div
                    className="text-4xl md:text-5xl font-bold text-white font-heading mb-2"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                  >
                    {formatNumber(counts[i])}{stat.suffix}
                  </motion.div>

                  {/* Label */}
                  <p className="text-gray-400 font-medium">
                    {stat.label}
                  </p>

                  {/* Progress bar decoration */}
                  <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${colors.bg} rounded-full`}
                      initial={{ width: '0%' }}
                      whileInView={{ width: '100%' }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
