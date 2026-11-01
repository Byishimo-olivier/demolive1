import React from 'react';
import { ArrowRight, BarChart3, CheckCircle2, FileText, Shield, Star, Sparkles, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const ref = useRef(null);
  const navigate = useNavigate();
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 30;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 30;
    setParallax({ x, y });
  }

  function handleMouseLeave() {
    setParallax({ x: 0, y: 0 });
  }

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.7 }}
      className="relative min-h-screen flex items-center overflow-hidden"
      aria-label="Hero section"
    >
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          animate={{ 
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1.1, 1, 1.1]
          }}
          transition={{ repeat: Infinity, duration: 25, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ 
            x: [0, 50, 0],
            y: [0, -50, 0],
          }}
          transition={{ repeat: Infinity, duration: 15, ease: 'easeInOut' }}
        />
      </div>

      {/* Grain overlay for texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%" height="100%" filter="url(%23noise)"/%3E%3C/svg%3E")' }} 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20">
        <div className="grid lg:grid-cols-2 gap-16 md:gap-12 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ x: -60, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.1, duration: 0.8, type: 'spring' }}
            className="relative z-10"
          >
            {/* Badge */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-purple-200/50 px-5 py-2 mb-8 backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium font-[var(--font-accent)] bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                #1 Infrastructure Project Platform
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              whileInView={{ y: 0, opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: 0.3, duration: 0.9, type: 'spring', bounce: 0.4 }}
              className="text-5xl md:text-7xl font-bold text-gray-900 leading-[1.1] mb-8 tracking-tight"
            >
              <span className="block">Build the</span>
              <span className="block mt-2">
                <span className="relative">
                  <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Future
                  </span>
                  <motion.svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 200 12"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                  >
                    <motion.path
                      d="M2 8 Q50 2 100 8 T198 8"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#EA580C" />
                        <stop offset="50%" stopColor="#111827" />
                        <stop offset="100%" stopColor="#FDBA74" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </span>
              </span>
              <span className="block mt-2 text-gray-400 text-4xl md:text-5xl font-light">
                Together.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="text-xl md:text-2xl text-gray-600 mb-10 max-w-xl font-light leading-relaxed"
            >
              The modern platform where 
              <span className="font-medium text-gray-900"> clients</span>, 
              <span className="font-medium text-gray-900"> contractors</span> & 
              <span className="font-medium text-gray-900"> consultants</span> collaborate seamlessly.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 mb-12"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  className="text-lg h-14 px-8 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-500/25 rounded-xl font-medium"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg h-14 px-8 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl font-medium"
                >
                  Watch Demo
                  <Zap className="ml-2 h-5 w-5 text-yellow-500" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Early Access */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: 0.8, duration: 0.7 }}
              className="flex items-center gap-6 mt-8"
            >
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Early Access Program</h4>
                  <p className="text-sm text-gray-500">Join our growing community of early adopters</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Interactive Dashboard Preview */}
          <motion.div
            initial={{ x: 60, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.2, duration: 0.8, type: 'spring' }}
            className="relative"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Glow effect behind card */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl scale-110" />
            
            <motion.div
              className="relative glass-card rounded-3xl p-2 glow-purple"
              style={{
                transform: `perspective(1000px) rotateY(${parallax.x * 0.5}deg) rotateX(${-parallax.y * 0.5}deg)`
              }}
              transition={{ type: 'spring', stiffness: 100 }}
            >
              {/* Browser-like header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-gray-100 rounded-lg px-4 py-1 text-xs text-gray-500 font-mono">
                    app.infrasoko.com/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Preview */}
              <div className="p-6 bg-gradient-to-br from-slate-50 to-white rounded-b-2xl">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Active Projects', value: '24', color: 'blue', change: '+12%' },
                    { label: 'Total Budget', value: '$4.2M', color: 'green', change: '+8%' },
                    { label: 'Team Members', value: '156', color: 'purple', change: '+24' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ y: 20, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                    >
                      <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                      <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                      <p className={`text-xs text-${stat.color}-600 mt-1`}>{stat.change}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="h-32 bg-gradient-to-t from-blue-100 to-transparent rounded-xl flex items-end justify-around px-4 pb-4 origin-bottom"
                >
                  {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 1 + i * 0.05, duration: 0.4 }}
                      className="w-6 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md"
                    />
                  ))}
                </motion.div>
              </div>
            </motion.div>

            {/* Floating elements */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.2 }}
              className="absolute -right-4 top-1/4 glass-card rounded-2xl p-4 shadow-xl animate-float"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Bid Accepted</p>
                  <p className="text-xs text-gray-500">Highway Project</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.4 }}
              className="absolute -left-8 bottom-1/4 glass-card rounded-2xl p-4 shadow-xl animate-float"
              style={{ animationDelay: '1s' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Secure Payment</p>
                  <p className="text-xs text-gray-500">256-bit encrypted</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
